import { describe, expect, test } from 'bun:test';
import { diwaliFirst, isDiwaliRecipe } from '../src/lib/diwali';

describe('Diwali priority', () => {
  test('Diwali recipes are first, with existing order preserved within each group', () => {
    const recipes = [{ title: 'Matar Masala' }, { title: 'Chakli' }, { title: 'Diwali Karanji' }, { title: 'Dal' }];
    expect(diwaliFirst(recipes, r => r).map(r => r.title)).toEqual(['Chakli', 'Diwali Karanji', 'Matar Masala', 'Dal']);
    expect(recipes[0].title).toBe('Matar Masala');
  });
  test('Marathi faral recipes are recognized', () => {
    expect(isDiwaliRecipe({ title_mr: 'दिवाळीचा फराळ चकली' })).toBe(true);
    expect(isDiwaliRecipe({ titleMr: 'बेसन लाडू' })).toBe(true);
    expect(isDiwaliRecipe({ title: 'Paneer curry' })).toBe(false);
  });
});