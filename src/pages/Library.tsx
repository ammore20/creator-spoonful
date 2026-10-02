import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { SEO } from '@/components/SEO';
import { Panel } from '@/components/ds/Panel';
import { EmptyState } from '@/components/ds/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen } from 'lucide-react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { BookCover } from './Home';

export default function Library() {
  const user = useCurrentUser();
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [books, setBooks] = useState<any[] | null>(null);
  const en = language === 'en';

  useEffect(() => {
    if (!user) { setBooks([]); return; }
    (supabase as any).rpc('my_books').then(({ data }: any) => setBooks(data ?? []));
  }, [user]);

  return (
    <AppShell language={language} onLanguageToggle={() => setLanguage(en ? 'mr' : 'en')}>
      <SEO title="My books | RecipeMaker" description="Your recipe books" url="/library" noindex />
      <h1 className="font-display text-2xl font-bold mb-4">{en ? 'My books' : 'माझी पुस्तके'}</h1>
      {books === null ? <Skeleton className="h-40" /> : books.length === 0 ? (
        <EmptyState icon={<BookOpen className="w-6 h-6" />} title={en ? 'No books yet' : 'अजून पुस्तके नाहीत'}
          description={en ? 'Books you buy appear here once your payment is confirmed.' : 'पेमेंट निश्चित झाल्यावर पुस्तके इथे दिसतील.'}
          action={<Link to="/"><Button>{en ? 'See books' : 'पुस्तके पहा'}</Button></Link>} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-5">
          {books.map((b) => (
            <Link key={b.id} to={`/book/${b.slug}`}>
              <Panel padded={false} hover className="overflow-hidden">
                <div className="aspect-[3/4]"><BookCover src={b.cover_url} title={b.title_en} /></div>
                <div className="p-3">
                  <p className="font-semibold text-sm line-clamp-1">{b.creator_name}</p>
                  <p className="text-xs text-muted-foreground">{b.recipe_count} {en ? 'recipes' : 'रेसिपी'}{b.access_source === 'subscription' ? (en ? ' · via membership' : ' · सदस्यत्व') : ''}</p>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
  );
}
