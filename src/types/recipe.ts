export type TasteProfile = 'Spicy' | 'Sweet' | 'Sour' | 'Bitter' | 'Tangy' | 'Savory' | 'Balanced';
export type MealType = 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert';
export type Cuisine = 'Maharashtrian' | 'South Indian' | 'North Indian' | 'Fusion' | 'Global';
export type Mood = 'Comfort' | 'Party' | 'Festive' | 'Quick Bite' | 'Traditional';

export interface Recipe {
  id: string;
  title: string;
  titleMr?: string; // Marathi translation
  description: string;
  descriptionMr?: string;
  youtubeUrl: string;
  videoId: string;
  thumbnailUrl: string;
  tasteProfile: TasteProfile[];
  mealType: MealType[];
  cuisine: Cuisine[];
  mood: Mood[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  cookTime: string; // e.g., "30 mins"
  servings: number;
  quantityInfo?: string; // e.g., "Makes 12 pieces" for quantity-based recipes
  quantityInfoMr?: string;
  ingredients: string[];
  ingredientsMr?: string[];
  steps: string[];
  stepsMr?: string[];
  isPremium: boolean;
}

export interface FilterOptions {
  tasteProfile: TasteProfile[];
  mealType: MealType[];
  cuisine: Cuisine[];
  mood: Mood[];
}
