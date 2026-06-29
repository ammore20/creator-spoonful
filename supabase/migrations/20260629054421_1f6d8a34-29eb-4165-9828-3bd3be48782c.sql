
-- Switch view to security_invoker so RLS of base tables applies
ALTER VIEW public.public_videos SET (security_invoker = true);

-- Column-level grants: anon can ONLY read these safe columns of videos
GRANT SELECT (
  id, video_id, creator_id, title, description, thumbnail_url,
  published_at, duration, extracted_recipe_json, created_at, updated_at
) ON public.videos TO anon;

-- Authenticated non-admins also need the safe columns (admins already have full SELECT via RLS policy)
GRANT SELECT (
  id, video_id, creator_id, title, description, thumbnail_url,
  published_at, duration, extracted_recipe_json, created_at, updated_at
) ON public.videos TO authenticated;

-- RLS policy that lets anon read only published-and-valid rows
CREATE POLICY "Anon read published videos"
ON public.videos
FOR SELECT
TO anon
USING (
  status = 'done'
  AND NOT (extracted_recipe_json @> '{"no_recipe": true}'::jsonb)
);

-- Same for authenticated non-admins (admins already have a broader policy)
CREATE POLICY "Authenticated read published videos"
ON public.videos
FOR SELECT
TO authenticated
USING (
  status = 'done'
  AND NOT (extracted_recipe_json @> '{"no_recipe": true}'::jsonb)
);
