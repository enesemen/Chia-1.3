export type MealType = 'Kahvaltı' | 'Öğle' | 'Ara Öğün' | 'Akşam';

export type RecipeCategory =
  | 'Kahvaltı' | 'Ana Yemek' | 'Çorba' | 'Salata / Meze' | 'Ara Öğün / Atıştırmalık'
  | 'Ara Öğün & Atıştırmalık' | 'Tatlı / Bowl' | 'Kahvaltılıklar' | 'Çorbalar'
  | 'Ana Yemekler' | 'Salatalar & Bowllar' | 'Tatlı & Sağlıklı Kaçamak' | 'İçecek & Smoothie' | 'Sos & Garnitür';

export type DietType =
  | 'Standart (STD)' | 'STD' | 'Glutensiz (GF)' | 'GF' | 'Laktozsuz (LF)' | 'LF'
  | 'Ketojenik' | 'Eliminasyon (4\'lü)' | 'Eliminasyon' | 'Düşük FODMAP' | 'FODMAP'
  | 'Histamin' | 'Fertilite' | 'GF + LF' | 'GF+LF' | 'Kilo Alma' | 'Vejetaryen' | 'Akdeniz';

export type FoodCategory =
  | 'Tahıllar & Ekmek' | 'Et, Tavuk & Balık' | 'Süt & Süt Ürünleri' | 'Yağlar & Yağlı Tohumlar'
  | 'Baklagiller' | 'Sebzeler' | 'Meyveler' | 'Baharat & Diğer';

export type Transportability = 'Taşınmaz' | 'Taşımaya Uygun';
export type Practicality = 'Kolay' | 'Orta' | 'Zor' | 'İleri';
export type FoodSource = 'TürKomp' | 'USDA';

export interface FoodItem {
  id: string; name: string; category: FoodCategory; source?: FoodSource; foodCode?: string;
  latinName?: string; notes?: string; defaultUnit: string; availableUnits: string[];
  unitWeightGrams: Record<string, number>;
  per100g: { calories: number; protein: number; carbs: number; fat: number; fiber: number };
  exchangeContributionPer100g?: { protein?: number; carb?: number; fat?: number; vegetable?: number; fruit?: number; dairy?: number };
}

export interface RecipeIngredient {
  id: string; foodId: string; foodName: string; amount: number; unit: string;
  amountDisplay?: string; preparationNote?: string; calculatedCalories: number;
  calculatedProtein: number; calculatedCarbs: number; calculatedFat: number; calculatedFiber: number;
}

export interface DetailedIngredient { order: number; name: string; amountDisplay: string; foodId?: string; }
export interface RecipeStep { stepNumber: number; instruction: string; tip?: string; }
export interface RecipeExchanges { protein: number; carb: number; fat: number; vegetable: number; fruit: number; dairy: number; }
export interface RecipeTotalNutrition { calories: number; protein: number; carbs: number; fat: number; fiber: number; }
export interface ArchetypeAdaptation { portionMultiplier: number; adaptedExchanges: RecipeExchanges; specialNotes?: string; }

export interface RecipeDietaryFlags {
  hasGluten: boolean; hasDairy: boolean; hasHighCarb: boolean; hasElimTrigger: boolean;
  hasHighFodmap: boolean; hasHighHistamine: boolean; hasAntiFertility: boolean; hasMeat: boolean; allText: string;
}

export interface Recipe {
  id: string; name: string; description?: string; mealType: MealType; mealTypes?: string[];
  category: string; categories?: string[]; family: string; classes?: string[];
  prepTimeMinutes: number; cookTimeMinutes?: number; cookingMethod?: string; portionDescription?: string;
  fridgeStorageDays?: number; isFreezerSuitable?: boolean; isBatchCookingSuitable?: boolean;
  storageAndServiceAdvice?: string; practicality: Practicality; transportability: Transportability;
  planCount: number; servings: number; seasonMonths: string[]; dietType: DietType; dietTypes: string[];
  tags: string[]; exchangeSummary: string; energyDisplay?: string; imageUrl?: string;
  ingredients: RecipeIngredient[]; detailedIngredients?: DetailedIngredient[]; steps?: RecipeStep[];
  kitchenNotes?: string; clinicalNote?: string; portionSub?: string;
  totalNutrition: RecipeTotalNutrition; exchanges: RecipeExchanges; instructions?: string;
  isDraft: boolean; version: string; createdAt: string; updatedAt: string;
  archetypeAdaptations?: Record<string, ArchetypeAdaptation>; dietaryFlags?: RecipeDietaryFlags;
}


export interface ClientProfile {
  id: string; name: string; age: number; gender: 'Kadın' | 'Erkek'; heightCm: number;
  weightKg: number; dailyCalorieTarget: number; archetypeId: string; dietTypePreference: DietType; allergies: string[];
}

export interface RecipeBooklet {
  id: string; title: string; subtitle?: string; authorName: string; description?: string;
  coverTheme?: 'amber' | 'emerald' | 'stone' | 'indigo' | 'rose'; recipeIds: string[];
  tags?: string[]; notes?: string; createdAt: string; updatedAt: string;
}

export type CompactSeedTuple = [
  id: string, name: string, category: string, family: string, prepTimeMinutes: number,
  cookTimeMinutes: number | undefined, practicality: Practicality, transportability: Transportability,
  planCount: number, mealType: MealType, mealTypes: string[], dietType: DietType, dietTypes: string[],
  tags: string[], exchangeSummary: string, energyDisplay: string, imageUrl: string, portionSub: string,
  clinicalNote: string, kitchenNotes: string | undefined,
  detailedIngredients: [name: string, amountDisplay: string, foodId?: string][],
  steps: string[], totalNutrition: [calories: number, protein: number, carbs: number, fat: number, fiber: number],
  exchanges: [protein: number, carb: number, fat: number, vegetable: number, fruit: number, dairy: number],
  seasonMonths?: string[]
];

export function defineSeedRecipes(tuples: CompactSeedTuple[]): Recipe[] {
  return tuples.map(([
    id, name, category, family, prepTimeMinutes, cookTimeMinutes, practicality, transportability,
    planCount, mealType, mealTypes, dietType, dietTypes, tags, exchangeSummary, energyDisplay,
    imageUrl, portionSub, clinicalNote, kitchenNotes, detailedIngredients, steps,
    [calories, protein, carbs, fat, fiber], [exP, exC, exF, exV, exFr, exD], seasonMonths = ['Tüm Yıl']
  ]) => ({
    id, name, category, family, prepTimeMinutes, ...(cookTimeMinutes !== undefined ? { cookTimeMinutes } : {}),
    practicality, transportability, planCount, servings: 1, mealType, mealTypes, dietType, dietTypes,
    tags, exchangeSummary, energyDisplay, imageUrl, portionSub, clinicalNote, ...(kitchenNotes ? { kitchenNotes } : {}),
    detailedIngredients: detailedIngredients.map(([ingName, amountDisplay, foodId], idx) => ({
      order: idx + 1, name: ingName, amountDisplay, ...(foodId ? { foodId } : {})
    })),
    steps: steps.map((instruction, idx) => ({ stepNumber: idx + 1, instruction })),
    ingredients: [], totalNutrition: { calories, protein, carbs, fat, fiber },
    exchanges: { protein: exP, carb: exC, fat: exF, vegetable: exV, fruit: exFr, dairy: exD },
    seasonMonths, isDraft: false, version: '1.0', createdAt: '2026-03-20T10:00:00.000Z', updatedAt: '2026-03-27T10:00:00.000Z'
  }));
}
