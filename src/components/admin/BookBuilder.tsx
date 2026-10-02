import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowDown, ArrowUp, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';

interface Creator { id: string; name: string; slug: string | null }
interface Item { video_id: string; is_free_sample: boolean }

const db = supabase as any;

export const BookBuilder = ({ creators }: { creators: Creator[] }) => {
  const [creatorId, setCreatorId] = useState('');
  const [book, setBook] = useState<any>(null);
  const [videos, setVideos] = useState<any[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState({ title_en: '', title_mr: '', cover_url: '', price: '299', list: '499', link: '' });
  const [busy, setBusy] = useState(false);
  const creator = creators.find((c) => c.id === creatorId);

  useEffect(() => {
    if (!creatorId) return;
    (async () => {
      const [{ data: b }, { data: v }] = await Promise.all([
        db.from('books').select('*').eq('creator_id', creatorId).maybeSingle(),
        db.from('videos').select('video_id,title,thumbnail_url,extracted_recipe_json')
          .eq('creator_id', creatorId).eq('status', 'done').eq('review_status', 'approved')
          .order('published_at', { ascending: false }),
      ]);
      setVideos((v ?? []).filter((x: any) => !x.extracted_recipe_json?.no_recipe));
      setBook(b);
      setForm({
        title_en: b?.title_en ?? `${creators.find((c) => c.id === creatorId)?.name ?? ''} recipes`,
        title_mr: b?.title_mr ?? '', cover_url: b?.cover_url ?? '',
        price: String((b?.price_paise ?? 29900) / 100), list: String((b?.list_price_paise ?? 49900) / 100),
        link: b?.payment_link_url ?? '',
      });
      if (b) {
        const { data: br } = await db.from('book_recipes').select('video_id,is_free_sample,position').eq('book_id', b.id).order('position');
        setItems((br ?? []).map((r: any) => ({ video_id: r.video_id, is_free_sample: r.is_free_sample })));
      } else setItems([]);
    })();
  }, [creatorId, creators]);

  const byId = useMemo(() => Object.fromEntries(videos.map((v) => [v.video_id, v])), [videos]);
  const selected = new Set(items.map((i) => i.video_id));
  const samples = items.filter((i) => i.is_free_sample).length;

  const toggle = (id: string) => {
    if (selected.has(id)) setItems(items.filter((i) => i.video_id !== id));
    else if (items.length >= 100) toast.error('A book can hold at most 100 recipes');
    else setItems([...items, { video_id: id, is_free_sample: false }]);
  };
  const move = (idx: number, d: number) => {
    const j = idx + d; if (j < 0 || j >= items.length) return;
    const n = [...items]; [n[idx], n[j]] = [n[j], n[idx]]; setItems(n);
  };
  const toggleSample = (idx: number) => {
    const it = items[idx];
    if (!it.is_free_sample && samples >= 3) { toast.error('Only 3 free samples per book'); return; }
    setItems(items.map((x, i) => (i === idx ? { ...x, is_free_sample: !x.is_free_sample } : x)));
  };

  const save = async (status?: 'draft' | 'published') => {
    if (!creator) return;
    const slug = creator.slug;
    if (!slug) { toast.error('This creator has no slug yet'); return; }
    const price = Math.round(Number(form.price) * 100), list = Math.round(Number(form.list) * 100);
    if (!(price > 0) || !(list > 0)) { toast.error('Enter valid prices'); return; }
    if (form.link && !/^https:\/\//.test(form.link)) { toast.error('Payment link must start with https://'); return; }
    const nextStatus = status ?? book?.status ?? 'draft';
    if (nextStatus === 'published' && (!form.link || items.length === 0)) { toast.error('Add recipes and a payment link before publishing'); return; }
    setBusy(true);
    const row = {
      creator_id: creator.id, slug, title_en: form.title_en.trim() || `${creator.name} recipes`,
      title_mr: form.title_mr.trim() || null, cover_url: form.cover_url.trim() || null,
      price_paise: price, list_price_paise: list, payment_link_url: form.link.trim() || null, status: nextStatus,
    };
    const q = book ? db.from('books').update(row).eq('id', book.id).select().single() : db.from('books').insert(row).select().single();
    const { data: saved, error } = await q;
    if (error) { setBusy(false); toast.error(error.message); return; }
    const { error: e2 } = await db.rpc('admin_set_book_recipes', { _book_id: saved.id, _items: items });
    setBusy(false);
    if (e2) { toast.error(e2.message); return; }
    setBook(saved);
    toast.success(nextStatus === 'published' ? 'Book saved and published' : 'Book saved');
  };

  return (
    <Card>
      <CardHeader><CardTitle>Book builder</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <select className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm" value={creatorId} onChange={(e) => setCreatorId(e.target.value)}>
          <option value="">Pick a creator…</option>
          {creators.map((c) => <option key={c.id} value={c.id}>{c.name} {c.slug ? `(/c/${c.slug})` : '(no slug)'}</option>)}
        </select>
        {creator && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant={book?.status === 'published' ? 'default' : 'secondary'}>{book?.status ?? 'not created'}</Badge>
              <span>{items.length} / 100 recipes</span>
              <span>· {samples} / 3 free samples</span>
              {items.length < 100 && <span className="text-destructive">· fewer than 100 recipes ({videos.length} approved available)</span>}
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              <Input placeholder="Title (English)" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
              <Input placeholder="Title (Marathi)" value={form.title_mr} onChange={(e) => setForm({ ...form, title_mr: e.target.value })} />
              <Input placeholder="Cover image URL" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
              <Input placeholder="PayU payment link (https://…)" value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} />
              <label className="text-xs text-muted-foreground">Sale price (₹, GST incl.)<Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
              <label className="text-xs text-muted-foreground">List price (₹, shown struck through)<Input type="number" value={form.list} onChange={(e) => setForm({ ...form, list: e.target.value })} /></label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => save()} disabled={busy}>{busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Save</Button>
              {book?.status === 'published'
                ? <Button variant="outline" onClick={() => save('draft')} disabled={busy}>Unpublish</Button>
                : <Button variant="secondary" onClick={() => save('published')} disabled={busy}>Save and publish</Button>}
            </div>

            <div>
              <p className="text-sm font-semibold mb-2">In the book (order, ★ = free sample)</p>
              <ul className="space-y-1 max-h-80 overflow-auto">
                {items.map((it, i) => (
                  <li key={it.video_id} className="flex items-center gap-2 text-sm border rounded-md px-2 py-1">
                    <span className="w-6 text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 line-clamp-1">{byId[it.video_id]?.extracted_recipe_json?.title || byId[it.video_id]?.title || it.video_id}</span>
                    <Button size="icon" variant={it.is_free_sample ? 'default' : 'ghost'} className="h-7 w-7" onClick={() => toggleSample(i)} aria-label="Free sample"><Star className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, -1)} aria-label="Up"><ArrowUp className="w-3.5 h-3.5" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => move(i, 1)} aria-label="Down"><ArrowDown className="w-3.5 h-3.5" /></Button>
                  </li>
                ))}
                {items.length === 0 && <li className="text-sm text-muted-foreground">Nothing yet. Tick recipes below.</li>}
              </ul>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-semibold">Approved recipes from {creator.name} ({videos.length})</p>
                <Button size="sm" variant="ghost" onClick={() => setItems(videos.slice(0, 100).map((v) => ({ video_id: v.video_id, is_free_sample: items.find((i) => i.video_id === v.video_id)?.is_free_sample ?? false })))}>Select first 100</Button>
              </div>
              <ul className="space-y-1 max-h-80 overflow-auto">
                {videos.map((v) => (
                  <li key={v.video_id}>
                    <label className="flex items-center gap-2 text-sm border rounded-md px-2 py-1 cursor-pointer">
                      <Checkbox checked={selected.has(v.video_id)} onCheckedChange={() => toggle(v.video_id)} />
                      <span className="flex-1 line-clamp-1">{v.extracted_recipe_json?.title || v.title}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
