-- ===== BOOKS =====
CREATE TABLE public.books (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL UNIQUE REFERENCES public.creators(id),
  slug text NOT NULL UNIQUE,
  title_en text NOT NULL,
  title_mr text,
  cover_url text,
  price_paise integer NOT NULL DEFAULT 29900 CHECK (price_paise > 0),
  list_price_paise integer NOT NULL DEFAULT 49900 CHECK (list_price_paise > 0),
  payment_link_url text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.books TO anon;
GRANT SELECT, INSERT, UPDATE ON public.books TO authenticated;
GRANT ALL ON public.books TO service_role;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published books are public" ON public.books FOR SELECT TO anon, authenticated USING (status = 'published');
CREATE POLICY "Admins read books" ON public.books FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update books" ON public.books FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_books_updated_at BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== BOOK RECIPES =====
CREATE TABLE public.book_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  video_id text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  is_free_sample boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, video_id)
);
CREATE INDEX book_recipes_book_pos ON public.book_recipes(book_id, position);
GRANT SELECT ON public.book_recipes TO authenticated;
GRANT ALL ON public.book_recipes TO service_role;
ALTER TABLE public.book_recipes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read book_recipes" ON public.book_recipes FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.validate_book_recipe()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _creator uuid;
BEGIN
  SELECT creator_id INTO _creator FROM public.books WHERE id = NEW.book_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.videos v
    WHERE v.video_id = NEW.video_id AND v.creator_id = _creator
      AND v.status = 'done' AND v.review_status = 'approved'
      AND NOT (COALESCE(v.extracted_recipe_json, '{}'::jsonb) @> '{"no_recipe": true}'::jsonb)
  ) THEN
    RAISE EXCEPTION 'recipe_not_approved_or_wrong_creator: %', NEW.video_id;
  END IF;
  IF (SELECT count(*) FROM public.book_recipes WHERE book_id = NEW.book_id AND id <> NEW.id) >= 100 THEN
    RAISE EXCEPTION 'book_full: max 100 recipes';
  END IF;
  IF NEW.is_free_sample AND (SELECT count(*) FROM public.book_recipes WHERE book_id = NEW.book_id AND is_free_sample AND id <> NEW.id) >= 3 THEN
    RAISE EXCEPTION 'too_many_samples: max 3 free samples';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_book_recipe BEFORE INSERT OR UPDATE ON public.book_recipes FOR EACH ROW EXECUTE FUNCTION public.validate_book_recipe();

-- ===== PURCHASE INTENTS =====
CREATE TABLE public.purchase_intents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','granted','dismissed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX purchase_intents_status ON public.purchase_intents(status, created_at DESC);
GRANT SELECT ON public.purchase_intents TO authenticated;
GRANT ALL ON public.purchase_intents TO service_role;
ALTER TABLE public.purchase_intents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own intents" ON public.purchase_intents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read intents" ON public.purchase_intents FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_purchase_intents_updated_at BEFORE UPDATE ON public.purchase_intents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== PURCHASES =====
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','refunded')),
  amount_paise integer NOT NULL CHECK (amount_paise >= 0),
  tax_paise integer NOT NULL DEFAULT 0,
  gateway_fee_paise integer NOT NULL DEFAULT 0,
  gateway_fee_percent numeric NOT NULL DEFAULT 0,
  net_paise integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  provider text NOT NULL DEFAULT 'payu',
  provider_ref text UNIQUE,
  fulfilment text NOT NULL DEFAULT 'manual' CHECK (fulfilment IN ('manual','automatic')),
  intent_id uuid REFERENCES public.purchase_intents(id),
  granted_by uuid,
  paid_at timestamptz NOT NULL DEFAULT now(),
  refunded_at timestamptz,
  refund_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX purchases_one_paid_per_book ON public.purchases(user_id, book_id) WHERE status = 'paid';
GRANT SELECT ON public.purchases TO authenticated;
GRANT ALL ON public.purchases TO service_role;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own purchases" ON public.purchases FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins read purchases" ON public.purchases FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_purchases_updated_at BEFORE UPDATE ON public.purchases FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== BOOK EARNINGS =====
CREATE TABLE public.book_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id uuid NOT NULL UNIQUE REFERENCES public.purchases(id),
  creator_id uuid NOT NULL REFERENCES public.creators(id),
  book_id uuid NOT NULL REFERENCES public.books(id),
  share_paise integer NOT NULL,
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','payable','paid','reversed')),
  payable_at timestamptz NOT NULL,
  paid_out_at timestamptz,
  reversed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.book_earnings TO authenticated;
