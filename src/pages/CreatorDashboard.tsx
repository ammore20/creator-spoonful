import { useEffect, useState } from 'react';
import { Eye, BookOpen, Wallet, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ds/PageHeader';
import { StatCard } from '@/components/ds/StatCard';
import { Panel } from '@/components/ds/Panel';
import { EmptyState } from '@/components/ds/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SEO } from '@/components/SEO';
import { toast } from 'sonner';
import { rupeesExact } from '@/lib/books';

const db = supabase as any;
const UPI = /^[A-Za-z0-9._-]{2,256}@[A-Za-z][A-Za-z0-9.-]{1,64}$/;
const LABEL: Record<string, string> = { held: 'In hold', payable: 'Payable', paid: 'Paid', reversed: 'Reversed' };

const CreatorDashboard = () => {
  const [data, setData] = useState<any>(null);
  const [upi, setUpi] = useState('');
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: d } = await db.rpc('my_creator_dashboard');
      setData(d ?? { linked: false });
      if (d?.linked) {
        const { data: p } = await db.from('creator_payout_details').select('upi_id,account_holder_name').eq('creator_id', d.creator_id).maybeSingle();
        if (p) { setUpi(p.upi_id); setName(p.account_holder_name); }
      }
    })();
  }, []);

  const save = async () => {
    if (!UPI.test(upi.trim())) { toast.error('Enter a valid UPI ID, like name@bank'); return; }
    if (name.trim().length < 2) { toast.error('Enter the account holder name'); return; }
    setSaving(true);
    const { error } = await db.from('creator_payout_details').upsert(
      { creator_id: data.creator_id, upi_id: upi.trim(), account_holder_name: name.trim() }, { onConflict: 'creator_id' });
    setSaving(false);
    error ? toast.error('Could not save. Check the details.') : toast.success('Payout details saved');
  };

  return (
    <AppShell language="en" onLanguageToggle={() => {}}>
      <SEO title="Creator dashboard | RecipeMaker" description="Your book sales and payouts" noindex />
      <div className="max-w-4xl mx-auto px-4 py-6">
        {data === null ? <p className="text-sm text-muted-foreground">Loading…</p> : !data.linked ? (
          <EmptyState icon={<Wallet className="w-6 h-6" />} title="Not available" description="This page is only for creators linked to their RecipeMaker account." />
        ) : (
          <>
            <PageHeader eyebrow="Creator" title={data.creator_name} description="Your book sales and payouts." />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={<Eye className="w-4 h-4" />} value={data.visits} label="Link visits" />
              <StatCard icon={<BookOpen className="w-4 h-4" />} value={data.books_sold} label="Books sold" />
              <StatCard icon={<Wallet className="w-4 h-4" />} value={rupeesExact(data.payable_paise)} label="Payable now" />
              <StatCard icon={<Clock className="w-4 h-4" />} value={rupeesExact(data.hold_paise)} label="In hold" tone="neutral" />
            </div>
            <p className="text-sm text-muted-foreground mt-3">Paid out so far: <b className="text-foreground">{rupeesExact(data.paid_paise)}</b></p>

            <Panel className="mt-6">
              <h2 className="font-display font-semibold mb-3">Recent sales</h2>
              {data.sales.length === 0 ? <p className="text-sm text-muted-foreground">No sales yet.</p> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground text-xs">
                      <tr><th className="py-2">Date</th><th>Sale</th><th>Your share</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                      {data.sales.map((s: any, i: number) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-2">{new Date(s.date).toLocaleDateString('en-IN')}</td>
                          <td>{rupeesExact(s.sale_paise)}</td>
                          <td>{rupeesExact(s.share_paise)}</td>
                          <td>{LABEL[s.status] ?? s.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Panel>

            <Panel className="mt-6 space-y-3">
              <h2 className="font-display font-semibold">Payout details</h2>
              <Input placeholder="UPI ID (name@bank)" value={upi} onChange={(e) => setUpi(e.target.value)} />
              <Input placeholder="Account holder name" value={name} onChange={(e) => setName(e.target.value)} />
              <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </Panel>

            <Panel className="mt-6 text-sm text-muted-foreground space-y-1">
              <p>Your share is 50% of each sale after GST and the payment gateway fee.</p>
              <p>A share becomes payable 7 days after the sale (the refund window). Refunds inside that window cancel the share.</p>
              <p>Payouts are made manually to your UPI ID.</p>
            </Panel>
          </>
        )}
      </div>
    </AppShell>
  );
};

export default CreatorDashboard;
