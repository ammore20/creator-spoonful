/**
 * Privacy-friendly analytics.
 *
 * - No cookies, no fingerprinting, no PII.
 * - Events are structured (stable name + small numeric/enum props only).
 * - Forwards to Plausible if VITE_PLAUSIBLE_DOMAIN is set, otherwise to the
 *   structured logger (useful for local dev + edge log aggregation).
 */
import { logger } from './logger';

export type AnalyticsEvent =
  | 'landing_view'
  | 'recipe_view'
  | 'premium_click'
  | 'checkout_started'
  | 'payment_success'
  | 'payment_failure'
  | 'search_used'
  | 'favorite_added'
  | 'ai_recipe_generated'
  | 'admin_import';

type Props = Record<string, string | number | boolean | undefined>;

// Strip anything that even looks like PII before we send.
const DENY = /(email|phone|token|password|secret|transcript|address|name)/i;

function sanitize(props?: Props): Props | undefined {
  if (!props) return undefined;
  const clean: Props = {};
  for (const [k, v] of Object.entries(props)) {
    if (DENY.test(k)) continue;
    if (typeof v === 'string' && v.length > 64) continue;
    clean[k] = v;
  }
  return clean;
}

declare global {
  interface Window {
    plausible?: (event: string, opts?: { props?: Props }) => void;
  }
}

export function track(event: AnalyticsEvent, props?: Props) {
  const clean = sanitize(props);
  try {
    if (typeof window !== 'undefined' && typeof window.plausible === 'function') {
      window.plausible(event, clean ? { props: clean } : undefined);
    }
  } catch {
    /* never break UX on analytics failure */
  }
  logger.info(`analytics.${event}`, clean);
}
