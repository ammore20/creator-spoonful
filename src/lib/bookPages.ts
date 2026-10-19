import type { BookRecipeRow } from './books';

export type BookPage = { kind: 'cover' | 'creator' | 'contents' | 'photo' | 'ingredients' | 'steps' | 'end'; recipeId?: string; entries?: { row: BookRecipeRow; group: string }[] };
export const CONTENTS_PER_PAGE = 10;
export function mealGroup(meal?: string): string {
  const value = (meal || '').toLowerCase();
  if (value.includes('breakfast')) return 'breakfast';
  if (value.includes('snack')) return 'snacks';
  if (value.includes('dessert') || value.includes('sweet')) return 'sweet';
  if (value.includes('lunch')) return 'lunch';
  if (value.includes('dinner') || value.includes('main')) return 'dinner';
  return 'other';
}
export function buildBookPages(rows: BookRecipeRow[]): BookPage[] {
  const groups = ['breakfast', 'lunch', 'dinner', 'snacks', 'sweet', 'other'];
  const entries = groups.flatMap(group => rows.filter(row => mealGroup(row.preview.meal_type) === group).map(row => ({ row, group })));
  const contents: BookPage[] = [];
  for (let i = 0; i < entries.length; i += CONTENTS_PER_PAGE) contents.push({ kind: 'contents', entries: entries.slice(i, i + CONTENTS_PER_PAGE) });
  if (!contents.length) contents.push({ kind: 'contents', entries: [] });
  return [{ kind: 'cover' }, { kind: 'creator' }, ...contents,
    ...rows.flatMap(row => (['photo', 'ingredients', 'steps'] as const).map(kind => ({ kind, recipeId: row.video_id }))), { kind: 'end' }];
}
export const recipePageIndex = (pages: BookPage[], id: string) => pages.findIndex(p => p.kind === 'photo' && p.recipeId === id);
export function swipeDirection(dx: number, dy: number): number {
  return Math.abs(dx) >= 40 && Math.abs(dx) >= 2 * Math.abs(dy) ? (dx < 0 ? 1 : -1) : 0;
}
export const jumpMode = (from: number, to: number) => Math.abs(to - from) > 6 ? 'fade' : 'flip';
export function visiblePageIndices(current: number, count: number): number[] {
  return Array.from({ length: count }, (_, i) => i).filter(i => Math.abs(i - current) <= 2);
}