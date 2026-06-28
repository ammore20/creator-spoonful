
-- 1. Column-level revoke of internal-only fields on videos from anon
REVOKE SELECT (raw_transcript, error_message, retry_count, manual_reviewed) ON public.videos FROM anon;

-- 2. Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 3. Idempotency: prevent duplicate Razorpay payments creating duplicate subscriptions
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_razorpay_payment_id_uniq
  ON public.subscriptions (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL
    AND razorpay_payment_id <> ''
    AND razorpay_payment_id NOT LIKE 'admin_grant%';

-- 4. Hot-path index for the home feed (videos by status + recency)
CREATE INDEX IF NOT EXISTS videos_status_published_at_idx
  ON public.videos (status, published_at DESC);
