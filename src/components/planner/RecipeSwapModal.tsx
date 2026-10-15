import React, { useState } from 'react';
import { X, Search, Sparkles, Check } from 'lucide-react';
import { Recipe, DietType } from '../../types/nutrition';
import { PlannedMealItem, PersonalizedRecipeCopy } from '../../types/menuPlanner';
import { isRecipeCompatibleWithDiet, adaptRecipeToArchetypeAndMeal } from '../../services/menuPlanningEngine';
import { personalizeRecipeForMeal } from '../../services/recipePersonalizationEngine';

interface RecipeSwapModalProps {
  isOpen: boolean; meal: PlannedMealItem | null; dayName: string; allRecipes: Recipe[];
  clientName?: string; dietCriteria?: DietType[]; excludedAllergies?: string[];
  activeBookletRecipeIds?: string[]; activeBookletTitle?: string;
  onSelectRecipe: (newRecipe: Recipe, personalizedCopy?: PersonalizedRecipeCopy) => void;
  onClose: () => void;
}

export const RecipeSwapModal: React.FC<RecipeSwapModalProps> = ({
  isOpen, meal, dayName, allRecipes, clientName, dietCriteria = [], excludedAllergies = [],
  activeBookletRecipeIds, activeBookletTitle, onSelectRecipe, onClose
}) => {
  const [search, setSearch] = useState('');
  const [filterTransportOnly, setFilterTransportOnly] = useState(meal?.isPortableOnly || false);
  const [filterBookletOnly, setFilterBookletOnly] = useState(!!activeBookletRecipeIds?.length);
  const [filterDietCompatibleOnly, setFilterDietCompatibleOnly] = useState(true);
  const [autoAdaptToTarget, setAutoAdaptToTarget] = useState(true);

  if (!isOpen || !meal) return null;

  const targetProtein = Number((meal.calculatedExchanges?.protein ?? 2).toFixed(1));
  const targetCarb = Number((meal.calculatedExchanges?.carb ?? 1).toFixed(1));
  const targetFat = Number((meal.calculatedExchanges?.fat ?? 1).toFixed(1));
  const targetVeg = Number((meal.calculatedExchanges?.vegetable ?? 0).toFixed(1));

  const filteredCandidates = allRecipes.filter(r => {
    if (r.isDraft) return false;
    if (filterBookletOnly && activeBookletRecipeIds?.length && !activeBookletRecipeIds.includes(r.id)) return false;
    if (filterDietCompatibleOnly && dietCriteria.length > 0 && !isRecipeCompatibleWithDiet(r, dietCriteria, excludedAllergies)) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!r.name.toLowerCase().includes(q) && !r.family?.toLowerCase().includes(q) && !r.category?.toLowerCase().includes(q)) return false;
    }
    if (filterTransportOnly && r.transportability !== 'Taşımaya Uygun') return false;
    return true;
  });

  const handleApplySelection = (candidate: Recipe) => {
    if (autoAdaptToTarget) {
      const adapted = adaptRecipeToArchetypeAndMeal(candidate, 'M1400', meal.targetCalories, { protein: targetProtein, carb: targetCarb, fat: targetFat, vegetable: targetVeg }, meal.targetMacros);
      const personalizedCopy = personalizeRecipeForMeal(candidate, adapted.calculatedExchanges, { fullName: clientName || 'Danışan' }, `plan_${clientName || 'Danisan'}_${dayName}`, meal.mealName, adapted.calculatedNutrition, adapted.portionMultiplier);
      onSelectRecipe(candidate, personalizedCopy);
    } else {
      onSelectRecipe(candidate);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-stone-50/70">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">{dayName} · {meal.mealName}</span>
              <span className="text-xs text-slate-500 font-mono">Hedef: ~{meal.targetCalories} kcal</span>
            </div>
            <h3 className="text-base font-bold font-serif text-slate-900 mt-1">Öğün İçin Alternatif Tarif Seçimi & Kişiselleştirme</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-2.5 bg-amber-50/80 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-950 font-serif">Danışan Hedefi:</span>
            <div className="font-mono text-amber-900 font-bold bg-white px-2 py-0.5 rounded-md border border-amber-300 flex items-center gap-2.5 text-[11px]">
              <span>P: <strong>{targetProtein}p</strong></span>
              <span>KH: <strong>{targetCarb}p</strong></span>
              <span>Y: <strong>{targetFat}p</strong></span>
              {targetVeg > 0 && <span>Sebze: <strong>{targetVeg}p</strong></span>}
            </div>
          </div>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-amber-950 select-none">
            <input
              type="checkbox"
              checked={autoAdaptToTarget}
              onChange={e => setAutoAdaptToTarget(e.target.checked)}
              className="rounded border-amber-300 text-amber-900 focus:ring-amber-800 w-3.5 h-3.5 cursor-pointer"
            />
            <span>Danışan Hedefine Otomatik Ölçekle (Akıllı Porsiyonlama)</span>
          </label>
        </div>

        <div className="p-4 border-b border-slate-200 space-y-3 bg-white">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Alternatif tarif ara (Örn: Çorba, Salata, Somon, Hindi, Omlet, Kefir)..." className="w-full pl-10 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-stone-50/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 transition-all font-medium" />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input type="checkbox" checked={filterDietCompatibleOnly} onChange={e => setFilterDietCompatibleOnly(e.target.checked)} className="w-4 h-4 text-amber-800 rounded border-slate-300 focus:ring-amber-700" />
                <span className="text-emerald-800 font-semibold">✓ Kriterlere Uyumlu ({dietCriteria.join(' + ') || 'STD'})</span>
              </label>

              {activeBookletRecipeIds && activeBookletRecipeIds.length > 0 && (
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                  <input type="checkbox" checked={filterBookletOnly} onChange={e => setFilterBookletOnly(e.target.checked)} className="w-4 h-4 text-amber-800 rounded border-slate-300 focus:ring-amber-700" />
                  <span className="text-amber-900 font-semibold">📚 Yalnızca Kitapçık ({activeBookletTitle || 'Seçili Kitapçık'})</span>
                </label>
              )}

              <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-700">
                <input type="checkbox" checked={filterTransportOnly} onChange={e => setFilterTransportOnly(e.target.checked)} className="w-4 h-4 text-amber-800 rounded border-slate-300 focus:ring-amber-700" />
                <span>📦 Taşımalık</span>
              </label>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">{filteredCandidates.length} uygun tarif</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredCandidates.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-xs">Arama kriterlerinize uygun alternatif tarif bulunamadı.</div>
          ) : (
            filteredCandidates.map(recipe => {
              const isCurrent = meal.selectedRecipe?.id === recipe.id;
              const cal = recipe.totalNutrition?.calories || 0;
              const calDiff = cal - meal.targetCalories;
              const stdP = Number((recipe.exchanges?.protein ?? 1.7).toFixed(1));
              const stdC = Number((recipe.exchanges?.carb ?? 0.8).toFixed(1));
              const stdF = Number((recipe.exchanges?.fat ?? 0.8).toFixed(1));

              return (
                <div key={recipe.id} onClick={() => handleApplySelection(recipe)} className={`flex items-center justify-between gap-3 p-3 rounded-xl transition-all cursor-pointer group ${isCurrent ? 'bg-emerald-50/80 border border-emerald-300 shadow-2xs' : 'hover:bg-amber-50/40 border border-slate-200/90 hover:border-amber-800/50'}`}>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-xs sm:text-sm text-slate-900 font-serif group-hover:text-amber-950 truncate">{recipe.name}</span>
                      {isCurrent && <span className="text-[10px] px-1.5 py-0.2 bg-emerald-700 text-white font-bold rounded">Mevcut</span>}
                      {recipe.transportability === 'Taşımaya Uygun' && <span className="text-[10px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 font-bold rounded">📦</span>}
                      <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-600 font-mono rounded">{recipe.dietType || 'STD'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                      <span className="font-sans">{recipe.category}</span><span>·</span>
                      <span>Standart: P:{stdP} KH:{stdC} Y:{stdF}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right font-mono">
                      <div className="font-bold text-xs text-slate-900">{cal} kcal</div>
                      <div className={`text-[10px] font-medium ${Math.abs(calDiff) <= 50 ? 'text-emerald-600' : calDiff > 0 ? 'text-amber-700' : 'text-rose-600'}`}>
                        {calDiff > 0 ? `+${calDiff}` : calDiff} kcal
                      </div>
                    </div>
                    <button type="button" className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-900 group-hover:bg-amber-950 text-white shadow-2xs transition-all cursor-pointer">
                      {autoAdaptToTarget ? <Sparkles className="w-3.5 h-3.5 text-amber-300" /> : <Check className="w-3.5 h-3.5" />}
                      <span>Seç</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-stone-50/70 flex items-center justify-between text-xs text-slate-500">
          <span>Kişiselleştirme yalnızca danışanın teslim dosyası ve planı için geçerlidir.</span>
          <button type="button" onClick={onClose} className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg font-semibold text-slate-700 cursor-pointer">Kapat</button>
        </div>
      </div>
    </div>
  );
};