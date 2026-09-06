import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FilterOptions, MealType } from '@/types/recipe';
import { AppShell } from '@/components/layout/AppShell';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeCardSkeleton } from '@/components/RecipeCardSkeleton';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ds/Panel';
import { Chip } from '@/components/ds/Chip';
import { SectionHeader } from '@/components/ds/SectionHeader';
import { EmptyState } from '@/components/ds/EmptyState';
import { StatCard } from '@/components/ds/StatCard';
import {
  PartyPopper, X, Flame, Zap, Sparkles, Gift, ArrowRight, SlidersHorizontal,
  Search as SearchIcon, BookOpen, Clock, Crown, ChevronRight,
} from 'lucide-react';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

const FilterBar = lazy(() => import('@/components/FilterBar').then(m => ({ default: m.FilterBar })));
const Footer = lazy(() => import('@/components/Footer').then(m => ({ default: m.Footer })));

const CATEGORIES: { key: 'all' | MealType; icon: string; en: string; mr: string }[] = [
  { key: 'all', icon: '🍽️', en: 'All', mr: 'सर्व' },
  { key: 'Breakfast', icon: '🌅', en: 'Breakfast', mr: 'नाश्ता' },
  { key: 'Snack', icon: '🍿', en: 'Snacks', mr: 'चाळण' },
  { key: 'Lunch', icon: '🍱', en: 'Lunch', mr: 'दुपार' },
  { key: 'Dinner', icon: '🌙', en: 'Dinner', mr: 'रात्र' },
  { key: 'Dessert', icon: '🍨', en: 'Dessert', mr: 'मिठाई' },
];

const GREETINGS = {
  en: ['Good morning', 'Good afternoon', 'Good evening'],
  mr: ['सुप्रभात', 'नमस्कार', 'शुभ संध्याकाळ'],
};

