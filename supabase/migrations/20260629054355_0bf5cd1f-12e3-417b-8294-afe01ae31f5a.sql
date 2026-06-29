
-- 1. Drop the over-permissive public read policy
DROP POLICY IF EXISTS "Public read access for videos" ON public.videos;

-- 2. Restrict base table to admins only (read). Writes already go through service role / edge functions.
CREATE POLICY "Admins can read videos"
ON public.videos
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Revoke any direct grants on the base table for anon; keep authenticated read (RLS still gates it to admins)
REVOKE SELECT ON public.videos FROM anon;
GRANT SELECT ON public.videos TO authenticated;
GRANT ALL ON public.videos TO service_role;

-- 4. Safe public-facing view (no internal columns)
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
  v.extracted_recipe_json,
  v.created_at,
  v.updated_at,
  c.name  AS creator_name,
  c.slug  AS creator_slug
FROM public.videos v
LEFT JOIN public.creators c ON c.id = v.creator_id
WHERE v.status = 'done'
  AND NOT (v.extracted_recipe_json @> '{"no_recipe": true}'::jsonb);

GRANT SELECT ON public.public_videos TO anon, authenticated;
