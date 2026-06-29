import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Hard request body cap (defensive — Supabase already caps, but explicit is better)
const MAX_BODY_BYTES = 4 * 1024; // 4 KB

// Server-side plan whitelist. Any amount not in this set is rejected.
// 4900 = ₹49 monthly, 29900 = ₹299 yearly (referral), 49900 = ₹499 yearly
const ALLOWED_AMOUNTS = new Set<number>([4900, 29900, 49900]);

// Simple in-memory rate limiter (per-edge-instance)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 20;

type RateRecord = { timestamps: number[] };
const rateLimitStore: Map<string, RateRecord> =
  (globalThis as any).rateLimitStore ?? new Map<string, RateRecord>();
(globalThis as any).rateLimitStore = rateLimitStore;

function getClientKey(req: Request): string {
  const ip = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for") ?? "unknown";
  const userId = req.headers.get("x-client-info") ?? "";
  return `${ip}:${userId}`;
}

function isRateLimited(req: Request): boolean {
  const key = getClientKey(req);
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const record = rateLimitStore.get(key) ?? { timestamps: [] };
  record.timestamps = record.timestamps.filter((ts) => ts >= windowStart);
  if (record.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    rateLimitStore.set(key, record);
    return true;
  }
  record.timestamps.push(now);
  rateLimitStore.set(key, record);
  return false;
}

// ---- Zod schemas ----
const TrackReferralSchema = z.object({
  action: z.literal('track-referral'),
  creatorSlug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/i),
});

const CreateOrderSchema = z.object({
  action: z.literal('create-order'),
  amount: z.number().int().refine((n) => ALLOWED_AMOUNTS.has(n), {
    message: 'amount must be one of the allowed plan prices',
  }),
});

const VerifyPaymentSchema = z.object({
  action: z.literal('verify-payment'),
  razorpay_order_id: z.string().trim().min(1).max(100).regex(/^order_[A-Za-z0-9]+$/),
  razorpay_payment_id: z.string().trim().min(1).max(100).regex(/^pay_[A-Za-z0-9]+$/),
  razorpay_signature: z.string().trim().min(1).max(256).regex(/^[a-f0-9]+$/i),
});

const RequestSchema = z.discriminatedUnion('action', [
  TrackReferralSchema,
  CreateOrderSchema,
  VerifyPaymentSchema,
]);

