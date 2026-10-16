import { FoodItem, RecipeIngredient, RecipeTotalNutrition, RecipeExchanges, Recipe, FoodSource } from '../types/nutrition';
import { INITIAL_FOODS } from '../data/mockFoods';
import { computeRecipeDietaryFlags } from '../data/turkishRecipes';
import { calculateIngredientNutrition, estimateExchangesFromIngredients, calculateRecipeTotalNutrition } from '../utils/nutritionCalculator';
import { trLower } from './recipePersonalizationEngine';

export interface TurKompDatabaseStats {
  totalFoods: number; turKompCount: number; usdaCount: number; categoriesCount: number;
  version: string; sourceAuthority: string; deterministicMode: boolean;
}

export interface IngredientCalculationResult {
  grams: number; calories: number; protein: number; carbs: number; fat: number; fiber: number;
}

export class TurKompDatabaseService {
  private foodList: FoodItem[];
  private foodMapById = new Map<string, FoodItem>();
  private foodMapByCode = new Map<string, FoodItem>();
  private foodMapByNameLower = new Map<string, FoodItem>();

  constructor(initialFoods: FoodItem[] = INITIAL_FOODS) {
    this.foodList = [...initialFoods];
    this.indexFoods();
  }

  private indexFoods() {
    this.foodMapById.clear();
    this.foodMapByCode.clear();
    this.foodMapByNameLower.clear();
    for (const food of this.foodList) {
      if (food.id) this.foodMapById.set(food.id, food);
      if (food.foodCode) this.foodMapByCode.set(food.foodCode.toUpperCase(), food);
      if (food.name) this.foodMapByNameLower.set(trLower(food.name).trim(), food);
    }
  }

  public getAllFoods(): FoodItem[] { return [...this.foodList]; }

  public getFood(identifier: string): FoodItem | undefined {
    if (!identifier) return undefined;
    const cleanId = identifier.trim();
    if (this.foodMapById.has(cleanId)) return this.foodMapById.get(cleanId);
    const upperCode = cleanId.toUpperCase();
    if (this.foodMapByCode.has(upperCode)) return this.foodMapByCode.get(upperCode);
    const lowerName = trLower(cleanId);
    if (this.foodMapByNameLower.has(lowerName)) return this.foodMapByNameLower.get(lowerName);
    return this.foodList.find(f => trLower(f.name).includes(lowerName) || f.id.includes(lowerName));
  }

  public searchFoods(query: string, sourceFilter: 'Tümü' | 'TürKomp' | 'USDA' = 'Tümü', categoryFilter = 'Tümü'): FoodItem[] {
    const q = trLower(query).trim();
    return this.foodList.filter(food => {
      if (sourceFilter === 'TürKomp' && !(food.source === 'TürKomp' || (!food.source && food.foodCode?.startsWith('TK')))) return false;
      if (sourceFilter === 'USDA' && food.source !== 'USDA') return false;
      if (categoryFilter !== 'Tümü' && food.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        trLower(food.name).includes(q) || (food.foodCode && trLower(food.foodCode).includes(q)) ||
        (food.latinName && trLower(food.latinName).includes(q)) || trLower(food.category).includes(q) || (food.notes && trLower(food.notes).includes(q))
      );
    });
  }

