ALTER TABLE public.books ADD COLUMN IF NOT EXISTS promo_payment_link_url text;
ALTER TABLE public.books ALTER COLUMN list_price_paise DROP NOT NULL;

CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id),
  code text NOT NULL CHECK (code ~ '^[A-Za-z0-9]{4,20}$'),
  price_paise integer NOT NULL DEFAULT 29900 CHECK (price_paise > 0),
  active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  max_uses integer CHECK (max_uses IS NULL OR max_uses > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX promo_codes_code_ci ON public.promo_codes (lower(code));
GRANT SELECT, INSERT, UPDATE ON public.promo_codes TO authenticated;
GRANT ALL ON public.promo_codes TO service_role;
ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage promo codes" ON public.promo_codes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Linked creator reads own codes" ON public.promo_codes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.creators c WHERE c.id = creator_id AND c.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.validate_promo_code_row() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bp int;
BEGIN
  SELECT max(price_paise) INTO _bp FROM public.books WHERE creator_id = NEW.creator_id;
  IF _bp IS NOT NULL AND NEW.price_paise >= _bp THEN RAISE EXCEPTION 'code price must be lower than the book price'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER promo_codes_validate BEFORE INSERT OR UPDATE ON public.promo_codes FOR EACH ROW EXECUTE FUNCTION public.validate_promo_code_row();

CREATE TABLE public.promo_attempts (
  id bigserial PRIMARY KEY,
  key_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX promo_attempts_key_time ON public.promo_attempts (key_hash, created_at DESC);
GRANT ALL ON public.promo_attempts TO service_role;
ALTER TABLE public.promo_attempts ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.payu_orders ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id);
ALTER TABLE public.purchases ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id);
ALTER TABLE public.purchase_intents ADD COLUMN IF NOT EXISTS promo_code_id uuid REFERENCES public.promo_codes(id);

