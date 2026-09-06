import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Creator Beta status, read from the database role (never client storage).
 */
export function useCreatorBeta(): boolean {
  const user = useCurrentUser();
  const [isCreatorBeta, setIsCreatorBeta] = useState(false);

  useEffect(() => {
    let active = true;
    if (!user) {
      setIsCreatorBeta(false);
      return;
    }
    (supabase as any)
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'creator_beta')
      .maybeSingle()
      .then(({ data }: any) => {
        if (active) setIsCreatorBeta(!!data);
      });
    return () => {
      active = false;
    };
  }, [user?.id]);

  return isCreatorBeta;
}
