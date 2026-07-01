/**
 * Structured logger.
 *
 * Rules:
 * - Never log secrets, tokens, payment identifiers, raw transcripts, or PII.
 * - Prefer short, stable event names as the first argument.
 * - Debug logs are dropped in production.
 */

type Severity = 'debug' | 'info' | 'warn' | 'error';

type LogContext = Record<string, unknown>;

const isProd = import.meta.env.PROD;

// Fields we refuse to serialize even if a caller passes them by accident.
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'access_token',
  'refresh_token',
  'authorization',
  'apiKey',
  'api_key',
  'secret',
  'razorpay_signature',
  'razorpay_payment_id',
  'razorpay_order_id',
  'transcript',
  'raw_transcript',
  'email',
  'phone',
]);

function sanitize(context?: LogContext): LogContext | undefined {
  if (!context) return undefined;
  const clean: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (SENSITIVE_KEYS.has(key)) {
      clean[key] = '[redacted]';
      continue;
    }
    if (value instanceof Error) {
      clean[key] = { name: value.name, message: value.message };
      continue;
    }
    clean[key] = value;
  }
  return clean;
}

function emit(severity: Severity, event: string, context?: LogContext) {
  if (severity === 'debug' && isProd) return;
  const payload = {
    ts: new Date().toISOString(),
    severity,
    event,
    ...(sanitize(context) ?? {}),
  };
  const fn =
    severity === 'error'
      ? console.error
      : severity === 'warn'
      ? console.warn
      : console.log;
  fn(JSON.stringify(payload));
}

export const logger = {
  debug: (event: string, context?: LogContext) => emit('debug', event, context),
  info: (event: string, context?: LogContext) => emit('info', event, context),
  warn: (event: string, context?: LogContext) => emit('warn', event, context),
  error: (event: string, context?: LogContext) => emit('error', event, context),
};