const IndexContent = () => {
  const [searchParams] = useSearchParams();
  const { user, isPremium, subscriptionDetails } = usePremiumStatus();
  const [showFreeBanner, setShowFreeBanner] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (searchParams.get('creator_access') === 'true') {
      sessionStorage.setItem('creator_preview', 'true');
    }
  }, [searchParams]);

  useEffect(() => {
    const refSlug = localStorage.getItem('ref_creator_slug');
    if (user && isPremium && refSlug && subscriptionDetails?.amount === 0) {
      const dismissed = sessionStorage.getItem('free_banner_dismissed');
      if (!dismissed) setShowFreeBanner(true);
    }
  }, [user, isPremium, subscriptionDetails]);

  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const RECIPES_PER_PAGE = 12;
  const [filters, setFilters] = useState<FilterOptions>({
    creator: [], tasteProfile: [], mealType: [], cuisine: [], mood: [], cookTimeRange: [], dietType: [],
  });

  useEffect(() => { fetchRecipes(true); }, []);

  const fetchRecipes = async (reset = false) => {
    try {
      const currentPage = reset ? 0 : page;
      if (reset) { setLoading(true); setRecipes([]); } else { setLoadingMore(true); }

      const from = currentPage * RECIPES_PER_PAGE;
      const to = from + RECIPES_PER_PAGE - 1;

      const { data, error, count } = await (supabase as any)
        .from('public_videos')
        .select(`id, video_id, title, description, thumbnail_url, published_at, recipe_preview, creator_name`, { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const transformed = data?.map((video: any) => {
        const recipe = (video.recipe_preview as any) || {};
        return {
          id: video.video_id,
          title: recipe.title || video.title,
          creator: video.creator_name || 'Unknown',
          description: video.description || '',
          youtubeUrl: `https://www.youtube.com/watch?v=${video.video_id}`,
          videoId: video.video_id,
          thumbnailUrl: video.thumbnail_url,
          tasteProfile: Array.isArray(recipe.taste_tags) ? recipe.taste_tags : [],
          mealType: recipe.meal_type ? [recipe.meal_type] : [],
          cuisine: recipe.cuisine ? [recipe.cuisine] : [],
          mood: [],
          difficulty: recipe.difficulty || 'Medium',
          cookTime: recipe.prep_time || '30 mins',
          servings: recipe.servings || 4,
          ingredientCount: recipe.ingredient_count ?? 0,
          stepCount: recipe.step_count ?? 0,
          ingredients: [],
          steps: [],
          isPremium: false,
        };
      }) || [];

      const valid = transformed.filter((r) => {
        const t = r.title.toLowerCase();
        const bad = t.includes('no recipe') || t.includes('not found') || t.includes('no specific') || t === 'recipe' || t === 'cooking' || t === 'food';
        return !bad && r.ingredientCount >= 5 && r.stepCount >= 5;
      });

      setRecipes(prev => reset ? valid : [...prev, ...valid]);
      setHasMore(valid.length === RECIPES_PER_PAGE && (count || 0) > to + 1);
      setPage(currentPage + 1);
    } catch (error) {
      logger.error('index.fetch_recipes_failed', { error: error as Error });
      toast.error(language === 'en' ? 'Failed to load recipes' : 'रेसिपी लोड करण्यात अयशस्वी', {
        description: language === 'en' ? 'Please check your connection and try again.' : 'कृपया तुमचे कनेक्शन तपासा.',
      });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => { if (!loadingMore && hasMore) fetchRecipes(false); };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const s = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery ||
        recipe.title.toLowerCase().includes(s) ||
        recipe.description.toLowerCase().includes(s) ||
        (recipe.titleMr && recipe.titleMr.toLowerCase().includes(s));

      const matchesCreator = filters.creator.length === 0 || filters.creator.includes(recipe.creator);
      const matchesTaste = filters.tasteProfile.length === 0 || filters.tasteProfile.some((t) => recipe.tasteProfile.includes(t));
      const matchesMeal = filters.mealType.length === 0 || filters.mealType.some((m) => recipe.mealType.includes(m));
      const matchesCuisine = filters.cuisine.length === 0 || filters.cuisine.some((c) => recipe.cuisine.includes(c));
      const matchesMood = filters.mood.length === 0 || filters.mood.some((m) => recipe.mood.includes(m));

      const matchesCookTime = (() => {
        if (filters.cookTimeRange.length === 0) return true;
        const timeStr = (recipe.cookTime || '').toLowerCase();
        const minutes = parseInt(timeStr) || 30;
        const adj = timeStr.includes('hour') ? minutes * 60 : minutes;
        return filters.cookTimeRange.some((r) => (r === 'Quick' ? adj <= 20 : r === 'Medium' ? adj > 20 && adj <= 45 : adj > 45));
      })();

      const matchesDiet = (() => {
        if (filters.dietType.length === 0) return true;
        const ing = recipe.ingredients.join(' ').toLowerCase();
        const title = recipe.title.toLowerCase();
        const nv = ['chicken','mutton','fish','prawn','shrimp','meat','lamb','pork','crab','surmai','pomfret','bombil','kolambi','kombdi','murg','keema','gosht','चिकन','मटण','मासा','कोळंबी','सुरमई','मांस'];
        const eg = ['egg','anda','अंड'];
        const hasNV = nv.some(k => ing.includes(k) || title.includes(k));
        const hasEgg = eg.some(k => ing.includes(k) || title.includes(k));
        return filters.dietType.some((d) => d === 'Veg' ? (!hasNV && !hasEgg) : d === 'Non-Veg' ? hasNV : d === 'Egg' ? hasEgg : false);
      })();

      return matchesSearch && matchesCreator && matchesTaste && matchesMeal && matchesCuisine && matchesMood && matchesCookTime && matchesDiet;
    });
  }, [recipes, searchQuery, filters]);

  const hasActiveFilters = Object.values(filters).some(a => a.length > 0);
  useEffect(() => {
    if (hasActiveFilters && filteredRecipes.length < 4 && hasMore && !loading && !loadingMore) fetchRecipes(false);
  }, [filteredRecipes.length, hasActiveFilters, hasMore, loading, loadingMore]);

  const quickBites = useMemo(() =>
    filteredRecipes.filter((r) => {
      const t = (r.cookTime || '').toLowerCase();
      const m = parseInt(t) || 30;
      return (t.includes('hour') ? m * 60 : m) <= 20;
    }), [filteredRecipes]);

  const groupedRecipes = useMemo(() => {
    const meals: MealType[] = ['Breakfast', 'Snack', 'Lunch', 'Dinner', 'Dessert'];
    const g: Record<string, typeof filteredRecipes> = {};
    meals.forEach(m => { g[m] = filteredRecipes.filter(r => r.mealType.includes(m)); });
    g['Other'] = filteredRecipes.filter(r => r.mealType.length === 0);
    return g;
  }, [filteredRecipes]);

  const freeRecipe = useMemo(() => {
    if (recipes.length === 0) return null;
    const today = new Date().toISOString().split('T')[0];
    const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
    const idx = seed % recipes.length;
    const r = recipes[idx];
    localStorage.setItem('free_recipe_of_day', r.id);
    localStorage.setItem('free_recipe_date', today);
    return r;
  }, [recipes]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? GREETINGS[language][0] : hour < 17 ? GREETINGS[language][1] : GREETINGS[language][2];
  const firstName = user?.email?.split('@')[0]?.split('.')[0] ?? (language === 'en' ? 'Chef' : 'शेफ');

  const grid = 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4';

  return (
    <AppShell
      language={language}
      onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')}
      onSearch={setSearchQuery}
    >
      <SEO
        title="RecipeMaker - Discover & Personalize Authentic Marathi Recipes"
        description="Discover and personalize authentic Marathi recipes with step-by-step videos, ingredients, and instructions."
        url="/"
        structuredData={{
          "@context": "https://schema.org", "@type": "WebSite", "name": "RecipeMaker",
          "url": "https://recipemaker.in",
          "description": "Discover and personalize authentic Marathi recipes",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://recipemaker.in/?search={search_term_string}",
            "query-input": "required name=search_term_string",
          },
        }}
      />

      {/* Greeting */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-2xl sm:text-[28px] font-bold text-foreground leading-tight">
            {greeting}, <span className="text-primary capitalize">{firstName}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'en'
              ? 'What are we cooking today? Fresh recipes, updated daily.'
              : 'आज काय बनवायचं? रोज नवीन रेसिपी.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowFilters((v) => !v)} className="gap-2">
            <SlidersHorizontal className="w-4 h-4" />
            {language === 'en' ? 'Filters' : 'फिल्टर्स'}
          </Button>
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-card border border-border/70 px-3 py-1.5 text-xs text-muted-foreground">
            <BookOpen className="w-3.5 h-3.5 text-primary" />
            {recipes.length} {language === 'en' ? 'recipes loaded' : 'रेसिपी'}
          </span>
        </div>
      </div>

      {showFreeBanner && (
        <Panel className="relative mb-5 border-primary/25 bg-primary/[0.06]">
          <button
            onClick={() => { setShowFreeBanner(false); sessionStorage.setItem('free_banner_dismissed', 'true'); }}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary/12 grid place-items-center shrink-0">
              <PartyPopper className="w-5 h-5 text-primary" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-foreground">
                {language === 'en' ? "You're one of the first 50!" : 'तुम्ही पहिल्या ५० मध्ये आहात!'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {language === 'en' ? '1 month of free premium unlocked.' : '१ महिन्याचा मोफत प्रीमियम अनलॉक.'}
              </p>
            </div>
          </div>
        </Panel>
      )}

      {/* Category chips */}
      <div className="sticky top-16 z-30 -mx-3 sm:-mx-6 px-3 sm:px-6 py-2.5 bg-background/90 backdrop-blur mb-5">
        <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {CATEGORIES.map((c) => {
            const active = c.key === 'all' ? filters.mealType.length === 0 : filters.mealType.includes(c.key as MealType);
            return (
              <Chip
                key={c.key}
                active={active}
                icon={<span className="text-base leading-none">{c.icon}</span>}
                onClick={() => setFilters({ ...filters, mealType: c.key === 'all' ? [] : [c.key as MealType] })}
              >
                {language === 'en' ? c.en : c.mr}
              </Chip>
            );
          })}
        </div>
      </div>

      {showFilters && (
        <Panel className="mb-6 p-0 overflow-hidden">
          <Suspense fallback={<div className="h-20" />}>
            <FilterBar filters={filters} onFilterChange={setFilters} language={language} />
          </Suspense>
        </Panel>
      )}

      <div id="recipes-section">
        {loading ? (
          <div className={grid}>
            {[...Array(8)].map((_, i) => <RecipeCardSkeleton key={i} />)}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="space-y-8 sm:space-y-10">

            {/* Featured of the day + side tiles */}
            {freeRecipe && (
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
                <Link
                  to={`/recipe/${freeRecipe.id}`}
                  className="lg:col-span-2 relative group overflow-hidden rounded-2xl border border-border/70 shadow-soft hover:shadow-card transition-shadow"
                >
                  <div className="aspect-[16/9] overflow-hidden bg-muted">
                    <img
                      src={freeRecipe.thumbnailUrl}
                      alt={freeRecipe.title}
                      loading="eager"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/30 to-transparent" />
                  <div className="absolute top-4 left-4 flex gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-card/95 px-3 py-1 text-[11px] font-semibold text-foreground">
                      <Gift className="w-3.5 h-3.5 text-primary" />
                      {language === 'en' ? "Today's free recipe" : 'आजची मोफत रेसिपी'}
                    </span>
                    <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-foreground/60 px-3 py-1 text-[11px] font-semibold text-background backdrop-blur">
                      <Clock className="w-3 h-3" /> {freeRecipe.cookTime}
                    </span>
                  </div>
                  <div className="absolute bottom-0 inset-x-0 p-4 sm:p-6 text-background">
                    <p className="text-xs opacity-85 mb-1">by {freeRecipe.creator}</p>
                    <h2 className="font-display text-xl sm:text-2xl font-bold leading-tight line-clamp-2 mb-3">
                      {freeRecipe.title}
                    </h2>
                    <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-pill">
                      {language === 'en' ? 'Cook now' : 'बनवा'} <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>

                <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4">
                  <button
                    onClick={() => setFilters({ ...filters, cookTimeRange: ['Quick'] })}
                    className="group text-left rounded-2xl border border-border/70 bg-card p-4 shadow-soft hover:shadow-card hover:border-primary/30 transition-all"
                  >
                    <span className="w-9 h-9 rounded-xl bg-accent/20 grid place-items-center mb-3">
                      <Zap className="w-4 h-4 text-accent-foreground" />
                    </span>
                    <h3 className="font-display text-base font-bold text-foreground leading-tight">
                      {language === 'en' ? 'In a hurry?' : 'घाईत आहात?'}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1 mb-2">
                      {language === 'en' ? `${quickBites.length} recipes under 20 min` : `२० मिनिटांच्या ${quickBites.length} रेसिपी`}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      {language === 'en' ? 'Show quick bites' : 'पहा'}
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>

                  <Link
                    to="/premium"
                    className="group rounded-2xl border border-border/70 bg-foreground p-4 text-background shadow-soft hover:shadow-card transition-all"
                  >
                    <span className="w-9 h-9 rounded-xl bg-background/15 grid place-items-center mb-3">
                      <Crown className="w-4 h-4 text-primary-glow" />
                    </span>
                    <h3 className="font-display text-base font-bold leading-tight">
                      {language === 'en' ? 'Unlock every recipe' : 'सर्व रेसिपी अनलॉक करा'}
                    </h3>
                    <p className="text-xs opacity-75 mt-1 mb-2">
                      {language === 'en' ? 'Premium from ₹49/mo' : 'फक्त ₹४९/महिना'}
                    </p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary-glow">
                      {language === 'en' ? 'Go premium' : 'प्रीमियम मिळवा'}
                      <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </div>
              </section>
            )}

            {/* Stats strip */}
            <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard icon={<BookOpen className="w-4 h-4" />} value={recipes.length} label={language === 'en' ? 'Recipes available' : 'उपलब्ध रेसिपी'} />
              <StatCard icon={<Zap className="w-4 h-4" />} tone="accent" value={quickBites.length} label={language === 'en' ? 'Under 20 minutes' : '२० मिनिटांत'} />
              <StatCard icon={<Flame className="w-4 h-4" />} value={Object.values(groupedRecipes).filter(l => l.length > 0).length} label={language === 'en' ? 'Meal categories' : 'श्रेणी'} />
              <StatCard icon={<Sparkles className="w-4 h-4" />} tone="neutral" value={isPremium ? (language === 'en' ? 'Active' : 'सक्रिय') : (language === 'en' ? 'Free' : 'मोफत')} label={language === 'en' ? 'Your plan' : 'तुमची योजना'} />
            </section>

            {/* Hot right now */}
            {filteredRecipes.length > 2 && (
              <section>
                <SectionHeader
                  icon={<Flame className="w-4 h-4" />}
                  title={language === 'en' ? 'Hot right now' : 'सध्या ट्रेंडिंग'}
                  subtitle={language === 'en' ? "What everyone's cooking today" : 'आज सर्वजण काय बनवत आहेत'}
                />
                <div className={grid}>
                  {filteredRecipes.slice(0, 8).map((r) => (
                    <RecipeCard key={`hot-${r.id}`} recipe={r} language={language} loading="lazy" />
                  ))}
                </div>
              </section>
            )}

            {/* Quick bites */}
            {quickBites.length >= 3 && (
              <section>
                <SectionHeader
                  icon={<Zap className="w-4 h-4" />}
                  title={language === 'en' ? 'Quick bites' : 'झटपट रेसिपी'}
                  subtitle={language === 'en' ? 'Ready in 20 minutes or less' : '२० मिनिटांत तयार'}
                />
                <div className={grid}>
                  {quickBites.slice(0, 8).map((r) => (
                    <RecipeCard key={`quick-${r.id}`} recipe={r} language={language} loading="lazy" />
                  ))}
                </div>
              </section>
            )}

            {/* By meal type */}
            {Object.entries(groupedRecipes).map(([meal, list]) => {
              if (list.length === 0) return null;
              const icons: Record<string, string> = { Breakfast: '🌅', Snack: '🍿', Lunch: '🍱', Dinner: '🌙', Dessert: '🍨', Other: '🍽️' };
              const mr: Record<string, string> = { Breakfast: 'नाश्ता', Snack: 'चाळण', Lunch: 'दुपारचे जेवण', Dinner: 'रात्रीचे जेवण', Dessert: 'मिठाई', Other: 'इतर' };
              return (
                <section key={meal}>
                  <SectionHeader
                    icon={<span className="text-lg leading-none">{icons[meal]}</span>}
                    title={language === 'en' ? meal : mr[meal]}
                    subtitle={`${list.length} ${language === 'en' ? 'recipes' : 'रेसिपी'}`}
                  />
                  <div className={grid}>
                    {list.slice(0, 8).map((r) => (
                      <RecipeCard key={`${meal}-${r.id}`} recipe={r} language={language} loading="lazy" />
                    ))}
                  </div>
                </section>
              );
            })}

            {hasMore && (
              <div className="flex justify-center pt-2">
                <Button onClick={loadMore} disabled={loadingMore} variant="outline" size="pill">
                  {loadingMore
                    ? (language === 'en' ? 'Loading…' : 'लोड करत आहे…')
                    : (language === 'en' ? 'Show more recipes' : 'अधिक रेसिपी पहा')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={<SearchIcon className="w-6 h-6" />}
            title={language === 'en' ? 'No recipes found' : 'रेसिपी सापडल्या नाहीत'}
            description={language === 'en' ? 'Try adjusting your filters or search terms.' : 'तुमचे फिल्टर्स बदलून पहा.'}
            action={
              <Button
                variant="soft"
                onClick={() => setFilters({ creator: [], tasteProfile: [], mealType: [], cuisine: [], mood: [], cookTimeRange: [], dietType: [] })}
              >
                {language === 'en' ? 'Clear filters' : 'फिल्टर्स रीसेट करा'}
              </Button>
            }
          />
        )}
      </div>

      <div className="mt-12">
        <Suspense fallback={<div className="h-40" />}>
          <Footer language={language} />
        </Suspense>
      </div>
    </AppShell>
  );
};

const Index = () => <IndexContent />;
export default Index;
