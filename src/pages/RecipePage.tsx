import { useParams, Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Clock, Users, ChefHat, Lock, ArrowLeft, 
  Bookmark, Share2, Play, Copy, Printer, Star,
  Timer, Flame, UtensilsCrossed, Heart
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ServingAdjuster } from '@/components/recipe/ServingAdjuster';

import { CreatorCard } from '@/components/recipe/CreatorCard';
import { CookingTimer } from '@/components/recipe/CookingTimer';
import { NutritionalInfo } from '@/components/recipe/NutritionalInfo';
import { CommentsSection } from '@/components/recipe/CommentsSection';
import { SEO } from '@/components/SEO';
import { toast } from '@/hooks/use-toast';
import { useToast } from '@/hooks/use-toast';

const RecipePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [language, setLanguage] = useState<'en' | 'mr'>('en');
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [servings, setServings] = useState(4);
  const [originalServings, setOriginalServings] = useState(4);
  const [user, setUser] = useState<any>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    checkAuthAndFetchRecipe();
  }, [id]);

  useEffect(() => {
    if (user && id) {
      checkIfFavorited(user.id);
    }
  }, [user, id]);

  const checkAuthAndFetchRecipe = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      navigate('/auth');
      return;
    }
    setUser(data.user);
    fetchRecipe();
  };

  const checkIfFavorited = async (userId: string) => {
    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', id)
      .maybeSingle();
    
    setIsFavorite(!!data);
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: language === 'en' ? 'Sign in required' : 'साइन इन आवश्यक',
        description: language === 'en' ? 'Please sign in to save favorites' : 'फेव्हरिट सेव्ह करण्यासाठी साइन इन करा',
        variant: 'destructive',
      });
      return;
    }

    if (isFavorite) {
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', id);
      
      setIsFavorite(false);
      toast({
        description: `${language === 'en' ? 'Removed from favorites' : 'फेव्हरिटमधून काढले'}`,
        duration: 2000,
      });
    } else {
      await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, recipe_id: id });
      
      setIsFavorite(true);
      toast({
        description: `❤️ ${language === 'en' ? 'Added to favorites' : 'फेव्हरिटमध्ये जोडले'}`,
        duration: 2000,
      });
    }
  };

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
          titleMr: recipeJson.title_mr,
          creator: data.creators?.name || 'Unknown',
          creatorMr: recipeJson.creator_mr,
          description: data.description || '',
          descriptionMr: recipeJson.description_mr,
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
          ingredientsMr: Array.isArray(recipeJson.ingredients_mr) ? recipeJson.ingredients_mr : [],
          steps: Array.isArray(recipeJson.steps) ? recipeJson.steps : [],
          stepsMr: Array.isArray(recipeJson.steps_mr) ? recipeJson.steps_mr : [],
          isPremium: false
        };
        setRecipe(transformedRecipe);
        setServings(transformedRecipe.servings);
        setOriginalServings(transformedRecipe.servings);
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
  const ingredients = language === 'mr' && recipe.ingredientsMr ? recipe.ingredientsMr : recipe.ingredients;
  const steps = language === 'mr' && recipe.stepsMr ? recipe.stepsMr : recipe.steps;

  // Generate custom recipe description
  const generateRecipeDescription = (): string => {
    const cuisine = recipe.cuisine?.[0] || '';
    const mealType = recipe.mealType?.[0] || '';
    const difficulty = recipe.difficulty || 'Medium';
    const cookTime = recipe.cookTime || '30 mins';
    const tasteProfile = recipe.tasteProfile?.slice(0, 2).join(' and ') || 'delicious';
    
    if (language === 'mr') {
      return `एक ${tasteProfile} ${cuisine} पदार्थ जो ${mealType} साठी परिपूर्ण आहे. ${difficulty === 'Easy' ? 'सोपे' : difficulty === 'Hard' ? 'कठीण' : 'मध्यम'} स्तरावरील ही रेसिपी ${cookTime} मध्ये तयार होते आणि कुटुंबासोबत आनंद घेण्यासाठी आदर्श आहे.`;
    }
    
    let description = `A ${tasteProfile} ${cuisine} dish`;
    
    if (mealType) {
      description += ` perfect for ${mealType.toLowerCase()}`;
    }
    
    description += `. This ${difficulty.toLowerCase()}-level recipe is ready in ${cookTime}`;
    
    if (ingredients.length > 0) {
      description += ` and uses traditional ingredients to create an authentic flavor`;
    }
    
    description += `. Best enjoyed fresh with your family and friends.`;
    
    return description;
  };

  const description = generateRecipeDescription();

  const scaledIngredients = ingredients.map((ingredient: string) => {
    const ratio = servings / originalServings;
    return ingredient.replace(/(\d+\.?\d*)/g, (match) => {
      const num = parseFloat(match);
      return (num * ratio).toFixed(num % 1 === 0 ? 0 : 1);
    });
  });


  const handleCopyIngredients = () => {
    const ingredientsText = scaledIngredients.join('\n');
    navigator.clipboard.writeText(ingredientsText);
    toast({
      title: language === 'en' ? 'Copied!' : 'कॉपी झाले!',
      description: language === 'en' ? 'Ingredients copied to clipboard' : 'साहित्य क्लिपबोर्डवर कॉपी झाले',
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleTagClick = (tag: string, type: 'taste' | 'meal' | 'cuisine') => {
    navigate(`/?filter=${type}&value=${encodeURIComponent(tag)}`);
  };

  const toggleStep = (index: number) => {
    const newCompleted = new Set(completedSteps);
    if (newCompleted.has(index)) {
      newCompleted.delete(index);
    } else {
      newCompleted.add(index);
    }
    setCompletedSteps(newCompleted);
  };

  const extractTimeFromStep = (step: string): number | null => {
    const timeMatch = step.match(/(\d+)\s*(min|mins|minute|minutes)/i);
    return timeMatch ? parseInt(timeMatch[1]) : null;
  };


  // Truncate description to 150 characters for meta description
  const metaDescription = description.length > 150 
    ? description.substring(0, 147) + '...' 
    : description;

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title={`${title} | Authentic Marathi Recipe by RecipeMaker`}
        description={metaDescription}
        image={recipe.thumbnailUrl}
        url={`/recipe/${recipe.id}`}
        type="article"
        structuredData={{
          "@context": "https://schema.org",
          "@type": "Recipe",
          "name": title,
          "description": description,
          "image": recipe.thumbnailUrl,
          "author": {
            "@type": "Person",
            "name": creator
          },
          "datePublished": new Date().toISOString(),
          "prepTime": recipe.cookTime,
          "cookTime": recipe.cookTime,
          "totalTime": recipe.cookTime,
          "recipeYield": `${recipe.servings} servings`,
          "recipeCategory": recipe.mealType?.[0] || "Main Dish",
          "recipeCuisine": recipe.cuisine?.[0] || "Marathi",
          "recipeIngredient": recipe.ingredients,
          "recipeInstructions": recipe.steps.map((step: string, index: number) => ({
            "@type": "HowToStep",
            "position": index + 1,
            "text": step
          })),
          "video": {
            "@type": "VideoObject",
            "name": title,
            "description": description,
            "thumbnailUrl": recipe.thumbnailUrl,
            "contentUrl": recipe.youtubeUrl,
            "embedUrl": `https://www.youtube.com/embed/${recipe.videoId}`,
            "uploadDate": new Date().toISOString()
          },
          "keywords": [...recipe.tasteProfile, ...recipe.mealType, ...recipe.cuisine, recipe.difficulty].join(", ")
        }}
      />
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
        <div className="mb-8 animate-fade-in">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 text-foreground">
                {title}
              </h1>
              {recipe.isPremium && (
                <Badge className="bg-accent text-accent-foreground mb-4">
                  <Lock className="mr-1 w-3 h-3" />
                  {language === 'en' ? 'Premium' : 'प्रीमियम'}
                </Badge>
              )}
            </div>
          </div>

          {/* About this Recipe */}
          <div className="bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-xl p-6 mb-6 border border-border/50">
            <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-primary" />
              {language === 'en' ? 'About this Recipe' : 'या रेसिपीबद्दल'}
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              {description}
            </p>
          </div>

          {/* Meta Info */}
          <div className="flex flex-wrap gap-6 mb-6">
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{language === 'en' ? 'Cook Time' : 'वेळ'}</p>
                <p className="font-semibold">{recipe.cookTime}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{language === 'en' ? 'Servings' : 'सर्व्हिंग्ज'}</p>
                <p className="font-semibold">{recipe.servings}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-foreground">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ChefHat className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{language === 'en' ? 'Difficulty' : 'कठिणाई'}</p>
                <p className="font-semibold">{recipe.difficulty}</p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button 
              className={`shadow-warm hover-scale ${
                isFavorite ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-gradient-hero'
              }`}
              onClick={toggleFavorite}
            >
              <Heart 
                className={`mr-2 w-4 h-4 ${isFavorite ? 'fill-white' : ''}`}
              />
              {isFavorite 
                ? (language === 'en' ? 'Added to Favorites' : 'फेव्हरिटमध्ये जोडले')
                : (language === 'en' ? 'Add to Favorites' : 'फेव्हरिटमध्ये जोडा')
              }
            </Button>
            <Button variant="outline" className="hover-scale">
              <Share2 className="mr-2 w-4 h-4" />
              {language === 'en' ? 'Share' : 'शेअर करा'}
            </Button>
          </div>
        </div>

        {/* Video */}
        <Card className="mb-8 overflow-hidden shadow-card animate-fade-in">
          <CardContent className="p-0">
            <div className="aspect-video bg-muted flex items-center justify-center relative group">
              <img 
                src={recipe.thumbnailUrl} 
                alt={title}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Button 
                  size="lg" 
                  className="bg-primary/90 hover:bg-primary shadow-warm hover-scale"
                  onClick={() => window.open(recipe.youtubeUrl, '_blank', 'noopener,noreferrer')}
                >
                  <Play className="mr-2 w-5 h-5" />
                  {language === 'en' ? 'Watch on YouTube' : 'YouTube वर पहा'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Creator Info */}
        <CreatorCard name={creator} language={language} />

        <div className="grid md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-1 space-y-4">
            <Card className="shadow-card animate-fade-in">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center">
                    <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">
                    {language === 'en' ? 'Ingredients' : 'साहित्य'}
                  </h2>
                </div>
                
                <ServingAdjuster 
                  servings={servings} 
                  onChange={setServings} 
                  language={language}
                />

                <ul className="space-y-3 mb-4">
                  {scaledIngredients.map((ingredient: string, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                      <span className="text-foreground">{ingredient}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex gap-2 pt-4 border-t border-border">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={handleCopyIngredients}
                  >
                    <Copy className="mr-2 w-4 h-4" />
                    {language === 'en' ? 'Copy' : 'कॉपी'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={handlePrint}
                  >
                    <Printer className="mr-2 w-4 h-4" />
                    {language === 'en' ? 'Print' : 'प्रिंट'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <NutritionalInfo 
              servings={servings} 
              baseServings={originalServings}
              language={language} 
            />
          </div>

          {/* Steps */}
          <Card className="md:col-span-2 shadow-card animate-fade-in">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-gradient-hero flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-bold text-foreground">
                  {language === 'en' ? 'Instructions' : 'सूचना'}
                </h2>
              </div>
              <ol className="space-y-6">
                {steps.map((step: string, index: number) => {
                  const timeInMinutes = extractTimeFromStep(step);
                  const stepIcon = index % 3 === 0 ? UtensilsCrossed : index % 3 === 1 ? Flame : ChefHat;
                  const StepIcon = stepIcon;
                  
                  return (
                    <li key={index} className="flex gap-4 group">
                      <div className="flex flex-col items-center gap-2">
                        <Checkbox
                          checked={completedSteps.has(index)}
                          onCheckedChange={() => toggleStep(index)}
                          className="mt-1"
                        />
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-hero text-primary-foreground flex items-center justify-center font-bold shadow-warm">
                          <StepIcon className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className={`text-foreground leading-relaxed ${completedSteps.has(index) ? 'line-through text-muted-foreground' : ''}`}>
                          {step}
                        </p>
                        {timeInMinutes && (
                          <div className="mt-2">
                            {activeTimer === index ? (
                              <CookingTimer 
                                minutes={timeInMinutes} 
                                onClose={() => setActiveTimer(null)} 
                              />
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="hover:bg-primary hover:text-primary-foreground transition-colors"
                                onClick={() => setActiveTimer(index)}
                              >
                                <Timer className="mr-2 w-4 h-4" />
                                {language === 'en' ? 'Start Timer' : 'टाइमर सुरू करा'}
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </CardContent>
          </Card>
        </div>


        {/* Related Tags Section */}
        <div className="mt-8 pb-8 border-t border-border pt-8 animate-fade-in">
          <h3 className="text-xl font-bold mb-4 text-foreground">
            {language === 'en' ? 'Related Tags' : 'संबंधित टॅग'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {recipe.tasteProfile.map((taste: string) => (
              <Badge 
                key={taste} 
                variant="secondary" 
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all hover-scale text-sm px-4 py-2"
                onClick={() => handleTagClick(taste, 'taste')}
              >
                {taste}
              </Badge>
            ))}
            {recipe.mealType.map((meal: string) => (
              <Badge 
                key={meal} 
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all hover-scale text-sm px-4 py-2"
                onClick={() => handleTagClick(meal, 'meal')}
              >
                {meal}
              </Badge>
            ))}
            {recipe.cuisine.map((cuisine: string) => (
              <Badge 
                key={cuisine} 
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all hover-scale text-sm px-4 py-2"
                onClick={() => handleTagClick(cuisine, 'cuisine')}
              >
                {cuisine}
              </Badge>
            ))}
          </div>
        </div>

        {/* Comments Section */}
        {user ? (
          <CommentsSection 
            recipeId={id!} 
            userId={user.id} 
            language={language} 
          />
        ) : (
          <Card className="mt-8 shadow-card relative overflow-hidden animate-fade-in">
            <div className="blur-sm pointer-events-none">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-4 text-foreground">
                  {language === 'en' ? 'Comments & Discussion' : 'कमेंट आणि चर्चा'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'en' 
                    ? 'Share your experience with this recipe...' 
                    : 'या रेसिपीसह तुमचा अनुभव शेअर करा...'}
                </p>
              </CardContent>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center p-6">
                <Lock className="w-12 h-12 mx-auto mb-3 text-primary" />
                <p className="text-lg font-semibold mb-2">
                  {language === 'en' 
                    ? 'Sign in to join the discussion!' 
                    : 'चर्चेत सामील होण्यासाठी साइन इन करा!'}
                </p>
                <Button
                  className="bg-gradient-hero shadow-warm mt-2 hover-scale"
                  onClick={() => navigate('/auth')}
                >
                  {language === 'en' ? 'Sign In' : 'साइन इन'}
                </Button>
              </div>
            </div>
          </Card>
        )}

      </div>
    </div>
  );
};

export default RecipePage;
