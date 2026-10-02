import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { SEO } from '@/components/SEO';
import { Panel } from '@/components/ds/Panel';
import { EmptyState } from '@/components/ds/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, WifiOff } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useOnline } from '@/hooks/useBookPack';
import { listPacks, offlineOwnerId } from '@/lib/offlineBooks';
import { BookCover } from './Home';

interface Row { id: string; slug: string; title_en: string; cover_url: string | null; creator_name: string; recipe_count: number; access_source?: string; saved?: number }

export default function Library() {
  const user = useCurrentUser();
  const online = useOnline();
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [books, setBooks] = useState<Row[] | null>(null);
  const en = language === 'en';
  const ownerId = user?.id ?? offlineOwnerId();

  useEffect(() => {
    let alive = true;
    (async () => {
      const local = ownerId ? await listPacks(ownerId) : [];
      const saved = new Map(local.map((p) => [p.slug, p]));
      let rows: Row[] = [];
      if (user && online) {
        const { data, error } = await (supabase as any).rpc('my_books');
        if (!error) rows = (data ?? []).map((b: any) => ({ ...b, saved: saved.get(b.slug)?.recipes.length }));
        else rows = [];
      }
      // Offline (or the server could not be reached): show what is saved on this phone.
      if (rows.length === 0 && local.length && (!online || !user)) {
        rows = local.map((p) => ({ id: p.book.id, slug: p.slug, title_en: p.book.title_en, cover_url: p.book.cover_url,
          creator_name: p.book.creator_name, recipe_count: p.recipes.length, saved: p.recipes.length }));
      }
      if (alive) setBooks(rows);
    })();
    return () => { alive = false; };
  }, [user, online, ownerId]);

  return (
    <AppShell language={language} onLanguageToggle={() => setLanguage(en ? 'mr' : 'en')}>
      <SEO title="My books | RecipeMaker" description="Your recipe books" url="/library" noindex />
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl font-bold">{en ? 'My books' : 'माझी पुस्तके'}</h1>
        {!online && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium"><WifiOff className="w-3 h-3" />{en ? 'Offline' : 'ऑफलाइन'}</span>}
      </div>
      {books === null ? <Skeleton className="h-40" /> : books.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-6 h-6" />} title={en ? 'No books yet' : 'अजून पुस्तके नाहीत'}
          description={!ownerId
            ? (en ? 'Sign in to see your books.' : 'तुमची पुस्तके पाहण्यासाठी साइन इन करा.')
            : (en ? 'Books you buy appear here once your payment is confirmed.' : 'पेमेंट निश्चित झाल्यावर पुस्तके इथे दिसतील.')}
          action={!ownerId ? <Link to="/auth"><Button>{en ? 'Sign in' : 'साइन इन'}</Button></Link> : <Link to="/"><Button>{en ? 'See books' : 'पुस्तके पहा'}</Button></Link>} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          {books.map((b) => (
            <Link key={b.id} to={`/book/${b.slug}`}>
              <Panel padded={false} hover className="overflow-hidden">
                <div className="aspect-[3/4]"><BookCover src={b.cover_url} title={b.title_en} /></div>
                <div className="p-3 space-y-1">
                  <p className="font-semibold text-sm line-clamp-1">{b.creator_name}</p>
                  <p className="text-xs text-muted-foreground">{b.recipe_count} {en ? 'recipes' : 'रेसिपी'}{b.access_source === 'subscription' ? (en ? ' · via membership' : ' · सदस्यत्व') : ''}</p>
                  {b.saved != null && <span className="inline-block rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-medium">{en ? 'Saved offline' : 'ऑफलाइन सेव्ह'}</span>}
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
