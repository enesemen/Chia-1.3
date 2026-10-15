import { Recipe } from '../types/nutrition';
import { getUnifiedRecipeIngredients } from '../data/turkishRecipes';
import { PersonalizedRecipeCopy, AdaptedIngredientItem, MealPoolOption } from '../types/menuPlanner';

const DAIRY_PROTEIN_REGEX = /kefir|yoğurt|yogurt|süt|peynir|lor|labne|kaşar|çökelek|hellim|tulum|yumurta|tavuk|hindi|somon|balık|levrek|çipura|hamsi|et|dana|kıyma|köfte|ton balığı|karides|sucuk|tofu|edamame|whey|protein/i;
const DAIRY_ONLY_REGEX = /kefir|süt|yoğurt|kefiri|ayran/i;
const FAT_REGEX = /keten tohumu|chia|zeytinyağ|zeytin|ceviz|badem|fındık|fıstık|tahin|avokado|tereyağ|sade yağ|ghee|susam|kabak çekirdeği/i;
const CARB_REGEX = /yulaf|ekmek|bazlama|simit|bulgur|pirinç|makarna|erişte|un|karabuğday|kinoa|patates|lavaş|tortilla|galeta|grissini|kraker|arpa|şehriye|irmik|nohut|fasulye|mercimek|barbunya/i;
const FRUIT_REGEX = /orman meyve|çilek|yaban mersini|ahududu|böğürtlen|muz|elma|ayva|armut|portakal|mandalina|kivi|incir|kayısı|hurma|kuru üzüm|kuru dut|nar|balkabağı/i;
const VEG_REGEX = /domates|salatalık|biber|marul|roka|maydanoz|dereotu|nane|fesleğen|ıspanak|pazı|semizotu|kabak|patlıcan|havuç|soğan|sarımsak|karnabahar|brokoli|kereviz|lahana|enginar|mantar|kuşkonmaz|pancar/i;

export function detectIngredientCategory(name: string): AdaptedIngredientItem['category'] {
  if (DAIRY_PROTEIN_REGEX.test(name)) return DAIRY_ONLY_REGEX.test(name) ? 'dairy' : 'protein';
  if (FAT_REGEX.test(name)) return 'fat';
  if (CARB_REGEX.test(name)) return 'carb';
  if (FRUIT_REGEX.test(name)) return 'fruit';
  if (VEG_REGEX.test(name)) return 'vegetable';
  return 'other';
}

export function parseAmountAndUnit(amountStr: string | number): { amount: number; unit: string } {
  if (typeof amountStr === 'number') return { amount: amountStr, unit: 'g' };
  if (!amountStr || typeof amountStr !== 'string') return { amount: 1, unit: 'porsiyon' };
  const clean = amountStr.trim().replace(',', '.');
  const match = clean.match(/^([\d.]+)\s*(.*)$/);
  if (match) {
    const num = parseFloat(match[1]);
    const unit = match[2].trim() || 'g';
    return { amount: isNaN(num) ? 1 : num, unit };
  }
  return { amount: 1, unit: 'porsiyon' };
}

export function formatScaledAmount(amount: number, unit: string): { amount: number; amountDisplay: string } {
  const cleanUnit = unit.toLowerCase();
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
  if (cleanUnit.includes('kaşık') || cleanUnit.includes('tatlı') || cleanUnit.includes('yemek') || cleanUnit.includes('bardak') || cleanUnit.includes('bardağı') || cleanUnit.includes('kase')) {
    rounded = Math.max(0.5, Math.round(rounded * 2) / 2);
    const updatedUnit = unit.replace(/\((\d+(?:[.,]\d+)?)\s*(g|gr|ml)\)/gi, (_, numStr, u) => {
      const baseVal = parseFloat(numStr.replace(',', '.'));
      if (isNaN(baseVal) || amount <= 0) return _;
      return `(${Math.round(baseVal * (rounded / Math.max(0.5, Math.round(amount))))}${u})`;
    });
    return { amount: rounded, amountDisplay: `${rounded} ${updatedUnit}` };
  }
  rounded = Number(amount.toFixed(1));
  return { amount: rounded, amountDisplay: `${rounded} ${unit}` };
}

export function personalizeRecipeForMeal(
  recipe: Recipe,
  targetExchanges: { protein: number; carb: number; fat: number; vegetable: number },
  client: { fullName?: string },
  planId: string,
  mealName: MealPoolOption,
  calculatedNutrition?: { calories: number; protein: number; carbs: number; fat: number },
  portionMultiplier: number = 1.0
): PersonalizedRecipeCopy {
  const unified = getUnifiedRecipeIngredients(recipe);
  const adaptedIngredients: AdaptedIngredientItem[] = unified.map((ing, idx) => {
    const category = detectIngredientCategory(ing.foodName);
    const scalingFactor = Math.max(0.2, Math.min(3.5, portionMultiplier));
    const baseAmt = typeof ing.amount === 'number' ? ing.amount : parseFloat(String(ing.amount)) || 100;
    const finalAmt = Math.round(baseAmt * scalingFactor);
    return {
      name: ing.foodName,
      originalAmount: baseAmt,
      amount: finalAmt,
      unit: ing.unit || 'g',
      amountDisplay: `${finalAmt} ${ing.unit || 'g'}`,
      category,
      scalingFactor,
      displayOrder: idx + 1
    };
  });

  return {
    recipeId: recipe.id,
    originalTitle: recipe.name,
    adaptedTitle: `${recipe.name} (${client.fullName || 'Danışan'} Porsiyonu)`,
    clientFullName: client.fullName || 'Danışan',
    planId,
    mealName,
    scalingMultiplier: portionMultiplier,
    adaptedIngredients,
    adaptedNutrition: calculatedNutrition || recipe.totalNutrition,
    adaptedExchanges: targetExchanges,
    preparationNotes: recipe.kitchenNotes || recipe.instructions
  };
}
