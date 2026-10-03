import { processCallback, readForm } from '../_shared/payu.ts';

const ALLOWED_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*(recipemaker\.in|lovable\.app)$/;

// PayU posts the browser here (surl and furl). Status always comes from PayU's verify API.
Deno.serve(async (req) => {
  const f = await readForm(req);
  let result: Awaited<ReturnType<typeof processCallback>>;
  try { result = await processCallback(f); } catch { result = { status: 'pending', reason: 'error', order: null }; }
  const slug = /^[a-z0-9-]{1,80}$/.test(f.udf1 ?? '') ? f.udf1 : '';
  const origin = ALLOWED_ORIGIN.test(f.udf2 ?? '') ? f.udf2 : 'https://recipemaker.in';
  const to = slug ? `${origin}/c/${slug}?payment=${result.status}` : `${origin}/library`;
  return new Response(null, { status: 303, headers: { Location: to } });
});
