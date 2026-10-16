import React, { Suspense, lazy } from 'react';
import { NutritionProvider, useNutrition } from './context/NutritionContext';
import { Navbar } from './components/layout/Navbar';
import { RecipeList } from './components/recipes/RecipeList';

const RecipeWizard = lazy(() => import('./components/recipes/RecipeWizard').then(m => ({ default: m.RecipeWizard })));
const RecipeDetailModal = lazy(() => import('./components/recipes/RecipeDetailModal').then(m => ({ default: m.RecipeDetailModal })));
const FoodsDatabaseView = lazy(() => import('./components/foods/FoodsDatabaseView').then(m => ({ default: m.FoodsDatabaseView })));
const ExchangeRulesView = lazy(() => import('./components/exchanges/ExchangeRulesView').then(m => ({ default: m.ExchangeRulesView })));
const MenuPlannerView = lazy(() => import('./components/planner/MenuPlannerView').then(m => ({ default: m.MenuPlannerView })));

const MainWorkspace: React.FC = () => {
  const { activeModule, isWizardOpen, selectedRecipeForDetail } = useNutrition();

  return (
    <>
      <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 font-sans">
        <div className="max-w-7xl mx-auto space-y-6">
          <Suspense fallback={<div className="py-12 text-center text-xs text-slate-400 font-medium">Yükleniyor...</div>}>
            {activeModule === 'recipes' && <RecipeList />}
            {activeModule === 'foods' && <FoodsDatabaseView />}
            {activeModule === 'exchanges' && <ExchangeRulesView />}
            {activeModule === 'templates' && <MenuPlannerView />}
          </Suspense>
        </div>
      </main>
      <Suspense fallback={null}>
        {isWizardOpen && <RecipeWizard />}
        {selectedRecipeForDetail && <RecipeDetailModal />}
      </Suspense>
    </>
  );
};

export default function App() {
  return (
    <NutritionProvider>
      <div className="min-h-screen bg-[#F8F6F0] flex flex-col text-[#1F2B1D] font-sans selection:bg-[#E3ECE0] selection:text-[#273423]">
        <Navbar />
        <div className="flex-1 flex overflow-hidden">
          <MainWorkspace />
        </div>
      </div>
    </NutritionProvider>
  );
}