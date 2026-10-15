import { FoodItem, Recipe, RecipeExchanges, RecipeIngredient, RecipeTotalNutrition } from '../types/nutrition';

export function calculateIngredientNutrition(food: FoodItem, amount: number, unit: string) {
  const unitFactor = food.unitWeightGrams[unit] || 1;
  const totalGrams = Math.max(0, amount) * unitFactor;
  const ratio = totalGrams / 100;
  return {
    grams: Math.round(totalGrams * 10) / 10,
    calories: Math.round(food.per100g.calories * ratio),
    protein: Math.round(food.per100g.protein * ratio * 10) / 10,
    carbs: Math.round(food.per100g.carbs * ratio * 10) / 10,
    fat: Math.round(food.per100g.fat * ratio * 10) / 10,
    fiber: Math.round(food.per100g.fiber * ratio * 10) / 10
  };
}

export function calculateRecipeTotalNutrition(ingredients: RecipeIngredient[]): RecipeTotalNutrition {
  let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0;
  for (const ing of ingredients) {
    calories += ing.calculatedCalories || 0;
    protein += ing.calculatedProtein || 0;
    carbs += ing.calculatedCarbs || 0;
    fat += ing.calculatedFat || 0;
    fiber += ing.calculatedFiber || 0;
  }
  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round(fiber * 10) / 10
  };
}

export function estimateExchangesFromIngredients(
  ingredients: RecipeIngredient[],
  foodDatabase: FoodItem[] | ReadonlyMap<string, FoodItem>
): RecipeExchanges {
  let proteinExc = 0, carbExc = 0, fatExc = 0, vegExc = 0, fruitExc = 0, dairyExc = 0;
  const foodMap = Array.isArray(foodDatabase) ? new Map(foodDatabase.map(f => [f.id, f])) : foodDatabase;

  for (const ing of ingredients) {
    const food = foodMap.get(ing.foodId);
    const grams = (ing.amount || 0) * (food?.unitWeightGrams?.[ing.unit] || 1);
    const ratio = grams / 100;

    if (food?.exchangeContributionPer100g) {
      const c = food.exchangeContributionPer100g;
      if (c.protein) proteinExc += c.protein * ratio;
      if (c.carb) carbExc += c.carb * ratio;
      if (c.fat) fatExc += c.fat * ratio;
      if (c.vegetable) vegExc += c.vegetable * ratio;
      if (c.fruit) fruitExc += c.fruit * ratio;
      if (c.dairy) dairyExc += c.dairy * ratio;
    } else {
      const category = food?.category || '';
      const foodName = (ing.foodName || food?.name || '').toLowerCase();
      if (category === 'Süt & Süt Ürünleri' || /süt|yoğurt|kefir|ayran/.test(foodName)) {
        const dp = (ing.calculatedProtein || 0) / 6;
        dairyExc += dp > 0 ? dp : grams / 200;
      } else if (category === 'Et, Tavuk & Balık' || /somon|köfte|tavuk|eti|balık|yumurta|peynir/.test(foodName)) {
        const pp = (ing.calculatedProtein || 0) / 6;
        proteinExc += pp > 0 ? pp : grams / 30;
      } else if (category === 'Sebzeler' || /sebze|kabak|ıspanak|domates|salatalık|biber|brokoli|patlıcan/.test(foodName)) {
        vegExc += grams / 150 > 0 ? grams / 150 : 0.5;
      } else if (category === 'Meyveler' || /elma|muz|çilek|portakal|ananas|meyve/.test(foodName)) {
        const fc = (ing.calculatedCarbs || 0) / 15;
        fruitExc += fc > 0 ? fc : grams / 120;
      } else if (category === 'Yağlar & Yağlı Tohumlar' || /zeytinyağı|yağ|ceviz|badem|fındık|avokado/.test(foodName)) {
        const ff = (ing.calculatedFat || 0) / 5;
        fatExc += ff > 0 ? ff : grams / 10;
      } else {
        const cm = (ing.calculatedCarbs || 0) / 15, pm = (ing.calculatedProtein || 0) / 6, fm = (ing.calculatedFat || 0) / 5;
        if (cm >= 0.3) carbExc += cm;
        else if (pm >= 0.3) proteinExc += pm;
        else if (fm >= 0.3) fatExc += fm;
      }
    }
  }
  const roundHalf = (n: number) => Math.max(0, Math.round(n * 2) / 2);
  return {
    protein: roundHalf(proteinExc), carb: roundHalf(carbExc), fat: roundHalf(fatExc),
    vegetable: roundHalf(vegExc), fruit: roundHalf(fruitExc), dairy: roundHalf(dairyExc)
  };
}