GRANT ALL ON public.book_earnings TO service_role;
ALTER TABLE public.book_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read book_earnings" ON public.book_earnings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== LINK VISITS =====
CREATE TABLE public.link_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creators(id),
  day date NOT NULL DEFAULT ((now() AT TIME ZONE 'Asia/Kolkata')::date),
  visitor_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (book_id, day, visitor_hash)
);
GRANT SELECT ON public.link_visits TO authenticated;
GRANT ALL ON public.link_visits TO service_role;
ALTER TABLE public.link_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read link_visits" ON public.link_visits FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

-- ===== HELPERS =====
CREATE OR REPLACE FUNCTION public.gateway_fee_percent()
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE((SELECT NULLIF(value,'')::numeric FROM public.app_settings WHERE key = 'gateway_fee_percent'), 2.36)
$$;

CREATE OR REPLACE FUNCTION public.has_book_access(_user_id uuid, _book_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND (
    public.is_premium(_user_id)
    OR EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = _user_id AND p.book_id = _book_id AND p.status = 'paid')
  )
$$;

-- Single fulfilment step used by manual grants now and automatic PayU confirmation later.
CREATE OR REPLACE FUNCTION public.record_book_purchase(
  _user_id uuid, _book_id uuid, _amount_paise integer, _provider_ref text,
  _fulfilment text DEFAULT 'manual', _intent_id uuid DEFAULT NULL, _granted_by uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
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
    net_paise, provider_ref, fulfilment, intent_id, granted_by)
  VALUES (_user_id, _book_id, _amount_paise, _tax, _fee, _pct, _net, _ref, _fulfilment, _intent_id, _granted_by)
  RETURNING id INTO _pid;

  INSERT INTO public.book_earnings (purchase_id, creator_id, book_id, share_paise, payable_at)
  VALUES (_pid, _book.creator_id, _book_id, _share, now() + interval '7 days');

  IF _intent_id IS NOT NULL THEN
    UPDATE public.purchase_intents SET status = 'granted' WHERE id = _intent_id;
  ELSE
    UPDATE public.purchase_intents SET status = 'granted' WHERE user_id = _user_id AND book_id = _book_id AND status = 'pending';
  END IF;

  RETURN jsonb_build_object('ok', true, 'purchase_id', _pid, 'tax_paise', _tax, 'fee_paise', _fee, 'net_paise', _net, 'creator_share_paise', _share);
