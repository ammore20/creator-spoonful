// PayU helpers shared by payu-create-order, payu-return and payu-webhook.
// Hash formulas follow PayU's docs (docs.payu.in, "Generate hash" / "Verify payment"):
//   request : sha512(key|txnid|amount|productinfo|firstname|email|udf1|udf2|udf3|udf4|udf5||||||SALT)
//   response: sha512([additionalCharges|]SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key)
//   verify  : sha512(key|command|var1|SALT)
import { createClient } from 'npm:@supabase/supabase-js@2';

export type PayuEnv = 'test' | 'live';

export const payuConfig = () => {
  const key = Deno.env.get('PAYU_MERCHANT_KEY') ?? '';
  const salt = Deno.env.get('PAYU_MERCHANT_SALT') ?? '';
  const env: PayuEnv = (Deno.env.get('PAYU_ENV') ?? 'test').toLowerCase() === 'live' ? 'live' : 'test';
  return {
    key, salt, env, ready: Boolean(key && salt),
    paymentUrl: env === 'live' ? 'https://secure.payu.in/_payment' : 'https://test.payu.in/_payment',
    verifyUrl: env === 'live' ? 'https://info.payu.in/merchant/postservice?form=2' : 'https://test.payu.in/merchant/postservice?form=2',
  };
};

export const sha512 = async (s: string) => {
  const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
};

export const safeEqual = (a: string, b: string) => {
  const x = new TextEncoder().encode(a.toLowerCase());
  const y = new TextEncoder().encode(b.toLowerCase());
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0;
};

type F = Record<string, string>;
const udfs = (f: F) => [1, 2, 3, 4, 5].map((i) => f[`udf${i}`] ?? '');

export const requestHash = (f: F, salt: string) =>
  sha512([f.key, f.txnid, f.amount, f.productinfo, f.firstname, f.email, ...udfs(f), '', '', '', '', '', salt].join('|'));

export const responseHash = (f: F, salt: string) => {
  const core = [salt, f.status ?? '', '', '', '', '', '', ...udfs(f).reverse(), f.email ?? '', f.firstname ?? '',
    f.productinfo ?? '', f.amount ?? '', f.txnid ?? '', f.key ?? ''];
  return sha512((f.additionalCharges ? [f.additionalCharges, ...core] : core).join('|'));
};

export const toPaise = (amount: string) => {
  if (!/^\d+(\.\d{1,2})?$/.test(amount ?? '')) return null;
  const [r, p = ''] = amount.split('.');
  return Number(r) * 100 + Number((p + '00').slice(0, 2));
};

export const admin = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

/** Ask PayU itself for the final status of a txnid. Never trust the browser-posted status alone. */
export const verifyWithPayu = async (txnid: string) => {
  const c = payuConfig();
  const body = new URLSearchParams({ key: c.key, command: 'verify_payment', var1: txnid, hash: await sha512(`${c.key}|verify_payment|${txnid}|${c.salt}`) });
  const res = await fetch(c.verifyUrl, { method: 'POST', body, headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  const json = await res.json().catch(() => null);
  const d = json?.transaction_details?.[txnid];
  if (!d) return null;
  return { status: String(d.status ?? '').toLowerCase(), amount: String(d.amt ?? d.transaction_amount ?? ''), mihpayid: String(d.mihpayid ?? '') };
};

/** Shared path for surl/furl and webhook: check hash, confirm with PayU, settle once. */
export const processCallback = async (f: F) => {
  const c = payuConfig();
  if (!c.ready) return { status: 'pending' as const, reason: 'not_configured', order: null };
  if (!f.txnid || !f.hash || f.key !== c.key) return { status: 'failed' as const, reason: 'bad_request', order: null };
  if (!safeEqual(await responseHash(f, c.salt), f.hash)) return { status: 'failed' as const, reason: 'bad_hash', order: null };

  const db = admin();
  const { data: order } = await db.from('payu_orders').select('txnid, book_id, amount_paise, status').eq('txnid', f.txnid).maybeSingle();
  if (!order) return { status: 'failed' as const, reason: 'unknown_txnid', order: null };

  const v = await verifyWithPayu(f.txnid);
  if (!v) return { status: 'pending' as const, reason: 'verify_unavailable', order };
  const { data: r } = await db.rpc('settle_payu_order', {
    _txnid: f.txnid, _verified_status: v.status, _amount_paise: toPaise(v.amount), _mihpayid: v.mihpayid,
  });
  const st = r?.status === 'paid' ? 'success' : r?.status === 'failed' ? 'failed' : 'pending';
  console.log(JSON.stringify({ evt: 'payu_settle', txnid: f.txnid, verified: v.status, result: r?.status ?? r?.reason }));
  return { status: st as 'success' | 'failed' | 'pending', reason: r?.reason ?? null, order };
};

export const readForm = async (req: Request): Promise<F> => {
  const ct = req.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) return await req.json().catch(() => ({}));
  const fd = await req.formData().catch(() => null);
  const out: F = {};
  fd?.forEach((v, k) => { out[k] = String(v); });
  return out;
};
