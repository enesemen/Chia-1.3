import React from 'react';
import { NutritionProvider, useNutrition } from './context/NutritionContext';
import { Navbar } from './components/layout/Navbar';
import { RecipeList } from './components/recipes/RecipeList';
import { RecipeWizard } from './components/recipes/RecipeWizard';
import { RecipeDetailModal } from './components/recipes/RecipeDetailModal';
import { FoodsDatabaseView } from './components/foods/FoodsDatabaseView';
import { ExchangeRulesView } from './components/exchanges/ExchangeRulesView';
import { MenuPlannerView } from './components/planner/MenuPlannerView';

const MainWorkspace: React.FC = () => {
  const { activeModule } = useNutrition();

  return (
    <main className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {activeModule === 'recipes' && <RecipeList />}
        {activeModule === 'foods' && <FoodsDatabaseView />}
        {activeModule === 'exchanges' && <ExchangeRulesView />}
        {activeModule === 'templates' && <MenuPlannerView />}
      </div>
    </main>
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
        <RecipeWizard />
        <RecipeDetailModal />
      </div>
    </NutritionProvider>
  );
}