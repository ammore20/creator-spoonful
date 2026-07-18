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
import { Sparkles, PartyPopper, X, Flame, Zap, Clock, TrendingUp } from 'lucide-react';
import { usePremiumStatus } from '@/hooks/usePremiumStatus';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';
import { HorizontalRail } from '@/components/HorizontalRail';

const FilterBar = lazy(() => import('@/components/FilterBar').then(module => ({ default: module.FilterBar })));
const Footer = lazy(() => import('@/components/Footer').then(module => ({ default: module.Footer })));

const RAIL_ITEM = 'snap-start flex-shrink-0 w-[160px] sm:w-[240px] md:w-[260px]';

const IndexContent = () => {
  const [searchParams] = useSearchParams();
  const { user, isPremium, subscriptionDetails } = usePremiumStatus();
  const [showFreeBanner, setShowFreeBanner] = useState(false);
  
  useEffect(() => {
    if (searchParams.get('creator_access') === 'true') {
      sessionStorage.setItem('creator_preview', 'true');
    }
  }, [searchParams]);

  // Show free month banner for referred users who got free access
  useEffect(() => {
    const refSlug = localStorage.getItem('ref_creator_slug');
    if (user && isPremium && refSlug && subscriptionDetails?.amount === 0) {
      const dismissed = sessionStorage.getItem('free_banner_dismissed');
      if (!dismissed) {
        setShowFreeBanner(true);
      }
    }
  }, [user, isPremium, subscriptionDetails]);

  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const RECIPES_PER_PAGE = 8;
  const [filters, setFilters] = useState<FilterOptions>({
    creator: [],
    tasteProfile: [],
    mealType: [],
    cuisine: [],
    mood: [],
    cookTimeRange: [],
    dietType: [],
  });

  useEffect(() => {
    fetchRecipes(true);
  }, []);

  const fetchRecipes = async (reset = false) => {
    try {
      const currentPage = reset ? 0 : page;
      if (reset) {
        setLoading(true);
        setRecipes([]);
      } else {
        setLoadingMore(true);
      }

      const from = currentPage * RECIPES_PER_PAGE;
      const to = from + RECIPES_PER_PAGE - 1;

      const { data, error, count } = await (supabase as any)
        .from('public_videos')
        .select(`
          id,
          video_id,
          title,
          description,
          thumbnail_url,
          published_at,
          extracted_recipe_json,
          creator_name
        `, { count: 'exact' })
        .order('published_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Transform database records to recipe format
      const transformedRecipes = data?.map((video: any) => {
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
          isPremium: false
        };
      }) || [];

      // Filter out invalid recipes
      const validRecipes = transformedRecipes.filter((recipe) => {
        const title = recipe.title.toLowerCase();
        
        // Check for invalid title patterns
        const hasInvalidTitle = 
          title.includes('no recipe') ||
          title.includes('not found') ||
          title.includes('no specific') ||
          title === 'recipe' ||
          title === 'cooking' ||
          title === 'food';
        
        // Check for minimum content requirements
        const hasEnoughIngredients = recipe.ingredients.length >= 5;
        const hasEnoughSteps = recipe.steps.length >= 5;
        
        // Only include recipes that pass all validations
        return !hasInvalidTitle && hasEnoughIngredients && hasEnoughSteps;
      });

      if (reset) {
        setRecipes(validRecipes);
      } else {
        setRecipes(prev => [...prev, ...validRecipes]);
      }

      setHasMore(validRecipes.length === RECIPES_PER_PAGE && (count || 0) > to + 1);
      setPage(currentPage + 1);
    } catch (error) {
      logger.error('index.fetch_recipes_failed', { error: error as Error });
      toast.error(
        language === 'en' ? 'Failed to load recipes' : 'रेसिपी लोड करण्यात अयशस्वी',
        {
          description: language === 'en'
            ? 'Please check your connection and try again.'
            : 'कृपया तुमचे कनेक्शन तपासा आणि पुन्हा प्रयत्न करा.',
        }
      );
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchRecipes(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        recipe.title.toLowerCase().includes(searchLower) ||
        recipe.description.toLowerCase().includes(searchLower) ||
        (recipe.titleMr && recipe.titleMr.toLowerCase().includes(searchLower)) ||
        (recipe.descriptionMr && recipe.descriptionMr.toLowerCase().includes(searchLower));

      const matchesCreator =
        filters.creator.length === 0 ||
        filters.creator.includes(recipe.creator);

      const matchesTaste =
        filters.tasteProfile.length === 0 ||
        filters.tasteProfile.some((taste) => recipe.tasteProfile.includes(taste));

      const matchesMeal =
        filters.mealType.length === 0 ||
        filters.mealType.some((meal) => recipe.mealType.includes(meal));

      const matchesCuisine =
        filters.cuisine.length === 0 ||
        filters.cuisine.some((cuisine) => recipe.cuisine.includes(cuisine));

      const matchesMood =
        filters.mood.length === 0 ||
        filters.mood.some((mood) => recipe.mood.includes(mood));

      // Parse cook time to minutes for filtering
      const matchesCookTime = (() => {
        if (filters.cookTimeRange.length === 0) return true;
        const timeStr = (recipe.cookTime || '').toLowerCase();
        const minutes = parseInt(timeStr) || 30;
        const adjustedMins = timeStr.includes('hour') ? minutes * 60 : minutes;
        return filters.cookTimeRange.some((range) => {
          if (range === 'Quick') return adjustedMins <= 20;
          if (range === 'Medium') return adjustedMins > 20 && adjustedMins <= 45;
          if (range === 'Long') return adjustedMins > 45;
          return false;
        });
      })();

      // Diet type filter based on ingredient keywords
      const matchesDiet = (() => {
        if (filters.dietType.length === 0) return true;
        const allIngredients = recipe.ingredients.join(' ').toLowerCase();
        const title = recipe.title.toLowerCase();
        const nonVegKeywords = ['chicken', 'mutton', 'fish', 'prawn', 'shrimp', 'meat', 'lamb', 'pork', 'crab', 'surmai', 'pomfret', 'bombil', 'kolambi', 'kombdi', 'murg', 'keema', 'gosht', 'चिकन', 'मटण', 'मासा', 'कोळंबी', 'सुरमई', 'मांस'];
        const eggKeywords = ['egg', 'anda', 'अंड'];
        const hasNonVeg = nonVegKeywords.some(k => allIngredients.includes(k) || title.includes(k));
        const hasEgg = eggKeywords.some(k => allIngredients.includes(k) || title.includes(k));
        return filters.dietType.some((diet) => {
          if (diet === 'Veg') return !hasNonVeg && !hasEgg;
          if (diet === 'Non-Veg') return hasNonVeg;
          if (diet === 'Egg') return hasEgg;
          return false;
        });
      })();

      return (
        matchesSearch &&
        matchesCreator &&
        matchesTaste &&
        matchesMeal &&
        matchesCuisine &&
        matchesMood &&
        matchesCookTime &&
        matchesDiet
      );
    });
  }, [recipes, searchQuery, filters]);

  // Auto-load more recipes when filters result in empty/few results but more data exists
  const hasActiveFilters = Object.values(filters).some(arr => arr.length > 0);
  useEffect(() => {
    if (hasActiveFilters && filteredRecipes.length < 4 && hasMore && !loading && !loadingMore) {
      fetchRecipes(false);
    }
  }, [filteredRecipes.length, hasActiveFilters, hasMore, loading, loadingMore]);

  // Group recipes by meal type
  const groupedRecipes = useMemo(() => {
    const mealTypes: MealType[] = ['Breakfast', 'Snack', 'Lunch', 'Dinner', 'Dessert'];
    const grouped: Record<string, typeof filteredRecipes> = {};
    
    mealTypes.forEach(mealType => {
      grouped[mealType] = filteredRecipes.filter(recipe => 
        recipe.mealType.includes(mealType)
      );
    });
    
    // Add "Other" category for recipes without meal type
    grouped['Other'] = filteredRecipes.filter(recipe => 
      recipe.mealType.length === 0
    );
    
    return grouped;
  }, [filteredRecipes]);

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="RecipeMaker - Discover & Personalize Authentic Marathi Recipes"
        description="RecipeMaker helps you discover and personalize authentic Marathi recipes with step-by-step videos, ingredients, and instructions. Explore recipes from top Marathi creators."
        url="/"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          "name": "RecipeMaker",
          "url": "https://recipemaker.in",
          "description": "Discover and personalize authentic Marathi recipes with step-by-step videos",
          "potentialAction": {
            "@type": "SearchAction",
            "target": "https://recipemaker.in/?search={search_term_string}",
            "query-input": "required name=search_term_string"
          }
        }}
      />
      <Navbar
        onSearch={setSearchQuery}
        language={language}
        onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')}
      />
      
      <Hero language={language} />

      {/* Free Month Congratulations Banner */}
      {showFreeBanner && (
        <div className="container mx-auto px-4 mt-6">
          <div className="relative bg-gradient-to-r from-primary/15 via-accent/15 to-primary/15 border border-primary/30 rounded-2xl p-6 animate-fade-in">
            <button
              onClick={() => {
                setShowFreeBanner(false);
                sessionStorage.setItem('free_banner_dismissed', 'true');
              }}
              className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-4">
              <PartyPopper className="w-10 h-10 text-primary flex-shrink-0" />
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {language === 'en'
                    ? '🎉 Congratulations! You\'re one of the first 50!'
                    : '🎉 अभिनंदन! तुम्ही पहिल्या ५० मध्ये आहात!'}
                </h3>
                <p className="text-muted-foreground text-sm mt-1">
                  {language === 'en'
                    ? 'You\'ve received 1 month of FREE premium access. Enjoy all recipes without limits!'
                    : 'तुम्हाला 1 महिन्याचा मोफत प्रीमियम अ‍ॅक्सेस मिळाला आहे. सर्व रेसिपी मर्यादेशिवाय आनंद घ्या!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <Suspense fallback={<div className="h-20" />}>
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          language={language}
        />
      </Suspense>

      <main id="recipes-section" className="container mx-auto px-3 sm:px-4 py-6 sm:py-12">
        {loading ? (
          <div className="space-y-16">
            <div>
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-8 border border-border animate-pulse">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl floating">✨</span>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                      {language === 'en' ? 'New Recipe Everyday' : 'दररोज नवीन रेसिपी'}
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                  {[...Array(3)].map((_, i) => (
                    <RecipeCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
              {[...Array(6)].map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="space-y-6 sm:space-y-10">
            {/* Category chips — quick jump */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-3 px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { key: 'all', icon: '🍽️', en: 'All', mr: 'सर्व' },
                { key: 'Breakfast', icon: '🌅', en: 'Breakfast', mr: 'नाश्ता' },
                { key: 'Snack', icon: '🍿', en: 'Snacks', mr: 'चाळण' },
                { key: 'Lunch', icon: '🍱', en: 'Lunch', mr: 'दुपार' },
                { key: 'Dinner', icon: '🌙', en: 'Dinner', mr: 'रात्र' },
                { key: 'Dessert', icon: '🍨', en: 'Dessert', mr: 'मिठाई' },
              ].map((c) => {
                const active = c.key !== 'all' && filters.mealType.includes(c.key as MealType);
                return (
                  <button
                    key={c.key}
                    onClick={() => {
                      if (c.key === 'all') {
                        setFilters({ ...filters, mealType: [] });
                      } else {
                        setFilters({ ...filters, mealType: [c.key as MealType] });
                      }
                    }}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-full border text-xs sm:text-sm font-semibold transition-all btn-press ${
                      active
                        ? 'bg-primary text-primary-foreground border-primary shadow-pill'
                        : 'bg-card text-foreground border-border hover:bg-secondary'
                    }`}
                  >
                    <span className="text-base">{c.icon}</span>
                    {language === 'en' ? c.en : c.mr}
                  </button>
                );
              })}
            </div>

            {/* Free Recipe of the Day */}
            {recipes.length > 0 && (() => {
              const today = new Date().toISOString().split('T')[0];
              const seed = today.split('-').reduce((a, b) => a + parseInt(b), 0);
              const freeIndex = seed % recipes.length;
              const freeRecipe = recipes[freeIndex];
              localStorage.setItem('free_recipe_of_day', freeRecipe.id);
              localStorage.setItem('free_recipe_date', today);
              return (
                <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: '0.05s' }}>
                  <div className="bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-500/10 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-emerald-500/20">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="text-3xl sm:text-4xl floating">🎁</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-xl sm:text-3xl font-bold text-foreground">
                            {language === 'en' ? 'Free Recipe of the Day' : 'आजची मोफत रेसिपी'}
                          </h2>
                          <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-500/30">
                            <Sparkles className="w-3 h-3 mr-1" />
                            {language === 'en' ? 'FREE' : 'मोफत'}
                          </Badge>
                        </div>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                          {language === 'en' ? 'Enjoy this recipe completely free today!' : 'आज ही रेसिपी पूर्णपणे मोफत आनंद घ्या!'}
                        </p>
                      </div>
                    </div>
                    <div className="max-w-[200px] sm:max-w-sm">
                      <RecipeCard recipe={freeRecipe} language={language} loading="eager" />
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Hot Recipes — horizontal rail */}
            {filteredRecipes.length > 0 && (
              <HorizontalRail
                title={language === 'en' ? 'Hot Right Now' : 'सध्या ट्रेंडिंग'}
                subtitle={language === 'en' ? "What everyone's cooking today" : 'आज सर्वजण काय बनवत आहेत'}
                icon="🔥"
                accent="from-orange-500/10 via-primary/10 to-red-500/10"
              >
                {filteredRecipes.slice(0, 12).map((recipe) => (
                  <div key={`hot-${recipe.id}`} className={RAIL_ITEM}>
                    <RecipeCard recipe={recipe} language={language} loading="eager" />
                  </div>
                ))}
              </HorizontalRail>
            )}

            {/* Quick Bites — under 20 min */}
            {(() => {
              const quick = filteredRecipes.filter((r) => {
                const t = (r.cookTime || '').toLowerCase();
                const m = parseInt(t) || 30;
                const mins = t.includes('hour') ? m * 60 : m;
                return mins <= 20;
              });
              if (quick.length < 3) return null;
              return (
                <HorizontalRail
                  title={language === 'en' ? 'Quick Bites' : 'झटपट रेसिपी'}
                  subtitle={language === 'en' ? 'Ready in 20 minutes or less' : '२० मिनिटांत तयार'}
                  icon="⚡"
                  accent="from-yellow-400/10 via-amber-400/10 to-orange-400/10"
                >
                  {quick.slice(0, 12).map((recipe) => (
                    <div key={`quick-${recipe.id}`} className={RAIL_ITEM}>
                      <RecipeCard recipe={recipe} language={language} loading="lazy" />
                    </div>
                  ))}
                </HorizontalRail>
              );
            })()}

            {/* Fresh Additions rail */}
            {recipes.length > 0 && (
              <HorizontalRail
                title={language === 'en' ? 'New Recipe Everyday' : 'दररोज नवीन रेसिपी'}
                subtitle={language === 'en' ? 'Fresh additions to inspire your cooking' : 'नवीन रेसिपी'}
                icon="✨"
                accent="from-primary/10 via-accent/10 to-primary/10"
              >
                {recipes.slice(0, 12).map((recipe) => (
                  <div key={`new-${recipe.id}`} className={RAIL_ITEM}>
                    <RecipeCard recipe={recipe} language={language} loading="lazy" />
                  </div>
                ))}
              </HorizontalRail>
            )}

            {/* Browse by Category header */}
            <div className="flex items-center justify-between pt-2 opacity-0 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                {language === 'en' ? 'Browse by Category' : 'श्रेणीनुसार पहा'}
              </h2>
              <div className="bg-gradient-pill px-3 py-1.5 rounded-full border border-border">
                <p className="text-xs sm:text-sm font-semibold text-foreground">
                  {filteredRecipes.length} {language === 'en' ? 'recipes' : 'रेसिपी'}
                </p>
              </div>
            </div>

            {/* Grouped Recipes by Meal Type — horizontal rails */}
            {Object.entries(groupedRecipes).map(([mealType, mealRecipes]) => {
              if (mealRecipes.length === 0) return null;

              const mealIcons: Record<string, string> = {
                Breakfast: '🌅', Snack: '🍿', Lunch: '🍱', Dinner: '🌙', Dessert: '🍨', Other: '🍽️',
              };
              const mealTranslations: Record<string, string> = {
                Breakfast: 'नाश्ता', Snack: 'चाळण', Lunch: 'दुपारचे जेवण',
                Dinner: 'रात्रीचे जेवण', Dessert: 'मिठाई', Other: 'इतर',
              };

              return (
                <HorizontalRail
                  key={mealType}
                  title={language === 'en' ? mealType : mealTranslations[mealType]}
                  subtitle={`${mealRecipes.length} ${language === 'en' ? 'recipes' : 'रेसिपी'}`}
                  icon={mealIcons[mealType]}
                >
                  {mealRecipes.map((recipe) => (
                    <div key={`${mealType}-${recipe.id}`} className={RAIL_ITEM}>
                      <RecipeCard recipe={recipe} language={language} loading="lazy" />
                    </div>
                  ))}
                </HorizontalRail>
              );
            })}

            {/* Load More Button */}
            {hasMore && !loading && (
              <div className="flex justify-center mt-8 opacity-0 animate-fade-in" style={{ animationDelay: '0.5s' }}>
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8 ripple btn-press transition-all duration-300 hover:shadow-warm hover:-translate-y-1"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-2"></div>
                      {language === 'en' ? 'Loading...' : 'लोड करत आहे...'}
                    </>
                  ) : (
                    language === 'en' ? 'Load More Recipes' : 'अधिक रेसिपी लोड करा'
                  )}
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-20 space-y-4">
            <div className="text-6xl mb-4">🔍</div>
            <p className="text-2xl font-bold text-foreground mb-2">
              {language === 'en' 
                ? 'No recipes found'
                : 'रेसिपी सापडल्या नाहीत'}
            </p>
            <p className="text-muted-foreground">
              {language === 'en'
                ? 'Try adjusting your filters or search query'
                : 'तुमचे फिल्टर्स किंवा शोध बदलून पहा'}
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
