-- PHASE 0: subscriptions writes are server-only
DROP POLICY IF EXISTS "Users can create own subscriptions" ON public.subscriptions;
REVOKE INSERT, UPDATE, DELETE ON public.subscriptions FROM anon, authenticated;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

-- one earnings row per subscription
CREATE UNIQUE INDEX IF NOT EXISTS creator_earnings_subscription_uniq ON public.creator_earnings (subscription_id);

-- Shared idempotent activation + earnings (called by verify-payment and webhook)
CREATE OR REPLACE FUNCTION public.activate_subscription(_order_id text, _payment_id text, _signature text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _sub public.subscriptions%ROWTYPE;
  _ref record;
  _net numeric;
  _share integer;
  _expires timestamptz;
  _activated boolean := false;
BEGIN
  SELECT * INTO _sub FROM public.subscriptions WHERE razorpay_order_id = _order_id FOR UPDATE;
  IF _sub.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF _sub.status NOT IN ('active', 'completed') THEN
    IF _sub.amount = 4900 THEN _expires := now() + interval '1 month';
    ELSIF _sub.amount IN (49900, 29900) THEN _expires := now() + interval '1 year';
    ELSE _expires := _sub.expires_at;
    END IF;
    UPDATE public.subscriptions
      SET status = 'active',
          razorpay_payment_id = _payment_id,
          razorpay_signature = COALESCE(_signature, razorpay_signature),
          expires_at = _expires
      WHERE id = _sub.id;
    _activated := true;
  END IF;

  -- Earnings: 50% of amount after GST (18% inclusive) and gateway fee (2% + 18% GST = 2.36% of gross)
  IF _sub.amount > 0 THEN
    SELECT id, creator_id INTO _ref FROM public.referrals WHERE user_id = _sub.user_id LIMIT 1;
    IF _ref.id IS NOT NULL THEN
      _net := (_sub.amount / 1.18) - (_sub.amount * 0.0236);
      _share := GREATEST(floor(_net / 2), 0)::int;
      INSERT INTO public.creator_earnings (creator_id, subscription_id, referral_id, subscription_amount, creator_share)
      VALUES (_ref.creator_id, _sub.id, _ref.id, _sub.amount, _share)
      ON CONFLICT (subscription_id) DO NOTHING;
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'activated', _activated, 'user_id', _sub.user_id, 'amount', _sub.amount);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.activate_subscription(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.activate_subscription(text, text, text) TO service_role;

-- App settings (Creator Beta expiry etc.), admin-readable, server-writable
CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can read app_settings" ON public.app_settings FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.creator_beta_active()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COALESCE((SELECT value::timestamptz > now() FROM public.app_settings
                   WHERE key = 'creator_beta_expires_at' AND value IS NOT NULL AND value <> ''), true)
$$;

CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::app_role)
    OR (public.has_role(_user_id, 'creator_beta'::app_role) AND public.creator_beta_active())
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user_id
        AND s.status IN ('active', 'completed')
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
  )
$$;

-- PHASE 1: review workflow columns
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS review_status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS legacy_approved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS confidence numeric,
  ADD COLUMN IF NOT EXISTS transcript_source text,
  ADD COLUMN IF NOT EXISTS duration_seconds integer,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid;
ALTER TABLE public.videos DROP CONSTRAINT IF EXISTS videos_review_status_check;
ALTER TABLE public.videos ADD CONSTRAINT videos_review_status_check CHECK (review_status IN ('draft','approved','rejected'));

-- Backfill: everything currently live stays live as legacy-approved
UPDATE public.videos SET review_status = 'approved', legacy_approved = true WHERE status = 'done';

CREATE INDEX IF NOT EXISTS videos_review_status_idx ON public.videos (review_status, status);

ALTER TABLE public.cost_tracking
  ADD COLUMN IF NOT EXISTS input_tokens integer,
  ADD COLUMN IF NOT EXISTS output_tokens integer,
  ADD COLUMN IF NOT EXISTS audio_minutes numeric,
  ADD COLUMN IF NOT EXISTS provider text;

