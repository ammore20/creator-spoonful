import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppShell } from '@/components/layout/AppShell';
import { SEO } from '@/components/SEO';
import { Panel } from '@/components/ds/Panel';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Clock, Gauge, Lock, Timer } from 'lucide-react';
import { ServingAdjuster } from '@/components/recipe/ServingAdjuster';
import { CookingTimer } from '@/components/recipe/CookingTimer';
import { parseServings, scaleIngredient } from '@/lib/scaleIngredient';
import { useBookPack } from '@/hooks/useBookPack';
import { WifiOff } from 'lucide-react';

type Access = 'granted' | 'locked' | 'login_required' | 'not_found' | 'offline';

const minutesFrom = (t?: string) => {
  const m = String(t ?? '').match(/(\d+)/);
  return m ? Math.min(Number(m[1]), 600) : 0;
};

export default function BookRecipe() {
  const { slug = '', recipeId = '' } = useParams();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [res, setRes] = useState<{ access: Access; recipe?: any; preview?: any; title?: string } | null>(null);
  const [servings, setServings] = useState(4);
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [timerMin, setTimerMin] = useState(10);
  const [showTimer, setShowTimer] = useState(false);
  const en = language === 'en';
  const { pack, online } = useBookPack(slug);

  useEffect(() => {
    if (pack === undefined) return; // wait for the local check
    const local = pack?.recipes.find((x) => x.video_id === recipeId);
    const apply = (r: any) => {
      setRes(r);
      if (r?.recipe) {
        setServings(parseServings(r.recipe.servings));
        const m = minutesFrom(r.recipe.prep_time);
        if (m) setTimerMin(m);
      }
      setChecked({});
    };
    // Saved copy first (works with no connection).
    if (local) { apply({ access: 'granted', recipe: local.recipe, title: local.title }); return; }
    if (!online) { setRes({ access: 'offline' as Access }); return; }
    setRes(null);
    (supabase as any).rpc('get_book_recipe', { _slug: slug, _video_id: recipeId }).then(({ data, error }: any) => {
      const r = error ? { access: (navigator.onLine ? 'not_found' : 'offline') as Access } : data;
      apply(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, recipeId, pack === undefined, pack?.version, online]);

  const shell = (children: React.ReactNode) => (
    <AppShell language={language} onLanguageToggle={() => setLanguage(en ? 'mr' : 'en')}>
      <SEO title={`${res?.recipe?.title || res?.title || 'Recipe'} | RecipeMaker`} description="Recipe from a creator book" url={`/book/${slug}/${recipeId}`} noindex />
      <div className="max-w-2xl mx-auto pb-12">
        <div className="flex items-center justify-between mb-3">
          <Link to={`/book/${slug}`} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"><ArrowLeft className="w-4 h-4" />{en ? 'Book' : 'पुस्तक'}</Link>
          {!online && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium"><WifiOff className="w-3 h-3" />{en ? 'Offline' : 'ऑफलाइन'}</span>}
        </div>
        {children}
      </div>
    </AppShell>
  );

  if (!res) return shell(<div className="space-y-3"><Skeleton className="h-8" /><Skeleton className="h-40" /><Skeleton className="h-60" /></div>);
  if (res.access === 'offline') return shell(<p className="py-16 text-center text-muted-foreground">{en ? 'You are offline and this recipe is not saved on this phone.' : 'तुम्ही ऑफलाइन आहात; ही रेसिपी फोनवर सेव्ह नाही.'}</p>);
  if (res.access === 'not_found') return shell(<p className="py-16 text-center text-muted-foreground">{en ? 'Recipe not found in this book.' : 'रेसिपी सापडली नाही.'}</p>);

  if (res.access !== 'granted') {
    return shell(
      <Panel className="text-center space-y-3 py-10">
        <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
        <h1 className="font-display text-xl font-bold">{res.preview?.title || res.title}</h1>
        <p className="text-sm text-muted-foreground">{en ? 'This recipe opens when you own the book.' : 'पुस्तक घेतल्यावर ही रेसिपी उघडेल.'}</p>
        {res.access === 'login_required' ? (
          <Button onClick={() => { sessionStorage.setItem('auth_return_to', `/book/${slug}/${recipeId}`); navigate('/auth'); }}>{en ? 'Sign in' : 'साइन इन'}</Button>
        ) : (
          <Link to={`/c/${slug}`}><Button>{en ? 'See the book' : 'पुस्तक पहा'}</Button></Link>
        )}
      </Panel>,
    );
  }

  const r = res.recipe || {};
  const base = parseServings(r.servings);
  const title = (en ? r.title : r.title_mr || r.title) || res.title;
  const ingredients: unknown[] = (en ? r.ingredients : (r.ingredients_mr?.length ? r.ingredients_mr : r.ingredients)) || [];
  const steps: string[] = (en ? r.steps : (r.steps_mr?.length ? r.steps_mr : r.steps)) || [];
  const known = (v?: string) => v && v !== 'unknown';

  return shell(
    <>
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-2xl sm:text-3xl font-bold">{title}</h1>
        <Button variant="outline" size="sm" onClick={() => setLanguage(en ? 'mr' : 'en')} className="shrink-0">{en ? 'मराठी' : 'English'}</Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {known(r.prep_time) && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs"><Clock className="w-3.5 h-3.5" />{r.prep_time}</span>}
        {known(r.difficulty) && <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs"><Gauge className="w-3.5 h-3.5" />{r.difficulty}</span>}
      </div>

      <Panel className="mt-5">
        <h2 className="font-display text-lg font-bold mb-3">{en ? 'Ingredients' : 'साहित्य'}</h2>
        <ServingAdjuster servings={servings} onChange={setServings} language={language} />
        <ul className="space-y-2.5">
          {ingredients.map((ing, i) => (
            <li key={i}>
              <label className="flex items-start gap-3 cursor-pointer">
                <Checkbox checked={!!checked[i]} onCheckedChange={(v) => setChecked((c) => ({ ...c, [i]: !!v }))} className="mt-0.5" />
                <span className={checked[i] ? 'line-through text-muted-foreground' : 'text-foreground'}>
                  {scaleIngredient(ing, servings / base, language)}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel className="mt-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="font-display text-lg font-bold">{en ? 'Steps' : 'कृती'}</h2>
          {showTimer ? (
            <CookingTimer key={timerMin} minutes={timerMin} onClose={() => setShowTimer(false)} />
          ) : (
            <div className="flex items-center gap-1.5">
              <input type="number" min={1} max={600} value={timerMin} onChange={(e) => setTimerMin(Math.max(1, Math.min(600, Number(e.target.value) || 1)))}
                className="w-16 h-8 rounded-lg border border-border bg-card px-2 text-sm" aria-label="Timer minutes" />
              <Button size="sm" variant="outline" onClick={() => setShowTimer(true)}><Timer className="w-4 h-4 mr-1" />{en ? 'Timer' : 'टायमर'}</Button>
            </div>
          )}
        </div>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <span className="w-6 h-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold grid place-items-center">{i + 1}</span>
              <p className="text-foreground leading-relaxed">{s}</p>
            </li>
          ))}
        </ol>
      </Panel>
    </>,
  );
}
