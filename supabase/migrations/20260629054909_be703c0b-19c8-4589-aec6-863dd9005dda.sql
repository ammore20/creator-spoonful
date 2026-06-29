
-- Recreate view without the status filter (RLS on videos already enforces it for anon/authenticated)
DROP VIEW IF EXISTS public.public_videos;
CREATE VIEW public.public_videos
WITH (security_invoker = true) AS
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
LEFT JOIN public.creators c ON c.id = v.creator_id;

GRANT SELECT ON public.public_videos TO anon, authenticated;

-- Creators table needs SELECT grants for the view's join to resolve under anon/authenticated
GRANT SELECT ON public.creators TO anon, authenticated;
GRANT ALL ON public.creators TO service_role;
