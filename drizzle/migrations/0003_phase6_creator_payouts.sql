ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS user_id uuid UNIQUE;

CREATE TABLE public.creator_payout_details (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE REFERENCES public.creators(id),
  upi_id text NOT NULL CHECK (upi_id ~ '^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,64}$'),
  account_holder_name text NOT NULL CHECK (length(btrim(account_holder_name)) BETWEEN 2 AND 120),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.creator_payout_details TO authenticated;
GRANT ALL ON public.creator_payout_details TO service_role;
ALTER TABLE public.creator_payout_details ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Linked creator or admin reads payout details" ON public.creator_payout_details FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Linked creator or admin inserts payout details" ON public.creator_payout_details FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE POLICY "Linked creator or admin updates payout details" ON public.creator_payout_details FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));
CREATE TRIGGER creator_payout_details_updated BEFORE UPDATE ON public.creator_payout_details
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id),
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  reference text NOT NULL UNIQUE,
  override_reason text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  paid_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payouts TO authenticated;
GRANT ALL ON public.payouts TO service_role;
ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read payouts" ON public.payouts FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.book_earnings ADD COLUMN IF NOT EXISTS payout_id uuid REFERENCES public.payouts(id);

CREATE OR REPLACE FUNCTION public.my_creator_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.creators; _r jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('linked', false); END IF;
  SELECT * INTO _c FROM public.creators WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('linked', false); END IF;
  SELECT jsonb_build_object(
    'linked', true, 'creator_id', _c.id, 'creator_name', _c.name,
    'visits', (SELECT count(*) FROM public.link_visits WHERE creator_id = _c.id),
    'books_sold', (SELECT count(*) FROM public.book_earnings WHERE creator_id = _c.id AND status <> 'reversed'),
    'payable_paise', (SELECT coalesce(sum(share_paise),0) FROM public.book_earnings WHERE creator_id = _c.id AND status IN ('held','payable') AND payable_at <= now()),
    'hold_paise', (SELECT coalesce(sum(share_paise),0) FROM public.book_earnings WHERE creator_id = _c.id AND status IN ('held','payable') AND payable_at > now()),
    'paid_paise', (SELECT coalesce(sum(share_paise),0) FROM public.book_earnings WHERE creator_id = _c.id AND status = 'paid'),
    'sales', coalesce((SELECT jsonb_agg(s ORDER BY s.date DESC) FROM (
       SELECT p.paid_at AS date, p.amount_paise AS sale_paise, e.share_paise,
         CASE WHEN e.status = 'reversed' THEN 'reversed' WHEN e.status = 'paid' THEN 'paid'
              WHEN e.payable_at <= now() THEN 'payable' ELSE 'held' END AS status
       FROM public.book_earnings e JOIN public.purchases p ON p.id = e.purchase_id
       WHERE e.creator_id = _c.id ORDER BY p.paid_at DESC LIMIT 50) s), '[]'::jsonb),
    'payouts', coalesce((SELECT jsonb_agg(jsonb_build_object('paid_at', paid_at, 'amount_paise', amount_paise, 'reference', reference) ORDER BY paid_at DESC)
       FROM public.payouts WHERE creator_id = _c.id), '[]'::jsonb)
  ) INTO _r;
  RETURN _r;
END $$;
REVOKE ALL ON FUNCTION public.my_creator_dashboard() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_creator_dashboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_link_creator(_creator_id uuid, _email text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _email IS NULL OR btrim(_email) = '' THEN
    UPDATE public.creators SET user_id = NULL WHERE id = _creator_id;
    RETURN jsonb_build_object('ok', true, 'unlinked', true);
  END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(btrim(_email)) LIMIT 1;
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_account_for_email'); END IF;
  IF EXISTS (SELECT 1 FROM public.creators WHERE user_id = _uid AND id <> _creator_id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'account_linked_elsewhere'); END IF;
  UPDATE public.creators SET user_id = _uid WHERE id = _creator_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_creator'); END IF;
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.admin_link_creator(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_link_creator(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_payout_summary()
RETURNS TABLE(creator_id uuid, creator_name text, linked_email text, payable_paise bigint, payable_count bigint, hold_paise bigint, upi_id text, account_holder_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT c.id, c.name, u.email::text,
    coalesce(sum(e.share_paise) FILTER (WHERE e.status IN ('held','payable') AND e.payable_at <= now()),0)::bigint,
    count(e.id) FILTER (WHERE e.status IN ('held','payable') AND e.payable_at <= now()),
    coalesce(sum(e.share_paise) FILTER (WHERE e.status IN ('held','payable') AND e.payable_at > now()),0)::bigint,
    d.upi_id, d.account_holder_name
  FROM public.creators c
  LEFT JOIN auth.users u ON u.id = c.user_id
  LEFT JOIN public.creator_payout_details d ON d.creator_id = c.id
  LEFT JOIN public.book_earnings e ON e.creator_id = c.id
  GROUP BY c.id, c.name, u.email, d.upi_id, d.account_holder_name
  ORDER BY c.name;
END $$;
REVOKE ALL ON FUNCTION public.admin_payout_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_payout_summary() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_payouts()
RETURNS TABLE(id uuid, creator_name text, amount_paise integer, reference text, override_reason text, paid_at timestamptz, earnings_count bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.id, c.name, p.amount_paise, p.reference, p.override_reason, p.paid_at,
    (SELECT count(*) FROM public.book_earnings e WHERE e.payout_id = p.id)
  FROM public.payouts p JOIN public.creators c ON c.id = p.creator_id ORDER BY p.paid_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_payouts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_payouts() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_payout(_creator_id uuid, _reference text, _amount_paise integer, _override_reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ids uuid[]; _total bigint; _pid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _reference IS NULL OR btrim(_reference) = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'reference_required'); END IF;
  IF EXISTS (SELECT 1 FROM public.payouts WHERE reference = btrim(_reference)) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'reference_already_used'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.creator_payout_details WHERE creator_id = _creator_id)
     AND coalesce(btrim(_override_reason),'') = '' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'payout_details_missing'); END IF;
  -- lock exactly the payable earnings
  SELECT array_agg(id), coalesce(sum(share_paise),0) INTO _ids, _total FROM (
    SELECT id, share_paise FROM public.book_earnings
    WHERE creator_id = _creator_id AND status IN ('held','payable') AND payable_at <= now()
    FOR UPDATE) x;
  IF _total = 0 THEN RETURN jsonb_build_object('ok', false, 'reason', 'nothing_payable'); END IF;
  IF _amount_paise <> _total THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'amount_mismatch', 'payable_paise', _total); END IF;
  INSERT INTO public.payouts (creator_id, amount_paise, reference, override_reason, paid_by)
  VALUES (_creator_id, _amount_paise, btrim(_reference), nullif(btrim(_override_reason),''), auth.uid())
  RETURNING id INTO _pid;
  UPDATE public.book_earnings SET status = 'paid', paid_out_at = now(), payout_id = _pid WHERE id = ANY(_ids);
  RETURN jsonb_build_object('ok', true, 'payout_id', _pid, 'earnings', array_length(_ids,1));
END $$;
REVOKE ALL ON FUNCTION public.admin_mark_payout(uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_payout(uuid, text, integer, text) TO authenticated;