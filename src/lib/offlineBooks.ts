/**
 * Offline book packs, stored in IndexedDB per user id + book slug.
 * Recipe content never goes into the service worker cache.
 */
import { supabase } from '@/integrations/supabase/client';
import type { BookResponse } from '@/lib/books';

export interface PackRecipe {
  video_id: string;
  position: number;
  is_free_sample: boolean;
  thumbnail_url: string | null;
  title: string;
  recipe: any;
}

export interface OfflinePack {
  key: string;
  userId: string;
  slug: string;
  version: string;
  savedAt: string;
  book: { id: string; slug: string; title_en: string; title_mr: string | null; cover_url: string | null; creator_name: string };
  recipes: PackRecipe[];
}

const DB = 'recipemaker-offline';
const STORE = 'packs';

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' }).createIndex('userId', 'userId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => { resolve(r.result); db.close(); };
    t.onerror = () => { reject(t.error); db.close(); };
  });
}

const keyOf = (userId: string, slug: string) => `${userId}:${slug}`;

export const getPack = (userId: string, slug: string) =>
  tx<OfflinePack | undefined>('readonly', (s) => s.get(keyOf(userId, slug))).catch(() => undefined);

export const listPacks = (userId: string) =>
  tx<OfflinePack[]>('readonly', (s) => s.index('userId').getAll(userId)).catch(() => [] as OfflinePack[]);

export async function deletePack(userId: string, slug: string) {
  await tx('readwrite', (s) => s.delete(keyOf(userId, slug))).catch(() => {});
  localStorage.removeItem(markerKey(userId, slug));
}

/** Remembers that this user installed this book, so a browser-cleared pack is restored automatically. */
const markerKey = (userId: string, slug: string) => `rm_installed:${userId}:${slug}`;
export const wasInstalled = (userId: string, slug: string) => !!localStorage.getItem(markerKey(userId, slug));

export type DownloadResult = { ok: true; pack: OfflinePack } | { ok: false; reason: string };

export async function downloadPack(userId: string, slug: string): Promise<DownloadResult> {
  const { data, error } = await (supabase as any).rpc('get_book_offline_pack', { _slug: slug });
  if (error) return { ok: false, reason: 'network' };
  if (!data?.ok) return { ok: false, reason: data?.reason ?? 'unknown' };
  const pack: OfflinePack = {
    key: keyOf(userId, slug), userId, slug, version: data.version, savedAt: data.saved_at,
    book: data.book, recipes: data.recipes ?? [],
  };
  await tx('readwrite', (s) => s.put(pack));
  localStorage.setItem(markerKey(userId, slug), '1');
  // Warm the image cache so covers and thumbnails show offline.
  [pack.book.cover_url, ...pack.recipes.map((r) => r.thumbnail_url)].filter(Boolean).forEach((u) => {
    const img = new Image();
    img.src = u as string;
  });
  return { ok: true, pack };
}

export async function requestPersistence() {
  try {
    if (navigator.storage?.persist && !(await navigator.storage.persisted())) await navigator.storage.persist();
  } catch { /* ignore */ }
}

export async function packStatus(slug: string): Promise<{ owned: boolean; version: string | null } | null> {
  const { data, error } = await (supabase as any).rpc('book_pack_status', { _slug: slug });
  if (error || !data) return null; // network or server problem: keep the local copy
  return data;
}

/** Turns a local pack into the same shape the online reader uses. */
export function packToBookResponse(p: OfflinePack): BookResponse {
  return {
    found: true, owned: true, signed_in: true,
    book: { ...p.book, price_paise: 0, list_price_paise: 0, status: 'published', has_payment_link: false },
    recipes: p.recipes.map((r) => ({
      video_id: r.video_id, position: r.position, is_free_sample: r.is_free_sample, thumbnail_url: r.thumbnail_url,
      preview: {
        title: r.recipe?.title || r.title, title_mr: r.recipe?.title_mr, meal_type: r.recipe?.meal_type,
        prep_time: r.recipe?.prep_time, difficulty: r.recipe?.difficulty, taste_tags: r.recipe?.taste_tags,
      },
    })),
  };
}

/**
 * The last signed-in user id, so packs still open offline after the access token expires.
 * Cleared on explicit sign-out, so another person on a shared phone never sees the book.
 */
const OWNER_KEY = 'rm_offline_uid';
export function initOfflineOwner() {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session?.user) localStorage.setItem(OWNER_KEY, session.user.id);
    else if (event === 'SIGNED_OUT') localStorage.removeItem(OWNER_KEY);
  });
}
export const offlineOwnerId = () => localStorage.getItem(OWNER_KEY);
