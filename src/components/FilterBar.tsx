import { FilterOptions, TasteProfile, MealType, Cuisine, Mood } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Filter, ChevronDown } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

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
    <>
      {/* Creator */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          {language === 'en' ? 'Creator' : 'क्रिएटर'}
        </Label>
        <div className="flex items-center space-x-2">
          <Checkbox
            id="creator-sarita"
            checked={filters.creator.includes("Sarita's Kitchen")}
            onCheckedChange={() => toggleFilter('creator', "Sarita's Kitchen")}
          />
          <label
            htmlFor="creator-sarita"
            className="text-sm cursor-pointer text-foreground"
          >
            {language === 'en' ? "Sarita's Kitchen" : 'सरिताज किचन'}
          </label>
        </div>
      </div>

      {/* Taste Profile */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          {language === 'en' ? 'Taste Profile' : 'चव प्रोफाइल'}
        </Label>
        <div className="space-y-2">
          {tasteProfiles.map((taste) => (
            <div key={taste} className="flex items-center space-x-2">
              <Checkbox
                id={`taste-${taste}`}
                checked={filters.tasteProfile.includes(taste)}
                onCheckedChange={() => toggleFilter('tasteProfile', taste)}
              />
              <label
                htmlFor={`taste-${taste}`}
                className="text-sm cursor-pointer text-foreground"
              >
                {getDisplayText(taste)}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Meal Type */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          {language === 'en' ? 'Meal Type' : 'जेवणाचा प्रकार'}
        </Label>
        <div className="space-y-2">
          {mealTypes.map((meal) => (
            <div key={meal} className="flex items-center space-x-2">
              <Checkbox
                id={`meal-${meal}`}
                checked={filters.mealType.includes(meal)}
                onCheckedChange={() => toggleFilter('mealType', meal)}
              />
              <label
                htmlFor={`meal-${meal}`}
                className="text-sm cursor-pointer text-foreground"
              >
                {getDisplayText(meal)}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Cuisine */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          {language === 'en' ? 'Cuisine' : 'पाककृती'}
        </Label>
        <div className="space-y-2">
          {cuisines.map((cuisine) => (
            <div key={cuisine} className="flex items-center space-x-2">
              <Checkbox
                id={`cuisine-${cuisine}`}
                checked={filters.cuisine.includes(cuisine)}
                onCheckedChange={() => toggleFilter('cuisine', cuisine)}
              />
              <label
                htmlFor={`cuisine-${cuisine}`}
                className="text-sm cursor-pointer text-foreground"
              >
                {getDisplayText(cuisine)}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Mood */}
      <div className="space-y-2">
        <Label className="text-sm font-semibold text-foreground">
          {language === 'en' ? 'Mood' : 'मूड'}
        </Label>
        <div className="space-y-2">
          {moods.map((mood) => (
            <div key={mood} className="flex items-center space-x-2">
              <Checkbox
                id={`mood-${mood}`}
                checked={filters.mood.includes(mood)}
                onCheckedChange={() => toggleFilter('mood', mood)}
              />
              <label
                htmlFor={`mood-${mood}`}
                className="text-sm cursor-pointer text-foreground"
              >
                {getDisplayText(mood)}
              </label>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div className="bg-card border-b border-border">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">
            {language === 'en' ? 'Filters' : 'फिल्टर्स'}
          </h2>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="text-xs">
              {activeFilterCount} {language === 'en' ? 'active' : 'सक्रिय'}
            </Badge>
          )}
        </div>
        
        {/* Direct Filter Display */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          <FilterContent />
        </div>
        
        {/* Active filters display */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
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
