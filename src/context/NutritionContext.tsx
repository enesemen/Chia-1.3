import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { Recipe, FoodItem, ClientProfile, RecipeIngredient, RecipeBooklet } from '../types/nutrition';
import { INITIAL_RECIPES } from '../data/mockRecipes';
import { INITIAL_FOODS } from '../data/mockFoods';
import { INITIAL_CLIENTS } from '../data/mockArchetypes';
import { INITIAL_BOOKLETS } from '../data/mockBooklets';
import { turKompMockService, TurKompDatabaseService, TurKompDatabaseStats, IngredientCalculationResult } from '../services/turKompDatabaseService';

export type ActiveModule = 'recipes' | 'foods' | 'exchanges' | 'templates';

export interface RecipeFilters {
  search: string; dietType: string; mealType: string; practicality: string;
  transportability: string; category: string; season: string; status: 'Tümü' | 'Aktif' | 'Taslak';
}

interface NutritionContextType {
  activeModule: ActiveModule; setActiveModule: (mod: ActiveModule) => void;
  recipes: Recipe[];
  recipeMap: ReadonlyMap<string, Recipe>;
  filters: RecipeFilters; setFilters: React.Dispatch<React.SetStateAction<RecipeFilters>>;
  filteredRecipes: Recipe[]; saveRecipe: (recipe: Recipe) => void; deleteRecipe: (id: string) => void;
  booklets: RecipeBooklet[];
  saveBooklet: (bookletData: Omit<RecipeBooklet, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => RecipeBooklet;
  deleteBooklet: (id: string) => void; addRecipesToBooklet: (bookletId: string, recipeIdsToAdd: string[]) => void;
  isWizardOpen: boolean; editingRecipe: Recipe | null; openWizard: (recipe?: Recipe) => void; closeWizard: () => void;
  selectedRecipeForDetail: Recipe | null; openDetail: (recipe: Recipe) => void; closeDetail: () => void;
  foods: FoodItem[]; addCustomFood: (food: FoodItem) => void; turKompService: TurKompDatabaseService;
  turKompStats: TurKompDatabaseStats;
  calculateIngredientNutrition: (foodOrId: FoodItem | string, amount: number, unit: string) => IngredientCalculationResult;
  calculateRecipeTotals: (ingredients: RecipeIngredient[]) => ReturnType<typeof turKompMockService.calculateRecipeTotals>;
  recalculateRecipe: (recipe: Recipe) => Recipe;
  clients: ClientProfile[];
  activePlannerClientId: string | null; setActivePlannerClientId: (id: string | null) => void;
  stats: {
    totalRecipes: number; activeRecipes: number; draftRecipes: number; totalFoods: number;
    turKompCount: number; usdaCount: number;
  };
}

const NutritionContext = createContext<NutritionContextType | undefined>(undefined);

const RECIPES_STORAGE_KEY = 'nutriplan_recipes_v3';
const FOODS_STORAGE_KEY = 'nutriplan_foods_v2';
const BOOKLETS_STORAGE_KEY = 'nutriplan_booklets_v1';

function loadStoredArray<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function useDebouncedStorage<T>(key: string, value: T, delay = 300) {
  useEffect(() => {
    const timer = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
    }, delay);
    return () => clearTimeout(timer);
  }, [key, value, delay]);
}

