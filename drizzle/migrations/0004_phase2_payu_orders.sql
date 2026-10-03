CREATE TABLE public.payu_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  txnid text NOT NULL UNIQUE CHECK (txnid ~ '^[A-Za-z0-9]{8,25}$'),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id),
  amount_paise integer NOT NULL CHECK (amount_paise > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','failed')),
  mihpayid text UNIQUE,
  purchase_id uuid REFERENCES public.purchases(id),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payu_orders_user_created ON public.payu_orders (user_id, created_at DESC);
GRANT SELECT ON public.payu_orders TO authenticated;
GRANT ALL ON public.payu_orders TO service_role;
ALTER TABLE public.payu_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Buyers read own PayU orders" ON public.payu_orders FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins read PayU orders" ON public.payu_orders FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER payu_orders_updated BEFORE UPDATE ON public.payu_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.app_settings (key, value) VALUES ('payu_checkout_enabled', 'false') ON CONFLICT (key) DO NOTHING;

-- Single idempotent settle step (service role only). Money math stays in record_book_purchase.
CREATE OR REPLACE FUNCTION public.settle_payu_order(_txnid text, _verified_status text, _amount_paise integer, _mihpayid text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _o public.payu_orders; _r jsonb;
BEGIN
  SELECT * INTO _o FROM public.payu_orders WHERE txnid = _txnid FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'unknown_txnid'); END IF;
  IF _o.status <> 'pending' THEN RETURN jsonb_build_object('ok', true, 'status', _o.status, 'unchanged', true, 'book_id', _o.book_id); END IF;
  IF _verified_status = 'success' THEN
    IF _amount_paise IS DISTINCT FROM _o.amount_paise THEN
      UPDATE public.payu_orders SET note = 'amount_mismatch' WHERE id = _o.id;
      RETURN jsonb_build_object('ok', false, 'reason', 'amount_mismatch', 'book_id', _o.book_id);
    END IF;
    IF coalesce(btrim(_mihpayid),'') = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'missing_payment_id'); END IF;
    _r := public.record_book_purchase(_o.user_id, _o.book_id, _o.amount_paise, 'payu:' || btrim(_mihpayid), 'automatic', NULL, NULL);
    UPDATE public.payu_orders SET status = 'paid', mihpayid = btrim(_mihpayid),
      purchase_id = (_r->>'purchase_id')::uuid,
      note = CASE WHEN (_r->>'ok')::boolean THEN NULL ELSE _r->>'reason' END
    WHERE id = _o.id;
    RETURN jsonb_build_object('ok', true, 'status', 'paid', 'book_id', _o.book_id, 'grant', _r);
  ELSIF _verified_status IN ('failure','failed','cancelled','dropped','bounced','usercancelled') THEN
    UPDATE public.payu_orders SET status = 'failed', mihpayid = nullif(btrim(_mihpayid),''), note = _verified_status WHERE id = _o.id;
    RETURN jsonb_build_object('ok', true, 'status', 'failed', 'book_id', _o.book_id);
  END IF;
  RETURN jsonb_build_object('ok', true, 'status', 'pending', 'book_id', _o.book_id);
END $$;
REVOKE ALL ON FUNCTION public.settle_payu_order(text, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_payu_order(text, text, integer, text) TO service_role;

CREATE OR REPLACE FUNCTION public.payu_checkout_enabled()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT value FROM public.app_settings WHERE key = 'payu_checkout_enabled') = 'true', false)
$$;
GRANT EXECUTE ON FUNCTION public.payu_checkout_enabled() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.admin_set_payu_enabled(_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.app_settings (key, value, updated_at) VALUES ('payu_checkout_enabled', CASE WHEN _enabled THEN 'true' ELSE 'false' END, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  RETURN jsonb_build_object('ok', true);
END $$;
REVOKE ALL ON FUNCTION public.admin_set_payu_enabled(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_payu_enabled(boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_list_payu_orders()
RETURNS TABLE(txnid text, email text, book_title text, amount_paise integer, status text, mihpayid text, note text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT o.txnid, u.email::text, b.title_en, o.amount_paise, o.status, o.mihpayid, o.note, o.created_at
  FROM public.payu_orders o JOIN public.books b ON b.id = o.book_id LEFT JOIN auth.users u ON u.id = o.user_id
  ORDER BY o.created_at DESC LIMIT 200;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_payu_orders() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_payu_orders() TO authenticated;