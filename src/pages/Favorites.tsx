import { useEffect, useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { RecipeCard } from '@/components/RecipeCard';
import { SEO } from '@/components/SEO';
import { supabase } from '@/integrations/supabase/client';
import { Recipe } from '@/types/recipe';
import { Heart } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const Favorites = () => {
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [favorites, setFavorites] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndLoadFavorites();
  }, []);

  const checkAuthAndLoadFavorites = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      navigate('/auth');
      return;
    }

    setUser(session.user);
    await loadFavorites(session.user.id);
  };

  const loadFavorites = async (userId: string) => {
    setLoading(true);
    
    // Get favorite recipe IDs
    const { data: favoriteData } = await supabase
      .from('user_favorites')
      .select('recipe_id')
      .eq('user_id', userId);

    if (!favoriteData || favoriteData.length === 0) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const recipeIds = favoriteData.map(f => f.recipe_id);

    // Get recipe details from videos table
    const { data: videos } = await supabase
      .from('videos')
      .select('*')
      .in('video_id', recipeIds)
      .eq('status', 'completed');

    if (videos) {
      const recipes: Recipe[] = videos
        .filter(v => v.extracted_recipe_json)
        .map(v => {
          const json = v.extracted_recipe_json as any;
          return {
            id: v.video_id,
            ...json,
            youtubeUrl: `https://www.youtube.com/watch?v=${v.video_id}`,
            videoId: v.video_id,
            thumbnailUrl: v.thumbnail_url || '',
          };
        });

      setFavorites(recipes);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-primary">
      <SEO
        title={language === 'en' ? 'My Favorites' : 'माझे आवडते'}
        description={language === 'en' ? 'Your favorite recipes collection' : 'तुमचे आवडते रेसिपी संग्रह'}
      />
      <Navbar language={language} onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')} onSearch={() => {}} />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            {language === 'en' ? 'My Favorites' : 'माझे आवडते'}
          </h1>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="bg-muted rounded-lg h-[400px]"></div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-24 h-24 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-bold mb-2">
              {language === 'en' ? 'No favorites yet' : 'अद्याप आवडते नाहीत'}
            </h2>
            <p className="text-muted-foreground mb-6">
              {language === 'en' 
                ? 'Start exploring recipes and add your favorites!' 
                : 'रेसिपी एक्सप्लोर करा आणि तुमचे आवडते जोडा!'}
            </p>
            <Button onClick={() => navigate('/')}>
              {language === 'en' ? 'Explore Recipes' : 'रेसिपी एक्सप्लोर करा'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {favorites.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                language={language}
              />
            ))}
          </div>
        )}
      </main>
      
      <Footer language={language} />
    </div>
  );
};

export default Favorites;