  public calculateIngredient(foodOrId: FoodItem | string, amount: number, unit: string): IngredientCalculationResult {
    const food = typeof foodOrId === 'string' ? this.getFood(foodOrId) : foodOrId;
    if (!food) return { grams: 0, calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    return calculateIngredientNutrition(food, amount, unit);
  }

  public calculateRecipeTotals(ingredients: RecipeIngredient[]): {
    totalNutrition: RecipeTotalNutrition; exchanges: RecipeExchanges;
    exchangeSummary: string; energyDisplay: string; updatedIngredients: RecipeIngredient[];
  } {
    const updatedIngredients = ingredients.map(ing => {
      const food = this.getFood(ing.foodId) || this.getFood(ing.foodName);
      if (!food) return ing;
      const calc = this.calculateIngredient(food, ing.amount, ing.unit);
      return {
        ...ing, calculatedCalories: calc.calories, calculatedProtein: calc.protein,
        calculatedCarbs: calc.carbs, calculatedFat: calc.fat, calculatedFiber: calc.fiber
      };
    });

    const totalNutrition = calculateRecipeTotalNutrition(updatedIngredients);
    const exchanges = estimateExchangesFromIngredients(updatedIngredients, this.foodMapById);
    const exchangeParts: string[] = [];
    if (exchanges.protein > 0) exchangeParts.push(`${exchanges.protein} Et`);
    if (exchanges.carb > 0) exchangeParts.push(`${exchanges.carb} Tahıl`);
    if (exchanges.vegetable > 0) exchangeParts.push(`${exchanges.vegetable} Sebze`);
    if (exchanges.fruit > 0) exchangeParts.push(`${exchanges.fruit} Meyve`);
    if (exchanges.dairy > 0) exchangeParts.push(`${exchanges.dairy} Süt`);
    if (exchanges.fat > 0) exchangeParts.push(`${exchanges.fat} Yağ`);

    return {
      totalNutrition, exchanges,
      exchangeSummary: exchangeParts.length > 0 ? exchangeParts.join(' · ') : 'Serbest / Kalorisiz',
      energyDisplay: `${totalNutrition.calories} kcal (P: ${totalNutrition.protein}g · C: ${totalNutrition.carbs}g · Y: ${totalNutrition.fat}g)`,
      updatedIngredients
    };
  }

  public recalculateRecipe(recipe: Recipe): Recipe {
    if (!recipe.ingredients?.length) {
      return { ...recipe, dietaryFlags: recipe.dietaryFlags || computeRecipeDietaryFlags(recipe) };
    }
    const calculation = this.calculateRecipeTotals(recipe.ingredients);
    if (calculation.totalNutrition.calories === 0 && recipe.totalNutrition?.calories > 0) {
      return { ...recipe, dietaryFlags: recipe.dietaryFlags || computeRecipeDietaryFlags(recipe) };
    }
    const updated: Recipe = {
      ...recipe, ingredients: calculation.updatedIngredients, totalNutrition: calculation.totalNutrition,
      exchanges: calculation.exchanges, exchangeSummary: calculation.exchangeSummary,
      energyDisplay: calculation.energyDisplay, updatedAt: recipe.updatedAt || new Date().toISOString()
    };
    return { ...updated, dietaryFlags: computeRecipeDietaryFlags(updated) };
  }

  public addFood(food: FoodItem): FoodItem {
    const source: FoodSource = food.source || 'TürKomp';
    const foodCode = food.foodCode || (source === 'TürKomp' ? `TK-CS.${Date.now().toString().slice(-4)}` : `USDA-${Date.now().toString().slice(-6)}`);
    const formattedFood: FoodItem = { ...food, source, foodCode };
    this.foodList = [formattedFood, ...this.foodList];
    this.indexFoods();
    return formattedFood;
  }

  public setFoods(foods: FoodItem[]) {
    this.foodList = [...foods];
    this.indexFoods();
  }

  public getStats(): TurKompDatabaseStats {
    const turKompCount = this.foodList.filter(f => f.source === 'TürKomp' || (!f.source && f.foodCode?.startsWith('TK'))).length;
    const usdaCount = this.foodList.filter(f => f.source === 'USDA').length;
    return {
      totalFoods: this.foodList.length, turKompCount, usdaCount,
      categoriesCount: new Set(this.foodList.map(f => f.category)).size,
      version: 'TürKomp v2.4 (Ulusal Gıda Kompozisyon Veri Tabanı) + USDA FDC Release',
      sourceAuthority: 'T.C. Tarım ve Orman Bakanlığı & TÜBİTAK MAM Ulusal Gıda Kompozisyon Veri Tabanı',
      deterministicMode: true
    };
  }
}

export const turKompMockService = new TurKompDatabaseService();