END $$;
REVOKE ALL ON FUNCTION public.record_book_purchase(uuid, uuid, integer, text, text, uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_book_purchase(uuid, uuid, integer, text, text, uuid, uuid) TO service_role;

-- ===== BUYER RPCs =====
CREATE OR REPLACE FUNCTION public.create_purchase_intent(_book_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _book public.books%ROWTYPE; _iid uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'login_required'); END IF;
  SELECT * INTO _book FROM public.books WHERE id = _book_id AND status = 'published';
  IF _book.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_available'); END IF;
  IF _book.payment_link_url IS NULL OR _book.payment_link_url = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_payment_link'); END IF;
  IF EXISTS (SELECT 1 FROM public.purchases WHERE user_id = _uid AND book_id = _book_id AND status = 'paid') THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_owned');
  END IF;
  SELECT id INTO _iid FROM public.purchase_intents WHERE user_id = _uid AND book_id = _book_id AND status = 'pending' ORDER BY created_at DESC LIMIT 1;
  IF _iid IS NULL THEN
    INSERT INTO public.purchase_intents (user_id, book_id) VALUES (_uid, _book_id) RETURNING id INTO _iid;
  ELSE
    UPDATE public.purchase_intents SET updated_at = now() WHERE id = _iid;
  END IF;
  RETURN jsonb_build_object('ok', true, 'intent_id', _iid, 'payment_link_url', _book.payment_link_url);
END $$;

CREATE OR REPLACE FUNCTION public.log_book_visit(_slug text, _visitor text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _book public.books%ROWTYPE; _day date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
BEGIN
  IF _visitor IS NULL OR length(_visitor) < 8 OR length(_visitor) > 100 THEN RETURN; END IF;
  SELECT * INTO _book FROM public.books WHERE slug = _slug;
  IF _book.id IS NULL THEN RETURN; END IF;
  INSERT INTO public.link_visits (book_id, creator_id, day, visitor_hash)
  VALUES (_book.id, _book.creator_id, _day, encode(sha256(convert_to(_visitor || ':' || _book.id::text || ':' || _day::text, 'UTF8')), 'hex'))
  ON CONFLICT DO NOTHING;
END $$;

CREATE OR REPLACE FUNCTION public.get_published_books()
RETURNS TABLE (id uuid, slug text, title_en text, title_mr text, cover_url text, price_paise int, list_price_paise int, creator_name text, recipe_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT b.id, b.slug, b.title_en, b.title_mr, b.cover_url, b.price_paise, b.list_price_paise, c.name,
         (SELECT count(*) FROM public.book_recipes br WHERE br.book_id = b.id)
  FROM public.books b JOIN public.creators c ON c.id = b.creator_id
  WHERE b.status = 'published' ORDER BY b.created_at
$$;

-- Book page / library: previews only, never full recipe content.
CREATE OR REPLACE FUNCTION public.get_book(_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
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
    'book', jsonb_build_object('id', _book.id, 'slug', _book.slug, 'title_en', _book.title_en, 'title_mr', _book.title_mr,
      'cover_url', _book.cover_url, 'price_paise', _book.price_paise, 'list_price_paise', _book.list_price_paise,
      'status', _book.status, 'creator_name', _cname, 'has_payment_link', COALESCE(_book.payment_link_url,'') <> ''),
    'recipes', _recipes);
END $$;

CREATE OR REPLACE FUNCTION public.get_book_recipe(_slug text, _video_id text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _book public.books%ROWTYPE; _br public.book_recipes%ROWTYPE; _v public.videos%ROWTYPE;
BEGIN
  SELECT * INTO _book FROM public.books WHERE slug = _slug;
  IF _book.id IS NULL OR (_book.status <> 'published' AND NOT public.has_role(_uid, 'admin'::app_role)) THEN
    RETURN jsonb_build_object('access', 'not_found');
  END IF;
  SELECT * INTO _br FROM public.book_recipes WHERE book_id = _book.id AND video_id = _video_id;
  IF _br.id IS NULL THEN RETURN jsonb_build_object('access', 'not_found'); END IF;
  SELECT * INTO _v FROM public.videos WHERE video_id = _video_id AND status = 'done' AND review_status = 'approved';
  IF _v.id IS NULL THEN RETURN jsonb_build_object('access', 'not_found'); END IF;
  IF _br.is_free_sample OR public.has_book_access(_uid, _book.id) THEN
    RETURN jsonb_build_object('access', 'granted', 'reason', CASE WHEN _br.is_free_sample THEN 'free_sample' ELSE 'owner' END,
      'recipe', _v.extracted_recipe_json, 'thumbnail_url', _v.thumbnail_url, 'title', _v.title);
  END IF;
  RETURN jsonb_build_object('access', CASE WHEN _uid IS NULL THEN 'login_required' ELSE 'locked' END,
    'preview', public.recipe_preview_json(_v.extracted_recipe_json), 'title', _v.title);
END $$;

CREATE OR REPLACE FUNCTION public.my_books()
RETURNS TABLE (id uuid, slug text, title_en text, title_mr text, cover_url text, creator_name text, recipe_count bigint, access_source text, purchased_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT b.id, b.slug, b.title_en, b.title_mr, b.cover_url, c.name,
         (SELECT count(*) FROM public.book_recipes br WHERE br.book_id = b.id),
         CASE WHEN p.id IS NOT NULL THEN 'purchase' ELSE 'subscription' END, p.paid_at
  FROM public.books b JOIN public.creators c ON c.id = b.creator_id
  LEFT JOIN public.purchases p ON p.book_id = b.id AND p.user_id = auth.uid() AND p.status = 'paid'
  WHERE auth.uid() IS NOT NULL AND b.status = 'published'
    AND (p.id IS NOT NULL OR public.is_premium(auth.uid()))
  ORDER BY p.paid_at DESC NULLS LAST, b.created_at
$$;

-- ===== ADMIN RPCs =====
CREATE OR REPLACE FUNCTION public.admin_set_book_recipes(_book_id uuid, _items jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _n int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF jsonb_typeof(_items) <> 'array' THEN RAISE EXCEPTION 'items_must_be_array'; END IF;
  IF jsonb_array_length(_items) > 100 THEN RAISE EXCEPTION 'book_full: max 100 recipes'; END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(_items) e WHERE (e->>'is_free_sample')::boolean) > 3 THEN
    RAISE EXCEPTION 'too_many_samples: max 3 free samples';
  END IF;
  DELETE FROM public.book_recipes WHERE book_id = _book_id;
  INSERT INTO public.book_recipes (book_id, video_id, position, is_free_sample)
  SELECT _book_id, e->>'video_id', (ord - 1)::int, COALESCE((e->>'is_free_sample')::boolean, false)
  FROM jsonb_array_elements(_items) WITH ORDINALITY AS t(e, ord);
  SELECT count(*) INTO _n FROM public.book_recipes WHERE book_id = _book_id;
  RETURN jsonb_build_object('ok', true, 'count', _n);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_gateway_fee(_percent numeric)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _percent IS NULL OR _percent < 0 OR _percent > 20 THEN RAISE EXCEPTION 'invalid_percent'; END IF;
  INSERT INTO public.app_settings (key, value, updated_at) VALUES ('gateway_fee_percent', _percent::text, now())
  ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
  RETURN jsonb_build_object('ok', true, 'percent', _percent);
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_purchase_intents()
RETURNS TABLE (id uuid, user_id uuid, email text, book_id uuid, book_title text, status text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT i.id, i.user_id, u.email::text, i.book_id, b.title_en, i.status, i.created_at
  FROM public.purchase_intents i JOIN public.books b ON b.id = i.book_id LEFT JOIN auth.users u ON u.id = i.user_id
  WHERE i.status = 'pending' ORDER BY i.created_at DESC LIMIT 200;
END $$;

CREATE OR REPLACE FUNCTION public.admin_list_purchases()
RETURNS TABLE (id uuid, email text, book_title text, status text, amount_paise int, tax_paise int, gateway_fee_paise int,
  net_paise int, provider_ref text, fulfilment text, paid_at timestamptz, refunded_at timestamptz,
  share_paise int, earning_status text, payable_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT p.id, u.email::text, b.title_en, p.status, p.amount_paise, p.tax_paise, p.gateway_fee_paise,
    p.net_paise, p.provider_ref, p.fulfilment, p.paid_at, p.refunded_at, e.share_paise,
    CASE WHEN e.status = 'held' AND e.payable_at <= now() THEN 'payable' ELSE e.status END, e.payable_at
  FROM public.purchases p JOIN public.books b ON b.id = p.book_id
  LEFT JOIN auth.users u ON u.id = p.user_id LEFT JOIN public.book_earnings e ON e.purchase_id = p.id
  ORDER BY p.paid_at DESC LIMIT 500;
END $$;

CREATE OR REPLACE FUNCTION public.admin_grant_intent(_intent_id uuid, _provider_ref text, _amount_paise integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _i public.purchase_intents%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NULLIF(btrim(_provider_ref), '') IS NULL THEN RAISE EXCEPTION 'reference_required'; END IF;
  SELECT * INTO _i FROM public.purchase_intents WHERE id = _intent_id FOR UPDATE;
  IF _i.id IS NULL OR _i.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'reason', 'intent_not_pending'); END IF;
  RETURN public.record_book_purchase(_i.user_id, _i.book_id, _amount_paise, _provider_ref, 'manual', _i.id, auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.admin_grant_book_to_email(_email text, _book_id uuid, _provider_ref text, _amount_paise integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NULLIF(btrim(_provider_ref), '') IS NULL THEN RAISE EXCEPTION 'reference_required'; END IF;
  SELECT id INTO _uid FROM auth.users WHERE lower(email) = lower(btrim(_email)) LIMIT 1;
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_account_for_email'); END IF;
  RETURN public.record_book_purchase(_uid, _book_id, _amount_paise, _provider_ref, 'manual', NULL, auth.uid());
END $$;

CREATE OR REPLACE FUNCTION public.admin_dismiss_intent(_intent_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.purchase_intents SET status = 'dismissed' WHERE id = _intent_id AND status = 'pending';
  RETURN jsonb_build_object('ok', true);
END $$;

CREATE OR REPLACE FUNCTION public.refund_book_purchase(_purchase_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _p public.purchases%ROWTYPE; _reversed int;
BEGIN
  SELECT * INTO _p FROM public.purchases WHERE id = _purchase_id FOR UPDATE;
  IF _p.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'not_found'); END IF;
  IF _p.status = 'refunded' THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  UPDATE public.purchases SET status = 'refunded', refunded_at = now(), refund_reason = _reason WHERE id = _p.id;
  UPDATE public.book_earnings SET status = 'reversed', reversed_at = now()
    WHERE purchase_id = _p.id AND status IN ('held','payable');
  GET DIAGNOSTICS _reversed = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'earnings_reversed', _reversed > 0);
END $$;
REVOKE ALL ON FUNCTION public.refund_book_purchase(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_book_purchase(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.admin_refund_purchase(_purchase_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN public.refund_book_purchase(_purchase_id, _reason);
END $$;

REVOKE ALL ON FUNCTION public.validate_book_recipe() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.admin_set_book_recipes(uuid, jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_set_gateway_fee(numeric) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_purchase_intents() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_list_purchases() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_intent(uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_grant_book_to_email(text, uuid, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_dismiss_intent(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_refund_purchase(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_purchase_intent(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_books() FROM PUBLIC, anon;