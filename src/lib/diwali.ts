/** Match festival names and traditional faral, not every dessert. */
export const DIWALI_TERMS = [
  'diwali', 'deepavali', 'दिवाळ', 'दीपावली', 'faral', 'फराळ',
  'chakli', 'चकली', 'karanji', 'करंजी', 'shankarpali', 'शंकरपाळ',
  'shankarpale', 'chivda', 'chiwda', 'चिवडा', 'anarsa', 'अनारस',
  'ladoo', 'laddu', 'ladu', 'लाडू', 'लड्डू',
] as const;

export function isDiwaliRecipe(recipe: { title?: string; titleMr?: string; title_mr?: string }): boolean {
  const title = `${recipe.title ?? ''} ${recipe.titleMr ?? ''} ${recipe.title_mr ?? ''}`.normalize('NFC').toLowerCase();
  return DIWALI_TERMS.some(term => /[a-z]/.test(term)
    ? new RegExp(`\\b${term}\\b`, 'i').test(title)
    : title.includes(term));
}

/** Stable partition; never mutates stored book positions or access flags. */
export function diwaliFirst<T>(rows: readonly T[], title: (row: T) => Parameters<typeof isDiwaliRecipe>[0]): T[] {
  return [...rows.filter(row => isDiwaliRecipe(title(row))), ...rows.filter(row => !isDiwaliRecipe(title(row)))];
}

// Query only public previews so festive recipes outside the latest page can be featured.
export const DIWALI_PUBLIC_FILTER = DIWALI_TERMS.flatMap(term =>
  ['title', 'recipe_preview->>title', 'recipe_preview->>title_mr'].map(field => `${field}.ilike.%${term}%`)
).join(',');