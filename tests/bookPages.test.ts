import { describe, test, expect } from 'bun:test';
import { buildBookPages, mealGroup, recipePageIndex, swipeDirection, jumpMode, visiblePageIndices } from '../src/lib/bookPages';
const rows = Array.from({ length: 100 }, (_, i) => ({ video_id: String(i), position: i, is_free_sample: false, thumbnail_url: null, preview: { title: `Recipe ${i}`, meal_type: i % 2 ? 'Dinner' : 'Breakfast' } }));
describe('Phase 8 reader rules', () => {
  test('100 recipes have ten contents pages and three pages each', () => {
    const pages = buildBookPages(rows);
    expect(pages.length).toBe(313);
    expect(pages.filter(p => p.kind === 'contents').length).toBe(10);
    expect(recipePageIndex(pages, '0')).toBe(12);
    expect(recipePageIndex(pages, '99')).toBe(309);
    expect(pages.slice(12, 15).map(p => p.kind)).toEqual(['photo', 'ingredients', 'steps']);
  });
  test('unmatched meal types go under Other', () => expect(mealGroup('unknown')).toBe('other'));
  test('swipes require forty pixels and twice the vertical movement', () => {
    expect(swipeDirection(-40, 20)).toBe(1);
    expect(swipeDirection(40, 20)).toBe(-1);
    expect(swipeDirection(-39, 0)).toBe(0);
    expect(swipeDirection(-40, 21)).toBe(0);
  });
  test('jumps over six pages fade', () => { expect(jumpMode(0, 6)).toBe('flip'); expect(jumpMode(0, 7)).toBe('fade'); });
  test('only two neighbours on each side render', () => { expect(visiblePageIndices(50, 313)).toEqual([48, 49, 50, 51, 52]); });
});