-- Only approved recipes are public
CREATE OR REPLACE VIEW public.public_videos AS
SELECT v.id, v.video_id, v.creator_id, v.title, v.description, v.thumbnail_url, v.published_at,
       v.duration, v.created_at, v.updated_at, c.name AS creator_name, c.slug AS creator_slug,
       recipe_preview_json(COALESCE(v.extracted_recipe_json, '{}'::jsonb)) AS recipe_preview
FROM videos v
LEFT JOIN creators c ON c.id = v.creator_id
WHERE v.status = 'done' AND v.review_status = 'approved'
  AND NOT COALESCE(v.extracted_recipe_json, '{}'::jsonb) @> '{"no_recipe": true}'::jsonb;

CREATE OR REPLACE FUNCTION public.get_recipe_content(_video_id text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  _json jsonb;
  _used record;
BEGIN
  SELECT extracted_recipe_json INTO _json FROM public.videos
  WHERE video_id = _video_id AND status = 'done' AND review_status = 'approved'
    AND NOT (COALESCE(extracted_recipe_json, '{}'::jsonb) @> '{"no_recipe": true}'::jsonb);
  IF _json IS NULL THEN RETURN jsonb_build_object('access', 'not_found'); END IF;
  IF _uid IS NULL THEN RETURN jsonb_build_object('access', 'login_required'); END IF;
  IF public.is_premium(_uid) THEN
    RETURN jsonb_build_object('access', 'granted', 'reason', 'premium', 'recipe', _json);
  END IF;
  SELECT * INTO _used FROM public.daily_recipe_unlocks WHERE user_id = _uid AND unlock_date = _today;
  IF _used.id IS NULL THEN RETURN jsonb_build_object('access', 'free_available');
  ELSIF _used.video_id = _video_id THEN
    RETURN jsonb_build_object('access', 'granted', 'reason', 'daily_free', 'recipe', _json);
  ELSE RETURN jsonb_build_object('access', 'locked', 'used_video_id', _used.video_id);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.unlock_daily_recipe(_video_id text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  _json jsonb;
  _used record;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('access', 'login_required'); END IF;
  SELECT extracted_recipe_json INTO _json FROM public.videos
  WHERE video_id = _video_id AND status = 'done' AND review_status = 'approved'
    AND NOT (COALESCE(extracted_recipe_json, '{}'::jsonb) @> '{"no_recipe": true}'::jsonb);
  IF _json IS NULL THEN RETURN jsonb_build_object('access', 'not_found'); END IF;
  IF public.is_premium(_uid) THEN
    RETURN jsonb_build_object('access', 'granted', 'reason', 'premium', 'recipe', _json);
  END IF;
  INSERT INTO public.daily_recipe_unlocks (user_id, video_id, unlock_date)
  VALUES (_uid, _video_id, _today) ON CONFLICT (user_id, unlock_date) DO NOTHING;
  SELECT * INTO _used FROM public.daily_recipe_unlocks WHERE user_id = _uid AND unlock_date = _today;
  IF _used.video_id = _video_id THEN
    RETURN jsonb_build_object('access', 'granted', 'reason', 'daily_free', 'recipe', _json);
  END IF;
  RETURN jsonb_build_object('access', 'locked', 'used_video_id', _used.video_id);
END;
$function$;

-- Cron auth key, kept private
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
CREATE TABLE IF NOT EXISTS private.internal_keys (name text PRIMARY KEY, value text NOT NULL);
REVOKE ALL ON private.internal_keys FROM anon, authenticated;
INSERT INTO private.internal_keys (name, value)
  VALUES ('cron', encode(gen_random_bytes(32), 'hex')) ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.check_internal_key(_name text, _value text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public', 'private'
AS $$ SELECT EXISTS (SELECT 1 FROM private.internal_keys WHERE name = _name AND value = _value) $$;
REVOKE EXECUTE ON FUNCTION public.check_internal_key(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_internal_key(text, text) TO service_role;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;