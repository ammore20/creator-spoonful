import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { rupeesExact } from '@/lib/books';

const db = supabase as any;
const REASONS: Record<string, string> = {
  no_account_for_email: 'No account with that email. Ask them to sign up first.',
  account_linked_elsewhere: 'That account is already linked to another creator.',
  reference_already_used: 'This payment reference was already used.',
  payout_details_missing: 'Creator has no payout details. Give an override reason to continue.',
  nothing_payable: 'Nothing is payable for this creator.',
  amount_mismatch: 'Amount must equal the payable total exactly.',
  reference_required: 'Enter a payment reference.',
};

export const PayoutsAdmin = () => {
  const [rows, setRows] = useState<any[]>([]);
  const [past, setPast] = useState<any[]>([]);
  const [linkCreator, setLinkCreator] = useState('');
  const [linkEmail, setLinkEmail] = useState('');

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([db.rpc('admin_payout_summary'), db.rpc('admin_list_payouts')]);
    setRows(s.data ?? []); setPast(p.data ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const handle = (res: any) => {
    if (res.error) { toast.error(res.error.message); return false; }
    if (res.data?.ok === false) { toast.error(REASONS[res.data.reason] ?? res.data.reason); return false; }
    toast.success('Done'); load(); return true;
  };

  const link = async () => {
    if (!linkCreator) { toast.error('Pick a creator'); return; }
    if (handle(await db.rpc('admin_link_creator', { _creator_id: linkCreator, _email: linkEmail.trim() }))) setLinkEmail('');
  };

  const markPaid = async (r: any) => {
    let override: string | null = null;
    if (!r.upi_id) {
      override = window.prompt('No payout details on file. Type a reason to pay anyway:');
      if (!override?.trim()) return;
    }
    const ref = window.prompt(`Payment reference (UPI / bank transaction ID) for ${r.creator_name}`);
    if (!ref?.trim()) return;
    const amt = window.prompt('Amount paid in ₹ (must equal payable total)', String(r.payable_paise / 100));
    const paise = Math.round(Number(amt) * 100);
    if (!(paise > 0)) { toast.error('Enter a valid amount'); return; }
    handle(await db.rpc('admin_mark_payout', { _creator_id: r.creator_id, _reference: ref.trim(), _amount_paise: paise, _override_reason: override }));
  };

  return (
    <Card>
      <CardHeader><CardTitle>Creator payouts</CardTitle></CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap items-end gap-2">
          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={linkCreator} onChange={(e) => setLinkCreator(e.target.value)}>
            <option value="">Creator…</option>
            {rows.map((r) => <option key={r.creator_id} value={r.creator_id}>{r.creator_name}</option>)}
          </select>
          <Input placeholder="Account email (empty = unlink)" value={linkEmail} onChange={(e) => setLinkEmail(e.target.value)} className="w-64" />
          <Button variant="outline" onClick={link}>Link creator to account</Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground">
              <tr><th className="py-2">Creator</th><th>Linked account</th><th>Payable</th><th>In hold</th><th>UPI</th><th /></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.creator_id} className="border-t border-border">
                  <td className="py-2">{r.creator_name}</td>
                  <td>{r.linked_email ?? '—'}</td>
                  <td>{rupeesExact(r.payable_paise)} ({r.payable_count})</td>
                  <td>{rupeesExact(r.hold_paise)}</td>
                  <td>{r.upi_id ? `${r.upi_id} · ${r.account_holder_name}` : 'Missing'}</td>
                  <td><Button size="sm" disabled={!(r.payable_paise > 0)} onClick={() => markPaid(r)}>Mark as paid</Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="font-semibold text-sm mb-2">Past payouts</h3>
          {past.length === 0 ? <p className="text-sm text-muted-foreground">None yet.</p> : (
            <ul className="text-sm space-y-1">
              {past.map((p) => (
                <li key={p.id}>{new Date(p.paid_at).toLocaleDateString('en-IN')} · {p.creator_name} · {rupeesExact(p.amount_paise)} · ref {p.reference} · {p.earnings_count} sales{p.override_reason ? ` · override: ${p.override_reason}` : ''}</li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