interface RazorpayOrder { id: string; amount: number; currency: string; }

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  if (isRateLimited(req)) {
    return jsonResponse({ error: 'Too many requests, please try again later.' }, 429);
  }

  try {
    // Body size guard
    const rawText = await req.text();
    if (rawText.length > MAX_BODY_BYTES) {
      return jsonResponse({ error: 'Request body too large' }, 413);
    }
    let rawBody: unknown;
    try {
      rawBody = rawText ? JSON.parse(rawText) : {};
    } catch {
      return jsonResponse({ error: 'Malformed JSON' }, 400);
    }

    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return jsonResponse({ error: 'Unauthorized' }, 401);

    // Validate body
    const parsed = RequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      console.warn('checkout validation failed', {
        userId: user.id,
        issues: parsed.error.flatten(),
      });
      return jsonResponse(
        { error: 'Invalid request', details: parsed.error.flatten() },
        400,
      );
    }
    const body = parsed.data;

    // ---- track-referral ----
    if (body.action === 'track-referral') {
      const adminClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );

      const { data: creator } = await adminClient
        .from('creators').select('id').eq('slug', body.creatorSlug).single();

      if (!creator) return jsonResponse({ error: 'Creator not found' }, 404);

      await adminClient
        .from('referrals')
        .upsert({ creator_id: creator.id, user_id: user.id }, { onConflict: 'user_id' });

      const { count: referralCount } = await adminClient
        .from('referrals')
        .select('id', { count: 'exact', head: true })
        .eq('creator_id', creator.id);

      let freeMonthGranted = false;
      if ((referralCount || 0) <= 50) {
        const { data: existingSub } = await adminClient
          .from('subscriptions').select('id')
          .eq('user_id', user.id).in('status', ['active', 'completed']).limit(1);

        if (!existingSub || existingSub.length === 0) {
          const expiresAt = new Date();
          expiresAt.setMonth(expiresAt.getMonth() + 1);
          await adminClient.from('subscriptions').insert({
            user_id: user.id, amount: 0, status: 'active', currency: 'INR',
            expires_at: expiresAt.toISOString(),
            razorpay_order_id: `free_creator_${body.creatorSlug}`,
            razorpay_payment_id: `free_creator_${body.creatorSlug}`,
          });
          freeMonthGranted = true;
          console.log('free_month_granted', { userId: user.id, creatorSlug: body.creatorSlug });
        }
      }
      return jsonResponse({ success: true, freeMonthGranted });
    }

    // ---- create-order ----
    if (body.action === 'create-order') {
      const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!razorpayKeyId || !razorpayKeySecret) {
        throw new Error('Razorpay credentials not configured');
      }

      const amount = body.amount; // already whitelisted
      const currency = 'INR';

      const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${btoa(`${razorpayKeyId}:${razorpayKeySecret}`)}`,
        },
        body: JSON.stringify({ amount, currency, receipt: `receipt_${Date.now()}` }),
      });

      if (!orderResponse.ok) {
        console.error('razorpay_order_failed', { status: orderResponse.status });
        throw new Error('Failed to create Razorpay order');
      }

      const order: RazorpayOrder = await orderResponse.json();

      const { error: dbError } = await supabaseClient.from('subscriptions').insert({
        user_id: user.id,
        razorpay_order_id: order.id,
        amount, currency, status: 'pending',
      });
      if (dbError) {
        console.error('subscription_insert_failed', { userId: user.id, err: dbError.message });
        throw new Error('Failed to save order');
      }

      return jsonResponse({
        orderId: order.id, amount: order.amount,
        currency: order.currency, keyId: razorpayKeyId,
      });
    }

    // ---- verify-payment ----
    if (body.action === 'verify-payment') {
      const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!razorpayKeySecret) throw new Error('Razorpay secret not configured');

      const encoder = new TextEncoder();
      const data = encoder.encode(`${body.razorpay_order_id}|${body.razorpay_payment_id}`);
      const keyData = encoder.encode(razorpayKeySecret);
      const cryptoKey = await crypto.subtle.importKey(
        "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
      );
      const signature = await crypto.subtle.sign("HMAC", cryptoKey, data);
      const expectedSignature = Array.from(new Uint8Array(signature))
        .map((b) => b.toString(16).padStart(2, '0')).join('');

      if (expectedSignature !== body.razorpay_signature) {
        console.warn('payment_signature_mismatch', { userId: user.id, orderId: body.razorpay_order_id });
        return jsonResponse({ error: 'Invalid payment signature' }, 400);
      }

      const { data: subscription, error: fetchError } = await supabaseClient
        .from('subscriptions').select('amount')
        .eq('razorpay_order_id', body.razorpay_order_id).eq('user_id', user.id).single();

      if (fetchError || !subscription) {
        return jsonResponse({ error: 'Subscription not found' }, 404);
      }

      let expiresAt: Date | null = null;
      if (subscription.amount === 4900) {
        expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1);
      } else if (subscription.amount === 49900 || subscription.amount === 29900) {
        expiresAt = new Date(); expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      }

      const updateData: Record<string, unknown> = {
        razorpay_payment_id: body.razorpay_payment_id,
        razorpay_signature: body.razorpay_signature,
        status: 'active',
      };
      if (expiresAt) updateData.expires_at = expiresAt.toISOString();

      const { error: updateError } = await supabaseClient
        .from('subscriptions').update(updateData)
        .eq('razorpay_order_id', body.razorpay_order_id).eq('user_id', user.id);

      if (updateError) {
        console.error('subscription_update_failed', { userId: user.id, err: updateError.message });
        throw new Error('Failed to update subscription');
      }

      console.log('payment_verified', { userId: user.id, orderId: body.razorpay_order_id, amount: subscription.amount });
      return jsonResponse({ success: true, message: 'Payment verified successfully' });
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('checkout_error', { err: error instanceof Error ? error.message : String(error) });
    return jsonResponse(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      500,
    );
  }
});
