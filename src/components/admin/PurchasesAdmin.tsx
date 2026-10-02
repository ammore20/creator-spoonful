import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { rupeesExact } from '@/lib/books';

const db = supabase as any;

const REASONS: Record<string, string> = {
  reference_already_used: 'This PayU reference was already used for a grant.',
  already_owned: 'This account already owns the book.',
  no_account_for_email: 'No account with that email. Ask them to sign up first.',
  intent_not_pending: 'That request is no longer pending.',
};

const askPayment = (defaultRupees: number) => {
  const ref = window.prompt('PayU reference (transaction / payment ID)');
  if (!ref?.trim()) return null;
  const amt = window.prompt('Amount paid in ₹ (GST included)', String(defaultRupees));
  const paise = Math.round(Number(amt) * 100);
  if (!(paise > 0)) { toast.error('Enter a valid amount'); return null; }
  return { ref: ref.trim(), paise };
};

export const PurchasesAdmin = () => {
  const [intents, setIntents] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [fee, setFee] = useState('');
  const [grantEmail, setGrantEmail] = useState('');
  const [grantBook, setGrantBook] = useState('');

  const load = useCallback(async () => {
    const [i, p, b, f] = await Promise.all([
      db.rpc('admin_list_purchase_intents'), db.rpc('admin_list_purchases'),
      db.from('books').select('id,title_en,price_paise').order('created_at'), db.rpc('gateway_fee_percent'),
    ]);
    setIntents(i.data ?? []); setPurchases(p.data ?? []); setBooks(b.data ?? []);
    if (f.data != null) setFee(String(f.data));
  }, []);
  useEffect(() => { load(); }, [load]);

  const handle = (res: any) => {
    if (res.error) { toast.error(res.error.message); return; }
    if (res.data?.ok === false) { toast.error(REASONS[res.data.reason] ?? res.data.reason); return; }
    if (res.data?.creator_share_paise != null) toast.success(`Granted. Creator share ${rupeesExact(res.data.creator_share_paise)}`);
    else toast.success('Done');
    load();
  };

  const priceOf = (bookId: string) => (books.find((b) => b.id === bookId)?.price_paise ?? 29900) / 100;

  const grantIntent = async (it: any) => {
    const p = askPayment(priceOf(it.book_id)); if (!p) return;
    handle(await db.rpc('admin_grant_intent', { _intent_id: it.id, _provider_ref: p.ref, _amount_paise: p.paise }));
  };
  const grantByEmail = async () => {
    if (!grantEmail.trim() || !grantBook) { toast.error('Enter an email and pick a book'); return; }
    const p = askPayment(priceOf(grantBook)); if (!p) return;
    handle(await db.rpc('admin_grant_book_to_email', { _email: grantEmail.trim(), _book_id: grantBook, _provider_ref: p.ref, _amount_paise: p.paise }));
    setGrantEmail('');
  };
  const refund = async (row: any) => {
    const reason = window.prompt(`Refund and lock ${row.book_title} for ${row.email}? Reason (optional)`);
    if (reason === null) return;
    handle(await db.rpc('admin_refund_purchase', { _purchase_id: row.id, _reason: reason || null }));
  };
  const saveFee = async () => handle(await db.rpc('admin_set_gateway_fee', { _percent: Number(fee) }));

  return (
    <Card>
      <CardHeader><CardTitle>Purchases</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs text-muted-foreground">Gateway fee % (used for new grants)
            <Input type="number" step="0.01" value={fee} onChange={(e) => setFee(e.target.value)} className="w-32" />
          </label>
          <Button variant="outline" onClick={saveFee}>Save fee</Button>
        </div>

        <section>
          <h3 className="font-semibold mb-2">Pending buy clicks ({intents.length})</h3>
          <p className="text-xs text-muted-foreground mb-2">Match each against the PayU dashboard before granting.</p>
          <ul className="space-y-2">
            {intents.map((it) => (
              <li key={it.id} className="flex flex-wrap items-center gap-2 border rounded-md p-2 text-sm">
                <span className="font-medium">{it.email}</span>
                <span className="text-muted-foreground">· {it.book_title}</span>
                <span className="text-muted-foreground">· {new Date(it.created_at).toLocaleString('en-IN')}</span>
                <span className="ml-auto flex gap-2">
                  <Button size="sm" onClick={() => grantIntent(it)}>Grant access</Button>
                  <Button size="sm" variant="ghost" onClick={async () => handle(await db.rpc('admin_dismiss_intent', { _intent_id: it.id }))}>Dismiss</Button>
                </span>
              </li>
            ))}
            {intents.length === 0 && <li className="text-sm text-muted-foreground">None pending.</li>}
          </ul>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Grant book to an email</h3>
          <div className="flex flex-wrap gap-2">
            <Input placeholder="buyer@email.com" value={grantEmail} onChange={(e) => setGrantEmail(e.target.value)} className="max-w-xs" />
            <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={grantBook} onChange={(e) => setGrantBook(e.target.value)}>
              <option value="">Pick a book…</option>
              {books.map((b) => <option key={b.id} value={b.id}>{b.title_en}</option>)}
            </select>
            <Button onClick={grantByEmail}>Grant</Button>
          </div>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Purchases ({purchases.length})</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-left text-muted-foreground">
                <tr><th className="p-1">Buyer</th><th className="p-1">Book</th><th className="p-1">Paid</th><th className="p-1">GST</th><th className="p-1">Fee</th><th className="p-1">Creator share</th><th className="p-1">Earning</th><th className="p-1">PayU ref</th><th className="p-1">Status</th><th /></tr>
              </thead>
              <tbody>
                {purchases.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-1">{p.email}</td><td className="p-1">{p.book_title}</td>
                    <td className="p-1">{rupeesExact(p.amount_paise)}</td><td className="p-1">{rupeesExact(p.tax_paise)}</td>
                    <td className="p-1">{rupeesExact(p.gateway_fee_paise)}</td><td className="p-1">{rupeesExact(p.share_paise)}</td>
                    <td className="p-1"><Badge variant="outline">{p.earning_status}</Badge></td>
                    <td className="p-1">{p.provider_ref}</td>
                    <td className="p-1"><Badge variant={p.status === 'paid' ? 'default' : 'secondary'}>{p.status}</Badge></td>
                    <td className="p-1">{p.status === 'paid' && <Button size="sm" variant="outline" onClick={() => refund(p)}>Refund/revoke</Button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </CardContent>
    </Card>
  );
};