-- Code lookup for a book (no throttle; internal). Enforces creator, active, expiry, max uses.
CREATE OR REPLACE FUNCTION public.promo_for_book(_book_id uuid, _code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN pc.id IS NULL THEN jsonb_build_object('valid', false)
    ELSE jsonb_build_object('valid', true, 'id', pc.id, 'price_paise', pc.price_paise) END
  FROM (SELECT 1) one
  LEFT JOIN LATERAL (
    SELECT p.* FROM public.promo_codes p JOIN public.books b ON b.creator_id = p.creator_id
    WHERE b.id = _book_id AND lower(p.code) = lower(btrim(coalesce(_code,''))) AND p.active
      AND (p.expires_at IS NULL OR p.expires_at > now())
      AND p.price_paise < b.price_paise
      AND (p.max_uses IS NULL OR (SELECT count(*) FROM public.purchases x WHERE x.promo_code_id = p.id AND x.status = 'paid') < p.max_uses)
    LIMIT 1) pc ON true
$$;
REVOKE ALL ON FUNCTION public.promo_for_book(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.promo_for_book(uuid, text) TO service_role;

-- Throttle: 15 tries per client per 10 minutes.
CREATE OR REPLACE FUNCTION public.promo_throttle_ok()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _h jsonb; _k text;
BEGIN
  BEGIN _h := current_setting('request.headers', true)::jsonb; EXCEPTION WHEN others THEN _h := NULL; END;
  _k := md5(coalesce(auth.uid()::text, '') || '|' || coalesce(split_part(_h->>'x-forwarded-for', ',', 1), _h->>'cf-connecting-ip', 'none'));
  IF (SELECT count(*) FROM public.promo_attempts WHERE key_hash = _k AND created_at > now() - interval '10 minutes') >= 15 THEN RETURN false; END IF;
  INSERT INTO public.promo_attempts (key_hash) VALUES (_k);
  DELETE FROM public.promo_attempts WHERE created_at < now() - interval '1 day';
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.promo_throttle_ok() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_promo_code(_slug text, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b uuid; _r jsonb;
BEGIN
  IF NOT public.promo_throttle_ok() THEN RETURN jsonb_build_object('valid', false, 'reason', 'too_many_attempts'); END IF;
  SELECT id INTO _b FROM public.books WHERE slug = _slug AND status = 'published';
  IF _b IS NULL THEN RETURN jsonb_build_object('valid', false); END IF;
  _r := public.promo_for_book(_b, _code);
  RETURN jsonb_build_object('valid', (_r->>'valid')::boolean, 'price_paise', (_r->>'price_paise')::int);
END $$;
GRANT EXECUTE ON FUNCTION public.validate_promo_code(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.resolve_promo_code(_code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b public.books;
BEGIN
  IF NOT public.promo_throttle_ok() THEN RETURN jsonb_build_object('valid', false, 'reason', 'too_many_attempts'); END IF;
  SELECT b.* INTO _b FROM public.promo_codes p JOIN public.books b ON b.creator_id = p.creator_id AND b.status = 'published'
  WHERE lower(p.code) = lower(btrim(coalesce(_code,''))) LIMIT 1;
  IF _b.id IS NULL OR NOT (public.promo_for_book(_b.id, _code)->>'valid')::boolean THEN RETURN jsonb_build_object('valid', false); END IF;
  RETURN jsonb_build_object('valid', true, 'slug', _b.slug);
END $$;
GRANT EXECUTE ON FUNCTION public.resolve_promo_code(text) TO anon, authenticated;

-- record_book_purchase gains an optional promo code; money math unchanged.
DROP FUNCTION public.record_book_purchase(uuid, uuid, integer, text, text, uuid, uuid);
CREATE FUNCTION public.record_book_purchase(_user_id uuid, _book_id uuid, _amount_paise integer, _provider_ref text, _fulfilment text DEFAULT 'manual'::text, _intent_id uuid DEFAULT NULL::uuid, _granted_by uuid DEFAULT NULL::uuid, _promo_code_id uuid DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _book public.books%ROWTYPE;
  _existing public.purchases%ROWTYPE;
  _pct numeric := public.gateway_fee_percent();
  _tax int; _fee int; _net int; _share int;
  _pid uuid; _ref text := NULLIF(btrim(_provider_ref), '');
BEGIN
  IF _amount_paise IS NULL OR _amount_paise <= 0 THEN RAISE EXCEPTION 'invalid_amount'; END IF;
  SELECT * INTO _book FROM public.books WHERE id = _book_id;
  IF _book.id IS NULL THEN RAISE EXCEPTION 'book_not_found'; END IF;
  IF _ref IS NOT NULL THEN
    SELECT * INTO _existing FROM public.purchases WHERE provider_ref = _ref;
    IF _existing.id IS NOT NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'reference_already_used', 'purchase_id', _existing.id);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.purchases WHERE user_id = _user_id AND book_id = _book_id AND status = 'paid') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_owned');
  END IF;

  _tax := round(_amount_paise - _amount_paise / 1.18)::int;
  _fee := round(_amount_paise * _pct / 100)::int;
  _net := GREATEST(_amount_paise - _tax - _fee, 0);
  _share := floor(_net / 2.0)::int;

  INSERT INTO public.purchases (user_id, book_id, amount_paise, tax_paise, gateway_fee_paise, gateway_fee_percent,
    net_paise, provider_ref, fulfilment, intent_id, granted_by, promo_code_id)
  VALUES (_user_id, _book_id, _amount_paise, _tax, _fee, _pct, _net, _ref, _fulfilment, _intent_id, _granted_by, _promo_code_id)
  RETURNING id INTO _pid;

  INSERT INTO public.book_earnings (purchase_id, creator_id, book_id, share_paise, payable_at)
  VALUES (_pid, _book.creator_id, _book_id, _share, now() + interval '7 days');

  IF _intent_id IS NOT NULL THEN
    UPDATE public.purchase_intents SET status = 'granted' WHERE id = _intent_id;
  ELSE
    UPDATE public.purchase_intents SET status = 'granted' WHERE user_id = _user_id AND book_id = _book_id AND status = 'pending';
  END IF;

  RETURN jsonb_build_object('ok', true, 'purchase_id', _pid, 'tax_paise', _tax, 'fee_paise', _fee, 'net_paise', _net, 'creator_share_paise', _share);
END $function$;
REVOKE ALL ON FUNCTION public.record_book_purchase(uuid, uuid, integer, text, text, uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_book_purchase(uuid, uuid, integer, text, text, uuid, uuid, uuid) TO service_role;

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
    _r := public.record_book_purchase(_o.user_id, _o.book_id, _o.amount_paise, 'payu:' || btrim(_mihpayid), 'automatic', NULL, NULL, _o.promo_code_id);
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

DROP FUNCTION public.create_purchase_intent(uuid);
CREATE FUNCTION public.create_purchase_intent(_book_id uuid, _code text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _book public.books%ROWTYPE; _iid uuid; _p jsonb; _pc uuid; _link text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'login_required'); END IF;
  SELECT * INTO _book FROM public.books WHERE id = _book_id AND status = 'published';
  IF _book.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_available'); END IF;
  IF nullif(btrim(coalesce(_code,'')),'') IS NOT NULL THEN
    _p := public.promo_for_book(_book_id, _code);
    IF NOT (_p->>'valid')::boolean THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
    _pc := (_p->>'id')::uuid; _link := _book.promo_payment_link_url;
  ELSE
    _link := _book.payment_link_url;
  END IF;
  IF coalesce(_link,'') = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_payment_link'); END IF;
  IF EXISTS (SELECT 1 FROM public.purchases WHERE user_id = _uid AND book_id = _book_id AND status = 'paid') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_owned');
  END IF;
  SELECT id INTO _iid FROM public.purchase_intents WHERE user_id = _uid AND book_id = _book_id AND status = 'pending' ORDER BY created_at DESC LIMIT 1;
  IF _iid IS NULL THEN
    INSERT INTO public.purchase_intents (user_id, book_id, promo_code_id) VALUES (_uid, _book_id, _pc) RETURNING id INTO _iid;
  ELSE
    UPDATE public.purchase_intents SET updated_at = now(), promo_code_id = _pc WHERE id = _iid;
  END IF;
  RETURN jsonb_build_object('ok', true, 'intent_id', _iid, 'payment_link_url', _link);
END $function$;
REVOKE ALL ON FUNCTION public.create_purchase_intent(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_purchase_intent(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_grant_intent(_intent_id uuid, _provider_ref text, _amount_paise integer)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _i public.purchase_intents%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NULLIF(btrim(_provider_ref), '') IS NULL THEN RAISE EXCEPTION 'reference_required'; END IF;
  SELECT * INTO _i FROM public.purchase_intents WHERE id = _intent_id FOR UPDATE;
  IF _i.id IS NULL OR _i.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'reason', 'intent_not_pending'); END IF;
  RETURN public.record_book_purchase(_i.user_id, _i.book_id, _amount_paise, _provider_ref, 'manual', _i.id, auth.uid(), _i.promo_code_id);
END $function$;

DROP FUNCTION public.admin_grant_book_to_email(text, uuid, text, integer);
CREATE FUNCTION public.admin_grant_book_to_email(_email text, _book_id uuid, _provider_ref text, _amount_paise integer, _code text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid; _pc uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NULLIF(btrim(_provider_ref), '') IS NULL THEN RAISE EXCEPTION 'reference_required'; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(btrim(_email)) LIMIT 1;
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_account_for_email'); END IF;
  IF nullif(btrim(coalesce(_code,'')),'') IS NOT NULL THEN
    SELECT p.id INTO _pc FROM public.promo_codes p JOIN public.books b ON b.creator_id = p.creator_id
      WHERE b.id = _book_id AND lower(p.code) = lower(btrim(_code));
    IF _pc IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
  END IF;
  RETURN public.record_book_purchase(_uid, _book_id, _amount_paise, _provider_ref, 'manual', NULL, auth.uid(), _pc);
END $function$;
REVOKE ALL ON FUNCTION public.admin_grant_book_to_email(text, uuid, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_grant_book_to_email(text, uuid, text, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_book(_slug text)
 RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _book public.books%ROWTYPE; _cname text; _owned boolean; _recipes jsonb;
BEGIN
  SELECT * INTO _book FROM public.books WHERE slug = _slug;
  IF _book.id IS NULL OR (_book.status <> 'published' AND NOT public.has_role(_uid, 'admin'::app_role)) THEN
    RETURN jsonb_build_object('found', false);
  END IF;
  SELECT name INTO _cname FROM public.creators WHERE id = _book.creator_id;
  _owned := public.has_book_access(_uid, _book.id);
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'video_id', br.video_id, 'position', br.position, 'is_free_sample', br.is_free_sample,
      'thumbnail_url', v.thumbnail_url, 'preview', public.recipe_preview_json(v.extracted_recipe_json)
    ) ORDER BY br.position), '[]'::jsonb)
  INTO _recipes
  FROM public.book_recipes br JOIN public.videos v ON v.video_id = br.video_id
  WHERE br.book_id = _book.id;
  RETURN jsonb_build_object('found', true, 'owned', _owned, 'signed_in', _uid IS NOT NULL,
    'can_install', private.can_install_book(_uid, _book.id),
    'payu_enabled', public.payu_checkout_enabled(),
    'book', jsonb_build_object('id', _book.id, 'slug', _book.slug, 'title_en', _book.title_en, 'title_mr', _book.title_mr,
      'cover_url', _book.cover_url, 'price_paise', _book.price_paise, 'list_price_paise', _book.list_price_paise,
      'status', _book.status, 'creator_name', _cname, 'has_payment_link', COALESCE(_book.payment_link_url,'') <> '',
      'has_promo_link', COALESCE(_book.promo_payment_link_url,'') <> ''),
    'recipes', _recipes);
END $function$;

CREATE OR REPLACE FUNCTION public.admin_list_promo_codes()
RETURNS TABLE(id uuid, creator_id uuid, creator_name text, code text, price_paise integer, active boolean, expires_at timestamptz, max_uses integer, uses bigint, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.id, p.creator_id, c.name, p.code, p.price_paise, p.active, p.expires_at, p.max_uses,
    (SELECT count(*) FROM public.purchases x WHERE x.promo_code_id = p.id AND x.status = 'paid'), p.created_at
  FROM public.promo_codes p JOIN public.creators c ON c.id = p.creator_id ORDER BY p.created_at DESC;
END $$;
REVOKE ALL ON FUNCTION public.admin_list_promo_codes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_promo_codes() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_creator_dashboard()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _c public.creators; _r jsonb;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('linked', false); END IF;
  SELECT * INTO _c FROM public.creators WHERE user_id = auth.uid();
  IF NOT FOUND THEN RETURN jsonb_build_object('linked', false); END IF;
  SELECT jsonb_build_object(
    'linked', true, 'creator_id', _c.id, 'creator_name', _c.name,
    'book_slug', (SELECT slug FROM public.books WHERE creator_id = _c.id LIMIT 1),
    'visits', (SELECT count(*) FROM public.link_visits WHERE creator_id = _c.id),
    'books_sold', (SELECT count(*) FROM public.book_earnings WHERE creator_id = _c.id AND status <> 'reversed'),
    'sales_with_code', (SELECT count(*) FROM public.purchases p JOIN public.books b ON b.id = p.book_id WHERE b.creator_id = _c.id AND p.status = 'paid' AND p.promo_code_id IS NOT NULL),
    'sales_without_code', (SELECT count(*) FROM public.purchases p JOIN public.books b ON b.id = p.book_id WHERE b.creator_id = _c.id AND p.status = 'paid' AND p.promo_code_id IS NULL),
    'codes', coalesce((SELECT jsonb_agg(jsonb_build_object('code', code, 'price_paise', price_paise, 'active', active, 'expires_at', expires_at) ORDER BY created_at DESC)
       FROM public.promo_codes WHERE creator_id = _c.id), '[]'::jsonb),
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