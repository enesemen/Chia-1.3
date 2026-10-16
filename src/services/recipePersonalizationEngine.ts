import { Recipe, RecipeExchanges, RecipeTotalNutrition } from '../types/nutrition';
import { getUnifiedRecipeIngredients } from '../data/turkishRecipes';
import { PersonalizedRecipeCopy, AdaptedIngredientItem, MealPoolOption } from '../types/menuPlanner';

export const trLower = (s: string): string => s.toLocaleLowerCase('tr-TR');

const RE_DAIRY_PROTEIN = /kefir|yoğurt|yogurt|süt|peynir|lor|labne|kaşar|çökelek|hellim|tulum/;
const RE_MEAT_PROTEIN = /yumurta|tavuk|hindi|somon|balık|levrek|çipura|hamsi|et|dana|kıyma|köfte|ton balığı|karides|sucuk/;
const RE_PLANT_PROTEIN = /tofu|edamame|whey|protein/;
const RE_DAIRY_ONLY = /kefir|süt|yoğurt|kefiri|ayran/;
const RE_FAT = /keten tohumu|chia|zeytinyağ|zeytin|ceviz|badem|fındık|fıstık|tahin|avokado|tereyağ|sade yağ|ghee|susam|kabak çekirdeği/;
const RE_CARB = /yulaf|ekmek|bazlama|simit|bulgur|pirinç|makarna|erişte|un|karabuğday|kinoa|patates|lavaş|tortilla|galeta|grissini|kraker|arpa|şehriye|irmik|nohut|fasulye|mercimek|barbunya/;
const RE_FRUIT = /orman meyve|çilek|yaban mersini|ahududu|böğürtlen|muz|elma|ayva|armut|portakal|mandalina|kivi|incir|kayısı|hurma|kuru üzüm|kuru dut|nar|balkabağı/;
const RE_VEG = /domates|salatalık|biber|marul|roka|maydanoz|dereotu|nane|fesleğen|ıspanak|pazı|semizotu|kabak|patlıcan|havuç|soğan|sarımsak|karnabahar|brokoli|kereviz|lahana|enginar|mantar|kuşkonmaz|pancar/;

export function detectIngredientCategory(name: string): AdaptedIngredientItem['category'] {
  const lower = trLower(name);
  if (RE_DAIRY_PROTEIN.test(lower) || RE_MEAT_PROTEIN.test(lower) || RE_PLANT_PROTEIN.test(lower)) {
    return RE_DAIRY_ONLY.test(lower) ? 'dairy' : 'protein';
  }
  if (RE_FAT.test(lower)) return 'fat';
  if (RE_CARB.test(lower)) return 'carb';
  if (RE_FRUIT.test(lower)) return 'fruit';
  if (RE_VEG.test(lower)) return 'vegetable';
  return 'other';
}

export function detectGroceryCategory(name: string): 'protein' | 'produce' | 'dairy' | 'grains' | 'pantry' {
  const cat = detectIngredientCategory(name);
  if (cat === 'dairy') return 'dairy';
  if (cat === 'protein') return /peynir|lor|labne|kaşar|çökelek|hellim|tulum/.test(trLower(name)) ? 'dairy' : 'protein';
  if (cat === 'vegetable' || cat === 'fruit') return 'produce';
  if (cat === 'carb') return 'grains';
  return 'pantry';
}

export function parseAmountAndUnit(amountStr: string | number): { amount: number; unit: string } {
  if (typeof amountStr === 'number') return { amount: amountStr, unit: 'g' };
  if (!amountStr || typeof amountStr !== 'string') return { amount: 1, unit: 'porsiyon' };
  const match = amountStr.trim().replace(',', '.').match(/^([\d.]+)\s*(.*)$/);
  if (match) {
    const num = parseFloat(match[1]);
    return { amount: isNaN(num) ? 1 : num, unit: match[2].trim() || 'g' };
  }
  return { amount: 1, unit: 'porsiyon' };
}

export function formatScaledAmount(amount: number, unit: string): { amount: number; amountDisplay: string } {
  const cleanUnit = trLower(unit);
  let rounded = amount;
  if (cleanUnit === 'ml' || cleanUnit.includes('ml)')) {
    rounded = rounded >= 100 ? Math.round(rounded / 10) * 10 : Math.max(1, Math.round(rounded));
    return { amount: rounded, amountDisplay: `${rounded} ml` };
  }
  if (cleanUnit === 'g' || cleanUnit === 'gr' || cleanUnit === 'gram') {
    rounded = rounded >= 50 ? Math.round(rounded / 5) * 5 : Math.max(1, Math.round(rounded));
    return { amount: rounded, amountDisplay: `${rounded} g` };
  }
  if (cleanUnit.includes('adet') || cleanUnit.includes('tane') || cleanUnit.includes('dilim')) {
    rounded = Math.max(0.5, Math.round(rounded * 2) / 2);
    return { amount: rounded, amountDisplay: `${rounded} ${unit}` };
  }
  if (/kaşık|tatlı|yemek|bardak|bardağı|kase/.test(cleanUnit)) {
    rounded = Math.max(0.5, Math.round(rounded * 2) / 2);
    const updatedUnit = unit.replace(/\((\d+(?:[.,]\d+)?)\s*(g|gr|ml)\)/gi, (_, numStr, u) => {
      const baseVal = parseFloat(numStr.replace(',', '.'));
      return isNaN(baseVal) || amount <= 0 ? _ : `(${Math.round(baseVal * (rounded / Math.max(0.5, Math.round(amount))))}${u})`;
    });
    return { amount: rounded, amountDisplay: `${rounded} ${updatedUnit}` };
  }
  rounded = Number(amount.toFixed(1));
  return { amount: rounded, amountDisplay: `${rounded} ${unit}` };
}

