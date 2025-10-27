import { Recipe } from '@/types/recipe';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, ChefHat, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RecipeCardProps {
  recipe: Recipe;
  language: 'en' | 'mr';
}

export const RecipeCard = ({ recipe, language }: RecipeCardProps) => {
  const title = language === 'mr' && recipe.titleMr ? recipe.titleMr : recipe.title;
  const creator = language === 'mr' && recipe.creatorMr ? recipe.creatorMr : recipe.creator;
  const description = language === 'mr' && recipe.descriptionMr ? recipe.descriptionMr : recipe.description;

  return (
    <Card className="group overflow-hidden hover:shadow-warm transition-all duration-300 bg-gradient-card border-border">
      <Link to={`/recipe/${recipe.id}`}>
        <CardHeader className="p-0 relative">
          <div className="aspect-video overflow-hidden">
            <img
              src={recipe.thumbnailUrl}
              alt={title}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            />
          </div>
          {recipe.isPremium && (
            <div className="absolute top-3 right-3 bg-accent text-accent-foreground px-3 py-1 rounded-full flex items-center gap-1 text-sm font-medium shadow-lg">
              <Lock className="w-3 h-3" />
              {language === 'en' ? 'Premium' : 'प्रीमियम'}
            </div>
          )}
          <div className="absolute bottom-3 left-3 flex flex-wrap gap-2">
            {recipe.difficulty && (
              <Badge variant="secondary" className="backdrop-blur-sm bg-card/80">
                {recipe.difficulty}
              </Badge>
            )}
          </div>
        </CardHeader>
      </Link>
      
      <CardContent className="p-4">
        <Link to={`/recipe/${recipe.id}`}>
          <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {title}
          </h3>
        </Link>
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {description}
        </p>
        
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
          <ChefHat className="w-4 h-4 text-primary" />
          <span className="font-medium">{creator}</span>
        </div>

        <div className="space-y-2 mb-3">
          <div className="flex flex-wrap gap-1">
            {recipe.mealType.map((meal) => (
              <Badge key={meal} variant="default" className="text-xs">
                {meal}
              </Badge>
            ))}
            {recipe.mood.slice(0, 2).map((mood) => (
              <Badge key={mood} variant="secondary" className="text-xs">
                {mood}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {recipe.tasteProfile.slice(0, 3).map((taste) => (
              <Badge key={taste} variant="outline" className="text-xs">
                {taste}
              </Badge>
            ))}
            {recipe.cuisine.map((cuisine) => (
              <Badge key={cuisine} variant="outline" className="text-xs">
                {cuisine}
              </Badge>
            ))}
          </div>
        </div>
      </CardContent>
      
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{recipe.cookTime}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{recipe.servings}</span>
          </div>
        </div>
        <Link to={`/recipe/${recipe.id}`}>
          <Button size="sm" variant="ghost" className="text-primary hover:text-primary hover:bg-primary/10">
            {language === 'en' ? 'View Recipe' : 'रेसिपी पहा'} →
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
};
