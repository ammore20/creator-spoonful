import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeCardSkeleton } from '@/components/RecipeCardSkeleton';
import { SEO } from '@/components/SEO';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Crown, ChefHat } from 'lucide-react';
import { Loader2 } from 'lucide-react';

export default function CreatorLanding() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [creator, setCreator] = useState<any>(null);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) {
      // Store referral in localStorage
      localStorage.setItem('ref_creator_slug', slug);
      fetchCreatorAndRecipes(slug);
    }
  }, [slug]);

  const fetchCreatorAndRecipes = async (creatorSlug: string) => {
    try {
      // Fetch creator by slug
      const { data: creatorData, error: creatorError } = await supabase
        .from('creators')
        .select('*')
        .eq('slug', creatorSlug)
        .single();

      if (creatorError || !creatorData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setCreator(creatorData);

      // Fetch creator's recipes
      const { data: videos } = await supabase
        .from('videos')
        .select('id, video_id, title, description, thumbnail_url, published_at, extracted_recipe_json, creators(name)')
        .eq('status', 'done')
        .eq('creator_id', creatorData.id)
        .order('published_at', { ascending: false })
        .limit(50);

      const transformedRecipes = videos?.map((video: any) => {
        const recipe = (video.extracted_recipe_json as any) || {};
        return {
          id: video.video_id,
          title: recipe.title || video.title,
          creator: video.creators?.name || creatorData.name,
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
      }).filter((r: any) => {
        const t = r.title.toLowerCase();
        return !t.includes('no recipe') && !t.includes('not found') && r.ingredients.length >= 5 && r.steps.length >= 5;
      }) || [];

      setRecipes(transformedRecipes);
    } catch (error) {
      console.error('Error fetching creator:', error);
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (notFound) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Creator not found</h1>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title={creator ? `${creator.name} - Recipes on RecipeMaker` : 'Creator Recipes'}
        description={creator ? `Discover authentic recipes by ${creator.name} on RecipeMaker. Get step-by-step instructions, ingredients, and cooking tips.` : ''}
        url={`/c/${slug}`}
      />
      <Navbar
        onSearch={() => {}}
        language={language}
        onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')}
      />

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <main className="flex-1">
          {/* Creator Hero */}
          <div className="bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 py-16">
            <div className="container mx-auto px-4 text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary ring-4 ring-primary/20">
                <AvatarFallback className="bg-gradient-hero text-primary-foreground text-3xl font-bold">
                  {creator?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex items-center justify-center gap-2 mb-2">
                <ChefHat className="w-6 h-6 text-primary" />
                <h1 className="text-3xl md:text-4xl font-bold text-foreground">{creator?.name}</h1>
              </div>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                {language === 'en'
                  ? `Explore ${recipes.length} authentic recipes by ${creator?.name}`
                  : `${creator?.name} यांच्या ${recipes.length} प्रामाणिक रेसिपी शोधा`}
              </p>
              <Button
                size="lg"
                className="bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
                onClick={() => navigate('/premium')}
              >
                <Crown className="mr-2 w-5 h-5" />
                {language === 'en' ? 'Get Premium — ₹299/year (Free 1 month for first 50!)' : 'प्रीमियम मिळवा — ₹299/वर्ष (पहिल्या 50 साठी 1 महिना मोफत!)'}
              </Button>
            </div>
          </div>

          {/* Recipes Grid */}
          <div className="container mx-auto px-4 py-12">
            <h2 className="text-2xl font-bold mb-8">
              {language === 'en' ? `Recipes by ${creator?.name}` : `${creator?.name} यांच्या रेसिपी`}
            </h2>
            {recipes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recipes.map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} language={language} loading="lazy" />
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-12">
                {language === 'en' ? 'No recipes available yet.' : 'अद्याप कोणतीही रेसिपी उपलब्ध नाही.'}
              </p>
            )}
          </div>
        </main>
      )}

      <Footer language={language} />
    </div>
  );
}
