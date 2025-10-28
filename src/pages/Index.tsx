import { useState, useMemo, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FilterOptions } from '@/types/recipe';
import { Navbar } from '@/components/Navbar';
import { Hero } from '@/components/Hero';
import { FilterBar } from '@/components/FilterBar';
import { RecipeCard } from '@/components/RecipeCard';

const Index = () => {
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [searchQuery, setSearchQuery] = useState('');
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterOptions>({
    creator: [],
    tasteProfile: [],
    mealType: [],
    cuisine: [],
    mood: [],
  });

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          creators (name)
        `)
        .eq('status', 'done')
        .order('published_at', { ascending: false });

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

      setRecipes(transformedRecipes);
    } catch (error) {
      console.error('Error fetching recipes:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      // Search filter
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        !searchQuery ||
        recipe.title.toLowerCase().includes(searchLower) ||
        recipe.description.toLowerCase().includes(searchLower) ||
        (recipe.titleMr && recipe.titleMr.toLowerCase().includes(searchLower)) ||
        (recipe.descriptionMr && recipe.descriptionMr.toLowerCase().includes(searchLower));

      // Creator filter
      const matchesCreator =
        filters.creator.length === 0 ||
        filters.creator.includes(recipe.creator);

      // Taste profile filter
      const matchesTaste =
        filters.tasteProfile.length === 0 ||
        filters.tasteProfile.some((taste) => recipe.tasteProfile.includes(taste));

      // Meal type filter
      const matchesMeal =
        filters.mealType.length === 0 ||
        filters.mealType.some((meal) => recipe.mealType.includes(meal));

      // Cuisine filter
      const matchesCuisine =
        filters.cuisine.length === 0 ||
        filters.cuisine.some((cuisine) => recipe.cuisine.includes(cuisine));

      // Mood filter
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        onSearch={setSearchQuery}
        language={language}
        onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')}
      />
      
      <Hero language={language} />
      
      <FilterBar
        filters={filters}
        onFilterChange={setFilters}
        language={language}
      />

      <main className="container mx-auto px-4 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-3xl font-bold text-foreground">
            {language === 'en' ? 'All Recipes' : 'सर्व रेसिपी'}
          </h2>
          <p className="text-muted-foreground">
            {filteredRecipes.length} {language === 'en' ? 'recipes found' : 'रेसिपी सापडल्या'}
          </p>
        </div>

        {loading ? (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground">Loading recipes...</p>
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} language={language} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <p className="text-xl text-muted-foreground mb-4">
              {language === 'en' 
                ? 'No recipes found matching your filters'
                : 'तुमच्या फिल्टर्सशी जुळणाऱ्या रेसिपी सापडल्या नाहीत'}
            </p>
            <p className="text-muted-foreground">
              {language === 'en'
                ? 'Try adjusting your filters or search query'
                : 'तुमचे फिल्टर्स किंवा शोध बदलून पहा'}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-20">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center text-muted-foreground">
            <p className="mb-2">
              © 2024 RecipeMaker. {language === 'en' ? 'All rights reserved.' : 'सर्व हक्क राखीव.'}
            </p>
            <p className="text-sm">
              {language === 'en' 
                ? 'AI Recipes by Your Favorite Creators'
                : 'तुमच्या आवडत्या क्रिएटर्सच्या AI रेसिपी'}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
