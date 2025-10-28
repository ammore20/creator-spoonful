import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Clock, Users, ChefHat, Lock, ArrowLeft, 
  Bookmark, Share2, Play
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';

const RecipePage = () => {
  const { id } = useParams();
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRecipe();
  }, [id]);

  const fetchRecipe = async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select(`
          *,
          creators (name)
        `)
        .eq('video_id', id)
        .eq('status', 'done')
        .single();

      if (error) throw error;

      if (data) {
        const recipeJson = data.extracted_recipe_json as any || {};
        const transformedRecipe = {
          id: data.video_id,
          title: recipeJson.title || data.title,
          creator: data.creators?.name || 'Unknown',
          description: data.description || '',
          youtubeUrl: `https://www.youtube.com/watch?v=${data.video_id}`,
          videoId: data.video_id,
          thumbnailUrl: data.thumbnail_url,
          tasteProfile: Array.isArray(recipeJson.taste_tags) ? recipeJson.taste_tags : [],
          mealType: recipeJson.meal_type ? [recipeJson.meal_type] : [],
          cuisine: recipeJson.cuisine ? [recipeJson.cuisine] : [],
          mood: [],
          difficulty: recipeJson.difficulty || 'Medium',
          cookTime: recipeJson.prep_time || '30 mins',
          servings: recipeJson.servings || 4,
          ingredients: Array.isArray(recipeJson.ingredients) ? recipeJson.ingredients : [],
          steps: Array.isArray(recipeJson.steps) ? recipeJson.steps : [],
          isPremium: false
        };
        setRecipe(transformedRecipe);
      }
    } catch (error) {
      console.error('Error fetching recipe:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          onSearch={() => {}} 
          language={language}
          onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')}
        />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Loading...</h1>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar 
          onSearch={() => {}} 
          language={language}
          onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')}
        />
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl font-bold mb-4">Recipe Not Found</h1>
          <Link to="/">
            <Button>
              <ArrowLeft className="mr-2 w-4 h-4" />
              Back to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const title = language === 'mr' && recipe.titleMr ? recipe.titleMr : recipe.title;
  const creator = language === 'mr' && recipe.creatorMr ? recipe.creatorMr : recipe.creator;
  const description = language === 'mr' && recipe.descriptionMr ? recipe.descriptionMr : recipe.description;
  const ingredients = language === 'mr' && recipe.ingredientsMr ? recipe.ingredientsMr : recipe.ingredients;
  const steps = language === 'mr' && recipe.stepsMr ? recipe.stepsMr : recipe.steps;

  return (
    <div className="min-h-screen bg-background">
      <Navbar 
        onSearch={() => {}} 
        language={language}
        onLanguageToggle={() => setLanguage(language === 'en' ? 'mr' : 'en')}
      />

      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Link to="/">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="mr-2 w-4 h-4" />
            {language === 'en' ? 'Back to Recipes' : 'रेसिपींकडे परत'}
          </Button>
        </Link>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-3 text-foreground">
                {title}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mb-4">
                <ChefHat className="w-5 h-5 text-primary" />
                <span className="font-medium text-lg">{creator}</span>
              </div>
            </div>
            {recipe.isPremium && (
              <Badge className="bg-accent text-accent-foreground">
                <Lock className="mr-1 w-3 h-3" />
                {language === 'en' ? 'Premium' : 'प्रीमियम'}
              </Badge>
            )}
          </div>

          <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
            {description}
          </p>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex items-center gap-2 text-foreground">
              <Clock className="w-5 h-5 text-primary" />
              <span className="font-medium">{recipe.cookTime}</span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <Users className="w-5 h-5 text-primary" />
              <span className="font-medium">
                {recipe.servings} {language === 'en' ? 'servings' : 'सर्व्हिंग्ज'}
              </span>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <ChefHat className="w-5 h-5 text-primary" />
              <span className="font-medium">{recipe.difficulty}</span>
            </div>
          </div>

          {/* Tags */}
          <div className="flex flex-wrap gap-2 mb-6">
            {recipe.tasteProfile.map((taste) => (
              <Badge key={taste} variant="secondary">{taste}</Badge>
            ))}
            {recipe.mealType.map((meal) => (
              <Badge key={meal} variant="outline">{meal}</Badge>
            ))}
            {recipe.cuisine.map((cuisine) => (
              <Badge key={cuisine} variant="outline">{cuisine}</Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button className="bg-gradient-hero shadow-warm">
              <Bookmark className="mr-2 w-4 h-4" />
              {language === 'en' ? 'Save Recipe' : 'रेसिपी सेव्ह करा'}
            </Button>
            <Button variant="outline">
              <Share2 className="mr-2 w-4 h-4" />
              {language === 'en' ? 'Share' : 'शेअर करा'}
            </Button>
          </div>
        </div>

        {/* Video */}
        <Card className="mb-8 overflow-hidden shadow-card">
          <CardContent className="p-0">
            <div className="aspect-video bg-muted flex items-center justify-center relative group">
              <img 
                src={recipe.thumbnailUrl} 
                alt={title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button size="lg" className="bg-primary/90 hover:bg-primary shadow-warm">
                  <Play className="mr-2 w-5 h-5" />
                  {language === 'en' ? 'Watch on YouTube' : 'YouTube वर पहा'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <Card className="md:col-span-1 shadow-card h-fit">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-foreground">
                {language === 'en' ? 'Ingredients' : 'साहित्य'}
              </h2>
              <ul className="space-y-3">
                {ingredients.map((ingredient, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                    <span className="text-foreground">{ingredient}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Steps */}
          <Card className="md:col-span-2 shadow-card">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-foreground">
                {language === 'en' ? 'Instructions' : 'सूचना'}
              </h2>
              <ol className="space-y-6">
                {steps.map((step, index) => (
                  <li key={index} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-hero text-primary-foreground flex items-center justify-center font-bold shadow-warm">
                      {index + 1}
                    </div>
                    <p className="text-foreground pt-1 leading-relaxed">{step}</p>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>

        {/* Premium CTA */}
        {recipe.isPremium && (
          <Card className="mt-8 bg-gradient-hero text-white shadow-warm">
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-3">
                {language === 'en' ? 'Unlock This Premium Recipe' : 'हा प्रीमियम रेसिपी अनलॉक करा'}
              </h3>
              <p className="mb-6 text-white/90">
                {language === 'en'
                  ? 'Subscribe to access this recipe and 100+ more premium recipes'
                  : 'या रेसिपी आणि १००+ अधिक प्रीमियम रेसिपींसाठी सदस्यता घ्या'}
              </p>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-warm">
                {language === 'en' ? 'Subscribe for ₹99/month' : '₹99/महिना सदस्यता घ्या'}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default RecipePage;
