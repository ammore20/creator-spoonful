import { processCallback, readForm } from '../_shared/payu.ts';

// PayU server-to-server notification. Safe to receive many times: settle_payu_order is idempotent.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('method', { status: 405 });
  try {
    const r = await processCallback(await readForm(req));
    return new Response(JSON.stringify({ status: r.status }), { status: r.reason === 'bad_hash' ? 401 : 200, headers: { 'Content-Type': 'application/json' } });
  } catch {
    return new Response(JSON.stringify({ status: 'error' }), { status: 500 });
  }
});
