import { FilterOptions, TasteProfile, MealType, Cuisine, Mood } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  language: 'en' | 'mr';
}

const tasteProfiles: TasteProfile[] = ['Spicy', 'Sweet', 'Sour', 'Bitter', 'Tangy', 'Savory', 'Balanced'];
const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const cuisines: Cuisine[] = ['Maharashtrian', 'South Indian', 'North Indian', 'Fusion', 'Global'];
const moods: Mood[] = ['Comfort', 'Party', 'Festive', 'Quick Bite', 'Traditional'];

const translations: Record<string, string> = {
  'Spicy': 'तिखट',
  'Sweet': 'गोड',
  'Sour': 'आंबट',
  'Bitter': 'कडू',
  'Tangy': 'चटपटीत',
  'Savory': 'चवदार',
  'Balanced': 'संतुलित',
  'Breakfast': 'नाश्ता',
  'Lunch': 'दुपारचे जेवण',
  'Dinner': 'रात्रीचे जेवण',
  'Snack': 'चाळण',
  'Dessert': 'मिठाई',
  'Maharashtrian': 'महाराष्ट्रीयन',
  'South Indian': 'दक्षिण भारतीय',
  'North Indian': 'उत्तर भारतीय',
  'Fusion': 'फ्यूजन',
  'Global': 'जागतिक',
  'Comfort': 'आराम',
  'Party': 'पार्टी',
  'Festive': 'सणासुदीचे',
  'Quick Bite': 'त्वरित',
  'Traditional': 'पारंपरिक'
};

export const FilterBar = ({ filters, onFilterChange, language }: FilterBarProps) => {
  const toggleFilter = <K extends keyof FilterOptions>(
    category: K,
    value: FilterOptions[K][number]
  ) => {
    const currentValues = filters[category] as string[];
    const newValues = currentValues.includes(value as string)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value as string];
    
    onFilterChange({
      ...filters,
      [category]: newValues,
    });
  };

  const clearAllFilters = () => {
    onFilterChange({
      creator: [],
      tasteProfile: [],
      mealType: [],
      cuisine: [],
      mood: [],
    });
  };

  const getDisplayText = (text: string) => {
    return language === 'mr' && translations[text] ? translations[text] : text;
  };

  const activeFilterCount = Object.values(filters).flat().length;

  const FilterContent = () => (
    <div className="space-y-6">
      {/* Creator */}
      <div>
        <h3 className="font-semibold mb-3 text-foreground">
          {language === 'en' ? 'Creator' : 'क्रिएटर'}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Badge
            variant={filters.creator.includes("Sarita's Kitchen") ? 'default' : 'outline'}
            className="cursor-pointer hover:shadow-warm transition-all"
            onClick={() => toggleFilter('creator', "Sarita's Kitchen")}
          >
            {language === 'en' ? "Sarita's Kitchen" : 'सरिताज किचन'}
          </Badge>
        </div>
      </div>

      {/* Taste Profile */}
      <div>
        <h3 className="font-semibold mb-3 text-foreground">
          {language === 'en' ? 'Taste Profile' : 'चव प्रोफाइल'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {tasteProfiles.map((taste) => (
            <Badge
              key={taste}
              variant={filters.tasteProfile.includes(taste) ? 'default' : 'outline'}
              className="cursor-pointer hover:shadow-warm transition-all"
              onClick={() => toggleFilter('tasteProfile', taste)}
            >
              {getDisplayText(taste)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Meal Type */}
      <div>
        <h3 className="font-semibold mb-3 text-foreground">
          {language === 'en' ? 'Meal Type' : 'जेवणाचा प्रकार'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {mealTypes.map((meal) => (
            <Badge
              key={meal}
              variant={filters.mealType.includes(meal) ? 'default' : 'outline'}
              className="cursor-pointer hover:shadow-warm transition-all"
              onClick={() => toggleFilter('mealType', meal)}
            >
              {getDisplayText(meal)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Cuisine */}
      <div>
        <h3 className="font-semibold mb-3 text-foreground">
          {language === 'en' ? 'Cuisine' : 'पाककृती'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {cuisines.map((cuisine) => (
            <Badge
              key={cuisine}
              variant={filters.cuisine.includes(cuisine) ? 'default' : 'outline'}
              className="cursor-pointer hover:shadow-warm transition-all"
              onClick={() => toggleFilter('cuisine', cuisine)}
            >
              {getDisplayText(cuisine)}
            </Badge>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div>
        <h3 className="font-semibold mb-3 text-foreground">
          {language === 'en' ? 'Mood' : 'मूड'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {moods.map((mood) => (
            <Badge
              key={mood}
              variant={filters.mood.includes(mood) ? 'default' : 'outline'}
              className="cursor-pointer hover:shadow-warm transition-all"
              onClick={() => toggleFilter('mood', mood)}
            >
              {getDisplayText(mood)}
            </Badge>
          ))}
        </div>
      </div>

      {activeFilterCount > 0 && (
        <Button
          variant="outline"
          onClick={clearAllFilters}
          className="w-full"
        >
          <X className="mr-2 w-4 h-4" />
          {language === 'en' ? 'Clear All Filters' : 'सर्व फिल्टर्स साफ करा'}
        </Button>
      )}
    </div>
  );

  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {language === 'en' ? 'Filters' : 'फिल्टर्स'}
          </h2>
          
          {/* Filter Sheet for all devices */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="mr-2 w-4 h-4" />
                {language === 'en' ? 'Filters' : 'फिल्टर्स'}
                {activeFilterCount > 0 && (
                  <Badge variant="default" className="ml-2 px-2 py-0.5 text-xs">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="overflow-y-auto w-[90vw] sm:w-[400px]">
              <SheetHeader>
                <SheetTitle>
                  {language === 'en' ? 'Filter Recipes' : 'रेसिपी फिल्टर करा'}
                </SheetTitle>
                <SheetDescription>
                  {language === 'en' 
                    ? 'Refine your recipe search with smart filters'
                    : 'स्मार्ट फिल्टर्ससह तुमचा रेसिपी शोध सुधारा'}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <FilterContent />
              </div>
            </SheetContent>
          </Sheet>
        </div>
        
        {/* Active filters display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {Object.entries(filters).map(([category, values]) =>
              (values as string[]).map((value) => (
                <Badge
                  key={`${category}-${value}`}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  onClick={() => toggleFilter(category as keyof FilterOptions, value)}
                >
                  {getDisplayText(value)}
                  <X className="ml-1 w-3 h-3" />
                </Badge>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
