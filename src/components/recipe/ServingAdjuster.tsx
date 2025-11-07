import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ServingAdjusterProps {
  servings: number;
  onChange: (servings: number) => void;
  language: 'en' | 'mr';
}

export const ServingAdjuster = ({ servings, onChange, language }: ServingAdjusterProps) => {
  const handleDecrease = () => {
    if (servings > 1) onChange(servings - 1);
  };

  const handleIncrease = () => {
    if (servings < 10) onChange(servings + 1);
  };

  return (
    <div className="flex items-center gap-3 mb-4 p-3 bg-muted/50 rounded-lg border border-border">
      <span className="text-sm font-medium text-foreground">
        {language === 'en' ? 'Servings:' : 'सर्व्हिंग्ज:'}
      </span>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={handleDecrease}
          disabled={servings <= 1}
        >
          <Minus className="w-4 h-4" />
        </Button>
        <span className="text-lg font-bold text-foreground min-w-[2rem] text-center">
          {servings}
        </span>
        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
          onClick={handleIncrease}
          disabled={servings >= 10}
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};
