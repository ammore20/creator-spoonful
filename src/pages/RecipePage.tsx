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
  MessageCircle, Timer, Flame, UtensilsCrossed
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';
import { ServingAdjuster } from '@/components/recipe/ServingAdjuster';
import { PremiumPopup } from '@/components/recipe/PremiumPopup';
import { CreatorCard } from '@/components/recipe/CreatorCard';
import { CookingTimer } from '@/components/recipe/CookingTimer';
import { NutritionalInfo } from '@/components/recipe/NutritionalInfo';
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
  const [showPremiumPopup, setShowPremiumPopup] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [activeTimer, setActiveTimer] = useState<number | null>(null);
  const [rating, setRating] = useState(0);

  useEffect(() => {
    fetchRecipe();
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
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
  const description = language === 'mr' && recipe.descriptionMr ? recipe.descriptionMr : recipe.description;
  const ingredients = language === 'mr' && recipe.ingredientsMr ? recipe.ingredientsMr : recipe.ingredients;
  const steps = language === 'mr' && recipe.stepsMr ? recipe.stepsMr : recipe.steps;

  const scaledIngredients = ingredients.map((ingredient: string) => {
    const ratio = servings / originalServings;
    return ingredient.replace(/(\d+\.?\d*)/g, (match) => {
      const num = parseFloat(match);
      return (num * ratio).toFixed(num % 1 === 0 ? 0 : 1);
    });
  });

  const handlePremiumAction = () => {
    if (!user) {
      toast({
        title: language === 'en' ? 'Login Required' : 'लॉगिन आवश्यक',
        description: language === 'en' ? 'Please login to access premium features' : 'प्रीमियम वैशिष्ट्यांसाठी कृपया लॉगिन करा',
      });
      return;
    }
    setShowPremiumPopup(true);
  };

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

  const handleRating = (value: number) => {
    handlePremiumAction();
    setRating(value);
  };

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
            {recipe.tasteProfile.map((taste: string) => (
              <Badge 
                key={taste} 
                variant="secondary" 
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleTagClick(taste, 'taste')}
              >
                {taste}
              </Badge>
            ))}
            {recipe.mealType.map((meal: string) => (
              <Badge 
                key={meal} 
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleTagClick(meal, 'meal')}
              >
                {meal}
              </Badge>
            ))}
            {recipe.cuisine.map((cuisine: string) => (
              <Badge 
                key={cuisine} 
                variant="outline"
                className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                onClick={() => handleTagClick(cuisine, 'cuisine')}
              >
                {cuisine}
              </Badge>
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button 
              className="bg-gradient-hero shadow-warm"
              onClick={handlePremiumAction}
            >
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
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <a href={recipe.youtubeUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" className="bg-primary/90 hover:bg-primary shadow-warm">
                    <Play className="mr-2 w-5 h-5" />
                    {language === 'en' ? 'Watch on YouTube' : 'YouTube वर पहा'}
                  </Button>
                </a>
              </div>
            </div>
          </CardContent>
          <CreatorCard name={creator} language={language} />
        </Card>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Ingredients */}
          <div className="md:col-span-1 space-y-4">
            <Card className="shadow-card">
              <CardContent className="p-6">
                <h2 className="text-2xl font-bold mb-4 text-foreground">
                  {language === 'en' ? 'Ingredients' : 'साहित्य'}
                </h2>
                
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
                    onClick={handlePremiumAction}
                  >
                    <Copy className="mr-2 w-4 h-4" />
                    {language === 'en' ? 'Copy' : 'कॉपी'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1 hover:bg-primary hover:text-primary-foreground transition-colors"
                    onClick={handlePremiumAction}
                  >
                    <Printer className="mr-2 w-4 h-4" />
                    {language === 'en' ? 'Print' : 'प्रिंट'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            <NutritionalInfo language={language} />
          </div>

          {/* Steps */}
          <Card className="md:col-span-2 shadow-card">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold mb-6 text-foreground">
                {language === 'en' ? 'Instructions' : 'सूचना'}
              </h2>
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

        {/* Rating Section */}
        <Card className="mt-8 shadow-card">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-4 text-foreground">
              {language === 'en' ? 'Rate this Recipe' : 'या रेसिपीला रेटिंग द्या'}
            </h3>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => handleRating(value)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={`w-8 h-8 ${
                      value <= rating
                        ? 'fill-amber-500 text-amber-500'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        <Card className="mt-8 shadow-card relative overflow-hidden">
          <div className={`${!user ? 'blur-sm pointer-events-none' : ''}`}>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4 text-foreground flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                {language === 'en' ? 'Comments & Your Version' : 'कमेंट आणि तुमची आवृत्ती'}
              </h3>
              <p className="text-muted-foreground">
                {language === 'en' 
                  ? 'Share your experience with this recipe...' 
                  : 'या रेसिपीसह तुमचा अनुभव शेअर करा...'}
              </p>
            </CardContent>
          </div>
          {!user && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
              <div className="text-center p-6">
                <Lock className="w-12 h-12 mx-auto mb-3 text-primary" />
                <p className="text-lg font-semibold mb-2">
                  {language === 'en' 
                    ? 'Unlock premium to comment and save recipes!' 
                    : 'कमेंट आणि रेसिपी सेव्ह करण्यासाठी प्रीमियम अनलॉक करा!'}
                </p>
                <Button
                  className="bg-gradient-hero shadow-warm mt-2"
                  onClick={handlePremiumAction}
                >
                  {language === 'en' ? 'Upgrade to Premium' : 'प्रीमियम मिळवा'}
                </Button>
              </div>
            </div>
          )}
        </Card>

      </div>

      <PremiumPopup 
        isOpen={showPremiumPopup} 
        onClose={() => setShowPremiumPopup(false)} 
        language={language}
      />
    </div>
  );
};

export default RecipePage;
