import { Recipe, RecipeExchanges, RecipeTotalNutrition, DietType } from '../types/nutrition';
import { computeRecipeDietaryFlags, getUnifiedRecipeIngredients } from '../data/turkishRecipes';
import {
  BMRFormula, CalorieArchetypeLevel, ArchetypePreset, PlannerClientData, MealPoolOption,
  MealRole, SelectedMealConfig, DayOfWeek, DayScheduleConfig, WeeklyMenuPlan,
  PlannedDayMenu, PlannedMealItem, RecipeVarietyStrategy,
  DailyMacroTargetGrams, MacroRatioConfig
} from '../types/menuPlanner';
import { personalizeRecipeForMeal, detectIngredientCategory } from './recipePersonalizationEngine';
import { calculateTargetMacroGrams, DEFAULT_MACRO_RATIOS, validateRecipeIntegrity, checkMacroCompliance } from '../utils/nutritionCalculator';

export const DAYS_OF_WEEK: DayOfWeek[] = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const CANONICAL_MEAL_ORDER: MealPoolOption[] = ['Sabah', 'Kahvaltı', 'Kuşluk', 'Öğle', 'İkindi', 'Akşam', 'Gece'];

export function sortMealsByCanonicalOrder<T extends { name?: MealPoolOption; mealName?: MealPoolOption }>(meals: T[]): T[] {
  return [...meals].sort((a, b) => {
    const idxA = CANONICAL_MEAL_ORDER.indexOf((a.name || a.mealName || 'Sabah') as MealPoolOption);
    const idxB = CANONICAL_MEAL_ORDER.indexOf((b.name || b.mealName || 'Sabah') as MealPoolOption);
    return (idxA !== -1 ? idxA : 99) - (idxB !== -1 ? idxB : 99);
  });
}

const MEAL_SPLIT_RULES: Record<string, (m: SelectedMealConfig) => number> = {
  '3_2': m => (m.name === 'Öğle' ? 30 : m.role === 'Ana Öğün' ? 25 : 10),
  '3_1': m => (m.name === 'Kahvaltı' ? 30 : m.name === 'Öğle' ? 35 : m.name === 'Akşam' ? 25 : m.role === 'Ana Öğün' ? 25 : 10),
  '3_0': m => (m.name === 'Kahvaltı' || m.name === 'Öğle' ? 35 : m.name === 'Akşam' ? 30 : 33),
  '2_1': m => (m.role === 'Ana Öğün' ? 40 : 20),
  '2_0': () => 50,
  '2_2': m => (m.role === 'Ana Öğün' ? 35 : 15)
};

export function autoDistributeMealPercentages(meals: SelectedMealConfig[]): SelectedMealConfig[] {
  if (meals.length === 0) return [];
  if (meals.length === 1) return [{ ...meals[0], percentage: 100 }];

  const mainCount = meals.filter(m => m.role === 'Ana Öğün').length;
  const snackCount = meals.filter(m => m.role === 'Ara Öğün').length;
  const allocated: Record<string, number> = {};
  const rule = MEAL_SPLIT_RULES[`${mainCount}_${snackCount}`];

  if (rule) {
    meals.forEach(m => { allocated[m.name] = rule(m); });
  } else {
    const weights = meals.map(m => (m.role === 'Ana Öğün' ? 3.0 : 1.0));
    const totalW = weights.reduce((a, b) => a + b, 0);
    const pcts = meals.map((_, idx) => Math.max(5, Math.round(((weights[idx] / totalW) * 100) / 5) * 5));
    const diff = 100 - pcts.reduce((a, b) => a + b, 0);
    if (diff !== 0) {
      let maxIdx = 0;
      for (let i = 1; i < pcts.length; i++) if (pcts[i] > pcts[maxIdx]) maxIdx = i;
      pcts[maxIdx] += diff;
    }
    meals.forEach((m, idx) => { allocated[m.name] = pcts[idx]; });
  }

  const currentTotal = Object.values(allocated).reduce((a, b) => a + b, 0);
  if (currentTotal !== 100 && meals.length > 0) {
    const firstMain = meals.find(m => m.role === 'Ana Öğün') || meals[0];
    allocated[firstMain.name] = (allocated[firstMain.name] || 0) + (100 - currentTotal);
  }
  return meals.map(m => ({ ...m, percentage: allocated[m.name] !== undefined ? allocated[m.name] : Math.round(100 / meals.length) }));
}

export const MEAL_POOL_OPTIONS: { name: MealPoolOption; defaultRole: MealRole; defaultPercentage: number }[] = [
  { name: 'Sabah', defaultRole: 'Ara Öğün', defaultPercentage: 10 },
  { name: 'Kahvaltı', defaultRole: 'Ana Öğün', defaultPercentage: 25 },
  { name: 'Kuşluk', defaultRole: 'Ara Öğün', defaultPercentage: 10 },
  { name: 'Öğle', defaultRole: 'Ana Öğün', defaultPercentage: 30 },
  { name: 'İkindi', defaultRole: 'Ara Öğün', defaultPercentage: 10 },
  { name: 'Akşam', defaultRole: 'Ana Öğün', defaultPercentage: 25 },
  { name: 'Gece', defaultRole: 'Ara Öğün', defaultPercentage: 10 }
];

const dist = (percentage: number, protein: number, carb: number, fat: number, vegetable: number) => ({
  percentage, exchanges: { protein, carb, fat, vegetable }
});

