import { FilterOptions, TasteProfile, MealType, Cuisine, Mood } from '@/types/recipe';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Wand2, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface FilterBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  language: 'en' | 'mr';
}

const filterIcons: Record<string, string> = {
  'Spicy': '🌶️',
  'Sweet': '🍰',
  'Sour': '🍋',
  'Bitter': '☕',
  'Tangy': '🍊',
  'Savory': '🧂',
  'Balanced': '⚖️',
  'Breakfast': '🌅',
  'Lunch': '🍱',
  'Dinner': '🌙',
  'Snack': '🍿',
  'Dessert': '🍨',
  'Maharashtrian': '🏛️',
  'South Indian': '🥥',
  'North Indian': '🍛',
  'Fusion': '🌍',
  'Global': '✈️',
  'Comfort': '🛋️',
  'Party': '🎉',
  'Festive': '🪔',
  'Quick Bite': '⏱️',
  'Traditional': '👵'
};

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

const tasteProfiles: TasteProfile[] = ['Spicy', 'Sweet', 'Sour', 'Bitter', 'Tangy', 'Savory', 'Balanced'];
const mealTypes: MealType[] = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
const cuisines: Cuisine[] = ['Maharashtrian', 'South Indian', 'North Indian', 'Fusion', 'Global'];
const moods: Mood[] = ['Comfort', 'Party', 'Festive', 'Quick Bite', 'Traditional'];

export const FilterBar = ({ filters, onFilterChange, language }: FilterBarProps) => {
  const { toast } = useToast();
  
  const toggleFilter = <K extends keyof FilterOptions>(
    category: K,
    value: FilterOptions[K][number]
  ) => {
    const currentValues = filters[category] as string[];
    const newValues = currentValues.includes(value as string)
      ? currentValues.filter((v) => v !== value)
      : [...currentValues, value as string];
    
    const newFilters = {
      ...filters,
      [category]: newValues,
    };
    
    onFilterChange(newFilters);
    
    // Show toast for filter changes
    const activeCount = Object.values(newFilters).flat().length;
    if (activeCount > 0) {
      toast({
        description: `🍲 ${language === 'en' ? `Showing recipes with ${activeCount} filter${activeCount > 1 ? 's' : ''}` : `${activeCount} फिल्टरसह रेसिपी दाखवत आहे`}`,
        duration: 2000,
      });
    }
  };

  const clearAllFilters = () => {
    onFilterChange({
      creator: [],
      tasteProfile: [],
      mealType: [],
      cuisine: [],
      mood: [],
    });
    toast({
      description: language === 'en' ? '✨ All filters cleared' : '✨ सर्व फिल्टर काढले',
      duration: 2000,
    });
  };

  const handleAISuggest = () => {
    toast({
      title: language === 'en' ? '🤖 AI Suggest' : '🤖 AI सूचना',
      description: language === 'en' ? 'Coming soon! AI will suggest recipes based on your preferences.' : 'लवकरच! AI तुमच्या प्राधान्यांवर आधारित रेसिपी सुचवेल.',
      duration: 3000,
    });
  };

  const getDisplayText = (text: string) => {
    return language === 'mr' && translations[text] ? translations[text] : text;
  };

  const activeFilterCount = Object.values(filters).flat().length;

  const FilterPillButton = ({ 
    value, 
    category, 
    isActive 
  }: { 
    value: string; 
    category: keyof FilterOptions; 
    isActive: boolean;
  }) => (
    <button
      onClick={() => toggleFilter(category, value as any)}
      className={`
        flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium
        transition-all duration-300 ease-bounce
        ${isActive 
          ? 'bg-primary text-primary-foreground shadow-warm scale-105' 
          : 'bg-gradient-pill hover:bg-primary/10 text-foreground hover:scale-105 shadow-pill'
        }
        border border-border hover:border-primary/50
        whitespace-nowrap
      `}
    >
      <span className="text-lg">{filterIcons[value]}</span>
      <span>{getDisplayText(value)}</span>
    </button>
  );

  return (
    <div className="z-40 bg-card/95 backdrop-blur-lg border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold text-foreground">
              {language === 'en' ? 'Filters' : 'फिल्टर्स'}
            </h2>
            {activeFilterCount > 0 && (
              <Badge className="bg-primary text-primary-foreground px-3 py-1 text-xs font-semibold">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handleAISuggest}
              className="bg-gradient-to-r from-accent to-primary text-white hover:opacity-90 shadow-pill ripple"
            >
              <Wand2 className="w-4 h-4 mr-1" />
              {language === 'en' ? 'AI Suggest' : 'AI सूचना'}
            </Button>
            {activeFilterCount > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearAllFilters}
                className="hover:bg-destructive/10 hover:text-destructive"
              >
                <RotateCcw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        
        {/* Horizontal scrolling filters */}
        <div className="space-y-4">
          {/* Taste Profile */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {language === 'en' ? 'Taste' : 'चव'}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {tasteProfiles.map((taste) => (
                <FilterPillButton
                  key={taste}
                  value={taste}
                  category="tasteProfile"
                  isActive={filters.tasteProfile.includes(taste)}
                />
              ))}
            </div>
          </div>

          {/* Meal Type */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {language === 'en' ? 'Meal Type' : 'जेवणाचा प्रकार'}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {mealTypes.map((meal) => (
                <FilterPillButton
                  key={meal}
                  value={meal}
                  category="mealType"
                  isActive={filters.mealType.includes(meal)}
                />
              ))}
            </div>
          </div>

          {/* Cuisine */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {language === 'en' ? 'Cuisine' : 'पाककृती'}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {cuisines.map((cuisine) => (
                <FilterPillButton
                  key={cuisine}
                  value={cuisine}
                  category="cuisine"
                  isActive={filters.cuisine.includes(cuisine)}
                />
              ))}
            </div>
          </div>

          {/* Mood */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
              {language === 'en' ? 'Mood' : 'मूड'}
            </p>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {moods.map((mood) => (
                <FilterPillButton
                  key={mood}
                  value={mood}
                  category="mood"
                  isActive={filters.mood.includes(mood)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Active filters with remove option */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            {Object.entries(filters).map(([category, values]) =>
              (values as string[]).map((value) => (
                <Badge
                  key={`${category}-${value}`}
                  variant="secondary"
                  className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground transition-colors px-3 py-1.5"
                  onClick={() => toggleFilter(category as keyof FilterOptions, value)}
                >
                  <span className="mr-1">{filterIcons[value]}</span>
                  {getDisplayText(value)}
                  <X className="ml-1.5 w-3 h-3" />
                </Badge>
              ))
            )}
          </div>
        )}
      </div>

      <style>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};