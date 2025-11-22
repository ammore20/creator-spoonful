import { Card, CardContent } from '@/components/ui/card';

interface NutritionalInfoProps {
  baseCalories?: number;
  baseProtein?: number;
  baseCarbs?: number;
  baseFat?: number;
  servings: number;
  baseServings: number;
  language: 'en' | 'mr';
}

export const NutritionalInfo = ({
  baseCalories = 1200,
  baseProtein = 35,
  baseCarbs = 140,
  baseFat = 45,
  servings,
  baseServings,
  language,
}: NutritionalInfoProps) => {
  // Calculate total nutrition based on current servings
  const totalCalories = Math.round((baseCalories / baseServings) * servings);
  const totalProtein = Math.round((baseProtein / baseServings) * servings);
  const totalCarbs = Math.round((baseCarbs / baseServings) * servings);
  const totalFat = Math.round((baseFat / baseServings) * servings);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">
          {language === 'en' ? `Nutritional Info (Total for ${servings} servings)` : `पोषण माहिती (एकूण ${servings} सर्व्हिंग्जसाठी)`}
        </h3>
        <div className="flex flex-wrap gap-3 text-sm text-foreground">
          <div className="flex items-center gap-1">
            <span className="font-bold">{totalCalories}</span>
            <span className="text-muted-foreground">kcal</span>
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1">
            <span className="font-bold">{totalProtein}g</span>
            <span className="text-muted-foreground">
              {language === 'en' ? 'Protein' : 'प्रोटीन'}
            </span>
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1">
            <span className="font-bold">{totalCarbs}g</span>
            <span className="text-muted-foreground">
              {language === 'en' ? 'Carbs' : 'कार्ब्स'}
            </span>
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1">
            <span className="font-bold">{totalFat}g</span>
            <span className="text-muted-foreground">
              {language === 'en' ? 'Fat' : 'फॅट'}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          {language === 'en' ? 'Approximate values' : 'अंदाजे मूल्ये'}
        </p>
      </CardContent>
    </Card>
  );
};
