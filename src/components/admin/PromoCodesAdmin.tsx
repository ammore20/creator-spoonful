import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { rupees } from '@/lib/books';

const db = supabase as any;

export const PromoCodesAdmin = ({ creators }: { creators: { id: string; name: string }[] }) => {
  const [rows, setRows] = useState<any[]>([]);
  const [f, setF] = useState({ creator: '', code: '', price: '299', expires: '', max: '' });

  const load = useCallback(async () => { const { data } = await db.rpc('admin_list_promo_codes'); setRows(data ?? []); }, []);
  useEffect(() => { load(); }, [load]);

  const create = async () => {
    if (!f.creator || !/^[A-Za-z0-9]{4,20}$/.test(f.code)) { toast.error('Pick a creator; code must be 4–20 letters or digits'); return; }
    const { error } = await db.from('promo_codes').insert({
      creator_id: f.creator, code: f.code.toUpperCase(), price_paise: Math.round(Number(f.price) * 100),
      expires_at: f.expires ? new Date(f.expires).toISOString() : null, max_uses: f.max ? Number(f.max) : null,
    });
    if (error) { toast.error(error.message.includes('duplicate') ? 'That code already exists' : error.message); return; }
    toast.success('Code created'); setF({ ...f, code: '' }); load();
  };
  const toggle = async (r: any) => {
    const { error } = await db.from('promo_codes').update({ active: !r.active }).eq('id', r.id);
    error ? toast.error(error.message) : load();
  };

  return (
    <Card>
      <CardHeader><CardTitle>Creator codes</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-2">
          <select className="h-10 rounded-md border border-input bg-background px-2 text-sm" value={f.creator} onChange={(e) => setF({ ...f, creator: e.target.value })}>
            <option value="">Creator…</option>
            {creators.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Input placeholder="CODE" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} className="w-32" />
          <label className="text-xs text-muted-foreground">Price ₹<Input type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} className="w-24" /></label>
          <label className="text-xs text-muted-foreground">Expires (optional)<Input type="date" value={f.expires} onChange={(e) => setF({ ...f, expires: e.target.value })} /></label>
          <label className="text-xs text-muted-foreground">Max uses<Input type="number" value={f.max} onChange={(e) => setF({ ...f, max: e.target.value })} className="w-24" /></label>
          <Button onClick={create}>Create code</Button>
        </div>
        <ul className="text-sm space-y-1">
          {rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-2">
              <b>{r.code}</b> · {r.creator_name} · {rupees(r.price_paise)} · used {r.uses}{r.max_uses ? ` / ${r.max_uses}` : ''}
              {r.expires_at ? ` · until ${new Date(r.expires_at).toLocaleDateString('en-IN')}` : ''}
              <Button size="sm" variant="outline" onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</Button>
            </li>
          ))}
          {rows.length === 0 && <li className="text-muted-foreground">No codes yet.</li>}
        </ul>
      </CardContent>
    </Card>
  );
};
