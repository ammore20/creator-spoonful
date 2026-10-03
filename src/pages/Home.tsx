import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { SEO } from '@/components/SEO';
import { Panel } from '@/components/ds/Panel';
import { EmptyState } from '@/components/ds/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BookOpen, ArrowRight } from 'lucide-react';
import { rupees } from '@/lib/books';

interface BookCard {
  id: string; slug: string; title_en: string; title_mr: string | null; cover_url: string | null;
  price_paise: number; list_price_paise: number | null; creator_name: string; recipe_count: number;
}

export const BookCover = ({ src, title, className = '' }: { src: string | null; title: string; className?: string }) =>
  src ? (
    <img src={src} alt={title} loading="lazy" className={`w-full h-full object-cover ${className}`} />
  ) : (
    <div className={`w-full h-full grid place-items-center bg-gradient-to-br from-primary/25 to-accent/30 ${className}`}>
      <BookOpen className="w-10 h-10 text-primary" />
    </div>
  );

function CodeBox({ en }: { en: boolean }) {
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const go = async () => {
    const c = code.trim();
    if (!/^[A-Za-z0-9]{4,20}$/.test(c)) { setMsg('That code is not valid.'); return; }
    const { data } = await (supabase as any).rpc('resolve_promo_code', { _code: c });
    if (data?.valid) nav(`/c/${data.slug}?code=${encodeURIComponent(c)}`);
    else setMsg(data?.reason === 'too_many_attempts' ? 'Too many tries. Please wait a few minutes.' : 'That code is not valid.');
  };
  return (
    <Panel className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-foreground">{en ? 'Have a creator code?' : 'क्रिएटर कोड आहे?'}</span>
      <Input value={code} onChange={(e) => { setCode(e.target.value); setMsg(''); }} placeholder="CODE" className="w-36 h-9" />
      <Button size="sm" onClick={go}>Apply</Button>
      {msg && <span className="text-sm text-destructive w-full">{msg}</span>}
    </Panel>
  );
}

export default function Home() {
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [books, setBooks] = useState<BookCard[] | null>(null);

  useEffect(() => {
    (supabase as any).rpc('get_published_books').then(({ data }: any) => setBooks(data ?? []));
  }, []);

  const en = language === 'en';

  return (
    <AppShell language={language} onLanguageToggle={() => setLanguage(en ? 'mr' : 'en')}>
      <SEO
        title="Recipe books from food creators | RecipeMaker"
        description="One book per creator. Pay once, cook offline. Every recipe from the channel, written out in English and Marathi."
        url="/"
      />
      <section className="pt-2 pb-6 sm:pb-8">
        <h1 className="font-display text-3xl sm:text-5xl font-bold text-foreground leading-tight">
          {en ? 'Recipe books from food creators' : 'फूड क्रिएटर्सची रेसिपी पुस्तके'}
        </h1>
        <p className="mt-2 text-base sm:text-lg text-muted-foreground">
          {en ? 'One book per creator. Pay once, cook offline.' : 'प्रत्येक क्रिएटरचे एक पुस्तक. एकदाच पैसे द्या.'}
        </p>
      </section>

      <CodeBox en={en} />

      {books === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="aspect-[3/4] rounded-2xl" />)}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          icon={<BookOpen className="w-6 h-6" />}
          title={en ? 'Books are on the way' : 'पुस्तके लवकरच'}
          description={en ? 'No book is published yet. You can still browse recipes.' : 'अजून पुस्तक प्रकाशित नाही.'}
          action={<Link to="/recipes"><Button>{en ? 'Browse recipes' : 'रेसिपी पहा'}</Button></Link>}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-5">
          {books.map((b) => (
            <Link key={b.id} to={`/c/${b.slug}`} className="group">
              <Panel padded={false} hover className="overflow-hidden h-full flex flex-col">
                <div className="aspect-[3/4] overflow-hidden">
                  <BookCover src={b.cover_url} title={b.title_en} className="transition-transform group-hover:scale-105" />
                </div>
                <div className="p-3 flex flex-col gap-1 flex-1">
                  <p className="font-semibold text-sm text-foreground line-clamp-1">{b.creator_name}</p>
                  <p className="text-xs text-muted-foreground">{b.recipe_count} {en ? 'recipes' : 'रेसिपी'}</p>
                  <p className="mt-auto pt-1 text-sm">
                    <span className="font-bold text-primary">{rupees(b.price_paise)}</span>
                  </p>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}

      <Panel className="mt-8 flex items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-foreground">{en ? 'Looking for a single recipe?' : 'एक रेसिपी शोधताय?'}</p>
          <p className="text-sm text-muted-foreground">{en ? 'Browse all recipes and open one free each day.' : 'सर्व रेसिपी पहा, रोज एक मोफत.'}</p>
        </div>
        <Link to="/recipes"><Button variant="outline" className="shrink-0">{en ? 'Recipes' : 'रेसिपी'} <ArrowRight className="ml-1.5 w-4 h-4" /></Button></Link>
      </Panel>
    </AppShell>
  );
}
