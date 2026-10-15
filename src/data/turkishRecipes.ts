import { Recipe, RecipeIngredient, RecipeDietaryFlags } from '../types/nutrition';
import { parseAmountAndUnit } from '../services/recipePersonalizationEngine';
import { TURKISH_BREAKFAST_RECIPES } from './turkishBreakfastRecipes';
import { TURKISH_SNACK_RECIPES } from './turkishSnackRecipes';
import { TURKISH_DINNER_RECIPES } from './turkishDinnerRecipes';

export { TURKISH_BREAKFAST_RECIPES, TURKISH_SNACK_RECIPES, TURKISH_DINNER_RECIPES };

const GLUTEN_TERMS = ['buğday', 'arpa', 'çavdar', 'durum', 'kuskus', 'bulgur', 'irmik', 'makarna', 'un', 'şehriye', 'bisküvi', 'ekmek', 'yufka', 'galeta', 'simit', 'grissini', 'bazlama', 'lavaş'];
const DAIRY_TERMS = ['süt', 'yoğurt', 'peynir', 'tereyağı', 'krema', 'kaymak', 'lor', 'kaşar', 'kefir', 'labne', 'hellim', 'tulum', 'cacık', 'ayran'];
const HIGH_CARB_TERMS = ['şeker', 'bal', 'pekmez', 'pirinç', 'makarna', 'patates', 'muz', 'ekmek', 'un', 'bulgur', 'mısır', 'kinoa', 'simit', 'nohut', 'fasulye', 'mercimek'];
const ELIM_TRIGGERS = ['buğday', 'arpa', 'çavdar', 'un', 'süt', 'peynir', 'yoğurt', 'tereyağı', 'krema', 'yumurta', 'soya', 'patlıcan', 'yer fıstığı', 'mısır', 'işlenmiş'];
const HIGH_FODMAP = ['soğan', 'sarımsak', 'pırasa', 'karnabahar', 'mantar', 'kuru fasulye', 'nohut', 'mercimek', 'bakla', 'elma', 'armut', 'karpuz', 'bal'];
const HIGH_HISTAMINE = ['eski kaşar', 'parmesan', 'rokfor', 'tulum', 'konserve', 'ton balığı', 'salamura', 'turşu', 'sirke', 'ıspanak', 'domates', 'avokado', 'patlıcan', 'şarküteri', 'sosis', 'sucuk', 'salam'];
const ANTI_FERTILITY = ['margarin', 'rafine şeker', 'işlenmiş', 'sosis', 'salam', 'kızartma'];
const MEAT_TERMS = ['et', 'dana', 'kuzu', 'tavuk', 'balık', 'köfte', 'hindi', 'kıyma', 'somon', 'levrek', 'çipura', 'ton balığı', 'karides', 'sakatat', 'ciğer', 'bonfile', 'antrikot', 'sucuk'];

export function computeRecipeDietaryFlags(recipe: Recipe): RecipeDietaryFlags {
  const rName = (recipe.name || '').toLowerCase();
  const ingList = recipe.ingredients?.length ? recipe.ingredients.map(i => i.foodName.toLowerCase()) : (recipe.detailedIngredients || []).map(di => di.name.toLowerCase());
  const allText = `${rName} ${(recipe.category || '').toLowerCase()} ${(recipe.family || '').toLowerCase()} ${(recipe.description || '').toLowerCase()} ${(recipe.kitchenNotes || '').toLowerCase()} ${(recipe.clinicalNote || '').toLowerCase()} ${ingList.join(' ')} ${(recipe.tags || []).join(' ').toLowerCase()}`;

  return {
    hasGluten: ingList.some(ing => GLUTEN_TERMS.some(t => ing.includes(t) && !ing.includes('glutensiz'))),
    hasDairy: ingList.some(ing => DAIRY_TERMS.some(t => ing.includes(t) && !/laktozsuz|bitkisel|badem|hindistan cevizi|soya sütü/.test(ing))),
    hasHighCarb: ingList.some(ing => HIGH_CARB_TERMS.some(t => ing.includes(t) && !ing.includes('unsuz') && !ing.includes('şekersiz'))),
    hasElimTrigger: ingList.some(ing => ELIM_TRIGGERS.some(t => ing.includes(t) && !ing.includes('glutensiz') && !ing.includes('laktozsuz'))),
    hasHighFodmap: ingList.some(ing => HIGH_FODMAP.some(t => ing.includes(t))),
    hasHighHistamine: ingList.some(ing => HIGH_HISTAMINE.some(t => ing.includes(t))),
    hasAntiFertility: ingList.some(ing => ANTI_FERTILITY.some(t => ing.includes(t))),
    hasMeat: ingList.some(ing => MEAT_TERMS.some(t => ing.includes(t))) || MEAT_TERMS.some(t => rName.includes(t) && !rName.includes('etsiz')),
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
    const count = recipe.detailedIngredients.length;
    const { calories = 250, protein = 12, carbs = 25, fat = 10, fiber = 3 } = recipe.totalNutrition || {};
    hydrated = {
      ...recipe,
      ingredients: recipe.detailedIngredients.map((di, idx) => {
        const parsed = parseAmountAndUnit(di.amountDisplay);
        return {
          id: `${recipe.id}_ing_${idx + 1}`, foodId: di.foodId || `food_custom_${idx + 1}`,
          foodName: di.name, amount: parsed.amount, unit: parsed.unit, amountDisplay: di.amountDisplay,
          calculatedCalories: Math.round(calories / count), calculatedProtein: Number((protein / count).toFixed(1)),
          calculatedCarbs: Number((carbs / count).toFixed(1)), calculatedFat: Number((fat / count).toFixed(1)),
          calculatedFiber: Number((fiber / count).toFixed(1))
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
