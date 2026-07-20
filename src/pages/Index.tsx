import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FilterOptions, MealType } from '@/types/recipe';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeCardSkeleton } from '@/components/RecipeCardSkeleton';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PartyPopper, X, Flame, Zap, Sparkles, Gift, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
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

const IndexContent = () => {
  const [searchParams] = useSearchParams();
  const { user, isPremium, subscriptionDetails } = usePremiumStatus();
  const [showFreeBanner, setShowFreeBanner] = useState(false);

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
        .select(`id, video_id, title, description, thumbnail_url, published_at, extracted_recipe_json, creator_name`, { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const transformed = data?.map((video: any) => {
        const recipe = video.extracted_recipe_json as any || {};
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
          ingredients: Array.isArray(recipe.ingredients) ? recipe.ingredients : [],
          steps: Array.isArray(recipe.steps) ? recipe.steps : [],
          isPremium: false,
        };
      }) || [];

      const valid = transformed.filter((r) => {
        const t = r.title.toLowerCase();
        const bad = t.includes('no recipe') || t.includes('not found') || t.includes('no specific') || t === 'recipe' || t === 'cooking' || t === 'food';
        return !bad && r.ingredients.length >= 5 && r.steps.length >= 5;
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

  return (
    <div className="min-h-screen bg-background">
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
      <Navbar onSearch={setSearchQuery} language={language} onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')} />
      <Hero language={language} />

      {showFreeBanner && (
        <div className="container mx-auto px-4 mt-4">
          <div className="relative bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/20 rounded-2xl p-5 animate-fade-in">
            <button
              onClick={() => { setShowFreeBanner(false); sessionStorage.setItem('free_banner_dismissed', 'true'); }}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3">
              <PartyPopper className="w-8 h-8 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-base font-bold text-foreground">
                  {language === 'en' ? '🎉 You\'re one of the first 50!' : '🎉 तुम्ही पहिल्या ५० मध्ये आहात!'}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {language === 'en' ? '1 month of FREE premium unlocked.' : '१ महिन्याचा मोफत प्रीमियम अनलॉक.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category chips — sticky under nav, always in reach */}
      <div className="sticky top-[64px] sm:top-[72px] z-30 bg-background/85 backdrop-blur border-b border-border/60">
        <div className="container mx-auto px-3 sm:px-6 py-3">
          <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {CATEGORIES.map((c) => {
              const active = c.key === 'all' ? filters.mealType.length === 0 : filters.mealType.includes(c.key as MealType);
              return (
                <button
                  key={c.key}
                  onClick={() => setFilters({ ...filters, mealType: c.key === 'all' ? [] : [c.key as MealType] })}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                    active
                      ? 'bg-foreground text-background shadow-soft'
                      : 'bg-secondary text-foreground hover:bg-muted'
                  }`}
                >
                  <span className="text-base leading-none">{c.icon}</span>
                  {language === 'en' ? c.en : c.mr}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <Suspense fallback={<div className="h-16" />}>
        <FilterBar filters={filters} onFilterChange={setFilters} language={language} />
      </Suspense>

      <main id="recipes-section" className="container mx-auto px-3 sm:px-6 py-6 sm:py-10">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
            {[...Array(8)].map((_, i) => <RecipeCardSkeleton key={i} />)}
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="space-y-10 sm:space-y-14">

            {/* BENTO: Featured of the Day + Quick Bites tiles + CTA */}
            {freeRecipe && (
              <section className="grid grid-cols-1 md:grid-cols-6 gap-3 sm:gap-5">
                {/* Big featured tile */}
                <Link
                  to={`/recipe/${freeRecipe.id}`}
                  className="md:col-span-4 relative group overflow-hidden rounded-3xl border border-border shadow-card hover:shadow-warm transition-shadow"
                >
                  <div className="aspect-[16/10] md:aspect-[16/11] overflow-hidden bg-muted">
                    <img
                      src={freeRecipe.thumbnailUrl}
                      alt={freeRecipe.title}
                      loading="eager"
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
                  <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 bg-white/95 text-foreground rounded-full px-3 py-1 text-xs font-semibold shadow-soft">
                    <Gift className="w-3.5 h-3.5 text-primary" />
                    {language === 'en' ? "Today's free recipe" : 'आजची मोफत रेसिपी'}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-7 text-white">
                    <p className="text-xs sm:text-sm opacity-90 mb-1">by {freeRecipe.creator}</p>
                    <h2 className="text-xl sm:text-3xl font-bold leading-tight mb-2 line-clamp-2">{freeRecipe.title}</h2>
                    <div className="flex items-center gap-3 text-xs sm:text-sm opacity-90">
                      <span>⏱ {freeRecipe.cookTime}</span>
                      <span>· {freeRecipe.servings} {language === 'en' ? 'servings' : 'लोक'}</span>
                      <span className="ml-auto inline-flex items-center gap-1 font-semibold">
                        {language === 'en' ? 'Cook it' : 'बनवा'} <ArrowRight className="w-4 h-4" />
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Right column: two stacked tiles */}
                <div className="md:col-span-2 grid grid-cols-2 md:grid-cols-1 gap-3 sm:gap-5">
                  {/* Quick bites tile */}
                  <button
                    onClick={() => setFilters({ ...filters, cookTimeRange: ['Quick'] })}
                    className="relative overflow-hidden rounded-3xl p-5 text-left bg-gradient-to-br from-accent/25 to-primary/20 border border-border shadow-soft hover:shadow-card transition-shadow group"
                  >
                    <Zap className="w-7 h-7 text-primary mb-3" />
                    <h3 className="text-base sm:text-lg font-bold text-foreground leading-tight mb-1">
                      {language === 'en' ? 'In a hurry?' : 'घाईत आहात?'}
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                      {language === 'en' ? `${quickBites.length} recipes under 20 min` : `२० मिनिटांच्या ${quickBites.length} रेसिपी`}
                    </p>
                    <span className="text-xs font-semibold text-primary inline-flex items-center gap-1">
                      {language === 'en' ? 'Show quick bites' : 'पहा'} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </button>

                  {/* Premium / veg tile */}
                  <Link
                    to="/premium"
                    className="relative overflow-hidden rounded-3xl p-5 bg-gradient-to-br from-foreground to-foreground/85 text-background shadow-soft hover:shadow-card transition-shadow group"
                  >
                    <Sparkles className="w-7 h-7 mb-3 text-primary-glow" />
                    <h3 className="text-base sm:text-lg font-bold leading-tight mb-1">
                      {language === 'en' ? 'Unlock every recipe' : 'सर्व रेसिपी अनलॉक करा'}
                    </h3>
                    <p className="text-xs sm:text-sm opacity-80 mb-2">
                      {language === 'en' ? 'Premium from ₹49/mo' : 'फक्त ₹४९/महिना'}
                    </p>
                    <span className="text-xs font-semibold inline-flex items-center gap-1 text-primary-glow">
                      {language === 'en' ? 'Go premium' : 'प्रीमियम मिळवा'} <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </div>
              </section>
            )}

            {/* Hot right now — bento asymmetric */}
            {filteredRecipes.length > 2 && (
              <section>
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                      <Flame className="w-5 h-5 text-primary" />
                      {language === 'en' ? 'Hot right now' : 'सध्या ट्रेंडिंग'}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === 'en' ? "What everyone's cooking today" : 'आज सर्वजण काय बनवत आहेत'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
                  {filteredRecipes.slice(0, 8).map((r) => (
                    <RecipeCard key={`hot-${r.id}`} recipe={r} language={language} loading="lazy" />
                  ))}
                </div>
              </section>
            )}

            {/* Quick bites row */}
            {quickBites.length >= 3 && (
              <section>
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
                      <Zap className="w-5 h-5 text-accent" />
                      {language === 'en' ? 'Quick bites' : 'झटपट रेसिपी'}
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {language === 'en' ? 'Ready in 20 minutes or less' : '२० मिनिटांत तयार'}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
                  {quickBites.slice(0, 8).map((r) => (
                    <RecipeCard key={`quick-${r.id}`} recipe={r} language={language} loading="lazy" />
                  ))}
                </div>
              </section>
            )}

            {/* Browse by category — one section per meal */}
            {Object.entries(groupedRecipes).map(([meal, list]) => {
              if (list.length === 0) return null;
              const icons: Record<string, string> = { Breakfast: '🌅', Snack: '🍿', Lunch: '🍱', Dinner: '🌙', Dessert: '🍨', Other: '🍽️' };
              const mr: Record<string, string> = { Breakfast: 'नाश्ता', Snack: 'चाळण', Lunch: 'दुपारचे जेवण', Dinner: 'रात्रीचे जेवण', Dessert: 'मिठाई', Other: 'इतर' };
              return (
                <section key={meal}>
                  <div className="flex items-end justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{icons[meal]}</span>
                      <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-foreground">
                          {language === 'en' ? meal : mr[meal]}
                        </h2>
                        <p className="text-xs text-muted-foreground">
                          {list.length} {language === 'en' ? 'recipes' : 'रेसिपी'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
                    {list.slice(0, 8).map((r) => (
                      <RecipeCard key={`${meal}-${r.id}`} recipe={r} language={language} loading="lazy" />
                    ))}
                  </div>
                </section>
              );
            })}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  size="lg"
                  variant="outline"
                  className="rounded-full px-8 border-border hover:border-primary hover:text-primary transition-colors"
                >
                  {loadingMore
                    ? (language === 'en' ? 'Loading…' : 'लोड करत आहे…')
                    : (language === 'en' ? 'Show more recipes' : 'अधिक रेसिपी पहा')}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl mb-2">🔍</div>
            <p className="text-2xl font-bold text-foreground">
              {language === 'en' ? 'No recipes found' : 'रेसिपी सापडल्या नाहीत'}
            </p>
            <p className="text-muted-foreground">
              {language === 'en' ? 'Try adjusting your filters or search' : 'तुमचे फिल्टर्स बदलून पहा'}
            </p>
          </div>
        )}
      </main>

      <Suspense fallback={<div className="h-40" />}>
        <Footer language={language} />
      </Suspense>
    </div>
  );
};

const Index = () => <IndexContent />;
export default Index;
