/**
 * The only place the service worker is registered.
 * Refuses (and removes any old app worker) in dev, Lovable preview, iframes, or with ?sw=off.
 */
import { toast } from 'sonner';

const SW_PATH = '/sw.js';

function refused(): boolean {
  if (!import.meta.env.PROD) return true;
  try {
    if (window.self !== window.top) return true;
  } catch {
    return true;
  }
  const h = window.location.hostname;
  if (h.startsWith('id-preview--') || h.startsWith('preview--')) return true;
  if (h === 'lovableproject.com' || h.endsWith('.lovableproject.com')) return true;
  if (h === 'lovableproject-dev.com' || h.endsWith('.lovableproject-dev.com')) return true;
  if (h === 'beta.lovable.dev' || h.endsWith('.beta.lovable.dev')) return true;
  if (new URLSearchParams(window.location.search).has('sw') &&
      new URLSearchParams(window.location.search).get('sw') === 'off') return true;
  return false;
}

async function unregisterAppWorkers() {
  if (!('serviceWorker' in navigator)) return;
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    regs
      .filter((r) => [r.active, r.waiting, r.installing].some((w) => w?.scriptURL.endsWith(SW_PATH)))
      .map((r) => r.unregister()),
  );
}

export async function initPwa() {
  if (!('serviceWorker' in navigator)) return;
  if (refused()) {
    await unregisterAppWorkers().catch(() => {});
    return;
  }
  const { registerSW } = await import('virtual:pwa-register');
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      toast('Update ready', {
        description: 'A new version of RecipeMaker is available.',
        duration: Infinity,
        action: { label: 'Refresh', onClick: () => updateSW(true) },
      });
    },
  });
}