export const ARCHETYPE_PRESETS: Record<CalorieArchetypeLevel, ArchetypePreset> = {
  XS1000: {
    level: 'XS1000', name: 'XS1000 (1000 kcal)', targetCalories: 1000,
    description: 'Düşük bazal metabolizmalı veya sıkı kilo kontrolü gerektiren danışanlar için kontrollü arketip.',
    focus: 'Kompakt porsiyonlar, yüksek biyoyararlanımlı protein ve düşük glisemik indeks.',
    defaultDistributions: { Kahvaltı: dist(30, 2, 1, 1, 1), Kuşluk: dist(10, 1, 0.5, 0.5, 0), Öğle: dist(25, 2.5, 1, 1.5, 2), İkindi: dist(10, 1, 0.5, 0.5, 0), Akşam: dist(25, 2.5, 1, 1.5, 2) }
  },
  S1200: {
    level: 'S1200', name: 'S1200 (1200 kcal)', targetCalories: 1200,
    description: 'Sedanter kadın danışanlarda standart yağ yakımı ve metabolik koruma arketipi.',
    focus: 'Dengeli protein, kontrollü kompleks karbonhidrat ve yüksek lif.',
    defaultDistributions: { Kahvaltı: dist(25, 2, 1.5, 2, 1), Kuşluk: dist(10, 1, 1, 0.5, 0), Öğle: dist(30, 3, 1.5, 2, 2), İkindi: dist(10, 1, 1, 0.5, 0), Akşam: dist(25, 3, 1, 2, 2) }
  },
  M1400: {
    level: 'M1400', name: 'M1400 (1400 kcal)', targetCalories: 1400,
    description: 'Hafif aktif kadınlar ve sedanter erkek danışanlar için altın standart arketip.',
    focus: 'Sürdürülebilir enerji, optimal tokluk süresi ve mikro besin zenginliği.',
    defaultDistributions: { Kahvaltı: dist(25, 2.5, 2, 2, 1), Kuşluk: dist(10, 1, 1, 1, 0), Öğle: dist(30, 3.5, 2, 2.5, 2), İkindi: dist(10, 1, 1, 1, 0), Akşam: dist(25, 3.5, 1.5, 2.5, 2) }
  },
  L1600: {
    level: 'L1600', name: 'L1600 (1600 kcal)', targetCalories: 1600,
    description: 'Orta düzeyde aktif danışanlar ve hafif aktif erkekler için dengeli enerji arketipi.',
    focus: 'Yüksek glikojen yenilenmesi, kas kitlesi muhafazası ve taşınabilir öğün esnekliği.',
    defaultDistributions: { Kahvaltı: dist(25, 3, 2.5, 2.5, 1), Kuşluk: dist(10, 1.5, 1.5, 1, 0), Öğle: dist(30, 4, 2.5, 3, 2), İkindi: dist(10, 1.5, 1, 1, 0), Akşam: dist(25, 4, 2, 3, 2) }
  },
  XL1800: {
    level: 'XL1800', name: 'XL1800 (1800 kcal)', targetCalories: 1800,
    description: 'Yüksek fiziksel aktiviteye sahip danışanlar ve sporcular için yüksek kapasiteli arketip.',
    focus: 'Maksimum protein sentezi, performans desteği ve zengin ara öğün opsiyonları.',
    defaultDistributions: { Kahvaltı: dist(25, 3.5, 3, 3, 1), Kuşluk: dist(10, 2, 2, 1, 0), Öğle: dist(30, 4.5, 3, 3.5, 2), İkindi: dist(10, 2, 1.5, 1.5, 0), Akşam: dist(25, 4.5, 2.5, 3.5, 2) }
  }
};

export function calculateBMR(gender: 'Kadın' | 'Erkek', weightKg: number, heightCm: number, age: number, formula: BMRFormula = 'mifflin_st_jeor'): number {
  if (formula === 'mifflin_st_jeor') {
    const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
    return Math.round(gender === 'Erkek' ? base + 5 : base - 161);
  }
  return gender === 'Erkek'
    ? Math.round(88.362 + 13.397 * weightKg + 4.799 * heightCm - 5.677 * age)
    : Math.round(447.593 + 9.247 * weightKg + 3.098 * heightCm - 4.330 * age);
}

export const PAL_FACTORS: Record<string, { factor: number; label: string; desc: string }> = {
  'Sedanter (Masa Başı, Sıfır Egzersiz)': { factor: 1.0, label: 'Sedanter', desc: 'Masa başı iş, minimum hareket (*1.0)' },
  'Sedanter (Masa Başı)': { factor: 1.0, label: 'Sedanter', desc: 'Masa başı iş, minimum hareket (*1.0)' },
  'Hafif Aktif (1-2 Gün Spor)': { factor: 1.1, label: 'Hafif Aktif', desc: 'Haftada 1-2 gün yürüyüş / egzersiz (*1.1)' },
  'Orta Derece Aktif (3-5 Gün Spor)': { factor: 1.2, label: 'Orta Aktif', desc: 'Haftada 3-5 gün ortalama egzersiz (*1.2)' },
  'Orta Düzey (3-4 Gün Spor)': { factor: 1.2, label: 'Orta Aktif', desc: 'Haftada 3-4 gün ortalama egzersiz (*1.2)' },
  'Yüksek Aktivite (5+ Gün)': { factor: 1.4, label: 'Çok Aktif', desc: 'Haftada 5+ gün yoğun spor (*1.4)' },
  'Çok Aktif (6-7 Gün Ağır Spor)': { factor: 1.4, label: 'Çok Aktif', desc: 'Haftada 6-7 gün ağır antrenman (*1.4)' }
};

export function getPALFactor(activityLevel: string): number {
  if (!activityLevel) return 1.1;
  if (PAL_FACTORS[activityLevel]) return PAL_FACTORS[activityLevel].factor;
  const lower = activityLevel.toLowerCase();
  if (lower.includes('sedanter') || lower.includes('masa')) return 1.0;
  if (lower.includes('hafif')) return 1.1;
  if (lower.includes('orta')) return 1.2;
  if (lower.includes('yüksek') || lower.includes('çok')) return 1.4;
  return 1.1;
}

export function calculateTargetEnergyFromPAL(bmr: number, activityLevel: string, weightKg?: number, targetWeightKg?: number) {
  const pal = getPALFactor(activityLevel);
  const tdee = Math.round(bmr * pal);
  let deficitOrSurplus = -350;
  if (targetWeightKg && weightKg && weightKg > 0) {
    const diff = targetWeightKg - weightKg;
    deficitOrSurplus = diff < -5 ? -500 : diff < -0.5 ? -350 : diff > 5 ? 500 : diff > 0.5 ? 350 : 0;
  }
  const rawTargetEnergy = Math.round(tdee + deficitOrSurplus);
  const minSafetyFloor = Math.max(1000, Math.round(bmr * 0.85));
  return { tdee, pal, rawTargetEnergy, targetEnergy: Math.max(minSafetyFloor, rawTargetEnergy), deficitOrSurplus };
}

export interface BMIAnalysis {
  bmi: number; category: string; categoryColor: string; badgeBg: string;
  idealWeightMin: number; idealWeightMax: number; targetBmi?: number; targetBmiCategory?: string; weightDifference?: number;
}