export const NutritionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModule] = useState<ActiveModule>('recipes');
  const [activePlannerClientId, setActivePlannerClientId] = useState<string | null>(null);

  const [recipes, setRecipes] = useState<Recipe[]>(() => {
    const stored = loadStoredArray(RECIPES_STORAGE_KEY, INITIAL_RECIPES);
    const storedMap = new Map(stored.map(r => [r.id, r]));
    const merged = [...stored];
    INITIAL_RECIPES.forEach(seed => {
      if (!storedMap.has(seed.id)) merged.push(seed);
    });
    return merged.map(r => turKompMockService.recalculateRecipe(r));
  });

  const [foods, setFoods] = useState<FoodItem[]>(() => {
    const stored = loadStoredArray(FOODS_STORAGE_KEY, INITIAL_FOODS);
    const storedMap = new Map(stored.map(f => [f.id, f]));
    const merged = [...stored];
    INITIAL_FOODS.forEach(seed => {
      if (!storedMap.has(seed.id)) merged.push(seed);
    });
    return merged;
  });

  const [booklets, setBooklets] = useState<RecipeBooklet[]>(() => loadStoredArray(BOOKLETS_STORAGE_KEY, INITIAL_BOOKLETS));
  // TODO [ORBIO-INTEGRATION]: Orbio ana danışanlar modülüyle birleştiğinde INITIAL_CLIENTS silinecek ve Orbio state'ine bağlanacaktır.
  const [clients] = useState<ClientProfile[]>(INITIAL_CLIENTS);

  useDebouncedStorage(RECIPES_STORAGE_KEY, recipes);
  useDebouncedStorage(FOODS_STORAGE_KEY, foods);
  useDebouncedStorage(BOOKLETS_STORAGE_KEY, booklets);

  const recipeMap = useMemo(() => new Map(recipes.map(r => [r.id, r])), [recipes]);

  const saveBooklet = useCallback((bookletData: Omit<RecipeBooklet, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): RecipeBooklet => {
    const now = new Date().toISOString();
    if (bookletData.id) {
      const existing = booklets.find(b => b.id === bookletData.id);
      const updated: RecipeBooklet = { ...bookletData, id: bookletData.id, createdAt: existing?.createdAt || now, updatedAt: now };
      setBooklets(prev => prev.map(b => (b.id === updated.id ? updated : b)));
      return updated;
    }
    const saved: RecipeBooklet = { ...bookletData, id: `booklet-${Date.now()}`, createdAt: now, updatedAt: now };
    setBooklets(prev => [saved, ...prev]);
    return saved;
  }, [booklets]);

  const deleteBooklet = useCallback((id: string) => setBooklets(prev => prev.filter(b => b.id !== id)), []);

  const addRecipesToBooklet = useCallback((bookletId: string, recipeIdsToAdd: string[]) => {
    setBooklets(prev => prev.map(b => b.id !== bookletId ? b : {
      ...b, recipeIds: Array.from(new Set([...b.recipeIds, ...recipeIdsToAdd])), updatedAt: new Date().toISOString()
    }));
  }, []);

  const [filters, setFilters] = useState<RecipeFilters>({
    search: '', dietType: 'Tümü', mealType: 'Tümü', practicality: 'Tümü',
    transportability: 'Tümü', category: 'Tümü', season: 'Tümü', status: 'Tümü'
  });

  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [selectedRecipeForDetail, setSelectedRecipeForDetail] = useState<Recipe | null>(null);

  const openWizard = useCallback((recipeToEdit?: Recipe) => { setEditingRecipe(recipeToEdit || null); setIsWizardOpen(true); }, []);
  const closeWizard = useCallback(() => { setIsWizardOpen(false); setEditingRecipe(null); }, []);
  const openDetail = useCallback((recipe: Recipe) => setSelectedRecipeForDetail(recipe), []);
  const closeDetail = useCallback(() => setSelectedRecipeForDetail(null), []);

  const calculateIngredientNutrition = useCallback((foodOrId: FoodItem | string, amount: number, unit: string) => turKompMockService.calculateIngredient(foodOrId, amount, unit), []);
  const calculateRecipeTotals = useCallback((ingredients: RecipeIngredient[]) => turKompMockService.calculateRecipeTotals(ingredients), []);
  const recalculateRecipe = useCallback((recipe: Recipe): Recipe => turKompMockService.recalculateRecipe(recipe), []);

  const saveRecipe = useCallback((recipe: Recipe) => {
    const deterministicallyCalculatedRecipe = turKompMockService.recalculateRecipe(recipe);
    setRecipes(prev => prev.some(r => r.id === recipe.id) ? prev.map(r => (r.id === recipe.id ? deterministicallyCalculatedRecipe : r)) : [deterministicallyCalculatedRecipe, ...prev]);
    setSelectedRecipeForDetail(deterministicallyCalculatedRecipe);
  }, []);

  const deleteRecipe = useCallback((id: string) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    setSelectedRecipeForDetail(prev => (prev?.id === id ? null : prev));
  }, []);

  const addCustomFood = useCallback((food: FoodItem) => {
    const formatted = turKompMockService.addFood(food);
    setFoods(prev => [formatted, ...prev.filter(f => f.id !== formatted.id)]);
  }, []);

  const filteredRecipes = useMemo(() => {
    const q = filters.search.toLowerCase().trim();
    const filterDietLower = filters.dietType.toLowerCase();
    const filterMealLower = filters.mealType.toLowerCase();

    return recipes.filter(r => {
      if (q) {
        const match = r.dietaryFlags?.allText ? r.dietaryFlags.allText.includes(q) : r.name.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filters.dietType !== 'Tümü' && !(r.dietTypes?.some(dt => dt.toLowerCase() === filterDietLower) || r.dietType === filters.dietType)) return false;
      if (filters.mealType !== 'Tümü' && !(r.mealTypes?.some(mt => mt.toLowerCase() === filterMealLower) || r.mealType === filters.mealType)) return false;
      if (filters.practicality !== 'Tümü' && r.practicality !== filters.practicality) return false;
      if (filters.transportability !== 'Tümü' && r.transportability !== filters.transportability) return false;
      if (filters.category !== 'Tümü' && r.category !== filters.category) return false;
      if (filters.status === 'Aktif' && r.isDraft) return false;
      if (filters.status === 'Taslak' && !r.isDraft) return false;
      return true;
    });
  }, [recipes, filters]);

  const turKompStats = turKompMockService.getStats();

  const stats = useMemo(() => ({
    totalRecipes: recipes.length, activeRecipes: recipes.filter(r => !r.isDraft).length,
    draftRecipes: recipes.filter(r => r.isDraft).length, totalFoods: foods.length,
    turKompCount: turKompStats.turKompCount, usdaCount: turKompStats.usdaCount
  }), [recipes, foods.length, turKompStats.turKompCount, turKompStats.usdaCount]);

  const contextValue = useMemo(() => ({
    activeModule, setActiveModule, recipes, recipeMap, filters, setFilters, filteredRecipes, saveRecipe, deleteRecipe,
    booklets, saveBooklet, deleteBooklet, addRecipesToBooklet, isWizardOpen, editingRecipe, openWizard, closeWizard,
    selectedRecipeForDetail, openDetail, closeDetail, foods, addCustomFood, turKompService: turKompMockService,
    turKompStats, calculateIngredientNutrition, calculateRecipeTotals, recalculateRecipe, clients,
    activePlannerClientId, setActivePlannerClientId, stats
  }), [
    activeModule, recipes, recipeMap, filters, filteredRecipes, saveRecipe, deleteRecipe,
    booklets, saveBooklet, deleteBooklet, addRecipesToBooklet, isWizardOpen, editingRecipe, openWizard, closeWizard,
    selectedRecipeForDetail, openDetail, closeDetail, foods, addCustomFood, turKompStats,
    calculateIngredientNutrition, calculateRecipeTotals, recalculateRecipe, clients, activePlannerClientId, stats
  ]);

  return <NutritionContext.Provider value={contextValue}>{children}</NutritionContext.Provider>;
};

export const useNutrition = () => {
  const context = useContext(NutritionContext);
  if (!context) throw new Error('useNutrition must be used within a NutritionProvider');
  return context;
};
