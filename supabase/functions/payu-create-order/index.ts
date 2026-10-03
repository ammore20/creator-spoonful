import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { admin, payuConfig, requestHash } from '../_shared/payu.ts';

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const ALLOWED_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*(recipemaker\.in|lovable\.app)$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const auth = req.headers.get('Authorization') ?? '';
  const userClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } });
  const { data: u } = await userClient.auth.getUser(auth.replace(/^Bearer /, ''));
  const user = u?.user;
  if (!user?.email) return json({ error: 'unauthorized' }, 401);

  const body = await req.json().catch(() => ({}));
  const slug = typeof body.slug === 'string' ? body.slug : '';
  if (!/^[a-z0-9-]{1,80}$/.test(slug)) return json({ error: 'invalid_slug' }, 400);
  const code = typeof body.code === 'string' && /^[A-Za-z0-9]{4,20}$/.test(body.code) ? body.code : '';
  const origin = typeof body.origin === 'string' && ALLOWED_ORIGIN.test(body.origin) ? body.origin : 'https://recipemaker.in';

  const db = admin();
  const c = payuConfig();
  const { data: flag } = await db.rpc('payu_checkout_enabled');
  if (!flag || !c.ready) return json({ fallback: true });

  const { data: book } = await db.from('books').select('id, slug, price_paise, status').eq('slug', slug).maybeSingle();
  if (!book || book.status !== 'published') return json({ error: 'not_available' }, 404);

  const { count: owned } = await db.from('purchases').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).eq('book_id', book.id).eq('status', 'paid');
  if (owned) return json({ error: 'already_owned' }, 409);

  let amount = book.price_paise as number;
  let promoId: string | null = null;
  if (code) {
    const { data: p } = await db.rpc('promo_for_book', { _book_id: book.id, _code: code });
    if (!p?.valid) return json({ error: 'invalid_code' }, 400);
    amount = p.price_paise; promoId = p.id;
  }

  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count: recent } = await db.from('payu_orders').select('id', { count: 'exact', head: true })
    .eq('user_id', user.id).gte('created_at', since);
  if ((recent ?? 0) >= 10) return json({ error: 'rate_limited' }, 429);

  const txnid = ('RM' + Date.now().toString(36) + crypto.randomUUID().replace(/-/g, '').slice(0, 8)).toUpperCase();
  const { error } = await db.from('payu_orders').insert({ txnid, user_id: user.id, book_id: book.id, amount_paise: amount, promo_code_id: promoId });
  if (error) return json({ error: 'order_failed' }, 500);

  const ret = `${Deno.env.get('SUPABASE_URL')}/functions/v1/payu-return`;
  const fields: Record<string, string> = {
    key: c.key, txnid, amount: (amount / 100).toFixed(2), productinfo: book.slug,
    firstname: 'Customer', email: user.email, phone: '', udf1: book.slug, udf2: origin, surl: ret, furl: ret,
  };
  fields.hash = await requestHash(fields, c.salt);
  console.log(JSON.stringify({ evt: 'payu_order_created', txnid, env: c.env }));
  return json({ action: c.paymentUrl, fields });
});
