import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

/**
 * Shared auth-user hook.
 *
 * Deduplicates `supabase.auth.getSession()` calls: the initial fetch runs
 * once for the whole app and every subscriber reuses the cached user.
 * Auth-state changes broadcast to all subscribers.
 *
 * Use this in components that only need the current user (e.g. recipe
 * cards). For premium/admin gating, keep using `usePremiumStatus`.
 */

let cachedUser: User | null = null;
let initialized = false;
let inflight: Promise<User | null> | null = null;
const listeners = new Set<(user: User | null) => void>();

function setUser(user: User | null) {
  cachedUser = user;
  initialized = true;
  listeners.forEach((fn) => fn(user));
}

function ensureInitialized() {
  if (initialized || inflight) return;
  inflight = supabase.auth.getSession().then(({ data }) => {
    setUser(data.session?.user ?? null);
    return cachedUser;
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });
}

export function useCurrentUser(): User | null {
  const [user, setLocalUser] = useState<User | null>(cachedUser);

  useEffect(() => {
    ensureInitialized();
    listeners.add(setLocalUser);
    if (initialized) {
      setLocalUser(cachedUser);
    } else if (inflight) {
      inflight.then((u) => setLocalUser(u));
    }
    return () => {
      listeners.delete(setLocalUser);
    };
  }, []);

  return user;
}
