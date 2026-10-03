import { assert, assertEquals } from 'jsr:@std/assert@1';
import { requestHash, responseHash, safeEqual, sha512, toPaise } from '../_shared/payu.ts';

const f = { key: 'KEY', txnid: 'T1', amount: '299.00', productinfo: 'saritas-kitchen', firstname: 'Customer', email: 'a@b.in', udf1: 'saritas-kitchen', udf2: 'https://recipemaker.in' };

Deno.test('request hash matches documented pipe order', async () => {
  const expected = await sha512('KEY|T1|299.00|saritas-kitchen|Customer|a@b.in|saritas-kitchen|https://recipemaker.in|||||||||SALT');
  assertEquals(await requestHash(f, 'SALT'), expected);
});

Deno.test('response hash is reverse order with status', async () => {
  const r = { ...f, status: 'success' };
  const expected = await sha512('SALT|success|||||||||https://recipemaker.in|saritas-kitchen|a@b.in|Customer|saritas-kitchen|299.00|T1|KEY');
  assertEquals(await responseHash(r, 'SALT'), expected);
  const withCharges = await sha512('5.00|SALT|success|||||||||https://recipemaker.in|saritas-kitchen|a@b.in|Customer|saritas-kitchen|299.00|T1|KEY');
  assertEquals(await responseHash({ ...r, additionalCharges: '5.00' }, 'SALT'), withCharges);
});

Deno.test('helpers', () => {
  assert(safeEqual('ABC', 'abc')); assert(!safeEqual('abc', 'abd')); assert(!safeEqual('abc', 'abcd'));
  assertEquals(toPaise('299.00'), 29900); assertEquals(toPaise('299.5'), 29950); assertEquals(toPaise('x'), null);
});
