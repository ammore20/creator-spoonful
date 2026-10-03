import { supabase } from '@/integrations/supabase/client';

export const rupees = (paise: number | null | undefined) =>
  `₹${Math.round((paise ?? 0) / 100).toLocaleString('en-IN')}`;

export const rupeesExact = (paise: number | null | undefined) =>
  `₹${((paise ?? 0) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export interface BookRecipeRow {
  video_id: string;
  position: number;
  is_free_sample: boolean;
  thumbnail_url: string | null;
  preview: {
    title?: string;
    title_mr?: string;
    meal_type?: string;
    prep_time?: string;
    difficulty?: string;
    taste_tags?: string[];
  };
}

export interface BookInfo {
  id: string;
  slug: string;
  title_en: string;
  title_mr: string | null;
  cover_url: string | null;
  price_paise: number;
  list_price_paise: number | null;
  status: string;
  creator_name: string;
  has_payment_link: boolean;
  has_promo_link?: boolean;
}

export interface BookResponse {
  found: boolean;
  owned?: boolean;
  signed_in?: boolean;
  payu_enabled?: boolean;
  book?: BookInfo;
  recipes?: BookRecipeRow[];
}

export async function fetchBook(slug: string): Promise<BookResponse> {
  const { data, error } = await (supabase as any).rpc('get_book', { _slug: slug });
  if (error) throw error;
  return data as BookResponse;
}

/** Anonymous random id; the server hashes it per book and day. No personal data. */
export function visitorId(): string {
  const key = 'rm_vid';
  let v = localStorage.getItem(key);
  if (!v) {
    v = crypto.randomUUID();
    localStorage.setItem(key, v);
  }
  return v;
}

export const READER_FILTERS = [
  { key: 'all', en: 'All', mr: 'सर्व' },
  { key: 'breakfast', en: 'Breakfast', mr: 'नाश्ता' },
  { key: 'snacks', en: 'Snacks', mr: 'स्नॅक्स' },
  { key: 'dinner', en: 'Dinner', mr: 'जेवण' },
  { key: 'sweet', en: 'Sweet', mr: 'गोड' },
] as const;

export function matchesFilter(r: BookRecipeRow, key: string): boolean {
  if (key === 'all') return true;
  const meal = (r.preview.meal_type || '').toLowerCase();
  const tags = (r.preview.taste_tags || []).map((t) => String(t).toLowerCase());
  if (key === 'breakfast') return meal.includes('breakfast');
  if (key === 'snacks') return meal.includes('snack');
  if (key === 'dinner') return meal.includes('dinner') || meal.includes('lunch') || meal.includes('main');
  if (key === 'sweet') return meal.includes('dessert') || meal.includes('sweet') || tags.includes('sweet');
  return true;
}