export function calculateBMI(weightKg: number, heightCm: number, targetWeightKg?: number): BMIAnalysis {
  const safeHeight = heightCm > 0 ? heightCm : 165;
  const safeWeight = weightKg > 0 ? weightKg : 65;
  const heightM = safeHeight / 100;
  const bmi = Number((safeWeight / (heightM * heightM)).toFixed(1));

  let category = 'Normal / İdeal Kilolu', categoryColor = 'text-emerald-400', badgeBg = 'bg-emerald-950/80 text-emerald-200 border-emerald-700';
  if (bmi < 18.5) { category = 'Zayıf (Düşük Kilolu)'; categoryColor = 'text-sky-400'; badgeBg = 'bg-sky-950/80 text-sky-200 border-sky-700'; }
  else if (bmi >= 25 && bmi < 30) { category = 'Fazla Kilolu (Hafif Şişman)'; categoryColor = 'text-amber-400'; badgeBg = 'bg-amber-950/80 text-amber-200 border-amber-700'; }
  else if (bmi >= 30 && bmi < 35) { category = '1. Derece Obezite'; categoryColor = 'text-orange-400'; badgeBg = 'bg-orange-950/80 text-orange-200 border-orange-700'; }
  else if (bmi >= 35 && bmi < 40) { category = '2. Derece Obezite'; categoryColor = 'text-rose-400'; badgeBg = 'bg-rose-950/80 text-rose-200 border-rose-700'; }
  else if (bmi >= 40) { category = '3. Derece Morbid Obezite'; categoryColor = 'text-red-400'; badgeBg = 'bg-red-950/80 text-red-200 border-red-700'; }

  const idealWeightMin = Number((18.5 * heightM * heightM).toFixed(1));
  const idealWeightMax = Number((24.9 * heightM * heightM).toFixed(1));
  let targetBmi: number | undefined, targetBmiCategory: string | undefined, weightDifference: number | undefined;

  if (targetWeightKg && targetWeightKg > 0) {
    targetBmi = Number((targetWeightKg / (heightM * heightM)).toFixed(1));
    weightDifference = Number((targetWeightKg - safeWeight).toFixed(1));
    targetBmiCategory = targetBmi < 18.5 ? 'Zayıf' : targetBmi < 25 ? 'Normal / İdeal' : targetBmi < 30 ? 'Fazla Kilolu' : 'Obezite';
  }
  return { bmi, category, categoryColor, badgeBg, idealWeightMin, idealWeightMax, targetBmi, targetBmiCategory, weightDifference };
}

export function determineDefaultArchetype(targetEnergy: number, rawTargetEnergy?: number): { archetype: CalorieArchetypeLevel; isBelowMinimumSafety: boolean } {
  const levels: CalorieArchetypeLevel[] = ['XS1000', 'S1200', 'M1400', 'L1600', 'XL1800'];
  let closest = levels[0], minDiff = Infinity;
  for (const lvl of levels) {
    const diff = Math.abs(targetEnergy - ARCHETYPE_PRESETS[lvl].targetCalories);
    if (diff < minDiff) { minDiff = diff; closest = lvl; }
  }
  return { archetype: closest, isBelowMinimumSafety: (rawTargetEnergy ?? targetEnergy) < 1000 };
}

export function normalizeDietCriterion(pref?: DietType): DietType[] {
  if (!pref || pref === 'STD' || pref === 'Standart (STD)') return ['Standart (STD)'];
  if (pref === 'GF' || pref === 'Glutensiz (GF)') return ['Glutensiz (GF)'];
  if (pref === 'LF' || pref === 'Laktozsuz (LF)') return ['Laktozsuz (LF)'];
  if (pref === 'GF + LF' || pref === 'GF+LF') return ['Glutensiz (GF)', 'Laktozsuz (LF)'];
  if (pref === 'Eliminasyon') return ['Eliminasyon (4\'lü)'];
  if (pref === 'FODMAP') return ['Düşük FODMAP'];
  return [pref];
}

