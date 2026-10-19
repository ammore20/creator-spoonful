import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, List, Maximize2, Minimize2, Timer, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { CookingTimer } from '@/components/recipe/CookingTimer';
import { ServingAdjuster } from '@/components/recipe/ServingAdjuster';
import { supabase } from '@/integrations/supabase/client';
import type { BookResponse } from '@/lib/books';
import type { OfflinePack } from '@/lib/offlineBooks';
import { parseServings, scaleIngredient } from '@/lib/scaleIngredient';
import { buildBookPages, recipePageIndex, swipeDirection, jumpMode, visiblePageIndices, type BookPage } from '@/lib/bookPages';

type Props = { data: BookResponse; pack?: OfflinePack | null; online: boolean; slug: string; language: 'en' | 'mr'; recipeId?: string };
type RecipeResult = { access: string; recipe?: any; title?: string };
type CookingState = { servings?: number; ingredients: Record<number, boolean>; steps: Record<number, boolean> };
const groups: Record<string, [string, string]> = { breakfast: ['Breakfast', 'नाश्ता'], lunch: ['Lunch', 'दुपारचे जेवण'], dinner: ['Dinner', 'रात्रीचे जेवण'], snacks: ['Snacks', 'स्नॅक्स'], sweet: ['Sweet', 'गोड'], other: ['Other', 'इतर'] };
const interactive = 'button,input,a,select,textarea,label,[role="checkbox"],[data-book-interactive]';

