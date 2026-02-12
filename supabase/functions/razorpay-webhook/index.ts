import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get webhook signature from headers
    const signature = req.headers.get('x-razorpay-signature');
    if (!signature) {
      console.error('Missing webhook signature');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    if (!webhookSecret) {
      console.error('Webhook secret not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body for signature verification
    const rawBody = await req.text();
    
    // Verify webhook signature using Web Crypto API
    const encoder = new TextEncoder();
    const keyData = encoder.encode(webhookSecret);
    const messageData = encoder.encode(rawBody);
    
    const cryptoKey = await crypto.subtle.importKey(
      "raw",
      keyData,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== signature) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse webhook payload
    const payload = JSON.parse(rawBody);
    const event = payload.event;
    
    console.log('Webhook event received:', event);

    // Handle payment.captured event
    if (event === 'payment.captured') {
      const paymentEntity = payload.payload.payment.entity;
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      const amount = paymentEntity.amount;

      console.log(`Processing payment capture: order=${orderId}, payment=${paymentId}, amount=${amount}`);

      // Initialize Supabase admin client
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Find the subscription by order ID
      const { data: subscription, error: fetchError } = await supabaseAdmin
        .from('subscriptions')
        .select('*')
        .eq('razorpay_order_id', orderId)
        .single();

      if (fetchError || !subscription) {
        console.error('Subscription not found for order:', orderId, fetchError);
        return new Response(
          JSON.stringify({ error: 'Subscription not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if already processed
      if (subscription.status === 'active' || subscription.status === 'completed') {
        console.log('Payment already processed for order:', orderId);
        return new Response(
          JSON.stringify({ success: true, message: 'Already processed' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine expiry based on amount
      let expiresAt: Date | null = null;
      
      if (subscription.amount === 9900) {
        // Monthly plan - 1 month
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (subscription.amount === 49900) {
        // Yearly plan - 1 year
        expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
      // For lifetime (99900), expiresAt remains null

      console.log(`Activating subscription: order=${orderId}, amount=${subscription.amount}, expiry=${expiresAt?.toISOString() || 'lifetime'}`);

      // Update subscription status
      const updateData: any = {
        razorpay_payment_id: paymentId,
        status: 'active',
      };

      if (expiresAt) {
        updateData.expires_at = expiresAt.toISOString();
      }

      const { error: updateError } = await supabaseAdmin
        .from('subscriptions')
        .update(updateData)
        .eq('razorpay_order_id', orderId);

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        throw new Error('Failed to update subscription');
      }

      console.log('Subscription activated successfully:', orderId);

      // Track affiliate earnings - check if user was referred by a creator
      try {
        const { data: referral } = await supabaseAdmin
          .from('referrals')
          .select('id, creator_id')
          .eq('user_id', subscription.user_id)
          .single();

        if (referral) {
          const creatorShare = Math.floor(amount / 2); // 50% split
          await supabaseAdmin
            .from('creator_earnings')
            .insert({
              creator_id: referral.creator_id,
              subscription_id: subscription.id,
              referral_id: referral.id,
              subscription_amount: amount,
              creator_share: creatorShare,
            });
          console.log(`Creator earning recorded: creator=${referral.creator_id}, share=${creatorShare}`);
        }
      } catch (refErr) {
        console.error('Error tracking referral earnings (non-fatal):', refErr);
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Payment processed successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Acknowledge other events
    console.log('Webhook event acknowledged:', event);
    return new Response(
      JSON.stringify({ success: true, message: 'Event received' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing webhook:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