export function isRecipeCompatibleWithDiet(recipe: Recipe, dietCriteria: DietType | DietType[], excludedAllergies: string[] = []): boolean {
  const criteriaList = Array.isArray(dietCriteria) ? dietCriteria : [dietCriteria];
  const rDietTypes = recipe.dietTypes?.length ? recipe.dietTypes : [recipe.dietType || 'STD'];
  const rTags = (recipe.tags || []).map(t => t.toLowerCase());
  const rCategory = (recipe.category || '').toLowerCase();
  const flags = recipe.dietaryFlags || computeRecipeDietaryFlags(recipe);

  for (const criterion of criteriaList) {
    if (!criterion || criterion === 'STD' || criterion === 'Standart (STD)') continue;
    if (criterion === 'GF' || criterion === 'Glutensiz (GF)') {
      if (!(rDietTypes.some(d => ['GF', 'Glutensiz (GF)', 'GF + LF', 'GF+LF'].includes(d)) || rTags.includes('glutensiz') || rTags.includes('gf')) && flags.hasGluten) return false;
    } else if (criterion === 'LF' || criterion === 'Laktozsuz (LF)') {
      if (!(rDietTypes.some(d => ['LF', 'Laktozsuz (LF)', 'GF + LF', 'GF+LF'].includes(d)) || rTags.includes('laktozsuz') || rTags.includes('lf')) && flags.hasDairy) return false;
    } else if (criterion === 'GF + LF' || criterion === 'GF+LF') {
      const isGF = rDietTypes.some(d => ['GF', 'Glutensiz (GF)', 'GF + LF', 'GF+LF'].includes(d)) || rTags.includes('glutensiz');
      const isLF = rDietTypes.some(d => ['LF', 'Laktozsuz (LF)', 'GF + LF', 'GF+LF'].includes(d)) || rTags.includes('laktozsuz');
      if ((!isGF || !isLF) && (flags.hasGluten || flags.hasDairy)) return false;
    } else if (criterion === 'Ketojenik') {
      const isKeto = rDietTypes.includes('Ketojenik') || rDietTypes.includes('Keto' as any) || rCategory.includes('keto') || rTags.includes('keto') || rTags.includes('ketojenik');
      if (!isKeto && ((recipe.totalNutrition?.carbs || 0) > 20 || flags.hasHighCarb)) return false;
    } else if (criterion === 'Eliminasyon (4\'lü)' || criterion === 'Eliminasyon') {
      if (!(rDietTypes.some(d => ['Eliminasyon (4\'lü)', 'Eliminasyon'].includes(d)) || rTags.includes('eliminasyon')) && flags.hasElimTrigger) return false;
    } else if (criterion === 'Düşük FODMAP' || criterion === 'FODMAP') {
      if (!(rDietTypes.some(d => ['Düşük FODMAP', 'FODMAP', 'Low FODMAP'].includes(d)) || rTags.includes('fodmap') || rTags.includes('düşük fodmap')) && flags.hasHighFodmap) return false;
    } else if (criterion === 'Histamin') {
      if (!(rDietTypes.includes('Histamin') || rTags.includes('histamin') || rTags.includes('düşük histamin')) && flags.hasHighHistamine) return false;
    } else if (criterion === 'Fertilite') {
      if (flags.hasAntiFertility) return false;
    } else if (criterion === 'Vejetaryen') {
      if (!(rDietTypes.includes('Vejetaryen') || rTags.includes('vejetaryen')) && flags.hasMeat) return false;
    }
  }

  for (const allergy of excludedAllergies) {
    const clean = allergy.trim().toLowerCase();
    if (!clean) continue;
    if (clean === 'gluten' && flags.hasGluten) return false;
    if ((clean === 'laktoz' || clean === 'süt') && flags.hasDairy) return false;
    if (clean === 'yumurta' && /yumurta|omlet|menemen|çılbır|frittata/.test(flags.allText)) return false;
    if ((clean === 'balık' || clean === 'deniz ürünleri' || clean === 'kabuklu deniz ürünleri') && /balık|somon|levrek|çipura|ton balığı|karides|kalamar|hamsi|sardalya|ahtapot/.test(flags.allText)) return false;
    if ((clean === 'fıstık' || clean === 'yer fıstığı') && /fıstık/.test(flags.allText)) return false;
    if ((clean === 'fındık / ceviz' || clean === 'kuruyemiş' || clean === 'fındık' || clean === 'ceviz') && /fındık|ceviz|badem|kaju|antep fıstığı/.test(flags.allText)) return false;
    if (clean === 'soya' && /soya|tofu|edamame/.test(flags.allText)) return false;
    if (clean === 'susam' && /susam|tahin|simit/.test(flags.allText)) return false;
    if (flags.allText.includes(clean)) return false;
  }
  return true;
}

export function isRecipeMealTypeMatch(recipe: Recipe, mealName: MealPoolOption): boolean {
  const rMeal = recipe.mealType, rMeals = recipe.mealTypes || [rMeal], rCat = recipe.category || '';
  if (mealName === 'Sabah' || mealName === 'Kahvaltı') return rMeals.includes('Kahvaltı') || rCat.includes('Kahvalt') || rMeal === 'Kahvaltı';
  if (mealName === 'Kuşluk' || mealName === 'İkindi' || mealName === 'Gece') return rMeals.includes('Ara Öğün') || rCat.includes('Ara Öğün') || rCat.includes('Tatlı') || rCat.includes('İçecek') || rMeal === 'Ara Öğün';
  if (mealName === 'Öğle' || mealName === 'Akşam') return rMeals.includes('Öğle') || rMeals.includes('Akşam') || rCat.includes('Ana Yemek') || rCat.includes('Çorba') || rCat.includes('Salata') || rMeal === 'Öğle' || rMeal === 'Akşam';
  return true;
}

export interface AdaptedRecipeResult {
  adaptedRecipe: Recipe | null; calculatedNutrition: RecipeTotalNutrition; calculatedExchanges: RecipeExchanges; portionMultiplier: number;
}

