import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FilterOptions, MealType } from '@/types/recipe';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeCardSkeleton } from '@/components/RecipeCardSkeleton';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { PremiumGate } from '@/components/PremiumGate';

const FilterBar = lazy(() => import('@/components/FilterBar').then(module => ({ default: module.FilterBar })));
const Footer = lazy(() => import('@/components/Footer').then(module => ({ default: module.Footer })));

const IndexContent = () => {
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

      const { data, error, count } = await supabase
        .from('videos')
        .select(`
          id,
          video_id,
          title,
          description,
          thumbnail_url,
          published_at,
          extracted_recipe_json,
          creators (name)
        `, { count: 'exact' })
        .eq('status', 'done')
        .order('published_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      // Transform database records to recipe format
      const transformedRecipes = data?.map((video: any) => {
        const recipe = video.extracted_recipe_json as any || {};
        return {
          id: video.video_id,
          title: recipe.title || video.title,
          creator: video.creators?.name || 'Unknown',
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
      console.error('Error fetching recipes:', error);
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

      return (
        matchesSearch &&
        matchesCreator &&
        matchesTaste &&
        matchesMeal &&
        matchesCuisine &&
        matchesMood
      );
    });
  }, [recipes, searchQuery, filters]);

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
      
      <Suspense fallback={<div className="h-20" />}>
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          language={language}
        />
      </Suspense>

      <main id="recipes-section" className="container mx-auto px-4 py-12">
        {loading ? (
          <div className="space-y-16">
            <div>
              <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-8 border border-border">
                <div className="flex items-center gap-3 mb-6">
                  <span className="text-4xl">✨</span>
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                      {language === 'en' ? 'New Recipe Everyday' : 'दररोज नवीन रेसिपी'}
                    </h2>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...Array(3)].map((_, i) => (
                    <RecipeCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <RecipeCardSkeleton key={i} />
              ))}
            </div>
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="space-y-16">
            {/* New Recipe Everyday Section */}
            {recipes.length > 0 && (
              <div>
                <div className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-8 border border-border">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="text-4xl">✨</span>
                    <div>
                      <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        {language === 'en' ? 'New Recipe Everyday' : 'दररोज नवीन रेसिपी'}
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        {language === 'en' ? 'Fresh additions to inspire your cooking' : 'तुमच्या स्वयंपाकाला प्रेरणा देण्यासाठी नवीन रेसिपी'}
                      </p>
                    </div>
                  </div>
                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recipes.slice(0, 3).map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} language={language} loading="eager" />
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {/* Recipe Count */}
            <div className="flex items-center justify-between">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                {language === 'en' ? 'All Recipes' : 'सर्व रेसिपी'}
              </h2>
              <div className="bg-gradient-pill px-4 py-2 rounded-full border border-border">
                <p className="text-sm font-semibold text-foreground">
                  {filteredRecipes.length} {language === 'en' ? 'recipes' : 'रेसिपी'}
                </p>
              </div>
            </div>

            {/* Grouped Recipes by Meal Type */}
            {Object.entries(groupedRecipes).map(([mealType, recipes]) => {
              if (recipes.length === 0) return null;
              
              const mealIcons: Record<string, string> = {
                'Breakfast': '🌅',
                'Snack': '🍿',
                'Lunch': '🍱',
                'Dinner': '🌙',
                'Dessert': '🍨',
                'Other': '🍽️'
              };

              const mealTranslations: Record<string, string> = {
                'Breakfast': 'नाश्ता',
                'Snack': 'चाळण',
                'Lunch': 'दुपारचे जेवण',
                'Dinner': 'रात्रीचे जेवण',
                'Dessert': 'मिठाई',
                'Other': 'इतर'
              };

              const categoryIntros: Record<string, { en: string; mr: string }> = {
                'Breakfast': {
                  en: 'Start your day with authentic Marathi breakfast recipes that blend tradition with taste. From quick poha to hearty upma, discover dishes perfect for energizing mornings.',
                  mr: 'पारंपरिक मराठी नाश्त्याच्या रेसिपींसह तुमचा दिवस सुरू करा. पोहे, उपमा आणि इतर चवदार पदार्थ जे तुमच्या सकाळला ऊर्जा देतील.'
                },
                'Snack': {
                  en: 'Explore delicious Marathi snack recipes perfect for evening tea time or party gatherings. From crispy vada pav to savory bhajiya, find quick bites that satisfy every craving.',
                  mr: 'संध्याकाळच्या चहासाठी किंवा पार्टीसाठी योग्य मराठी स्नॅक्स रेसिपी शोधा. वडा पाव पासून भजी पर्यंत चवदार पदार्थ.'
                },
                'Lunch': {
                  en: 'Discover wholesome Marathi lunch recipes featuring traditional thalis, fragrant rice dishes, and flavorful curries. Complete meal solutions for family dining and special occasions.',
                  mr: 'पारंपरिक थाळी, सुगंधी भात आणि चवदार भाज्या असलेल्या पौष्टिक मराठी दुपारच्या जेवणाच्या रेसिपी शोधा.'
                },
                'Dinner': {
                  en: 'Find comforting Marathi dinner recipes that bring families together. From simple dal-bhaat to elaborate festive meals, create memorable evening dining experiences.',
                  mr: 'कुटुंबाला एकत्र आणणाऱ्या मराठी रात्रीच्या जेवणाच्या रेसिपी शोधा. साध्या डाळ-भातापासून विशेष सणाच्या जेवणापर्यंत.'
                },
                'Dessert': {
                  en: 'Indulge in traditional Marathi dessert recipes and sweet delicacies. From festive modaks to everyday kheer, satisfy your sweet tooth with authentic flavors.',
                  mr: 'पारंपरिक मराठी गोड पदार्थांची रेसिपी आणि मिठाई शोधा. मोदकापासून खिरापर्यंत, प्रत्येक सणासुदीसाठी गोड पदार्थ.'
                },
                'Other': {
                  en: 'Browse unique Marathi recipes that don\'t fit traditional categories but are equally delicious. Discover fusion dishes and creative cooking ideas from talented creators.',
                  mr: 'पारंपरिक श्रेणीत न बसणाऱ्या पण तितक्याच चविष्ट मराठी रेसिपी शोधा. फ्यूजन पदार्थ आणि नाविन्यपूर्ण कल्पना.'
                }
              };

              const intro = categoryIntros[mealType] || { en: '', mr: '' };

              return (
                <section key={mealType} className="space-y-6">
                  <div>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-4xl">{mealIcons[mealType]}</span>
                      <div>
                        <h2 className="text-2xl md:text-3xl font-bold text-foreground">
                          {language === 'en' ? mealType : mealTranslations[mealType]}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {recipes.length} {language === 'en' ? 'recipes' : 'रेसिपी'}
                        </p>
                      </div>
                    </div>
                    {intro.en && (
                      <p className="text-sm text-muted-foreground/90 leading-relaxed max-w-4xl mb-4 font-light">
                        {language === 'en' ? intro.en : intro.mr}
                      </p>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recipes.map((recipe) => (
                      <RecipeCard key={recipe.id} recipe={recipe} language={language} loading="lazy" />
                    ))}
                  </div>
                </section>
              );
            })}

            {/* Load More Button */}
            {hasMore && !loading && (
              <div className="flex justify-center mt-12">
                <Button
                  onClick={loadMore}
                  disabled={loadingMore}
                  size="lg"
                  className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8"
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

const Index = () => (
  <PremiumGate>
    <IndexContent />
  </PremiumGate>
);

export default Index;
