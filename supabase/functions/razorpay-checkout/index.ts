import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, ...body } = await req.json();

    // Create Razorpay order
    if (action === 'create-order') {
      const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

      if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error('Razorpay credentials not configured');
      }

      const amount = body.amount || 49900; // Amount in paise from request, default to ₹499
      const currency = 'INR';

      // Create order in Razorpay
      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        },
        body: JSON.stringify({
          amount,
          currency,
          receipt: `receipt_${Date.now()}`,
        }),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error('Razorpay order creation failed:', errorText);
        throw new Error('Failed to create Razorpay order');
      }

      const order: RazorpayOrder = await orderResponse.json();

      // Save order to database
      const { error: dbError } = await supabaseClient
        .from('subscriptions')
        .insert({
          user_id: user.id,
          razorpay_order_id: order.id,
          amount: amount,
          currency: currency,
          status: 'pending',
        });

      if (dbError) {
        console.error('Database error:', dbError);
        throw new Error('Failed to save order');
      }

      return new Response(
        JSON.stringify({ 
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          keyId: razorpayKeyId,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify payment
    if (action === 'verify-payment') {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!razorpayKeySecret) {
        throw new Error('Razorpay secret not configured');
      }

      // Verify signature using Web Crypto API
      const encoder = new TextEncoder();
      const data = encoder.encode(`${razorpay_order_id}|${razorpay_payment_id}`);
      const keyData = encoder.encode(razorpayKeySecret);
      
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
      const expectedSignature = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      if (expectedSignature !== razorpay_signature) {
        console.error('Payment signature verification failed');
        return new Response(
          JSON.stringify({ error: 'Invalid payment signature' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update subscription with payment details and set expiry based on amount
      let expiresAt: Date | null = null;
      
      // Determine expiry based on amount
      if (body.amount === 9900) {
        // Monthly plan - 1 month
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (body.amount === 49900) {
        // Yearly plan - 1 year
        expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }
      // For lifetime (99900), expiresAt remains null

      const updateData: any = {
        razorpay_payment_id,
        razorpay_signature,
        status: 'active',
      };

      if (expiresAt) {
        updateData.expires_at = expiresAt.toISOString();
      }

      const { error: updateError } = await supabaseClient
        .from('subscriptions')
        .update(updateData)
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update subscription:', updateError);
        throw new Error('Failed to update subscription');
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Payment verified successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in razorpay-checkout:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});