export function adaptRecipeToArchetypeAndMeal(
  recipe: Recipe | null,
  archetypeLevel: CalorieArchetypeLevel,
  mealTargetCalories: number,
  mealTargetMacros?: { calories: number; proteinG: number; carbG: number; fatG: number }
): AdaptedRecipeResult {
  if (!recipe) {
    return {
      adaptedRecipe: null,
      calculatedNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
      calculatedExchanges: { protein: 0, carb: 0, fat: 0, vegetable: 0, fruit: 0, dairy: 0 },
      portionMultiplier: 1
    };
  }

  const explicit = recipe.archetypeAdaptations?.[archetypeLevel];
  const baseCalories = recipe.totalNutrition?.calories || 300;
  const baseProtein = recipe.totalNutrition?.protein || 15;
  const baseCarbs = recipe.totalNutrition?.carbs || 30;
  const baseFat = recipe.totalNutrition?.fat || 10;

  let overallMultiplier = 1;
  if (explicit && explicit.portionMultiplier > 0) overallMultiplier = explicit.portionMultiplier;
  else if (baseCalories > 0 && mealTargetCalories > 0) overallMultiplier = Math.max(0.5, Math.min(2.5, Number((mealTargetCalories / baseCalories).toFixed(2))));

  let pMult = overallMultiplier, cMult = overallMultiplier, fMult = overallMultiplier;
  if (mealTargetMacros && baseCalories > 0) {
    if (baseProtein > 0 && mealTargetMacros.proteinG > 0) pMult = Math.max(0.55, Math.min(2.2, Number(((mealTargetMacros.proteinG / baseProtein) * 0.75 + overallMultiplier * 0.25).toFixed(2))));
    if (baseCarbs > 0 && mealTargetMacros.carbG > 0) cMult = Math.max(0.55, Math.min(2.2, Number(((mealTargetMacros.carbG / baseCarbs) * 0.75 + overallMultiplier * 0.25).toFixed(2))));
    if (baseFat > 0 && mealTargetMacros.fatG > 0) fMult = Math.max(0.5, Math.min(2.0, Number(((mealTargetMacros.fatG / baseFat) * 0.75 + overallMultiplier * 0.25).toFixed(2))));
  }

  const baseIngredients = recipe.ingredients?.length ? recipe.ingredients : getUnifiedRecipeIngredients(recipe);
  const adaptedIngredients = baseIngredients.map(ing => {
    const category = detectIngredientCategory(ing.foodName || '');
    const ingMultiplier = category === 'protein' ? pMult : category === 'carb' ? cMult : category === 'fat' ? fMult : overallMultiplier;
    return {
      ...ing,
      amount: Number((ing.amount * ingMultiplier).toFixed(1)),
      calculatedCalories: Math.round((ing.calculatedCalories || 0) * ingMultiplier),
      calculatedProtein: Number(((ing.calculatedProtein || 0) * ingMultiplier).toFixed(1)),
      calculatedCarbs: Number(((ing.calculatedCarbs || 0) * ingMultiplier).toFixed(1)),
      calculatedFat: Number(((ing.calculatedFat || 0) * ingMultiplier).toFixed(1)),
      calculatedFiber: Number(((ing.calculatedFiber || 0) * ingMultiplier).toFixed(1))
    };
  });

  let sumCal = 0, sumP = 0, sumC = 0, sumF = 0, sumFib = 0;
  if (adaptedIngredients.length > 0) {
    for (const ing of adaptedIngredients) {
      sumCal += ing.calculatedCalories || 0; sumP += ing.calculatedProtein || 0;
      sumC += ing.calculatedCarbs || 0; sumF += ing.calculatedFat || 0; sumFib += ing.calculatedFiber || 0;
    }
  } else {
    sumCal = Math.round(baseCalories * overallMultiplier); sumP = Number((baseProtein * pMult).toFixed(1));
    sumC = Number((baseCarbs * cMult).toFixed(1)); sumF = Number((baseFat * fMult).toFixed(1));
    sumFib = Number(((recipe.totalNutrition?.fiber || 3) * overallMultiplier).toFixed(1));
  }

  if (mealTargetCalories > 0 && Math.abs(sumCal - mealTargetCalories) > mealTargetCalories * 0.08) {
    const energyNormFactor = mealTargetCalories / Math.max(50, sumCal);
    sumCal = Math.round(sumCal * energyNormFactor); sumP = Number((sumP * energyNormFactor).toFixed(1));
    sumC = Number((sumC * energyNormFactor).toFixed(1)); sumF = Number((sumF * energyNormFactor).toFixed(1));
  }

  const calculatedNutrition: RecipeTotalNutrition = {
    calories: Math.round(sumCal), protein: Number(sumP.toFixed(1)), carbs: Number(sumC.toFixed(1)), fat: Number(sumF.toFixed(1)), fiber: Number(sumFib.toFixed(1))
  };
  const calculatedExchanges: RecipeExchanges = explicit?.adaptedExchanges || {
    protein: Number(((recipe.exchanges?.protein || 2) * pMult).toFixed(1)),
    carb: Number(((recipe.exchanges?.carb || 2) * cMult).toFixed(1)),
    fat: Number(((recipe.exchanges?.fat || 1) * fMult).toFixed(1)),
    vegetable: Number(((recipe.exchanges?.vegetable || 1) * overallMultiplier).toFixed(1)),
    fruit: Number(((recipe.exchanges?.fruit || 0) * overallMultiplier).toFixed(1)),
    dairy: Number(((recipe.exchanges?.dairy || 0) * overallMultiplier).toFixed(1))
  };
  const portionDesc = overallMultiplier === 1 ? (recipe.portionDescription || '1 Porsiyon') : `${overallMultiplier.toFixed(2).replace(/\.00$/, '')} Porsiyon (${archetypeLevel} Arketip Uyarlamalı)`;

  return {
    adaptedRecipe: { ...recipe, portionDescription: portionDesc, totalNutrition: calculatedNutrition, exchanges: calculatedExchanges, ingredients: adaptedIngredients },
    calculatedNutrition, calculatedExchanges, portionMultiplier: overallMultiplier
  };
}

function recalculateDayTotals(dayMenu: PlannedDayMenu, targetDailyMacros: DailyMacroTargetGrams, calorieTolerancePercent = 3): PlannedDayMenu {
  let sumCal = 0, sumProt = 0, sumCarb = 0, sumFat = 0, sumFib = 0;
  let exP = 0, exC = 0, exF = 0, exV = 0, exFr = 0, exD = 0;

  for (const m of dayMenu.meals) {
    sumCal += m.calculatedNutrition?.calories || 0; sumProt += m.calculatedNutrition?.protein || 0;
    sumCarb += m.calculatedNutrition?.carbs || 0; sumFat += m.calculatedNutrition?.fat || 0; sumFib += m.calculatedNutrition?.fiber || 0;
    exP += m.calculatedExchanges?.protein || 0; exC += m.calculatedExchanges?.carb || 0; exF += m.calculatedExchanges?.fat || 0;
    exV += m.calculatedExchanges?.vegetable || 0; exFr += m.calculatedExchanges?.fruit || 0; exD += m.calculatedExchanges?.dairy || 0;
  }

  const totalEx: RecipeExchanges = {
    protein: Number(exP.toFixed(1)), carb: Number(exC.toFixed(1)), fat: Number(exF.toFixed(1)),
    vegetable: Number(exV.toFixed(1)), fruit: Number(exFr.toFixed(1)), dairy: Number(exD.toFixed(1))
  };
  const compliance = checkMacroCompliance(targetDailyMacros, { calories: sumCal, protein: sumProt, carbs: sumCarb, fat: sumFat });

  return {
    ...dayMenu,
    totalCalories: Math.round(sumCal),
    calorieDiff: Math.round(sumCal - targetDailyMacros.calories),
    totalNutrition: { calories: Math.round(sumCal), protein: Math.round(sumProt), carbs: Math.round(sumCarb), fat: Math.round(sumFat), fiber: Math.round(sumFib) },
    totalExchanges: totalEx,
    targetMacros: targetDailyMacros,
    macroDiff: {
      proteinG: Number((sumProt - targetDailyMacros.proteinG).toFixed(1)),
      carbG: Number((sumCarb - targetDailyMacros.carbG).toFixed(1)),
      fatG: Number((sumFat - targetDailyMacros.fatG).toFixed(1)),
      fiberG: Number((sumFib - targetDailyMacros.fiberG).toFixed(1))
    },
    macroCompliance: compliance,
    validationStatus: { isCalorieWithinTolerance: compliance.isEnergyCompliant, calorieTolerancePercent, messages: compliance.messages, isValid: compliance.isAllCompliant }
  };
}

