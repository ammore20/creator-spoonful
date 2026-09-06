-- 1. Daily unlock table
CREATE TABLE public.daily_recipe_unlocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  video_id text NOT NULL,
  unlock_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Kolkata')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT daily_recipe_unlocks_one_per_day UNIQUE (user_id, unlock_date)
);

GRANT SELECT ON public.daily_recipe_unlocks TO authenticated;
GRANT ALL ON public.daily_recipe_unlocks TO service_role;

ALTER TABLE public.daily_recipe_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own unlocks"
  ON public.daily_recipe_unlocks FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_daily_recipe_unlocks_updated_at
  BEFORE UPDATE ON public.daily_recipe_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Premium check (server side)
CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user_id
        AND s.status IN ('active', 'completed')
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
  )
$$;

-- 3. Sanitized preview projection
CREATE OR REPLACE FUNCTION public.recipe_preview_json(_j jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'title', _j->'title',
    'title_mr', _j->'title_mr',
    'description_mr', _j->'description_mr',
    'meal_type', _j->'meal_type',
    'cuisine', _j->'cuisine',
    'difficulty', _j->'difficulty',
    'prep_time', _j->'prep_time',
    'servings', _j->'servings',
    'taste_tags', _j->'taste_tags',
    'diet', _j->'diet',
    'ingredient_count', to_jsonb(COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(_j->'ingredients') = 'array' THEN _j->'ingredients' END), 0)),
    'step_count', to_jsonb(COALESCE(jsonb_array_length(CASE WHEN jsonb_typeof(_j->'steps') = 'array' THEN _j->'steps' END), 0))
  ))
$$;

-- 4. Preview-only public view (security definer: bypasses videos RLS, exposes safe columns only)
DROP VIEW IF EXISTS public.public_videos;

CREATE VIEW public.public_videos
WITH (security_invoker = false) AS
SELECT
  v.id,
  v.video_id,
  v.creator_id,
  v.title,
  v.description,
  v.thumbnail_url,
  v.published_at,
  v.duration,
  v.created_at,
  v.updated_at,
  c.name AS creator_name,
  c.slug AS creator_slug,
  public.recipe_preview_json(COALESCE(v.extracted_recipe_json, '{}'::jsonb)) AS recipe_preview
FROM public.videos v
LEFT JOIN public.creators c ON c.id = v.creator_id
WHERE v.status = 'done'
  AND NOT (COALESCE(v.extracted_recipe_json, '{}'::jsonb) @> '{"no_recipe": true}'::jsonb);

GRANT SELECT ON public.public_videos TO anon, authenticated;

-- 5. Lock down direct reads of the videos table (admins keep access)
DROP POLICY IF EXISTS "Anon read published videos" ON public.videos;
DROP POLICY IF EXISTS "Authenticated read published videos" ON public.videos;
REVOKE SELECT ON public.videos FROM anon;

-- 6. Entitled content read (does NOT consume the daily free unlock)
CREATE OR REPLACE FUNCTION public.get_recipe_content(_video_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  _json jsonb;
  _used record;
BEGIN
  SELECT extracted_recipe_json INTO _json
  FROM public.videos
  WHERE video_id = _video_id
    AND status = 'done'
    AND NOT (COALESCE(extracted_recipe_json, '{}'::jsonb) @> '{"no_recipe": true}'::jsonb);

  IF _json IS NULL THEN
    RETURN jsonb_build_object('access', 'not_found');
  END IF;

  IF _uid IS NULL THEN
    RETURN jsonb_build_object('access', 'login_required');
  END IF;

  IF public.is_premium(_uid) THEN
    RETURN jsonb_build_object('access', 'granted', 'reason', 'premium', 'recipe', _json);
  END IF;

  SELECT * INTO _used FROM public.daily_recipe_unlocks
  WHERE user_id = _uid AND unlock_date = _today;

  IF _used.id IS NULL THEN
    RETURN jsonb_build_object('access', 'free_available');
  ELSIF _used.video_id = _video_id THEN
    RETURN jsonb_build_object('access', 'granted', 'reason', 'daily_free', 'recipe', _json);
  ELSE
    RETURN jsonb_build_object('access', 'locked', 'used_video_id', _used.video_id);
  END IF;
END;
$$;

-- 7. Atomic consumption of the one daily free unlock
CREATE OR REPLACE FUNCTION public.unlock_daily_recipe(_video_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  _json jsonb;
  _used record;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('access', 'login_required');
  END IF;

  SELECT extracted_recipe_json INTO _json
  FROM public.videos
  WHERE video_id = _video_id
    AND status = 'done'
    AND NOT (COALESCE(extracted_recipe_json, '{}'::jsonb) @> '{"no_recipe": true}'::jsonb);

  IF _json IS NULL THEN
    RETURN jsonb_build_object('access', 'not_found');
  END IF;

  IF public.is_premium(_uid) THEN
    RETURN jsonb_build_object('access', 'granted', 'reason', 'premium', 'recipe', _json);
  END IF;

  INSERT INTO public.daily_recipe_unlocks (user_id, video_id, unlock_date)
  VALUES (_uid, _video_id, _today)
  ON CONFLICT (user_id, unlock_date) DO NOTHING;

  SELECT * INTO _used FROM public.daily_recipe_unlocks
  WHERE user_id = _uid AND unlock_date = _today;

  IF _used.video_id = _video_id THEN
    RETURN jsonb_build_object('access', 'granted', 'reason', 'daily_free', 'recipe', _json);
  END IF;

  RETURN jsonb_build_object('access', 'locked', 'used_video_id', _used.video_id);
END;
$$;

REVOKE ALL ON FUNCTION public.get_recipe_content(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.unlock_daily_recipe(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recipe_content(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.unlock_daily_recipe(text) TO authenticated, service_role;