CREATE TABLE public.pack_download_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  book_id uuid NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pack_download_log_user_time ON public.pack_download_log(user_id, created_at DESC);
GRANT SELECT ON public.pack_download_log TO authenticated;
GRANT ALL ON public.pack_download_log TO service_role;
ALTER TABLE public.pack_download_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read pack_download_log" ON public.pack_download_log FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE SCHEMA IF NOT EXISTS private;

-- Offline copies: purchasers, admin, active Creator Beta. Not subscribers (a copy would outlive the plan).
CREATE OR REPLACE FUNCTION private.can_install_book(_user_id uuid, _book_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT _user_id IS NOT NULL AND (
    EXISTS (SELECT 1 FROM public.purchases p WHERE p.user_id = _user_id AND p.book_id = _book_id AND p.status = 'paid')
    OR public.has_role(_user_id, 'admin'::app_role)
    OR (public.has_role(_user_id, 'creator_beta'::app_role) AND public.creator_beta_active())
  )
$$;

CREATE OR REPLACE FUNCTION private.book_pack_version(_book_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT md5(COALESCE((SELECT updated_at::text FROM public.books WHERE id = _book_id), '') || '|' ||
    COALESCE((SELECT string_agg(br.video_id || ':' || br.position || ':' || br.is_free_sample || ':' || COALESCE(v.updated_at::text,''), ',' ORDER BY br.position)
      FROM public.book_recipes br JOIN public.videos v ON v.video_id = br.video_id
      WHERE br.book_id = _book_id AND v.status = 'done' AND v.review_status = 'approved'), ''))
$$;

CREATE OR REPLACE FUNCTION public.book_pack_status(_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _bid uuid;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('owned', false, 'version', NULL); END IF;
  SELECT id INTO _bid FROM public.books WHERE slug = _slug;
  IF _bid IS NULL OR NOT private.can_install_book(_uid, _bid) THEN
    RETURN jsonb_build_object('owned', false, 'version', NULL);
  END IF;
  RETURN jsonb_build_object('owned', true, 'version', private.book_pack_version(_bid));
END $$;
REVOKE ALL ON FUNCTION public.book_pack_status(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.book_pack_status(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_book_offline_pack(_slug text)
RETURNS jsonb LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _uid uuid := auth.uid(); _book public.books%ROWTYPE; _cname text; _recipes jsonb; _recent int;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'login_required'); END IF;
  SELECT * INTO _book FROM public.books WHERE slug = _slug;
  IF _book.id IS NULL OR NOT private.can_install_book(_uid, _book.id) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_owned');
  END IF;
  SELECT count(*) INTO _recent FROM public.pack_download_log WHERE user_id = _uid AND created_at > now() - interval '1 hour';
  IF _recent >= 10 THEN RETURN jsonb_build_object('ok', false, 'reason', 'rate_limited'); END IF;
  INSERT INTO public.pack_download_log (user_id, book_id) VALUES (_uid, _book.id);
  SELECT name INTO _cname FROM public.creators WHERE id = _book.creator_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'video_id', br.video_id, 'position', br.position, 'is_free_sample', br.is_free_sample,
      'thumbnail_url', v.thumbnail_url, 'title', v.title, 'recipe', v.extracted_recipe_json
    ) ORDER BY br.position), '[]'::jsonb)
  INTO _recipes
  FROM public.book_recipes br JOIN public.videos v ON v.video_id = br.video_id
  WHERE br.book_id = _book.id AND v.status = 'done' AND v.review_status = 'approved';
  RETURN jsonb_build_object('ok', true, 'version', private.book_pack_version(_book.id), 'saved_at', now(),
    'book', jsonb_build_object('id', _book.id, 'slug', _book.slug, 'title_en', _book.title_en, 'title_mr', _book.title_mr,
      'cover_url', _book.cover_url, 'creator_name', _cname),
    'recipes', _recipes);
END $$;
REVOKE ALL ON FUNCTION public.get_book_offline_pack(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_book_offline_pack(text) TO authenticated;

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
    'can_install', private.can_install_book(_uid, _book.id),
    'book', jsonb_build_object('id', _book.id, 'slug', _book.slug, 'title_en', _book.title_en, 'title_mr', _book.title_mr,
      'cover_url', _book.cover_url, 'price_paise', _book.price_paise, 'list_price_paise', _book.list_price_paise,
      'status', _book.status, 'creator_name', _cname, 'has_payment_link', COALESCE(_book.payment_link_url,'') <> ''),
    'recipes', _recipes);
END $$;