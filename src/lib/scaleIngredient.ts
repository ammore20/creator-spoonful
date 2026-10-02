/**
 * Ingredient scaling that never breaks on non-numeric amounts.
 * - Supports ASCII and Devanagari digits, decimals, fractions (1/2, ½) and ranges (4–5).
 * - Lines with no number ("unknown salt", "salt to taste") are returned unchanged.
 * - "unknown X" is displayed as "X (amount not stated)".
 */
const DEV = '०१२३४५६७८९';
const UNICODE_FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

const toAscii = (s: string) => s.replace(/[०-९]/g, (d) => String(DEV.indexOf(d)));
const toDev = (s: string) => s.replace(/[0-9]/g, (d) => DEV[Number(d)]);

const NICE: [number, string][] = [
  [0.25, '1/4'], [1 / 3, '1/3'], [0.5, '1/2'], [2 / 3, '2/3'], [0.75, '3/4'],
];

export function formatAmount(n: number): string {
  if (!isFinite(n) || n <= 0) return '0';
  const whole = Math.floor(n + 1e-9);
  const frac = n - whole;
  if (frac < 0.05) return String(whole);
  if (frac > 0.95) return String(whole + 1);
  if (whole < 10) {
    for (const [v, label] of NICE) {
      if (Math.abs(frac - v) < 0.05) return whole ? `${whole} ${label}` : label;
    }
  }
  return n.toFixed(1).replace(/\.0$/, '');
}

const NUM = String.raw`(?:\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d+)?|[½¼¾⅓⅔])`;
const PATTERN = new RegExp(NUM, 'g');

function parseNum(raw: string): number | null {
  const t = raw.trim();
  if (UNICODE_FRACTIONS[t] !== undefined) return UNICODE_FRACTIONS[t];
  const mixed = t.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = t.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (frac) return Number(frac[2]) ? Number(frac[1]) / Number(frac[2]) : null;
  const n = Number(t);
  return isFinite(n) ? n : null;
}

const UNKNOWN_RE = /^\s*(unknown|अज्ञात)\s+/i;

export function displayIngredient(line: unknown, language: 'en' | 'mr' = 'en'): string {
  const s = typeof line === 'string' ? line : line == null ? '' : String((line as any).name ?? line);
  if (UNKNOWN_RE.test(s)) {
    const rest = s.replace(UNKNOWN_RE, '');
    return `${rest} (${language === 'en' ? 'amount not stated' : 'प्रमाण सांगितलेले नाही'})`;
  }
  return s;
}

export function scaleIngredient(line: unknown, ratio: number, language: 'en' | 'mr' = 'en'): string {
  const text = displayIngredient(line, language);
  if (!text || !isFinite(ratio) || ratio <= 0 || Math.abs(ratio - 1) < 1e-9) return text;
  const hadDev = /[०-९]/.test(text);
  const ascii = toAscii(text);
  if (!/[0-9½¼¾⅓⅔]/.test(ascii)) return text;
  const out = ascii.replace(PATTERN, (m) => {
    const n = parseNum(m);
    return n === null ? m : formatAmount(n * ratio);
  });
  return hadDev ? toDev(out) : out;
}

export function parseServings(v: unknown, fallback = 4): number {
  const n = typeof v === 'number' ? v : parseInt(toAscii(String(v ?? '')), 10);
  return Number.isFinite(n) && n > 0 && n <= 50 ? n : fallback;
}
