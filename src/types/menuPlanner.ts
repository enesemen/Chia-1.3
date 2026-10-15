import { DietType, Recipe, RecipeExchanges, RecipeTotalNutrition } from './nutrition';

export type BMRFormula = 'mifflin_st_jeor' | 'harris_benedict';
export type CalorieArchetypeLevel = 'XS1000' | 'S1200' | 'M1400' | 'L1600' | 'XL1800';
export type MealPoolOption = 'Sabah' | 'Kahvaltı' | 'Kuşluk' | 'Öğle' | 'İkindi' | 'Akşam' | 'Gece';
export type MealRole = 'Ana Öğün' | 'Ara Öğün';
export type DayOfWeek = 'Pazartesi' | 'Salı' | 'Çarşamba' | 'Perşembe' | 'Cuma' | 'Cumartesi' | 'Pazar';
export type ActivityLevelOption =
  | 'Sedanter (Masa Başı)' | 'Sedanter (Masa Başı, Sıfır Egzersiz)' | 'Hafif Aktif (1-2 Gün Spor)'
  | 'Orta Düzey (3-4 Gün Spor)' | 'Orta Derece Aktif (3-5 Gün Spor)' | 'Yüksek Aktivite (5+ Gün)' | 'Çok Aktif (6-7 Gün Ağır Spor)';

export interface ArchetypePreset {
  level: CalorieArchetypeLevel; name: string; targetCalories: number; description: string; focus: string;
  defaultDistributions: Record<string, {
    percentage: number;
    exchanges: { protein: number; carb: number; fat: number; vegetable: number; fruit?: number; dairy?: number };
  }>;
}

export interface SelectedMealConfig { name: MealPoolOption; role: MealRole; percentage: number; note: string; }
export interface DayScheduleConfig {
  day: DayOfWeek; isWorkDay: boolean; location: 'Evde' | 'İşte / Dışarıda' | 'Hibrit';
  specialNote?: string; mealPortability: Record<MealPoolOption, boolean>;
}

export type RecipeSourceType = 'all_recipes' | 'selected_booklet';
export type RecipeVarietyStrategy = 'max_variety' | 'balanced' | 'batch_cooking' | 'custom';

export interface RecipeSourceConfig {
  sourceType: RecipeSourceType; bookletId?: string; bookletTitle?: string;
  bookletIds?: string[]; bookletTitles?: string[]; bookletRecipeIds?: string[];
}

export interface MacroRatioConfig { proteinPct: number; carbPct: number; fatPct: number; }
export interface DailyMacroTargetGrams { calories: number; proteinG: number; carbG: number; fatG: number; fiberG: number; }

export interface MacroComplianceResult {
  isEnergyCompliant: boolean; isProteinCompliant: boolean; isCarbCompliant: boolean;
  isFatCompliant: boolean; isAllCompliant: boolean; energyDiff: number; energyPctDiff: number;
  proteinDiff: number; proteinPctDiff: number; carbDiff: number; carbPctDiff: number;
  fatDiff: number; fatPctDiff: number; messages: string[]; needsReoptimization: boolean;
}

export interface PlannerClientData {
  clientId?: string; fullName: string; age: number; gender: 'Kadın' | 'Erkek';
  heightCm: number; weightKg: number; targetWeightKg?: number; activityLevel: ActivityLevelOption;
  bmrFormula: BMRFormula; calculatedBMR: number; calculatedBMI?: number; bmiCategory?: string;
  calculatedTargetEnergy: number; isEnergyBelowMinimumSafety: boolean; defaultArchetype: CalorieArchetypeLevel;
  selectedArchetype: CalorieArchetypeLevel; selectionMode: 'auto' | 'manual'; dietCriteria: DietType[];
  targetMacroRatios?: MacroRatioConfig; recipeSource?: RecipeSourceConfig;
  varietyStrategy?: RecipeVarietyStrategy; varietyScore?: number; maxRecipeRepeatPerWeek?: number;
  practicalityPreference?: 'all' | 'kolay' | 'kolay_orta' | 'zor';
  preferences: { likedFoods: string[]; dislikedFoods: string[]; excludedAllergies: string[] };
}

export interface AdaptedIngredientItem {
  name: string; originalAmountDisplay?: string; amount: number; unit: string; amountDisplay: string;
  category: 'protein' | 'carb' | 'fat' | 'fruit' | 'vegetable' | 'dairy' | 'other'; scalingFactor: number;
}

export interface PersonalizedRecipeCopy {
  recipeId: string; clientId: string; planId: string; mealId: string; mealName: MealPoolOption;
  baseRecipeName: string; adaptedTitle: string; portion: string; isAdaptedToTarget: boolean;
  adaptationNote: string; standardExchanges: RecipeExchanges; targetExchanges: RecipeExchanges;
  adaptedExchanges: RecipeExchanges; adaptedNutrition: RecipeTotalNutrition;
  adaptedIngredients: AdaptedIngredientItem[]; steps?: Recipe['steps']; prepTimeMinutes?: number;
  category?: string; imageUrl?: string; kitchenNotes?: string; clinicalNote?: string;
}

export interface PlannedMealItem {
  mealName: MealPoolOption; mealRole: MealRole; targetCalories: number; targetPercentage: number;
  targetMacros?: { calories: number; proteinG: number; carbG: number; fatG: number };
  macroCompliance?: { isCompliant: boolean; energyOk: boolean; proteinOk: boolean; carbOk: boolean; fatOk: boolean; messages: string[] };
  note?: string; isPortableOnly: boolean;
  selectedRecipe: Recipe | null; adaptedRecipe?: PersonalizedRecipeCopy; fallbackReason?: string;
  calculatedNutrition: RecipeTotalNutrition; calculatedExchanges: RecipeExchanges; isManuallySwapped?: boolean;
}

export interface PlannedDayMenu {
  day: DayOfWeek; isWorkDay: boolean; location: 'Evde' | 'İşte / Dışarıda' | 'Hibrit'; specialNote?: string;
  meals: PlannedMealItem[]; totalCalories: number; targetCalories: number; calorieDiff: number;
  totalNutrition: RecipeTotalNutrition; totalExchanges: RecipeExchanges; targetExchanges: RecipeExchanges;
  targetMacros?: DailyMacroTargetGrams; macroDiff?: { proteinG: number; carbG: number; fatG: number; fiberG: number };
  macroCompliance?: MacroComplianceResult;
  validationStatus: { isCalorieWithinTolerance: boolean; calorieTolerancePercent: number; messages: string[]; isValid: boolean };
}

export interface WeeklyMenuPlan {
  id: string; planTitle?: string; client: PlannerClientData; selectedMeals: SelectedMealConfig[];
  daySchedules: DayScheduleConfig[]; days: PlannedDayMenu[]; targetMacroRatios?: MacroRatioConfig;
  targetDailyMacros?: DailyMacroTargetGrams;
  weeklyStats: {
    averageDailyCalories: number; repeatCountByRecipe: Record<string, number>; uniqueRecipeCount?: number;
    estimatedCookCount?: number; prepTimeSavingsPercent?: number; portableMealCount: number; warnings: string[];
  };
  calorieTolerancePercent: number; maxRecipeRepeatPerWeek: number;
  varietyStrategy: RecipeVarietyStrategy; varietyScore: number; createdAt: string; updatedAt: string;
}