export const DEFAULT_MACRO_RATIOS = { proteinPct: 20, carbPct: 50, fatPct: 30 };

export function calculateTargetMacroGrams(targetCalories: number, ratios = DEFAULT_MACRO_RATIOS) {
  const safeCalories = Math.max(500, targetCalories);
  return {
    calories: safeCalories,
    proteinG: Number(((safeCalories * (ratios.proteinPct / 100)) / 4).toFixed(1)),
    carbG: Number(((safeCalories * (ratios.carbPct / 100)) / 4).toFixed(1)),
    fatG: Number(((safeCalories * (ratios.fatPct / 100)) / 9).toFixed(1)),
    fiberG: Math.round(safeCalories / 70)
  };
}

export function validateRecipeIntegrity(recipe: Recipe): { isValid: boolean; error?: string } {
  if (!recipe.totalNutrition || recipe.totalNutrition.calories <= 0) {
    return { isValid: false, error: `"${recipe.name}" tarifinin kalori verisi eksik veya 0 kcal.` };
  }
  const { calories, protein, carbs, fat } = recipe.totalNutrition;
  const calculatedCal = protein * 4 + carbs * 4 + fat * 9;
  const diff = Math.abs(calculatedCal - calories);
  if (calories > 80 && diff > 80 && diff / calories > 0.35) {
    return { isValid: false, error: `"${recipe.name}" tarifinin kayıtlı enerjisi (${calories} kcal) ile makrolardan hesaplanan enerjisi (${Math.round(calculatedCal)} kcal) arasında kritik sapma var.` };
  }
  return { isValid: true };
}

export function checkMacroCompliance(
  target: { calories: number; proteinG: number; carbG: number; fatG: number },
  actual: { calories: number; protein: number; carbs: number; fat: number }
) {
  const calc = (act: number, tgt: number, roundInt = false) => {
    const diff = roundInt ? Math.round(act - tgt) : Number((act - tgt).toFixed(1));
    const pct = tgt > 0 ? Number(((diff / tgt) * 100).toFixed(1)) : 0;
    return { diff, pct };
  };
  const e = calc(actual.calories, target.calories, true);
  const p = calc(actual.protein, target.proteinG);
  const c = calc(actual.carbs, target.carbG);
  const f = calc(actual.fat, target.fatG);

  const isEnergyCompliant = Math.abs(e.pct) <= 5.0;
  const isProteinCompliant = Math.abs(p.pct) <= 10.0;
  const isCarbCompliant = Math.abs(c.pct) <= 10.0;
  const isFatCompliant = Math.abs(f.pct) <= 10.0;
  const isAllCompliant = isEnergyCompliant && isProteinCompliant && isCarbCompliant && isFatCompliant;

  const messages: string[] = [];
  if (!isEnergyCompliant) messages.push(`Enerji sapması: %${Math.abs(e.pct)} (${e.diff > 0 ? '+' : ''}${e.diff} kcal, limit: ±%5).`);
  if (!isProteinCompliant) messages.push(`Protein sapması: %${Math.abs(p.pct)} (${p.diff > 0 ? '+' : ''}${p.diff}g, limit: ±%10).`);
  if (!isCarbCompliant) messages.push(`Karbonhidrat sapması: %${Math.abs(c.pct)} (${c.diff > 0 ? '+' : ''}${c.diff}g, limit: ±%10).`);
  if (!isFatCompliant) messages.push(`Yağ sapması: %${Math.abs(f.pct)} (${f.diff > 0 ? '+' : ''}${f.diff}g, limit: ±%10).`);

  return {
    isEnergyCompliant, isProteinCompliant, isCarbCompliant, isFatCompliant, isAllCompliant,
    energyDiff: e.diff, energyPctDiff: e.pct, proteinDiff: p.diff, proteinPctDiff: p.pct,
    carbDiff: c.diff, carbPctDiff: c.pct, fatDiff: f.diff, fatPctDiff: f.pct,
    messages, needsReoptimization: !isAllCompliant
  };
}