export function optimizeDayMenuMacros(
  dayMenu: PlannedDayMenu,
  targetDailyMacros: DailyMacroTargetGrams,
  client: PlannerClientData,
  maxPasses = 8
): PlannedDayMenu {
  let currentDay = recalculateDayTotals({ ...dayMenu, meals: [...dayMenu.meals] }, targetDailyMacros, dayMenu.validationStatus?.calorieTolerancePercent || 3);
  if (currentDay.macroCompliance?.isAllCompliant) return currentDay;

  const mainMealsIndices = currentDay.meals.map((m, idx) => ({ m, idx })).filter(item => item.m.mealRole === 'Ana Öğün').map(item => item.idx);

  for (let pass = 0; pass < maxPasses; pass++) {
    if (currentDay.macroCompliance?.isAllCompliant) break;
    const targetMealIdx = mainMealsIndices[pass % mainMealsIndices.length] ?? 0;
    const targetMeal = currentDay.meals[targetMealIdx];

    if (targetMeal?.selectedRecipe) {
      const mealTargetCal = targetMeal.targetCalories;
      const mealNormPct = targetMeal.targetPercentage || 25;
      const mealTargetM = {
        calories: mealTargetCal,
        proteinG: Number((targetDailyMacros.proteinG * (mealNormPct / 100)).toFixed(1)),
        carbG: Number((targetDailyMacros.carbG * (mealNormPct / 100)).toFixed(1)),
        fatG: Number((targetDailyMacros.fatG * (mealNormPct / 100)).toFixed(1))
      };
      const adapted = adaptRecipeToArchetypeAndMeal(targetMeal.selectedRecipe, client.selectedArchetype, mealTargetCal, mealTargetM);
      const syncedPersonalizedCopy = personalizeRecipeForMeal(
        targetMeal.selectedRecipe, adapted.calculatedExchanges, { fullName: client.fullName },
        `plan_${client.fullName}_${currentDay.day}`, targetMeal.mealName, adapted.calculatedNutrition, adapted.portionMultiplier
      );

      const updatedMeals = [...currentDay.meals];
      updatedMeals[targetMealIdx] = {
        ...targetMeal, calculatedNutrition: adapted.calculatedNutrition, calculatedExchanges: adapted.calculatedExchanges,
        selectedRecipe: adapted.adaptedRecipe, adaptedRecipe: syncedPersonalizedCopy
      };
      currentDay = recalculateDayTotals({ ...currentDay, meals: updatedMeals }, targetDailyMacros, dayMenu.validationStatus?.calorieTolerancePercent || 3);
    }
  }
  return currentDay;
}

