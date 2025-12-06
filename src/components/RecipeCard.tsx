import { useState, useEffect, memo } from 'react';
import { Recipe } from '@/types/recipe';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, ChefHat, Lock, Heart, Star, Flame } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import logo from '@/assets/logo.png';

interface RecipeCardProps {
  recipe: Recipe;
  language: 'en' | 'mr';
  loading?: 'lazy' | 'eager';
}

const RecipeCardComponent = ({ recipe, language, loading = 'lazy' }: RecipeCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { toast } = useToast();

  const title = language === 'mr' && recipe.titleMr ? recipe.titleMr : recipe.title;
  const creator = language === 'mr' && recipe.creatorMr ? recipe.creatorMr : recipe.creator;
  const description = language === 'mr' && recipe.descriptionMr ? recipe.descriptionMr : recipe.description;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        checkIfFavorited(session.user.id);
      }
    });
  }, [recipe.id]);

  const checkIfFavorited = async (userId: string) => {
    const { data } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', recipe.id)
      .maybeSingle();
    
    setIsFavorite(!!data);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: language === 'en' ? 'Sign in required' : 'साइन इन आवश्यक',
        description: language === 'en' ? 'Please sign in to save favorites' : 'फेव्हरिट सेव्ह करण्यासाठी साइन इन करा',
        variant: 'destructive',
      });
      return;
    }

    if (isFavorite) {
      // Remove from favorites
      await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('recipe_id', recipe.id);
      
      setIsFavorite(false);
      toast({
        description: `${language === 'en' ? 'Removed from favorites' : 'फेव्हरिटमधून काढले'}`,
        duration: 2000,
      });
    } else {
      // Add to favorites
      await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, recipe_id: recipe.id });
      
      setIsFavorite(true);
      toast({
        description: `❤️ ${language === 'en' ? 'Added to favorites' : 'फेव्हरिटमध्ये जोडले'}`,
        duration: 2000,
      });
    }
  };

  const getSpiceLevel = () => {
    if (recipe.tasteProfile.includes('Spicy')) return 3;
    if (recipe.tasteProfile.includes('Tangy')) return 2;
    return 1;
  };

  return (
    <Card className="group overflow-hidden hover-lift hover-glow transition-all duration-500 bg-gradient-card border-border relative opacity-0 animate-fade-in-scale">
      <Link to={`/recipe/${recipe.id}`}>
        <CardHeader className="p-0 relative img-zoom">
          <div className="aspect-video overflow-hidden relative bg-muted">
            {!imageLoaded && (
              <div className="absolute inset-0 shimmer"></div>
            )}
            <img
              src={recipe.thumbnailUrl}
              alt={title}
              loading={loading}
              onLoad={() => setImageLoaded(true)}
              className={`w-full h-full object-cover transition-all duration-700 ${
                imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'
              }`}
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="text-white text-xl font-bold animate-zoom-in">
                🎥 {language === 'en' ? 'Watch Recipe' : 'रेसिपी पहा'}
              </div>
            </div>
            
            {/* Creator Avatar Badge */}
            <div className="absolute top-3 left-3 bg-white rounded-full p-1 shadow-lg">
              <img src={logo} alt={creator} className="w-8 h-8 rounded-full" />
            </div>

            {/* Premium Badge */}
            {recipe.isPremium && (
              <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-3 py-1.5 rounded-full flex items-center gap-1 text-sm font-semibold shadow-lg">
                <Lock className="w-3 h-3" />
                {language === 'en' ? 'Premium' : 'प्रीमियम'}
              </div>
            )}

            {/* Difficulty Badge */}
            {recipe.difficulty && (
              <div className="absolute bottom-3 left-3">
                <Badge variant="secondary" className="backdrop-blur-md bg-white/90 text-foreground shadow-md font-medium">
                  {recipe.difficulty}
                </Badge>
              </div>
            )}

            {/* Favorite Heart */}
            <button
              onClick={toggleFavorite}
              className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:scale-125 btn-press transition-all duration-300"
            >
              <Heart 
                className={`w-5 h-5 transition-all duration-300 ${
                  isFavorite ? 'fill-red-500 text-red-500 animate-heart-beat' : 'text-muted-foreground hover:text-red-400'
                }`}
              />
            </button>
          </div>
        </CardHeader>
      </Link>
      
      <CardContent className="p-4 sm:p-5">
        <Link to={`/recipe/${recipe.id}`} className="link-underline">
          <h3 className="text-lg sm:text-xl font-bold mb-2 group-hover:text-primary transition-colors duration-300 line-clamp-2">
            {title}
          </h3>
        </Link>
        <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 line-clamp-2">
          {description}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3 sm:mb-4 pb-3 sm:pb-4 border-b border-border">
          <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" />
          <span className="font-medium truncate">{creator}</span>
        </div>

        {/* Info Chips */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
          {/* Time Chip */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-gradient-pill px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border">
            <Clock className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
            <span className="text-[10px] sm:text-xs font-medium">{recipe.cookTime}</span>
          </div>
          
          {/* Spice Level Chip */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-gradient-pill px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border">
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-500" />
            <div className="flex gap-0.5">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1 h-2.5 sm:h-3 rounded-full ${
                    i < getSpiceLevel() ? 'bg-orange-500' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
          
          {/* Rating Chip */}
          <div className="flex items-center gap-1 sm:gap-1.5 bg-gradient-pill px-2 sm:px-3 py-1 sm:py-1.5 rounded-full border border-border">
            <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-accent fill-accent" />
            <span className="text-[10px] sm:text-xs font-medium">4.8</span>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {recipe.mealType.map((meal) => (
              <Badge key={meal} className="text-xs bg-primary/10 text-primary hover:bg-primary/20 border-0">
                {meal}
              </Badge>
            ))}
            {recipe.mood.slice(0, 2).map((mood) => (
              <Badge key={mood} variant="secondary" className="text-xs">
                {mood}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {recipe.tasteProfile.slice(0, 3).map((taste) => (
              <Badge key={taste} variant="outline" className="text-xs">
                {taste}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 sm:p-5 pt-0 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 sm:gap-1.5 text-xs sm:text-sm text-muted-foreground bg-muted/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full">
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span className="font-medium">{recipe.servings} {language === 'en' ? 'servings' : 'सर्व्हिंग्ज'}</span>
        </div>
        <Link to={`/recipe/${recipe.id}`}>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 ripple btn-press font-semibold shadow-pill text-xs sm:text-sm px-3 sm:px-4 transition-all duration-300 hover:shadow-warm">
            {language === 'en' ? 'View Recipe' : 'रेसिपी पहा'} →
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};

export const RecipeCard = memo(RecipeCardComponent);