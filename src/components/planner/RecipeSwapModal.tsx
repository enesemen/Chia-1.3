import React, { useState } from 'react';
import { X, Search, Sparkles } from 'lucide-react';
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

        <div className="px-6 py-3 bg-amber-50/80 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-amber-950 font-serif">Danışan Öğün Hedefi:</span>
            <div className="font-mono text-amber-900 font-bold bg-white px-2.5 py-1 rounded-lg border border-amber-300 flex items-center gap-3">
              <span>Protein: <strong>{targetProtein} p</strong></span>
              <span>KH: <strong>{targetCarb} p</strong></span>
              <span>Yağ: <strong>{targetFat} p</strong></span>
              {targetVeg > 0 && <span>Sebze: <strong>{targetVeg} p</strong></span>}
            </div>
          </div>
          <span className="text-[11px] font-medium text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-700" /><span>Kişiselleştirilmiş Reçete Uyarlaması</span>
          </span>
        </div>

        {meal.selectedRecipe && (
          <div className="px-6 py-2.5 bg-stone-100/70 border-b border-slate-200 flex items-center justify-between text-xs">
            <div><span className="text-slate-500">Mevcut Seçili Tarif:</span><span className="font-bold text-slate-900 ml-1.5">{meal.selectedRecipe.name}</span></div>
            <div className="font-mono font-bold text-amber-900">{meal.selectedRecipe.totalNutrition?.calories || 0} kcal</div>
          </div>
        )}

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

        <div className="flex-1 overflow-y-auto p-4 space-y-3 divide-y divide-slate-100">
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
                <div key={recipe.id} className={`pt-3 first:pt-0 flex flex-col gap-2 p-3.5 rounded-2xl transition-all ${isCurrent ? 'bg-emerald-50/70 border border-emerald-300 shadow-2xs' : 'hover:bg-stone-50 border border-slate-200'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 font-serif">{recipe.name}</span>
                        {recipe.transportability === 'Taşımaya Uygun' && <span className="text-[10px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded">📦 Taşınabilir</span>}
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 font-mono rounded">{recipe.dietType || 'STD'}</span>
                      </div>
                      <div className="text-xs text-slate-500"><span>{recipe.category}</span>{recipe.family && <span> · {recipe.family}</span>}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-xs text-slate-900">{cal} kcal</div>
                      <div className={`text-[10px] font-mono font-medium ${Math.abs(calDiff) <= 50 ? 'text-emerald-600' : calDiff > 0 ? 'text-amber-700' : 'text-rose-600'}`}>
                        {calDiff > 0 ? `+${calDiff}` : calDiff} kcal
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-stone-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <div className="space-y-0.5">
                      <div className="text-[10px] uppercase tracking-wider font-mono text-slate-500 font-bold">Standart Tarif Değerleri</div>
                      <div className="font-mono text-slate-700 font-medium">P: <strong>{stdP} p</strong> · KH: <strong>{stdC} p</strong> · Y: <strong>{stdF} p</strong></div>
                    </div>
                    <div className="space-y-0.5 border-t sm:border-t-0 sm:border-l border-slate-200 pt-1.5 sm:pt-0 sm:pl-3">
                      <div className="text-[10px] uppercase tracking-wider font-mono text-amber-800 font-bold flex items-center justify-between">
                        <span>Danışan Hedefi</span><span className="text-emerald-700 font-semibold text-[9px]">Uyum Hedefi</span>
                      </div>
                      <div className="font-mono text-amber-950 font-bold">P: <strong>{targetProtein} p</strong> · KH: <strong>{targetCarb} p</strong> · Y: <strong>{targetFat} p</strong></div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-slate-500 italic">* Orijinal tarif veritabanında sabit kalır, sadece bu plana özel kopya oluşturulur.</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const adapted = adaptRecipeToArchetypeAndMeal(recipe, 'M1400', meal.targetCalories, { protein: targetProtein, carb: targetCarb, fat: targetFat, vegetable: targetVeg }, meal.targetMacros);
                          const personalizedCopy = personalizeRecipeForMeal(recipe, adapted.calculatedExchanges, { fullName: clientName || 'Danışan' }, `plan_${clientName || 'Danisan'}_${dayName}`, meal.mealName, adapted.calculatedNutrition, adapted.portionMultiplier);
                          onSelectRecipe(recipe, personalizedCopy);
                          onClose();
                        }}
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-900 hover:bg-amber-950 text-white shadow-xs transition-all cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" /><span>Kişiye Göre Uyarla & Seç</span>
                      </button>
                      <button type="button" onClick={() => { onSelectRecipe(recipe); onClose(); }} className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-slate-700 transition-all cursor-pointer border border-slate-200">
                        Standart Seç
                      </button>
                    </div>
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