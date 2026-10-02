import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { SEO } from '@/components/SEO';
import { Chip } from '@/components/ds/Chip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Lock, Search, ChevronRight } from 'lucide-react';
import { BookResponse, fetchBook, matchesFilter, READER_FILTERS } from '@/lib/books';
import { useBookPack } from '@/hooks/useBookPack';
import { packToBookResponse } from '@/lib/offlineBooks';
import { InstallBanner } from '@/components/book/InstallBanner';
import { WifiOff } from 'lucide-react';

export default function BookReader() {
  const { slug = '' } = useParams<{ slug: string }>();
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [remote, setRemote] = useState<BookResponse | null | 'failed'>(null);
  const { pack, busy, install, online, ownerId } = useBookPack(slug);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState('all');
  const en = language === 'en';

  useEffect(() => {
    if (!online) { setRemote('failed'); return; }
    fetchBook(slug).then(setRemote).catch(() => setRemote('failed'));
  }, [slug, online, pack?.version]);

  // An up-to-date local pack is used first; the network copy is the fallback (and decides who may install).
  const data: BookResponse | null = pack
    ? packToBookResponse(pack)
    : remote === 'failed' ? (pack === undefined ? null : { found: false }) : remote;
  const canInstall = !!pack || (remote && remote !== 'failed' && (remote as any).can_install);

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    return (data?.recipes ?? []).filter((r) => matchesFilter(r, filter) && (!term ||
      `${r.preview.title ?? ''} ${r.preview.title_mr ?? ''}`.toLowerCase().includes(term)));
  }, [data, q, filter]);

  const shell = (children: React.ReactNode) => (
    <AppShell language={language} onLanguageToggle={() => setLanguage(en ? 'mr' : 'en')}>
      <SEO title="Your recipe book | RecipeMaker" description="Recipe book reader" url={`/book/${slug}`} noindex />
      <div className="max-w-2xl mx-auto pb-10">{children}</div>
    </AppShell>
  );

  if (!data) return shell(<div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>);
  if (!data.found || !data.book) {
    const msg = !online
      ? (ownerId ? (en ? 'You are offline and this book is not saved on this phone.' : 'तुम्ही ऑफलाइन आहात; हे पुस्तक फोनवर सेव्ह नाही.')
                 : (en ? 'You are offline. Connect and sign in to open your book.' : 'तुम्ही ऑफलाइन आहात. पुस्तक उघडण्यासाठी साइन इन करा.'))
      : (en ? 'This book is not available.' : 'हे पुस्तक उपलब्ध नाही.');
    return shell(<p className="py-16 text-center text-muted-foreground">{msg}</p>);
  }

  const owned = !!data.owned;

  return shell(
    <>
      <div className="flex items-start justify-between gap-2">
        <h1 className="font-display text-2xl font-bold">{data.book.creator_name}</h1>
        <div className="flex flex-wrap justify-end gap-1.5">
          {!online && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium"><WifiOff className="w-3 h-3" />{en ? 'Offline' : 'ऑफलाइन'}</span>}
          {pack && <span className="rounded-full bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-medium">{en ? 'Works offline' : 'ऑफलाइन चालते'}</span>}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {data.recipes?.length ?? 0} {en ? 'recipes' : 'रेसिपी'}
        {pack && ` · ${pack.recipes.length} ${en ? 'of' : 'पैकी'} ${data.recipes?.length ?? 0} ${en ? 'recipes saved on this phone' : 'रेसिपी या फोनवर'}`}
      </p>
      {canInstall && (
        <div className="mt-3">
          <InstallBanner installed={!!pack} count={pack?.recipes.length ?? 0} busy={busy} online={online} onInstall={install} en={en} />
        </div>
      )}
      {!owned && (
        <div className="mt-3 rounded-xl bg-primary/10 p-3 text-sm flex items-center justify-between gap-2">
          <span>{en ? 'You can read the free samples. Buy the book to open all recipes.' : 'मोफत नमुने वाचा. सर्व रेसिपीसाठी पुस्तक खरेदी करा.'}</span>
          <Link to={`/c/${slug}`}><Button size="sm">{en ? 'Get book' : 'पुस्तक घ्या'}</Button></Link>
        </div>
      )}
      <div className="relative mt-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={en ? 'Search this book' : 'या पुस्तकात शोधा'}
          className="w-full h-11 rounded-xl border border-border/70 bg-card pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {READER_FILTERS.map((f) => (
          <Chip key={f.key} active={filter === f.key} onClick={() => setFilter(f.key)}>{en ? f.en : f.mr}</Chip>
        ))}
      </div>
      <ul className="mt-4 divide-y divide-border/70 rounded-2xl border border-border/70 bg-card overflow-hidden">
        {rows.map((r) => {
          const open = owned || r.is_free_sample;
          const t = (en ? r.preview.title : r.preview.title_mr || r.preview.title) || '';
          return (
            <li key={r.video_id}>
              <Link to={open ? `/book/${slug}/${r.video_id}` : `/c/${slug}`} className="flex items-center gap-3 p-3 hover:bg-secondary/50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{t}</p>
                  {r.preview.prep_time && r.preview.prep_time !== 'unknown' && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" />{r.preview.prep_time}</p>
                  )}
                </div>
                {r.is_free_sample && !owned && <span className="text-[11px] rounded-full bg-primary/10 text-primary px-2 py-0.5">{en ? 'Free' : 'मोफत'}</span>}
                {open ? <ChevronRight className="w-4 h-4 text-muted-foreground" /> : <Lock className="w-4 h-4 text-muted-foreground" />}
              </Link>
            </li>
          );
        })}
        {rows.length === 0 && <li className="p-6 text-center text-sm text-muted-foreground">{en ? 'No recipes match.' : 'काही सापडले नाही.'}</li>}
      </ul>
    </>,
  );
}
