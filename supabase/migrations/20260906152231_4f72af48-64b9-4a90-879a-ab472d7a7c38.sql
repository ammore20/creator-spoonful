CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT _user_id IS NOT NULL AND (
    public.has_role(_user_id, 'admin'::app_role)
    OR public.has_role(_user_id, 'creator_beta'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _user_id
        AND s.status IN ('active', 'completed')
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
  )
$function$;