export function generateWeeklyMenuPlan(
  client: PlannerClientData,
  selectedMeals: SelectedMealConfig[],
  daySchedules: DayScheduleConfig[],
  allRecipes: Recipe[],
  calorieTolerancePercent = 3,
  maxRecipeRepeatPerWeekInput?: number,
  varietyStrategyInput?: RecipeVarietyStrategy,
  varietyScoreInput?: number
): WeeklyMenuPlan {
  const varietyScore = varietyScoreInput ?? client.varietyScore ?? (varietyStrategyInput === 'max_variety' ? 5 : varietyStrategyInput === 'batch_cooking' ? 1 : 3);
  const varietyStrategy: RecipeVarietyStrategy = varietyStrategyInput || client.varietyStrategy || (varietyScore >= 4 ? 'max_variety' : varietyScore <= 2 ? 'batch_cooking' : 'balanced');
  const maxRecipeRepeatPerWeek = maxRecipeRepeatPerWeekInput ?? client.maxRecipeRepeatPerWeek ?? (varietyScore === 5 ? 1 : varietyScore >= 3 ? 2 : varietyScore === 2 ? 3 : 4);

  const sortedSelectedMeals = sortMealsByCanonicalOrder(selectedMeals);
  const preset = ARCHETYPE_PRESETS[client.selectedArchetype] || ARCHETYPE_PRESETS.M1400;
  const targetDailyCalories = preset.targetCalories;
  const targetMacroRatios: MacroRatioConfig = client.targetMacroRatios || DEFAULT_MACRO_RATIOS;
  const fixedDailyTargetMacros: DailyMacroTargetGrams = calculateTargetMacroGrams(targetDailyCalories, targetMacroRatios);

  const validRecipesPool = allRecipes.filter(r => validateRecipeIntegrity(r).isValid);
  const activeValidPool = validRecipesPool.filter(r => !r.isDraft);
  const dietCompatiblePool = activeValidPool.filter(r => isRecipeCompatibleWithDiet(r, client.dietCriteria, client.preferences.excludedAllergies));

  const isBookletMode = client.recipeSource?.sourceType === 'selected_booklet';
  const bookletSet = new Set(client.recipeSource?.bookletRecipeIds || []);
  const baseCandidatePool = isBookletMode && bookletSet.size > 0
    ? dietCompatiblePool.filter(r => bookletSet.has(r.id))
    : dietCompatiblePool;

  const practicalityFilteredPool = (() => {
    const pref = client.practicalityPreference;
    if (!pref || pref === 'all') return baseCandidatePool;
    const filtered = baseCandidatePool.filter(r => {
      const p = (r.practicality || 'Kolay').toLowerCase();
      return pref === 'kolay' ? p === 'kolay' : pref === 'kolay_orta' ? p === 'kolay' || p === 'orta' : pref === 'zor' ? p === 'zor' || p === 'i̇leri' || p === 'ileri' : true;
    });
    return filtered.length > 0 ? filtered : baseCandidatePool;
  })();

  const recipeById = new Map(allRecipes.map(r => [r.id, r]));
  const usageCounts: Record<string, number> = {};
  const days: PlannedDayMenu[] = [];

  for (const sched of daySchedules) {
    const plannedMeals: PlannedMealItem[] = [];
    const sumPercentage = sortedSelectedMeals.reduce((acc, m) => acc + (m.percentage || 20), 0) || 100;

    for (const mealConfig of sortedSelectedMeals) {
      const normalizedPercentage = Math.round(((mealConfig.percentage || 20) / sumPercentage) * 100);
      const mealTargetCalories = Math.round((targetDailyCalories * normalizedPercentage) / 100);
      const isPortableOnly = !!sched.mealPortability[mealConfig.name];
      const mealTargetMacros = {
        calories: mealTargetCalories,
        proteinG: Number((fixedDailyTargetMacros.proteinG * (normalizedPercentage / 100)).toFixed(1)),
        carbG: Number((fixedDailyTargetMacros.carbG * (normalizedPercentage / 100)).toFixed(1)),
        fatG: Number((fixedDailyTargetMacros.fatG * (normalizedPercentage / 100)).toFixed(1))
      };

      const defaultDist = preset.defaultDistributions[mealConfig.name] || {
        percentage: normalizedPercentage,
        exchanges: {
          protein: mealConfig.role === 'Ana Öğün' ? 3 : 1,
          carb: mealConfig.role === 'Ana Öğün' ? 2 : 1,
          fat: mealConfig.role === 'Ana Öğün' ? 2 : 0.5,
          vegetable: mealConfig.role === 'Ana Öğün' ? 2 : 0
        }
      };

      let candidates = practicalityFilteredPool.filter(r => isRecipeMealTypeMatch(r, mealConfig.name));

      if (isPortableOnly) {
        const portableCandidates = candidates.filter(r => r.transportability === 'Taşımaya Uygun');
        if (portableCandidates.length > 0) candidates = portableCandidates;
      }

      const underRepeatLimit = candidates.filter(r => (usageCounts[r.id] || 0) < maxRecipeRepeatPerWeek);
      if (underRepeatLimit.length > 0) candidates = underRepeatLimit;

      let selectedRecipe: Recipe | null = null;
      let fallbackReason: string | undefined;

      if (candidates.length === 0) {
        let fallbackCandidates = dietCompatiblePool.filter(r => isRecipeMealTypeMatch(r, mealConfig.name));

        if (isPortableOnly) {
          const portFallback = fallbackCandidates.filter(r => r.transportability === 'Taşımaya Uygun');
          if (portFallback.length > 0) fallbackCandidates = portFallback;
        }

        if (fallbackCandidates.length > 0) {
          selectedRecipe = fallbackCandidates[0];
          fallbackReason = isBookletMode
            ? 'Seçili kitapçık havuzunda bu öğün için uygun reçete bulunamadığından, genel kütüphaneden en yakın diyet uyumlu tarif atandı.'
            : 'Bu öğün için seçilen sıkı kriterlerin tamamını karşılayan tarif bulunamadı; en yakın genel reçete atandı.';
        } else {
          selectedRecipe = dietCompatiblePool[0] || validRecipesPool[0] || null;
          fallbackReason = 'Bu öğün için kısıtları tam karşılayan tarif bulunamadı; en yakın alternatif reçete atandı.';
        }
      } else {
        const scored = candidates.map(r => {
          const rCal = r.totalNutrition?.calories || 300, rP = r.totalNutrition?.protein || 15;
          const rC = r.totalNutrition?.carbs || 30, rF = r.totalNutrition?.fat || 10;
          const macroScore = Math.abs(rCal - mealTargetCalories) * 1.0 + Math.abs(rP - mealTargetMacros.proteinG) * 3.5 + Math.abs(rC - mealTargetMacros.carbG) * 2.5 + Math.abs(rF - mealTargetMacros.fatG) * 3.5;
          const exchangeDistance = Math.abs((r.exchanges?.protein || 0) - defaultDist.exchanges.protein) * 2 + Math.abs((r.exchanges?.carb || 0) - defaultDist.exchanges.carb) * 1.5 + Math.abs((r.exchanges?.fat || 0) - defaultDist.exchanges.fat) * 1.5;

          let prefModifier = 0;
          const rText = r.dietaryFlags?.allText || `${r.name} ${r.family || ''}`.toLowerCase();
          for (const liked of client.preferences.likedFoods) if (liked.trim() && rText.includes(liked.trim().toLowerCase())) prefModifier -= 50;
          for (const disliked of client.preferences.dislikedFoods) if (disliked.trim() && rText.includes(disliked.trim().toLowerCase())) prefModifier += 100;

          const repeatModifier = (usageCounts[r.id] || 0) * (varietyScore === 5 ? 400 : varietyScore === 4 ? 220 : 80);
          return { recipe: r, score: macroScore + exchangeDistance * 20 + prefModifier + repeatModifier };
        });
        scored.sort((a, b) => a.score - b.score);
        selectedRecipe = scored[0]?.recipe || candidates[0];
      }

      if (selectedRecipe) usageCounts[selectedRecipe.id] = (usageCounts[selectedRecipe.id] || 0) + 1;

      const { adaptedRecipe, calculatedNutrition, calculatedExchanges, portionMultiplier } = adaptRecipeToArchetypeAndMeal(
        selectedRecipe, client.selectedArchetype, mealTargetCalories, mealTargetMacros
      );

      const personalizedCopy = selectedRecipe
        ? personalizeRecipeForMeal(selectedRecipe, calculatedExchanges, { fullName: client.fullName }, `plan_${client.fullName}_${sched.day}`, mealConfig.name, calculatedNutrition, portionMultiplier)
        : undefined;

      const mealEnergyDiff = Math.abs(calculatedNutrition.calories - mealTargetCalories);
      const mealPDiff = Math.abs(calculatedNutrition.protein - mealTargetMacros.proteinG);
      const mealCDiff = Math.abs(calculatedNutrition.carbs - mealTargetMacros.carbG);
      const mealFDiff = Math.abs(calculatedNutrition.fat - mealTargetMacros.fatG);

      const mealEnergyOk = mealTargetCalories > 0 ? mealEnergyDiff / mealTargetCalories <= 0.08 : true;
      const mealPOk = mealTargetMacros.proteinG > 0 ? mealPDiff / mealTargetMacros.proteinG <= 0.15 : true;
      const mealCOk = mealTargetMacros.carbG > 0 ? mealCDiff / mealTargetMacros.carbG <= 0.15 : true;
      const mealFOk = mealTargetMacros.fatG > 0 ? mealFDiff / mealTargetMacros.fatG <= 0.15 : true;

      const mealComplianceMessages: string[] = [];
      if (!mealEnergyOk) mealComplianceMessages.push(`Kalori sapması: ±%${Math.round((mealEnergyDiff / mealTargetCalories) * 100)}`);
      if (!mealPOk) mealComplianceMessages.push(`Protein sapması: ±%${Math.round((mealPDiff / mealTargetMacros.proteinG) * 100)}`);
      if (!mealCOk) mealComplianceMessages.push(`Karbonhidrat sapması: ±%${Math.round((mealCDiff / mealTargetMacros.carbG) * 100)}`);
      if (!mealFOk) mealComplianceMessages.push(`Yağ sapması: ±%${Math.round((mealFDiff / mealTargetMacros.fatG) * 100)}`);

      plannedMeals.push({
        mealName: mealConfig.name, mealRole: mealConfig.role, targetCalories: mealTargetCalories, targetPercentage: normalizedPercentage,
        targetMacros: mealTargetMacros,
        macroCompliance: { isCompliant: mealEnergyOk && mealPOk && mealCOk && mealFOk, energyOk: mealEnergyOk, proteinOk: mealPOk, carbOk: mealCOk, fatOk: mealFOk, messages: mealComplianceMessages },
        note: mealConfig.note || (isPortableOnly ? 'Taşınabilir kapta hazırlanacak' : undefined),
        isPortableOnly, selectedRecipe: adaptedRecipe, adaptedRecipe: personalizedCopy, fallbackReason,
        calculatedNutrition, calculatedExchanges, isManuallySwapped: false
      });
    }

    const targetEx: RecipeExchanges = {
      protein: Number((fixedDailyTargetMacros.proteinG / 6).toFixed(1)),
      carb: Number((fixedDailyTargetMacros.carbG / 15).toFixed(1)),
      fat: Number((fixedDailyTargetMacros.fatG / 5).toFixed(1)),
      vegetable: 4, fruit: 1, dairy: 1
    };

    const initialDay: PlannedDayMenu = recalculateDayTotals(
      {
        day: sched.day, isWorkDay: sched.isWorkDay, location: sched.location, specialNote: sched.specialNote,
        meals: plannedMeals, totalCalories: 0, targetCalories: targetDailyCalories, calorieDiff: 0,
        totalNutrition: { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
        totalExchanges: { protein: 0, carb: 0, fat: 0, vegetable: 0, fruit: 0, dairy: 0 },
        targetExchanges: targetEx,
        validationStatus: { isCalorieWithinTolerance: true, calorieTolerancePercent, messages: [], isValid: true }
      },
      fixedDailyTargetMacros,
      calorieTolerancePercent
    );

    days.push(initialDay.macroCompliance?.isAllCompliant ? initialDay : optimizeDayMenuMacros(initialDay, fixedDailyTargetMacros, client));
  }

  const totalWeeklyCal = days.reduce((acc, d) => acc + d.totalCalories, 0);
  const avgDailyCal = Math.round(totalWeeklyCal / (days.length || 1));
  const totalPortableMeals = days.reduce((acc, d) => acc + d.meals.filter(m => m.isPortableOnly).length, 0);
  const uniqueRecipesCount = Object.keys(usageCounts).length;
  const totalMealsCount = days.reduce((acc, d) => acc + d.meals.length, 0);
  const prepTimeSavingsPercent = totalMealsCount > 0 ? Math.max(0, Math.round(((totalMealsCount - uniqueRecipesCount) / totalMealsCount) * 100)) : 0;

  const weeklyWarnings: string[] = [];
  for (const [rId, count] of Object.entries(usageCounts)) {
    if (count > maxRecipeRepeatPerWeek) {
      const rObj = recipeById.get(rId);
      weeklyWarnings.push(`"${rObj?.name || rId}" reçetesi haftada ${count} kez kullanıldı (Maksimum önerilen: ${maxRecipeRepeatPerWeek}).`);
    }
  }

  return {
    id: `plan-${Date.now()}`,
    client: { ...client, targetMacroRatios, varietyStrategy, varietyScore, maxRecipeRepeatPerWeek },
    selectedMeals: sortedSelectedMeals, daySchedules, days, targetMacroRatios, targetDailyMacros: fixedDailyTargetMacros,
    weeklyStats: {
      averageDailyCalories: avgDailyCal, repeatCountByRecipe: usageCounts, uniqueRecipeCount: uniqueRecipesCount,
      estimatedCookCount: uniqueRecipesCount, prepTimeSavingsPercent, portableMealCount: totalPortableMeals, warnings: weeklyWarnings
    },
    calorieTolerancePercent, maxRecipeRepeatPerWeek, varietyStrategy, varietyScore,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
  };
}

export function swapRecipeInDayMenu(
  currentDay: PlannedDayMenu,
  mealIndex: number,
  newRecipe: Recipe,
  calorieTolerancePercent = 3,
  archetypeLevel: CalorieArchetypeLevel = 'M1400',
  clientFullName?: string,
  personalizedCopy?: any
): PlannedDayMenu {
  const updatedMeals = [...currentDay.meals];
  const currentMeal = updatedMeals[mealIndex];
  if (!currentMeal) return currentDay;

  const { adaptedRecipe, calculatedNutrition, calculatedExchanges, portionMultiplier } = adaptRecipeToArchetypeAndMeal(
    newRecipe, archetypeLevel, currentMeal.targetCalories, currentMeal.targetMacros
  );

  const effectivePersonalizedCopy = personalizedCopy || (clientFullName
    ? personalizeRecipeForMeal(newRecipe, calculatedExchanges, { fullName: clientFullName }, `plan_${clientFullName}_${currentDay.day}`, currentMeal.mealName, calculatedNutrition, portionMultiplier)
    : undefined);

  updatedMeals[mealIndex] = {
    ...currentMeal, selectedRecipe: adaptedRecipe, adaptedRecipe: effectivePersonalizedCopy, fallbackReason: undefined,
    calculatedNutrition: effectivePersonalizedCopy ? effectivePersonalizedCopy.adaptedNutrition : calculatedNutrition,
    calculatedExchanges: effectivePersonalizedCopy ? effectivePersonalizedCopy.adaptedExchanges : calculatedExchanges,
    isManuallySwapped: true
  };

  const targetMacros: DailyMacroTargetGrams = currentDay.targetMacros || {
    calories: currentDay.targetCalories, proteinG: Math.round((currentDay.targetCalories * 0.2) / 4),
    carbG: Math.round((currentDay.targetCalories * 0.5) / 4), fatG: Math.round((currentDay.targetCalories * 0.3) / 9), fiberG: 25
  };
  return recalculateDayTotals({ ...currentDay, meals: updatedMeals }, targetMacros, calorieTolerancePercent);
}
