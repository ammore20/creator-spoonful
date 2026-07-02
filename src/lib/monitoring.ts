/**
 * Frontend runtime monitoring.
 *
 * Captures uncaught errors + unhandled promise rejections and forwards them
 * to our structured logger. If VITE_SENTRY_DSN is set at build time we also
 * forward to Sentry (loaded dynamically to keep it out of the main bundle
 * when unused).
 *
 * Never logs: passwords, tokens, payment identifiers, transcripts, or PII.
 * The logger already redacts known-sensitive keys.
 */
import { logger } from './logger';

let installed = false;

type SentryLike = {
  init: (opts: Record<string, unknown>) => void;
  captureException: (err: unknown, ctx?: Record<string, unknown>) => void;
};

let sentry: SentryLike | null = null;

async function loadSentry(dsn: string) {
  try {
    // Dynamic import so unused when no DSN configured.
    const mod = await import(/* @vite-ignore */ '@sentry/browser' as string).catch(() => null);
    if (!mod) return;
    sentry = mod as unknown as SentryLike;
    sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      tracesSampleRate: 0.05,
      // Never send request bodies or headers.
      sendDefaultPii: false,
      beforeSend(event: any) {
        // Strip URL query strings that may contain tokens.
        if (event?.request?.url) {
          try {
            const u = new URL(event.request.url);
            u.search = '';
            event.request.url = u.toString();
          } catch {}
        }
        return event;
      },
    });
  } catch {
    /* swallow: monitoring must never break the app */
  }
}

function report(kind: string, err: unknown, extra?: Record<string, unknown>) {
  const message = err instanceof Error ? err.message : String(err);
  const name = err instanceof Error ? err.name : 'Error';
  logger.error(kind, { name, message, ...extra });
  if (sentry) {
    try { sentry.captureException(err, { extra }); } catch {}
  }
}

export function initMonitoring() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (dsn) void loadSentry(dsn);

  window.addEventListener('error', (event) => {
    report('window_error', event.error ?? event.message, {
      source: event.filename,
      line: event.lineno,
      col: event.colno,
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    report('unhandled_rejection', event.reason);
  });
}

/** Manual capture for caught errors we still want to observe. */
export function captureError(err: unknown, ctx?: Record<string, unknown>) {
  report('captured_error', err, ctx);
}
