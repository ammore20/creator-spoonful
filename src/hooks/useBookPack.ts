import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  OfflinePack, deletePack, downloadPack, getPack, offlineOwnerId, packStatus, requestPersistence, wasInstalled,
} from '@/lib/offlineBooks';

export function useOnline() {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}

const checkedThisSession = new Set<string>();

/**
 * Local offline pack for one book plus the online ownership/version check.
 * - Revoked or refunded: deletes the local copy.
 * - New version: re-downloads quietly.
 * - Pack cleared by the browser: restores it ("Restoring your book").
 */
export function useBookPack(slug: string) {
  const user = useCurrentUser();
  const online = useOnline();
  const ownerId = user?.id ?? offlineOwnerId();
  const [pack, setPack] = useState<OfflinePack | null | undefined>(undefined); // undefined = still loading
  const [busy, setBusy] = useState<null | 'installing' | 'restoring' | 'updating'>(null);

  useEffect(() => {
    let alive = true;
    if (!ownerId) { setPack(null); return; }
    getPack(ownerId, slug).then((p) => alive && setPack(p ?? null));
    return () => { alive = false; };
  }, [ownerId, slug]);

  useEffect(() => {
    if (!user || !online || pack === undefined) return;
    const key = `${user.id}:${slug}`;
    if (checkedThisSession.has(key)) return;
    checkedThisSession.add(key);
    (async () => {
      const st = await packStatus(slug);
      if (!st) { checkedThisSession.delete(key); return; }
      if (!st.owned) {
        if (pack || wasInstalled(user.id, slug)) {
          await deletePack(user.id, slug);
          setPack(null);
          if (pack) toast('The offline copy of this book was removed from this phone.');
        }
        return;
      }
      const restore = !pack && wasInstalled(user.id, slug);
      if (restore || (pack && pack.version !== st.version)) {
        setBusy(restore ? 'restoring' : 'updating');
        const r = await downloadPack(user.id, slug);
        setBusy(null);
        if (r.ok) setPack(r.pack);
      }
    })();
  }, [user, online, slug, pack]);

  const install = useCallback(async () => {
    if (!user) return { ok: false as const, reason: 'login_required' };
    setBusy('installing');
    const r = await downloadPack(user.id, slug);
    setBusy(null);
    if (r.ok) {
      setPack(r.pack);
      await requestPersistence();
    }
    return r;
  }, [user, slug]);

  return { pack, busy, install, online, ownerId, signedIn: !!user };
}