export function FlipBook({ data, pack, online, slug, language, recipeId }: Props) {
  const en = language === 'en';
  const rows = data.recipes ?? [];
  const pages = useMemo(() => buildBookPages(rows), [data.recipes]);
  const [current, setCurrent] = useState(() => Math.max(0, recipeId ? recipePageIndex(pages, recipeId) : 0));
  const [turn, setTurn] = useState<{ from: number; to: number; direction: number; fast: boolean; fade: boolean } | null>(null);
  const target = useRef(current);
  const currentRef = useRef(current);
  const turning = useRef(false);
  const timeout = useRef<ReturnType<typeof setTimeout>>();
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const [remoteRecipes, setRemoteRecipes] = useState<Record<string, RecipeResult>>({});
  const requests = useRef(new Set<string>());
  const [cooking, setCooking] = useState<Record<string, CookingState>>({});
  const [timers, setTimers] = useState<Record<string, number>>({});
  const reduced = useRef(false);
  const [full, setFull] = useState(false);
  useEffect(() => {
    if (!full) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', esc);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', esc); };
  }, [full]);
  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = query.matches;
    const update = () => { reduced.current = query.matches; };
    query.addEventListener('change', update);
    return () => { query.removeEventListener('change', update); clearTimeout(timeout.current); };
  }, []);

  const performTurn = useCallback(function step(fast = false) {
    const from = currentRef.current;
    const destination = Math.max(0, Math.min(pages.length - 1, target.current));
    if (from === destination) { turning.current = false; return; }
    const fade = reduced.current || jumpMode(from, destination) === 'fade';
    const direction = destination > from ? 1 : -1;
    const to = fade ? destination : from + direction;
    turning.current = true;
    setTurn({ from, to, direction, fast, fade });
    timeout.current = setTimeout(() => {
      currentRef.current = to;
      setCurrent(to);
      setTurn(null);
      turning.current = false;
      if (to !== target.current) step(true);
    }, fade ? 180 : fast ? 180 : 750);
  }, [pages.length]);

  const go = useCallback((to: number) => {
    if (turning.current) return;
    target.current = Math.max(0, Math.min(pages.length - 1, to));
    performTurn(Math.abs(to - currentRef.current) > 1);
  }, [pages.length, performTurn]);
  useEffect(() => {
    if (!recipeId) return;
    const index = recipePageIndex(pages, recipeId);
    if (index >= 0) { clearTimeout(timeout.current); turning.current = false; target.current = index; currentRef.current = index; setCurrent(index); setTurn(null); }
  }, [recipeId, pages]);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.target instanceof Element && event.target.closest(interactive)) return;
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); go(currentRef.current + (event.key === 'ArrowRight' ? 1 : -1)); }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [go]);

  // The saved pack is the only source offline. Online, reuse the existing access-checked recipe RPC on demand.
  const activeRecipe = pages[turn?.to ?? current]?.recipeId;
  useEffect(() => {
    if (!online || !activeRecipe || pack?.recipes.some(r => r.video_id === activeRecipe) || remoteRecipes[activeRecipe] || requests.current.has(activeRecipe)) return;
    requests.current.add(activeRecipe);
    let alive = true;
    (supabase as any).rpc('get_book_recipe', { _slug: slug, _video_id: activeRecipe }).then(({ data: result, error }: any) => {
      requests.current.delete(activeRecipe);
      if (alive) setRemoteRecipes(previous => ({ ...previous, [activeRecipe]: error ? { access: 'error' } : result ?? { access: 'not_found' } }));
    });
    return () => { alive = false; requests.current.delete(activeRecipe); };
  }, [activeRecipe, online, pack, remoteRecipes, slug]);
  const updateCooking = (id: string, update: (state: CookingState) => CookingState) => setCooking(previous => ({ ...previous, [id]: update(previous[id] ?? { ingredients: {}, steps: {} }) }));
  const book = data.book;
  if (!book) return null;
  const creator = book.creator;
  const channel = creator?.channel_id;
  const channelUrl = channel ? `https://www.youtube.com/${channel.startsWith('@') ? channel : `channel/${encodeURIComponent(channel)}`}` : null;
  const text = (english?: string, marathi?: string) => en ? english : marathi || english;

  function pageContent(page: BookPage) {
    if (!book) return null;
    if (page.kind === 'cover') return <div className="flip-cover">
      <div className="p-8"><h2 className="text-3xl font-display font-bold">{book.creator_name}</h2><p className="mt-3">{rows.length} {en ? 'recipes' : 'रेसिपी'}</p></div>
      {book.cover_url && <img src={book.cover_url} alt={text(book.title_en, book.title_mr ?? undefined)} className="absolute inset-0 h-full w-full object-cover" onError={e => { e.currentTarget.hidden = true; }} />}
      <span className="flip-cover-hint">{en ? 'Swipe to open' : 'उघडण्यासाठी स्वाइप करा'}</span>
    </div>;
    if (page.kind === 'creator') return <div className="flip-content space-y-5">
      <p className="text-sm text-muted-foreground">{en ? 'About the creator' : 'निर्मात्याबद्दल'}</p>
      <div className="relative h-28 w-28 overflow-hidden rounded-full bg-secondary grid place-items-center text-3xl font-display" aria-label={book.creator_name}>
        {book.creator_name.split(/\s+/).slice(0, 2).map(n => n[0]).join('')}
        {creator?.photo_url && <img className="absolute inset-0 w-full h-full object-cover" src={creator.photo_url} alt={book.creator_name} onError={e => { e.currentTarget.hidden = true; }} />}
      </div>
      <h2 className="text-2xl font-display font-bold">{book.creator_name}</h2>
      {text(creator?.bio_en ?? undefined, creator?.bio_mr ?? undefined) && <p className="whitespace-pre-line leading-relaxed">{text(creator?.bio_en ?? undefined, creator?.bio_mr ?? undefined)}</p>}
      {channelUrl && <a href={channelUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline break-words">{en ? 'Creator’s channel' : 'निर्मात्याचे चॅनल'}</a>}
    </div>;
    if (page.kind === 'contents') return <div className="flip-content">
      <h2 className="text-2xl font-display font-bold mb-4">{en ? 'Contents' : 'अनुक्रमणिका'}</h2>
      {page.entries?.map(({ row, group }, i, entries) => <div key={row.video_id}>
        {(i === 0 || entries[i - 1]?.group !== group) && <h3 className="text-sm font-bold text-primary mt-4 mb-1">{groups[group]?.[en ? 0 : 1]}</h3>}
        <Button variant="ghost" onClick={() => go(recipePageIndex(pages, row.video_id))} className="w-full h-auto min-h-10 justify-between gap-3 text-left px-0 py-2 border-b rounded-none">
          <span className="min-w-0 whitespace-normal break-words">{text(row.preview.title, row.preview.title_mr)}</span><span className="text-muted-foreground shrink-0">{recipePageIndex(pages, row.video_id) + 1}</span>
        </Button>
      </div>)}
    </div>;
    if (page.kind === 'end') return <div className="flip-content h-full flex flex-col items-center justify-center gap-5"><h2 className="text-3xl font-display font-bold">{en ? 'The end' : 'समाप्त'}</h2><Button variant="outline" onClick={() => go(2)}>{en ? 'Contents' : 'अनुक्रमणिका'}</Button></div>;
    const id = page.recipeId ?? '';
    const row = rows.find(r => r.video_id === id);
    const local = pack?.recipes.find(r => r.video_id === id);
    const result = local ? { access: 'granted', recipe: local.recipe, title: local.title } : remoteRecipes[id];
    const r = result?.access === 'granted' ? result.recipe : null;
    const title = text(r?.title || row?.preview.title, r?.title_mr || row?.preview.title_mr);
    if (!r) return <div className="flip-content space-y-4"><h2 className="text-xl font-bold">{title}</h2>{!result && online ? <><Skeleton className="h-40" /><Skeleton className="h-20" /></> : <><p className="text-muted-foreground">{!online ? (en ? 'This recipe is not saved on this phone.' : 'ही रेसिपी या फोनवर सेव्ह नाही.') : (en ? 'Unable to open this recipe.' : 'ही रेसिपी उघडता आली नाही.')}</p>{online && <Button variant="outline" onClick={() => setRemoteRecipes(previous => { const next = { ...previous }; delete next[id]; return next; })}>{en ? 'Try again' : 'पुन्हा प्रयत्न करा'}</Button>}</>}</div>;
    const base = parseServings(r.servings);
    const state = cooking[id] ?? { ingredients: {}, steps: {} };
    const servings = state.servings ?? base;
    if (page.kind === 'photo') return <div>
      {row?.thumbnail_url && <img src={row.thumbnail_url} alt={title} className="w-full aspect-video object-cover" onError={e => { e.currentTarget.hidden = true; }} />}
      <div className="flip-content space-y-4"><h2 className="text-2xl font-display font-bold">{title}</h2>
        <div className="flex flex-wrap gap-2 text-xs">{[r.prep_time, r.difficulty].filter(v => v && v !== 'unknown').map((v, i) => <span key={i} className="bg-secondary rounded-full px-3 py-1">{String(v)}</span>)}<span className="inline-flex items-center gap-1 bg-secondary rounded-full px-3 py-1"><Users className="w-3 h-3" />{base}</span></div>
        {text(r.description, r.description_mr) && <p className="leading-relaxed whitespace-pre-line">{text(r.description, r.description_mr)}</p>}
      </div>
    </div>;
    if (page.kind === 'ingredients') {
      const ingredients: unknown[] = (en ? r.ingredients : r.ingredients_mr?.length ? r.ingredients_mr : r.ingredients) ?? [];
      return <div className="flip-content"><p className="text-sm text-muted-foreground mb-2">{title}</p><h2 className="text-2xl font-display font-bold mb-4">{en ? 'Ingredients' : 'साहित्य'}</h2>
        <ServingAdjuster servings={servings} language={language} onChange={value => updateCooking(id, s => ({ ...s, servings: value }))} />
        <ul className="space-y-4">{ingredients.map((ing, i) => <li key={i}><label className="flex items-start gap-3 cursor-pointer"><Checkbox className="mt-1" aria-label={`${en ? 'Ingredient' : 'साहित्य'} ${i + 1}`} checked={!!state.ingredients[i]} onCheckedChange={value => updateCooking(id, s => ({ ...s, ingredients: { ...s.ingredients, [i]: !!value } }))} /><span className={state.ingredients[i] ? 'line-through text-muted-foreground' : ''}>{scaleIngredient(ing, servings / base, language)}</span></label></li>)}</ul>
      </div>;
    }
    const steps: string[] = (en ? r.steps : r.steps_mr?.length ? r.steps_mr : r.steps) ?? [];
    return <div className="flip-content"><p className="text-sm text-muted-foreground mb-2">{title}</p><h2 className="text-2xl font-display font-bold mb-4">{en ? 'Steps' : 'कृती'}</h2>
      <ol className="space-y-5">{steps.map((step, i) => {
        const ascii = step.replace(/[०-९]/g, d => String('०१२३४५६७८९'.indexOf(d)));
        const match = ascii.match(/(\d+)\s*(?:min(?:ute)?s?|मिनिटे?|मिनिटं)/i);
        const minutes = match ? Math.max(1, Math.min(600, Number(match[1]))) : null;
        const timerKey = `${id}:${i}`;
        return <li key={i}><div className="flex items-start gap-2"><Checkbox className="mt-1" aria-label={`${en ? 'Step' : 'पायरी'} ${i + 1}`} checked={!!state.steps[i]} onCheckedChange={value => updateCooking(id, s => ({ ...s, steps: { ...s.steps, [i]: !!value } }))} /><span className="text-primary font-bold shrink-0">{i + 1}.</span><p className={`leading-relaxed ${state.steps[i] ? 'line-through text-muted-foreground' : ''}`}>{step}</p></div>
          {minutes && <div data-book-interactive className="mt-2 ml-7">{timers[timerKey] ? <CookingTimer minutes={timers[timerKey]} onClose={() => {}} /> : <Button variant="outline" size="sm" onClick={() => setTimers(t => ({ ...t, [timerKey]: minutes }))}><Timer className="w-4 h-4 mr-1" />{minutes} {en ? 'min' : 'मिनिटे'}</Button>}</div>}
        </li>;
      })}</ol>
    </div>;
  }
  const mounted = new Set(visiblePageIndices(current, pages.length));
  if (turn) mounted.add(turn.to);
  return <section className={`flip-reader${full ? ' flip-full' : ''}`} aria-label={en ? 'Book reader' : 'पुस्तक वाचक'}>
    <div className="flex justify-end mb-2"><Button size="icon" variant="outline" onClick={() => setFull(f => !f)} aria-label={full ? (en ? 'Exit full screen' : 'पूर्ण स्क्रीन बंद') : (en ? 'Full screen' : 'पूर्ण स्क्रीन')}>{full ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}</Button></div>
    <div className="flip-stage" onPointerDown={event => {
      if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0) || (event.target instanceof Element && event.target.closest(interactive))) { pointer.current = null; return; }
      pointer.current = { x: event.clientX, y: event.clientY };
      event.currentTarget.setPointerCapture(event.pointerId);
    }} onPointerCancel={() => { pointer.current = null; }} onPointerUp={event => {
      const start = pointer.current; pointer.current = null;
      if (!start) return;
      const direction = swipeDirection(event.clientX - start.x, event.clientY - start.y);
      if (direction) go(currentRef.current + direction);
    }}>
      {[...mounted].map(index => {
        const page = pages[index];
        const active = index === current || index === turn?.to;
        const animated = turn && (turn.direction === 1 || turn.fade ? index === turn.from : index === turn.to);
        const animation = animated ? ` ${turn?.fade ? 'flip-fade' : turn?.direction === 1 ? 'flip-forward' : 'flip-backward'}${turn?.fast ? ' flip-fast' : ''}` : '';
        return <article key={index} ref={element => { if (element) element.toggleAttribute('inert', index !== current); }} className={`flip-page${active ? ' flip-visible' : ''}${animated ? ' flip-turning' : ''}${animation}`} aria-hidden={index !== current}>
          <div className="flip-scroll" key={page.recipeId ? `${page.recipeId}:${page.kind}` : index}>{pageContent(page)}</div>
          <div className="flip-spine" /><div className="flip-turn-shadow" />
        </article>;
      })}
    </div>
    <nav className="flex items-center justify-between gap-1 mt-3" aria-label={en ? 'Page navigation' : 'पान नेव्हिगेशन'}>
      <Button size="sm" variant="outline" disabled={current === 0 || !!turn} onClick={() => go(current - 1)} aria-label={en ? 'Back page' : 'मागील पान'}><ArrowLeft className="w-4 h-4" /><span className="ml-1">{en ? 'Back' : 'मागे'}</span></Button>
      <span className="text-sm tabular-nums" aria-live="polite" data-testid="book-counter">{current + 1} / {pages.length}</span>
      <Button variant="ghost" size="icon" onClick={() => go(2)} disabled={!!turn} aria-label={en ? 'Contents' : 'अनुक्रमणिका'} title={en ? 'Contents' : 'अनुक्रमणिका'}><List className="w-4 h-4" /></Button>
      <Button size="sm" variant="outline" disabled={current === pages.length - 1 || !!turn} onClick={() => go(current + 1)} aria-label={en ? 'Next page' : 'पुढील पान'}><span className="mr-1">{en ? 'Next' : 'पुढे'}</span><ArrowRight className="w-4 h-4" /></Button>
    </nav>
  </section>;
}