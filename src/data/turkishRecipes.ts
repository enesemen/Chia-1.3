import { Recipe, RecipeIngredient, RecipeDietaryFlags } from '../types/nutrition';
import { parseAmountAndUnit, trLower } from '../services/recipePersonalizationEngine';
import { TURKISH_BREAKFAST_RECIPES } from './turkishBreakfastRecipes';
import { TURKISH_SNACK_RECIPES } from './turkishSnackRecipes';
import { TURKISH_DINNER_RECIPES } from './turkishDinnerRecipes';

export { TURKISH_BREAKFAST_RECIPES, TURKISH_SNACK_RECIPES, TURKISH_DINNER_RECIPES };

const RE_GLUTEN = /buğday|arpa|çavdar|durum|kuskus|bulgur|irmik|makarna|un|şehriye|bisküvi|ekmek|yufka|galeta|simit|grissini|bazlama|lavaş/;
const RE_DAIRY = /süt|yoğurt|peynir|tereyağı|krema|kaymak|lor|kaşar|kefir|labne|hellim|tulum|cacık|ayran/;
const RE_DAIRY_SAFE = /laktozsuz|bitkisel|badem|hindistan cevizi|soya sütü/;
const RE_HIGH_CARB = /şeker|bal|pekmez|pirinç|makarna|patates|muz|ekmek|un|bulgur|mısır|kinoa|simit|nohut|fasulye|mercimek/;
const RE_ELIM = /buğday|arpa|çavdar|un|süt|peynir|yoğurt|tereyağı|krema|yumurta|soya|patlıcan|yer fıstığı|mısır|işlenmiş/;
const RE_FODMAP = /soğan|sarımsak|pırasa|karnabahar|mantar|kuru fasulye|nohut|mercimek|bakla|elma|armut|karpuz|bal/;
const RE_HISTAMINE = /eski kaşar|parmesan|rokfor|tulum|konserve|ton balığı|salamura|turşu|sirke|ıspanak|domates|avokado|patlıcan|şarküteri|sosis|sucuk|salam/;
const RE_ANTI_FERT = /margarin|rafine şeker|işlenmiş|sosis|salam|kızartma/;
const RE_MEAT = /et|dana|kuzu|tavuk|balık|köfte|hindi|kıyma|somon|levrek|çipura|ton balığı|karides|sakatat|ciğer|bonfile|antrikot|sucuk/;
const RE_ZERO_CAL = /tuz|karabiber|pul biber|kimyon|kekik|nane|zerdeçal|zencefil|tarçın|sumak|su\b|çay|kahve/;

export function computeRecipeDietaryFlags(recipe: Recipe): RecipeDietaryFlags {
  const rName = trLower(recipe.name || '');
  const ingList = recipe.ingredients?.length ? recipe.ingredients.map(i => trLower(i.foodName)) : (recipe.detailedIngredients || []).map(di => trLower(di.name));
  const allText = trLower(`${recipe.name || ''} ${recipe.category || ''} ${recipe.family || ''} ${recipe.description || ''} ${recipe.kitchenNotes || ''} ${recipe.clinicalNote || ''} ${ingList.join(' ')} ${(recipe.tags || []).join(' ')}`);

  return {
    hasGluten: ingList.some(ing => !ing.includes('glutensiz') && RE_GLUTEN.test(ing)),
    hasDairy: ingList.some(ing => !RE_DAIRY_SAFE.test(ing) && RE_DAIRY.test(ing)),
    hasHighCarb: ingList.some(ing => !ing.includes('unsuz') && !ing.includes('şekersiz') && RE_HIGH_CARB.test(ing)),
    hasElimTrigger: ingList.some(ing => !ing.includes('glutensiz') && !ing.includes('laktozsuz') && RE_ELIM.test(ing)),
    hasHighFodmap: ingList.some(ing => RE_FODMAP.test(ing)),
    hasHighHistamine: ingList.some(ing => RE_HISTAMINE.test(ing)),
    hasAntiFertility: ingList.some(ing => RE_ANTI_FERT.test(ing)),
    hasMeat: ingList.some(ing => RE_MEAT.test(ing)) || (!rName.includes('etsiz') && RE_MEAT.test(rName)),
    allText
  };
}

export function getUnifiedRecipeIngredients(recipe: Recipe): RecipeIngredient[] {
  if (recipe.ingredients?.length) return recipe.ingredients;
  if (recipe.detailedIngredients?.length) {
    return recipe.detailedIngredients.map((di, idx) => {
      const parsed = parseAmountAndUnit(di.amountDisplay);
      return {
        id: `${recipe.id}_ing_${idx + 1}`, foodId: di.foodId || `food_custom_${idx + 1}`,
        foodName: di.name, amount: parsed.amount, unit: parsed.unit, amountDisplay: di.amountDisplay,
        calculatedCalories: 0, calculatedProtein: 0, calculatedCarbs: 0, calculatedFat: 0, calculatedFiber: 0
      };
    });
  }
  return [];
}

export function hydrateRecipeIngredients(recipe: Recipe): Recipe {
  let hydrated = recipe;
  if (!recipe.ingredients?.length && recipe.detailedIngredients?.length) {
    const { calories = 250, protein = 12, carbs = 25, fat = 10, fiber = 3 } = recipe.totalNutrition || {};
    const parsedItems = recipe.detailedIngredients.map(di => {
      const parsed = parseAmountAndUnit(di.amountDisplay);
      const weight = RE_ZERO_CAL.test(trLower(di.name)) ? 0 : Math.max(1, parsed.amount);
      return { di, parsed, weight };
    });
    const totalWeight = parsedItems.reduce((sum, item) => sum + item.weight, 0) || parsedItems.length;
    hydrated = {
      ...recipe,
      ingredients: parsedItems.map(({ di, parsed, weight }, idx) => {
        const share = totalWeight > 0 ? weight / totalWeight : 1 / parsedItems.length;
        return {
          id: `${recipe.id}_ing_${idx + 1}`, foodId: di.foodId || `food_custom_${idx + 1}`,
          foodName: di.name, amount: parsed.amount, unit: parsed.unit, amountDisplay: di.amountDisplay,
          calculatedCalories: Math.round(calories * share), calculatedProtein: Number((protein * share).toFixed(1)),
          calculatedCarbs: Number((carbs * share).toFixed(1)), calculatedFat: Number((fat * share).toFixed(1)),
          calculatedFiber: Number((fiber * share).toFixed(1))
        };
      })
    };
  }
  return { ...hydrated, dietaryFlags: computeRecipeDietaryFlags(hydrated) };
}

export const TURKISH_RECIPES: Recipe[] = [
  ...TURKISH_BREAKFAST_RECIPES,
  ...TURKISH_SNACK_RECIPES,
  ...TURKISH_DINNER_RECIPES
].map(hydrateRecipeIngredients);
