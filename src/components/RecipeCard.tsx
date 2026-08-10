import { useState, useEffect, memo } from 'react';
import { Recipe } from '@/types/recipe';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, Lock, Heart, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCurrentUser } from '@/hooks/useCurrentUser';


interface RecipeCardProps {
  recipe: Recipe;
  language: 'en' | 'mr';
  loading?: 'lazy' | 'eager';
}

const RecipeCardComponent = ({ recipe, language, loading = 'lazy' }: RecipeCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const user = useCurrentUser();
  const [imageLoaded, setImageLoaded] = useState(false);
  const { toast } = useToast();

  const title = language === 'mr' && recipe.titleMr ? recipe.titleMr : recipe.title;
  const creator = language === 'mr' && recipe.creatorMr ? recipe.creatorMr : recipe.creator;
  const description = language === 'mr' && recipe.descriptionMr ? recipe.descriptionMr : recipe.description;

  useEffect(() => {
    if (user) {
      checkIfFavorited(user.id);
    } else {
      setIsFavorite(false);
    }
  }, [user, recipe.id]);

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
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all duration-300 hover:shadow-card hover:border-primary/30">
      <Link to={`/recipe/${recipe.id}`} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-muted">
          {!imageLoaded && <div className="absolute inset-0 shimmer" />}
          <img
            src={recipe.thumbnailUrl}
            alt={title}
            loading={loading}
            onLoad={() => setImageLoaded(true)}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-[1.04] ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />

          {recipe.isPremium && (
            <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-foreground/85 px-2 py-1 text-[10px] font-semibold text-background backdrop-blur">
              <Lock className="w-2.5 h-2.5" />
              {language === 'en' ? 'Premium' : 'प्रीमियम'}
            </span>
          )}

          {recipe.difficulty && !recipe.isPremium && (
            <span className="absolute top-2 left-2 rounded-full bg-card/90 px-2 py-1 text-[10px] font-semibold text-foreground backdrop-blur">
              {recipe.difficulty}
            </span>
          )}

          <button
            onClick={toggleFavorite}
            aria-label="Toggle favorite"
            className="absolute top-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-card/90 backdrop-blur transition-transform duration-200 hover:scale-110"
          >
            <Heart
              className={`w-4 h-4 transition-colors ${
                isFavorite ? 'fill-primary text-primary' : 'text-muted-foreground'
              }`}
            />
          </button>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-3 sm:p-3.5">
        <div className="flex items-center gap-1 mb-1.5">
          <Star className="w-3 h-3 fill-accent text-accent" />
          <span className="text-[11px] font-semibold text-foreground">4.8</span>
          <span className="text-[11px] text-muted-foreground truncate">· {creator}</span>
        </div>

        <Link to={`/recipe/${recipe.id}`}>
          <h3 className="font-display text-sm sm:text-[15px] font-bold leading-snug text-foreground line-clamp-2 transition-colors group-hover:text-primary">
            {title}
          </h3>
        </Link>

        <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-primary" />
            {recipe.cookTime}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="w-3 h-3" />
            {recipe.servings}
          </span>
        </div>

        {(recipe.mealType.length > 0 || recipe.tasteProfile.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.mealType.slice(0, 1).map((meal) => (
              <Badge key={meal} variant="soft">
                {meal}
              </Badge>
            ))}
            {recipe.tasteProfile.slice(0, 1).map((taste) => (
              <Badge key={taste} variant="outline">
                {taste}
              </Badge>
            ))}
          </div>
        )}

        <Link to={`/recipe/${recipe.id}`} className="mt-3 mt-auto pt-3">
          <Button variant="soft" size="sm" className="w-full">
            {language === 'en' ? 'View details' : 'रेसिपी पहा'}
          </Button>
        </Link>
      </div>
    </article>
  );
};


export const RecipeCard = memo(RecipeCardComponent);