export function personalizeRecipeForMeal(
  recipe: Recipe,
  targetExchanges: { protein: number; carb: number; fat: number; vegetable?: number; fruit?: number; dairy?: number },
  clientInfo: { id?: string; fullName?: string },
  planId: string,
  mealName: MealPoolOption,
  syncedNutrition?: RecipeTotalNutrition,
  portionMultiplier?: number
): PersonalizedRecipeCopy {
  const clientId = clientInfo.id || clientInfo.fullName || 'default_client';
  const clientName = clientInfo.fullName || 'Danışan';
  const r1 = (val: number | undefined, fb: number) => Number((val ?? fb).toFixed(1));

  const stdP = r1(recipe.exchanges?.protein, 1.5), stdC = r1(recipe.exchanges?.carb, 1), stdF = r1(recipe.exchanges?.fat, 1);
  const stdV = r1(recipe.exchanges?.vegetable, 0), stdFr = r1(recipe.exchanges?.fruit, 0), stdD = r1(recipe.exchanges?.dairy, 0);
  const standardExchanges: RecipeExchanges = { protein: stdP, carb: stdC, fat: stdF, vegetable: stdV, fruit: stdFr, dairy: stdD };

  const targetP = Math.max(0, r1(targetExchanges.protein, stdP)), targetC = Math.max(0, r1(targetExchanges.carb, stdC)), targetF = Math.max(0, r1(targetExchanges.fat, stdF));
  const targetV = r1(targetExchanges.vegetable, stdV), targetFr = r1(targetExchanges.fruit, stdFr), targetD = r1(targetExchanges.dairy, stdD);
  const planTargetExchanges: RecipeExchanges = { protein: targetP, carb: targetC, fat: targetF, vegetable: targetV, fruit: targetFr, dairy: targetD };

  const baseScale = portionMultiplier && portionMultiplier > 0 ? portionMultiplier : 1;
  const proteinRatio = stdP > 0 && targetP > 0 ? targetP / stdP : baseScale;
  const carbRatio = stdC > 0 && targetC > 0 ? targetC / stdC : baseScale;
  const fatRatio = stdF > 0 && targetF > 0 ? targetF / stdF : baseScale;
  const vegRatio = stdV > 0 && targetV > 0 ? targetV / stdV : baseScale;

  const adaptedIngredients: AdaptedIngredientItem[] = getUnifiedRecipeIngredients(recipe).map(ing => {
    const amountStr = ing.amountDisplay || `${ing.amount} ${ing.unit}`;
    const category = detectIngredientCategory(ing.foodName);
    const { amount: origAmount, unit } = parseAmountAndUnit(amountStr);
    let factor = baseScale;
    if (category === 'protein' || category === 'dairy') factor = Math.max(0.55, Math.min(2.4, proteinRatio));
    else if (category === 'carb') factor = Math.max(0.55, Math.min(2.4, carbRatio));
    else if (category === 'fat') factor = Math.max(0.5, Math.min(2.2, fatRatio));
    else if (category === 'fruit') factor = Math.max(0.75, Math.min(1.6, (carbRatio + baseScale) / 2));
    else if (category === 'vegetable') factor = Math.max(0.75, Math.min(2.0, vegRatio));
    else factor = 1;

    const { amount: scaledAmount, amountDisplay } = formatScaledAmount(origAmount * factor, unit);
    return { name: ing.foodName, originalAmountDisplay: amountStr, amount: scaledAmount, unit, amountDisplay, category, scalingFactor: Number(factor.toFixed(2)) };
  });

  const adaptedNutrition: RecipeTotalNutrition = syncedNutrition || {
    calories: Math.round(targetP * 6 * 4 + targetC * 15 * 4 + targetF * 5 * 9),
    protein: Math.round(targetP * 6), carbs: Math.round(targetC * 15), fat: Math.round(targetF * 5),
    fiber: Math.max(3, Math.round(targetV * 2 + targetC * 2))
  };

  return {
    recipeId: recipe.id, clientId, planId, mealId: `${planId}_${mealName}`, mealName,
    baseRecipeName: recipe.name, adaptedTitle: `${recipe.name} (${clientName} için Uyarlanmış)`,
    portion: '1 porsiyon', isAdaptedToTarget: true, adaptationNote: 'Bu tarif sizin bu öğündeki hedeflerinize göre düzenlenmiştir.',
    standardExchanges, targetExchanges: planTargetExchanges, adaptedExchanges: planTargetExchanges,
    adaptedNutrition, adaptedIngredients, steps: recipe.steps, prepTimeMinutes: recipe.prepTimeMinutes,
    category: recipe.category, imageUrl: recipe.imageUrl, kitchenNotes: recipe.kitchenNotes, clinicalNote: recipe.clinicalNote
  };
}