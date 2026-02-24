import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter (per-edge-instance)
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 20; // max 20 requests per window

type RateRecord = {
  timestamps: number[];
};

const rateLimitStore: Map<string, RateRecord> = (globalThis as any).rateLimitStore ??
  new Map<string, RateRecord>();
(globalThis as any).rateLimitStore = rateLimitStore;

function getClientKey(req: Request): string {
  const ip =
    req.headers.get("x-real-ip") ??
    req.headers.get("x-forwarded-for") ??
    "unknown";
  const userId = req.headers.get("x-client-info") ?? "";
  return `${ip}:${userId}`;
}

function isRateLimited(req: Request): boolean {
  const key = getClientKey(req);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  const record = rateLimitStore.get(key) ?? { timestamps: [] };
  // Remove timestamps outside the window
  record.timestamps = record.timestamps.filter((ts) => ts >= windowStart);

  if (record.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(key, record);
    return true;
  }

  record.timestamps.push(now);
  rateLimitStore.set(key, record);
  return false;
}

interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (isRateLimited(req)) {
    return new Response(
      JSON.stringify({ error: 'Too many requests, please try again later.' }),
      {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
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

    // Handle referral tracking
    if (action === 'track-referral') {
      const { creatorSlug } = body;
      if (!creatorSlug) {
        return new Response(JSON.stringify({ error: 'Missing creator slug' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { data: creator } = await adminClient
        .from('creators')
        .select('id')
        .eq('slug', creatorSlug)
        .single();

      if (!creator) {
        return new Response(JSON.stringify({ error: 'Creator not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // Upsert referral (ignore if already exists)
      await adminClient
        .from('referrals')
        .upsert({ creator_id: creator.id, user_id: user.id }, { onConflict: 'user_id' });

      // Check if this creator's first 50 referrals — grant free 1 month
      const { count: referralCount } = await adminClient
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', creator.id);

      let freeMonthGranted = false;
      if ((referralCount || 0) <= 50) {
        // Check if user already has an active subscription
        const { data: existingSub } = await adminClient
          .from('subscriptions')
          .select('id')
          .eq('user_id', user.id)
          .in('status', ['active', 'completed'])
          .limit(1);

        if (!existingSub || existingSub.length === 0) {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          
          await adminClient
            .from('subscriptions')
            .insert({
              user_id: user.id,
              amount: 0,
              status: 'active',
              currency: 'INR',
              expires_at: expiresAt.toISOString(),
              razorpay_order_id: `free_creator_${creatorSlug}`,
              razorpay_payment_id: `free_creator_${creatorSlug}`,
            });
          freeMonthGranted = true;
          console.log(`Free month granted to user ${user.id} via creator ${creatorSlug} (referral #${referralCount})`);
        }
      }

      return new Response(JSON.stringify({ success: true, freeMonthGranted }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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

      // Fetch the original subscription to get the amount from database
      const { data: subscription, error: fetchError } = await supabaseClient
        .from('subscriptions')
        .select('amount')
        .eq('razorpay_order_id', razorpay_order_id)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !subscription) {
        console.error('Failed to fetch subscription:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Subscription not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Determine expiry based on amount from database (not client)
      let expiresAt: Date | null = null;
      
      if (subscription.amount === 4900) {
        // Monthly plan - 1 month
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (subscription.amount === 49900 || subscription.amount === 29900) {
        // Yearly plan (regular or creator discount) - 1 year
        expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      console.log(`Payment verified for user ${user.id}, order ${razorpay_order_id}, amount ${subscription.amount}, expiry: ${expiresAt?.toISOString() || 'lifetime'}`);

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