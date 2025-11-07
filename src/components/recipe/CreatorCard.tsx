import { Star, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface CreatorCardProps {
  name: string;
  rating?: number;
  recipeCount?: number;
  language: 'en' | 'mr';
}

export const CreatorCard = ({ name, rating = 4.8, recipeCount = 120, language }: CreatorCardProps) => {
  return (
    <Card className="mt-4 shadow-card hover:shadow-warm transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="w-16 h-16 border-2 border-primary">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-hero text-primary-foreground text-lg font-bold">
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h3 className="font-bold text-lg text-foreground mb-1">{name}</h3>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span className="font-medium">{rating}</span>
              </div>
              <div className="flex items-center gap-1">
                <ChefHat className="w-4 h-4" />
                <span>
                  {recipeCount} {language === 'en' ? 'Recipes' : 'रेसिपी'}
                </span>
              </div>
            </div>
          </div>
          <Button
            size="sm"
            className="bg-gradient-hero shadow-warm hover:opacity-90"
          >
            {language === 'en' ? 'Follow' : 'फॉलो करा'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
