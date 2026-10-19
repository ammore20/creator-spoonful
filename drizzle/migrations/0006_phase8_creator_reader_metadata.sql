ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS bio_en text, ADD COLUMN IF NOT EXISTS bio_mr text, ADD COLUMN IF NOT EXISTS photo_url text;
CREATE OR REPLACE FUNCTION public.admin_set_creator_profile(_creator_id uuid, _bio_en text, _bio_mr text, _photo_url text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
 IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Admin required'; END IF;
 IF _photo_url IS NOT NULL AND _photo_url !~ '^https://' THEN RAISE EXCEPTION 'Photo must use https'; END IF;
 UPDATE public.creators SET bio_en = nullif(trim(_bio_en), ''), bio_mr = nullif(trim(_bio_mr), ''), photo_url = nullif(trim(_photo_url), '') WHERE id = _creator_id;
 IF NOT FOUND THEN RAISE EXCEPTION 'Creator not found'; END IF;
 UPDATE public.books SET updated_at = now() WHERE creator_id = _creator_id;
END $$;
REVOKE ALL ON FUNCTION public.admin_set_creator_profile(uuid,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_creator_profile(uuid,text,text,text) TO authenticated, service_role;
DO $$
DECLARE fn text; name text;
BEGIN
 FOREACH name IN ARRAY ARRAY['get_book','get_book_offline_pack'] LOOP
  fn := pg_get_functiondef(('public.' || name || '(text)')::regprocedure);
  IF position('''creator_name'', _cname' in fn) = 0 THEN RAISE EXCEPTION 'Unexpected book response shape'; END IF;
  fn := replace(fn, '''creator_name'', _cname', '''creator_name'', _cname, ''creator'', (SELECT jsonb_build_object(''name'', c.name, ''channel_id'', c.channel_id, ''bio_en'', c.bio_en, ''bio_mr'', c.bio_mr, ''photo_url'', c.photo_url) FROM public.creators c WHERE c.id = _book.creator_id)');
  EXECUTE fn;
 END LOOP;
END $$;