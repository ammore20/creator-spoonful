import { Card, CardContent } from '@/components/ui/card';

interface NutritionalInfoProps {
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  language: 'en' | 'mr';
}

export const NutritionalInfo = ({
  calories = 250,
  protein = 8,
  carbs = 30,
  fat = 10,
  language,
}: NutritionalInfoProps) => {
  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-amber-50/50 to-orange-50/50 dark:from-amber-950/10 dark:to-orange-950/10 shadow-sm">
      <CardContent className="p-4">
        <h3 className="text-sm font-bold text-foreground mb-2">
          {language === 'en' ? 'Nutritional Info (Per Serving)' : 'पोषण माहिती (प्रति सर्व्हिंग)'}
        </h3>
        <div className="flex flex-wrap gap-3 text-sm text-foreground">
          <div className="flex items-center gap-1">
            <span className="font-bold">{calories}</span>
            <span className="text-muted-foreground">kcal</span>
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1">
            <span className="font-bold">{protein}g</span>
            <span className="text-muted-foreground">
              {language === 'en' ? 'Protein' : 'प्रोटीन'}
            </span>
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1">
            <span className="font-bold">{carbs}g</span>
            <span className="text-muted-foreground">
              {language === 'en' ? 'Carbs' : 'कार्ब्स'}
            </span>
          </div>
          <span className="text-muted-foreground">|</span>
          <div className="flex items-center gap-1">
            <span className="font-bold">{fat}g</span>
            <span className="text-muted-foreground">
              {language === 'en' ? 'Fat' : 'फॅट'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
