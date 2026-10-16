import React, { useState, useMemo } from 'react';
import {
  Utensils, Clock, Sparkles, Shuffle, ShoppingBag, Printer,
  Check, CheckCircle2, X, Info, Flame, Edit3, Copy,
  ExternalLink, Layers, ChefHat, BookOpen
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';
import { WeeklyMenuPlan, PlannedMealItem, DailyMacroTargetGrams } from '../../types/menuPlanner';
import { Recipe } from '../../types/nutrition';
import { getUnifiedRecipeIngredients } from '../../data/turkishRecipes';
import { sortMealsByCanonicalOrder } from '../../services/menuPlanningEngine';
import { detectGroceryCategory, trLower } from '../../services/recipePersonalizationEngine';

interface WeeklyMatrixViewProps {
  plan: WeeklyMenuPlan;
  targetMacroGrams: DailyMacroTargetGrams;
  activeArchetypeTargetCalories: number;
  onSwapRecipeClick: (dayIndex: number, mealIndex: number, meal: PlannedMealItem, dayName: string) => void;
  onReOptimizeDay: (dayIndex: number) => void;
  onReOptimizeAllDays: () => void;
  onUpdatePlanTitle?: (newTitle: string) => void;
}

export const getMealFallbackImage = (mealName: string, recipeTitle?: string): string => {
  const text = trLower(`${mealName} ${recipeTitle || ''}`);
  if (/yulaf|oat|kahvaltı|omlet|yumurta|pancake/.test(text)) return 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?auto=format&fit=crop&w=400&q=80';
  if (/somon|balık|salmon|fish|levrek|çipura/.test(text)) return 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80';
  if (/tavuk|chicken|salata|salad|öğle/.test(text)) return 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=400&q=80';
  if (/köfte|et|steak|akşam|roast/.test(text)) return 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=400&q=80';
  if (/chia|smoothie|meyve|ara|snack|yoğurt|kuruyemiş/.test(text)) return 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80';
  return 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80';
};

const getMealLabels = (mealName: string): { tr: string; en: string } => {
  const l = trLower(mealName);
  if (l.includes('kahvaltı') || l.includes('sabah')) return { tr: 'Kahvaltı', en: 'Breakfast' };
  if (l.includes('öğle')) return { tr: 'Öğle', en: 'Lunch' };
  if (l.includes('akşam')) return { tr: 'Akşam', en: 'Dinner' };
  if (l.includes('kuşluk')) return { tr: 'Kuşluk', en: 'Morning Snack' };
  if (l.includes('ikindi')) return { tr: 'İkindi', en: 'Afternoon Snack' };
  if (l.includes('gece')) return { tr: 'Gece', en: 'Late Snack' };
  if (l.includes('ara')) return { tr: 'Ara Öğün', en: 'Snack' };
  return { tr: mealName, en: 'Meal' };
};

const DAY_LABELS_MAP: Record<string, { tr: string; en: string }> = {
  Pazartesi: { tr: 'Pazartesi', en: 'Monday' }, Salı: { tr: 'Salı', en: 'Tuesday' },
  Çarşamba: { tr: 'Çarşamba', en: 'Wednesday' }, Perşembe: { tr: 'Perşembe', en: 'Thursday' },
  Cuma: { tr: 'Cuma', en: 'Friday' }, Cumartesi: { tr: 'Cumartesi', en: 'Saturday' }, Pazar: { tr: 'Pazar', en: 'Sunday' }
};

export const WeeklyMatrixView: React.FC<WeeklyMatrixViewProps> = ({
  plan, targetMacroGrams, activeArchetypeTargetCalories,
  onSwapRecipeClick, onReOptimizeDay, onReOptimizeAllDays, onUpdatePlanTitle
}) => {
  const [planTitle, setPlanTitle] = useState(plan.planTitle || `${plan.client?.fullName || 'Danışan'}'in Haftalık Planı`);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const { openDetail, recipeMap } = useNutrition();

  const [isGroceryModalOpen, setIsGroceryModalOpen] = useState(false);
  const [selectedRecipeDetail, setSelectedRecipeDetail] = useState<{
    recipe: Recipe | null; meal: PlannedMealItem; dayName: string; dayIndex: number; mealIndex: number;
  } | null>(null);
  const [recipeModalTab, setRecipeModalTab] = useState<'content' | 'ingredients' | 'notes' | 'nutrition'>('content');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => { setToastMessage(msg); setTimeout(() => setToastMessage(null), 3500); };

  const fullRecipe: Recipe | null = useMemo(() => {
    if (!selectedRecipeDetail) return null;
    const directId = selectedRecipeDetail.recipe?.id || selectedRecipeDetail.meal?.selectedRecipe?.id || selectedRecipeDetail.meal?.adaptedRecipe?.recipeId;
    return (directId && recipeMap.get(directId)) || selectedRecipeDetail.recipe || selectedRecipeDetail.meal?.selectedRecipe || null;
  }, [selectedRecipeDetail, recipeMap]);

  const resolvedIngredients = useMemo((): { name: string; amountDisplay: string; isAdapted: boolean; calories?: number }[] => {
    if (!selectedRecipeDetail) return [];
    const { meal, recipe: rec } = selectedRecipeDetail;
    if (meal?.adaptedRecipe?.adaptedIngredients?.length) {
      return meal.adaptedRecipe.adaptedIngredients.map(item => ({
        name: item.name, amountDisplay: item.amountDisplay, isAdapted: item.scalingFactor !== 1
      }));
    }
    const targetRecipe = meal?.selectedRecipe || fullRecipe || rec;
    if (targetRecipe) {
      const unified = getUnifiedRecipeIngredients(targetRecipe);
      if (unified.length) {
        return unified.map(u => ({
          name: u.foodName, amountDisplay: u.amountDisplay || `${u.amount} ${u.unit}`, isAdapted: false, calories: u.calculatedCalories
        }));
      }
    }
    const recipeName = rec?.name || meal?.selectedRecipe?.name || fullRecipe?.name || 'Tarif';
    return [{
      name: `${recipeName} Ana Porsiyonu`, amountDisplay: fullRecipe?.portionDescription || '1 Porsiyon',
      isAdapted: true, calories: meal?.calculatedNutrition?.calories || fullRecipe?.totalNutrition?.calories
    }];
  }, [selectedRecipeDetail, fullRecipe]);

  const canonicalMealRows = useMemo(() => {
    const namesSet = new Set<string>();
    if (plan.selectedMeals?.length) sortMealsByCanonicalOrder(plan.selectedMeals).forEach(m => namesSet.add(m.name));
    plan.days.forEach(d => d.meals.forEach(m => namesSet.add(m.mealName)));
    return Array.from(namesSet);
  }, [plan]);

  const clientTags = useMemo(() => [
    plan.client?.selectedArchetype || 'Kilo Verme',
    plan.client?.dietCriteria?.length ? plan.client.dietCriteria.join(' · ') : 'Standart Diyet',
    `${canonicalMealRows.length} Öğün / Gün`
  ], [plan, canonicalMealRows]);

  const groceryCategories = useMemo(() => {
    const categories: Record<string, { title: string; items: Map<string, { name: string; amount: number; unit: string }> }> = {
      produce: { title: 'Sebze & Meyve', items: new Map() },
      protein: { title: 'Et, Tavuk & Balık', items: new Map() },
      dairy: { title: 'Süt & Süt Ürünleri', items: new Map() },
      grains: { title: 'Kuru Gıda, Tahıl & Bakliyat', items: new Map() },
      pantry: { title: 'Baharat, Yağ & Soslar', items: new Map() }
    };

    plan.days.forEach(d => d.meals.forEach(m => {
      const recipe = m.selectedRecipe;
      if (!recipe) return;
      const rawList = m.adaptedRecipe?.adaptedIngredients?.length
        ? m.adaptedRecipe.adaptedIngredients.map(a => ({ name: a.name, amount: a.amount, unit: a.unit }))
        : getUnifiedRecipeIngredients(recipe).map(i => ({ name: i.foodName, amount: i.amount, unit: i.unit }));

      rawList.forEach(ing => {
        const name = ing.name?.trim();
        if (!name) return;
        const catKey = detectGroceryCategory(name);
        const amt = Number(ing.amount) || 1;
        const rawUnit = (ing.unit || 'adet').trim();
        const normalizedUnit = rawUnit.replace(/\s*\(.*?\)\s*/g, '').trim() || rawUnit;
        const key = `${trLower(name)}__${trLower(normalizedUnit)}`;
        const existing = categories[catKey].items.get(key);
        if (existing) existing.amount = Number((existing.amount + amt).toFixed(1));
        else categories[catKey].items.set(key, { name, amount: Number(amt.toFixed(1)), unit: normalizedUnit });
      });
    }));

    return Object.entries(categories).map(([key, cat]) => ({ key, title: cat.title, items: Array.from(cat.items.values()) })).filter(c => c.items.length > 0);
  }, [plan]);

  const handleCopyGroceryList = () => {
    let text = `🛒 ${plan.client?.fullName || 'Danışan'} - Haftalık Alışveriş Listesi\n\n`;
    groceryCategories.forEach(cat => {
      text += `📌 ${cat.title}:\n` + cat.items.map(it => `• ${it.name}: ${it.amount} ${it.unit}`).join('\n') + '\n\n';
    });
    navigator.clipboard.writeText(text);
    showToast('Alışveriş listesi panoya kopyalandı!');
  };

  const handleOpenRecipeModal = (dayPlan: WeeklyMenuPlan['days'][0], dayIdx: number, mealRowName: string, mealItem: PlannedMealItem) => {
    setSelectedRecipeDetail({
      recipe: mealItem.selectedRecipe || null, meal: mealItem, dayName: dayPlan.day,
      dayIndex: dayIdx, mealIndex: dayPlan.meals.findIndex(m => m.mealName === mealRowName)
    });
    setRecipeModalTab('content');
  };

  return (
    <div className="space-y-4">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 bg-slate-900 text-white rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" /><span>{toastMessage}</span>
        </div>
      )}

      <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  type="text" value={planTitle} onChange={e => setPlanTitle(e.target.value)}
                  onBlur={() => { setIsEditingTitle(false); onUpdatePlanTitle?.(planTitle); }}
                  onKeyDown={e => { if (e.key === 'Enter') { setIsEditingTitle(false); onUpdatePlanTitle?.(planTitle); } }}
                  autoFocus className="text-xl sm:text-2xl font-bold text-slate-900 border-b border-amber-900 focus:outline-hidden px-1"
                />
                <button type="button" onClick={() => setIsEditingTitle(false)} className="p-1 text-emerald-600 hover:text-emerald-700 cursor-pointer"><Check className="w-4 h-4" /></button>
              </div>
            ) : (
              <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">{planTitle}</h1>
                <Edit3 className="w-4 h-4 text-slate-400 group-hover:text-amber-800 transition-colors" />
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {clientTags.map((tag, idx) => (
              <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100/90 text-slate-600 border border-slate-200/60">{tag}</span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap justify-end">
          <button type="button" onClick={() => setIsGroceryModalOpen(true)} className="flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer">
            <ShoppingBag className="w-4 h-4 text-slate-600" /><span>Alışveriş Listesi</span>
          </button>
        </div>
      </div>

      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4 sm:gap-6 flex-wrap">
          <span className="font-bold text-slate-700 text-sm">Günlük Hedefler:</span>
          {[
            { label: 'Enerji', val: `${activeArchetypeTargetCalories.toLocaleString('tr-TR')} kcal`, dot: 'bg-purple-600' },
            { label: 'Protein', val: `${targetMacroGrams.proteinG} g`, dot: 'bg-indigo-600' },
            { label: 'Karbonhidrat', val: `${targetMacroGrams.carbG} g`, dot: 'bg-amber-500' },
            { label: 'Yağ', val: `${targetMacroGrams.fatG} g`, dot: 'bg-emerald-600' }
          ].map(t => (
            <div key={t.label} className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${t.dot} shrink-0`} />
              <span className="text-slate-600">{t.label}</span>
              <strong className="text-slate-900 font-bold font-mono">{t.val}</strong>
            </div>
          ))}
        </div>

        <button type="button" onClick={onReOptimizeAllDays} className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg text-xs font-semibold transition-all cursor-pointer">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" /><span>Haftayı Yeniden Dengele</span>
        </button>
      </div>

      <div id="weekly-matrix-export-container" className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
        <table className="w-full table-fixed border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200/80 bg-stone-50/60">
              <th className="py-2.5 px-2 w-[11%] font-bold text-[11px] text-slate-500 uppercase tracking-wider">Öğün</th>
              {plan.days.map((d, dIdx) => {
                const labels = DAY_LABELS_MAP[d.day] || { tr: d.day, en: d.day };
                return (
                  <th key={d.day} className="py-2.5 px-1.5 font-semibold text-xs text-slate-800 text-left w-[12.7%]">
                    <div className="flex items-center justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-xs truncate">{labels.tr}</div>
                        <div className="text-[9px] text-slate-400 font-normal truncate">{labels.en}</div>
                      </div>
                      <button type="button" onClick={() => onReOptimizeDay(dIdx)} title={`${d.day} menüsünü optimize et`} className="opacity-40 hover:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-600 transition-all cursor-pointer shrink-0">
                        <Sparkles className="w-3 h-3 text-amber-700" />
                      </button>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {canonicalMealRows.map(mealRowName => {
              const mealLabels = getMealLabels(mealRowName);
              return (
                <tr key={mealRowName} className="hover:bg-slate-50/40 transition-colors">
                  <td className="py-2 px-2 align-middle bg-stone-50/30 border-r border-slate-100">
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">{mealLabels.tr}</div>
                    <div className="text-[9px] text-slate-400 font-medium">{mealLabels.en}</div>
                  </td>
                  {plan.days.map((dayPlan, dayIdx) => {
                    const mealItem = dayPlan.meals.find(m => m.mealName === mealRowName);
                    const recipe = mealItem?.selectedRecipe;
                    const recipeTitle = recipe?.name || mealItem?.adaptedRecipe?.adaptedTitle || 'Özel Tarif';
                    const calories = mealItem?.calculatedNutrition?.calories || recipe?.totalNutrition?.calories || 0;
                    const imgUrl = recipe?.imageUrl || getMealFallbackImage(mealRowName, recipeTitle);

                    return (
                      <td key={dayPlan.day} className="py-1.5 px-1.5 align-top border-r border-slate-100 last:border-r-0">
                        {mealItem ? (
                          <div className="group relative bg-white hover:bg-stone-50/90 border border-slate-200/90 hover:border-amber-700/60 rounded-xl p-1.5 transition-all shadow-2xs flex flex-col justify-between gap-1 min-h-[92px]">
                            <div onClick={() => handleOpenRecipeModal(dayPlan, dayIdx, mealRowName, mealItem)} className="cursor-pointer space-y-1 w-full">
                              <div className="flex items-center gap-1.5">
                                <img src={imgUrl} alt={recipeTitle} className="w-7 h-7 rounded-lg object-cover shrink-0 border border-slate-200/80" loading="lazy" onError={e => { (e.target as HTMLImageElement).src = getMealFallbackImage(mealRowName); }} />
                                <span className="font-mono font-bold text-[10px] text-purple-700 bg-purple-50 px-1 py-0.5 rounded border border-purple-100 truncate">{calories} kcal</span>
                              </div>
                              <h4 title="Tarif içeriğini ve yapılışını görüntülemek için tıklayın" className="text-[11px] font-bold text-slate-900 line-clamp-2 leading-tight group-hover:text-amber-900 group-hover:underline transition-colors">{recipeTitle}</h4>
                            </div>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-100/80">
                              <span onClick={() => handleOpenRecipeModal(dayPlan, dayIdx, mealRowName, mealItem)} className="text-[9px] font-bold text-amber-800 hover:underline cursor-pointer flex items-center gap-0.5">
                                <BookOpen className="w-2.5 h-2.5" /><span>Tarif</span>
                              </span>
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onSwapRecipeClick(dayIdx, dayPlan.meals.findIndex(m => m.mealName === mealRowName), mealItem, dayPlan.day); }}
                                title="Tarifi Değiştir (Alternatif Seç)"
                                className="w-5 h-5 rounded-md bg-slate-100 hover:bg-amber-100 text-slate-500 hover:text-amber-900 flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                              >
                                <Shuffle className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="h-16 rounded-xl border border-dashed border-slate-200 bg-stone-50/40 flex items-center justify-center text-slate-300 text-xs">—</div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="border-t-2 border-slate-200 bg-stone-50/70">
              <td className="py-3 px-4 font-bold text-xs text-slate-600 bg-stone-100/50 border-r border-slate-200">Günlük Toplam</td>
              {plan.days.map(d => {
                const protCal = (d.totalNutrition.protein || 0) * 4;
                const carbCal = (d.totalNutrition.carbs || 0) * 4;
                const fatCal = (d.totalNutrition.fat || 0) * 9;
                const sumCal = protCal + carbCal + fatCal || d.totalCalories || 1;
                const isCompliant = Math.abs(d.calorieDiff) <= d.targetCalories * 0.05;

                return (
                  <td key={d.day} className="py-3 px-3 align-top border-r border-slate-100 last:border-r-0">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 font-mono text-xs sm:text-sm">{d.totalCalories.toLocaleString('tr-TR')} kcal</span>
                        <span className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${isCompliant ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'}`} title={isCompliant ? 'Hedefe Uygun (±%5)' : `Hedef Farkı: ${d.calorieDiff} kcal`}>
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full overflow-hidden flex bg-slate-200 shadow-2xs">
                        <div style={{ width: `${Math.round((protCal / sumCal) * 100)}%` }} className="bg-indigo-600 h-full transition-all" />
                        <div style={{ width: `${Math.round((carbCal / sumCal) * 100)}%` }} className="bg-amber-500 h-full transition-all" />
                        <div style={{ width: `${Math.round((fatCal / sumCal) * 100)}%` }} className="bg-emerald-600 h-full transition-all" />
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                        <span className="text-indigo-700 font-semibold">{d.totalNutrition.protein}g P</span>
                        <span className="text-amber-700 font-semibold">{d.totalNutrition.carbs}g KH</span>
                        <span className="text-emerald-700 font-semibold">{d.totalNutrition.fat}g Y</span>
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>

      {isGroceryModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center"><ShoppingBag className="w-5 h-5" /></div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Haftalık Alışveriş Listesi</h3>
                  <p className="text-xs text-slate-500">{plan.client?.fullName} · {groceryCategories.reduce((acc, c) => acc + c.items.length, 0)} kalem malzeme</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsGroceryModalOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {groceryCategories.map(cat => (
                <div key={cat.key} className="space-y-2">
                  <h4 className="font-bold text-slate-800 text-xs border-b border-slate-100 pb-1 flex items-center gap-1.5">
                    <span>{cat.title}</span><span className="text-slate-400 font-normal">({cat.items.length})</span>
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {cat.items.map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-slate-200/80">
                        <span className="font-medium text-slate-800">{it.name}</span>
                        <span className="font-mono text-slate-500 font-semibold bg-white px-2 py-0.5 rounded border border-slate-200">{it.amount} {it.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-3 bg-stone-50/50">
              <button type="button" onClick={handleCopyGroceryList} className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-100 border border-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-all shadow-2xs">
                <Copy className="w-4 h-4" /><span>Panoya Kopyala</span>
              </button>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-100 border border-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer transition-all shadow-2xs">
                  <Printer className="w-4 h-4" /><span>Yazdır</span>
                </button>
                <button type="button" onClick={() => setIsGroceryModalOpen(false)} className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl font-bold cursor-pointer transition-all shadow-2xs">Tamam</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedRecipeDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="relative h-48 w-full bg-slate-900">
              <img src={fullRecipe?.imageUrl || selectedRecipeDetail.recipe?.imageUrl || getMealFallbackImage(selectedRecipeDetail.meal.mealName, fullRecipe?.name || selectedRecipeDetail.recipe?.name)} alt={fullRecipe?.name || 'Tarif'} className="w-full h-full object-cover opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <button type="button" onClick={() => setSelectedRecipeDetail(null)} className="absolute top-3 right-3 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 cursor-pointer transition-colors"><X className="w-5 h-5" /></button>

              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between gap-2">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-900/90 text-amber-200 text-[11px] font-bold tracking-wide uppercase mb-1">
                    {selectedRecipeDetail.dayName} · {selectedRecipeDetail.meal.mealName}
                  </div>
                  <h3 className="text-lg font-bold text-white drop-shadow-sm line-clamp-2">
                    {fullRecipe?.name || selectedRecipeDetail.recipe?.name || selectedRecipeDetail.meal.adaptedRecipe?.adaptedTitle || 'Özel Tarif'}
                  </h3>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-base font-mono font-bold text-amber-300">
                    {selectedRecipeDetail.meal.calculatedNutrition?.calories || fullRecipe?.totalNutrition?.calories || 0} kcal
                  </div>
                  <div className="text-[10px] text-white/80 font-medium">{fullRecipe?.portionDescription || '1 Porsiyon'}</div>
                </div>
              </div>
            </div>

            <div className="bg-stone-50 border-b border-slate-200 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto text-[11px]">
              <div className="flex items-center gap-3 text-slate-600 font-medium">
                {fullRecipe?.prepTimeMinutes && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-slate-400" /><span>Hazırlık: {fullRecipe.prepTimeMinutes} dk</span></span>}
                {fullRecipe?.cookTimeMinutes && <span className="flex items-center gap-1"><Flame className="w-3.5 h-3.5 text-amber-600" /><span>Pişirme: {fullRecipe.cookTimeMinutes} dk</span></span>}
                {fullRecipe?.cookingMethod && <span className="px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700">{fullRecipe.cookingMethod}</span>}
              </div>
              {fullRecipe?.category && <span className="text-slate-500 font-semibold">{fullRecipe.category}</span>}
            </div>

            <div className="flex border-b border-slate-200 bg-white px-4 text-xs font-semibold">
              {[
                { id: 'content' as const, label: 'Hazırlanışı & İçerik', icon: BookOpen },
                { id: 'ingredients' as const, label: `Malzemeler (${resolvedIngredients.length})`, icon: Utensils },
                { id: 'notes' as const, label: 'Püf Noktaları & Notlar', icon: Info },
                { id: 'nutrition' as const, label: 'Besin Değerleri', icon: Layers }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button key={tab.id} type="button" onClick={() => setRecipeModalTab(tab.id)} className={`py-2.5 px-3 border-b-2 transition-all cursor-pointer flex items-center gap-1.5 ${recipeModalTab === tab.id ? 'border-amber-900 text-amber-950 font-bold' : 'border-transparent text-slate-500 hover:text-slate-800'}`}>
                    <Icon className="w-3.5 h-3.5" /><span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {recipeModalTab === 'content' && (
                <div className="space-y-4 animate-in fade-in">
                  {fullRecipe?.description && <div className="p-3 bg-stone-50 rounded-xl border border-slate-200 text-slate-700 leading-relaxed italic">"{fullRecipe.description}"</div>}
                  <div>
                    <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <ChefHat className="w-4 h-4 text-amber-900" /><span>Tarifin Hazırlanışı ve Adımları</span>
                    </h4>
                    {fullRecipe?.steps?.length ? (
                      <div className="space-y-2.5">
                        {fullRecipe.steps.map((step, idx) => (
                          <div key={step.stepNumber || idx} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
                            <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{step.stepNumber || idx + 1}</span>
                            <p className="text-slate-800 leading-relaxed text-xs flex-1">{step.instruction}</p>
                          </div>
                        ))}
                      </div>
                    ) : fullRecipe?.instructions ? (
                      <div className="p-4 rounded-xl bg-stone-50 border border-slate-200 text-slate-800 whitespace-pre-line leading-relaxed text-xs">{fullRecipe.instructions}</div>
                    ) : (
                      <div className="space-y-2.5">
                        {[
                          'Tarif için belirtilen tüm malzemeleri porsiyon gramajlarına göre yıkayıp hazırlayın.',
                          `${fullRecipe?.cookingMethod ? `${fullRecipe.cookingMethod} yöntemiyle` : 'Önerilen pişirme tekniğiyle'} pişirin veya servis için harmanlayın.`,
                          'Belirtilen porsiyon miktarına uygun olarak servis tabağına alıp danışanın öğününe uygun tüketin.'
                        ].map((inst, i) => (
                          <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white border border-slate-200">
                            <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-bold text-xs flex items-center justify-center shrink-0">{i + 1}</span>
                            <p className="text-slate-800 leading-relaxed">{inst}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {recipeModalTab === 'ingredients' && (
                <div className="space-y-3 animate-in fade-in">
                  <div className="p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-[11px] text-amber-950">
                    🎯 <strong>Kişiselleştirilmiş Öğün Porsiyonu:</strong> Malzeme miktarları danışanın kalori ve makro hedefine göre uyarlanmıştır.
                  </div>
                  <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-[11px]">
                    <span className="font-bold text-slate-800">Malzeme Adı</span><span className="font-bold text-slate-500">Kişiye Özel Gramaj / Ölçü</span>
                  </div>
                  <ul className="divide-y divide-slate-100">
                    {resolvedIngredients.map((ing, i) => (
                      <li key={i} className="py-2.5 flex items-center justify-between text-slate-700">
                        <div className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-700 shrink-0" />
                          <span className="font-semibold text-slate-900">{ing.name}</span>
                          {ing.isAdapted && <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold">Hedefe Uyarlı</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-slate-800 font-bold bg-stone-100 px-2.5 py-1 rounded border border-slate-200 text-xs shadow-2xs">{ing.amountDisplay}</span>
                          {ing.calories !== undefined && ing.calories > 0 && <span className="font-mono text-[10px] text-slate-400">({ing.calories} kcal)</span>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recipeModalTab === 'notes' && (
                <div className="space-y-3 animate-in fade-in text-xs">
                  {fullRecipe?.kitchenNotes && (
                    <div className="p-3.5 bg-amber-50/60 rounded-xl border border-amber-200/80">
                      <div className="font-bold text-amber-950 mb-1 flex items-center gap-1.5"><ChefHat className="w-3.5 h-3.5 text-amber-900" /><span>Mutfak ve Şef Püf Noktaları</span></div>
                      <p className="text-amber-900/90 leading-relaxed">{fullRecipe.kitchenNotes}</p>
                    </div>
                  )}
                  {fullRecipe?.storageAndServiceAdvice && (
                    <div className="p-3.5 bg-blue-50/60 rounded-xl border border-blue-200/80">
                      <div className="font-bold text-blue-950 mb-1 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-blue-900" /><span>Saklama ve Servis Tavsiyesi</span></div>
                      <p className="text-blue-900/90 leading-relaxed">{fullRecipe.storageAndServiceAdvice}</p>
                    </div>
                  )}
                  {fullRecipe?.fridgeStorageDays && (
                    <div className="p-3 rounded-xl bg-stone-50 border border-slate-200 flex items-center justify-between">
                      <span className="font-semibold text-slate-700">Buzdolabında Saklama Süresi:</span>
                      <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">{fullRecipe.fridgeStorageDays} Gün</span>
                    </div>
                  )}
                  {fullRecipe?.clinicalNote && (
                    <div className="p-3.5 bg-emerald-50/60 rounded-xl border border-emerald-200/80">
                      <div className="font-bold text-emerald-950 mb-1 flex items-center gap-1.5"><Info className="w-3.5 h-3.5 text-emerald-900" /><span>Diyetisyen Klinik Notu</span></div>
                      <p className="text-emerald-900/90 leading-relaxed">{fullRecipe.clinicalNote}</p>
                    </div>
                  )}
                  {!fullRecipe?.kitchenNotes && !fullRecipe?.storageAndServiceAdvice && !fullRecipe?.clinicalNote && (
                    <p className="text-slate-400 text-center py-6">Bu tarif için henüz özel mutfak notu eklenmemiştir.</p>
                  )}
                </div>
              )}

              {recipeModalTab === 'nutrition' && (
                <div className="space-y-4 animate-in fade-in">
                  <div className="grid grid-cols-4 gap-2 bg-stone-50 p-3 rounded-xl border border-slate-200/80 text-center font-mono">
                    {[
                      { label: 'Kalori', val: selectedRecipeDetail.meal.calculatedNutrition?.calories || fullRecipe?.totalNutrition?.calories || 0, cls: 'text-slate-900' },
                      { label: 'Protein', val: `${selectedRecipeDetail.meal.calculatedNutrition?.protein || fullRecipe?.totalNutrition?.protein || 0}g`, cls: 'text-indigo-700' },
                      { label: 'Karbonhidrat', val: `${selectedRecipeDetail.meal.calculatedNutrition?.carbs || fullRecipe?.totalNutrition?.carbs || 0}g`, cls: 'text-amber-700' },
                      { label: 'Yağ', val: `${selectedRecipeDetail.meal.calculatedNutrition?.fat || fullRecipe?.totalNutrition?.fat || 0}g`, cls: 'text-emerald-700' }
                    ].map(n => (
                      <div key={n.label}><div className="text-[10px] text-slate-400">{n.label}</div><div className={`font-bold text-sm ${n.cls}`}>{n.val}</div></div>
                    ))}
                  </div>

                  {fullRecipe?.exchanges && (
                    <div className="space-y-2">
                      <h5 className="font-bold text-slate-800 text-xs">Porsiyon Değişimleri</h5>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center font-mono text-xs">
                        {[
                          { label: 'Protein', val: `${fullRecipe.exchanges.protein || 0} P` },
                          { label: 'Karb', val: `${fullRecipe.exchanges.carb || 0} K` },
                          { label: 'Yağ', val: `${fullRecipe.exchanges.fat || 0} Y` },
                          { label: 'Sebze', val: `${fullRecipe.exchanges.vegetable || 0} Seb` },
                          { label: 'Meyve', val: `${fullRecipe.exchanges.fruit || 0} Mey` },
                          { label: 'Süt', val: `${fullRecipe.exchanges.dairy || 0} Süt` }
                        ].map(ex => (
                          <div key={ex.label} className="p-2 rounded-lg bg-stone-50 border border-slate-200">
                            <div className="text-[10px] text-slate-400">{ex.label}</div><div className="font-bold text-slate-800">{ex.val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-between gap-2 bg-stone-50/50 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const { dayIndex, mealIndex, meal, dayName } = selectedRecipeDetail;
                    setSelectedRecipeDetail(null);
                    onSwapRecipeClick(dayIndex, mealIndex, meal, dayName);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl font-bold cursor-pointer transition-all shadow-xs text-xs"
                >
                  <Shuffle className="w-3.5 h-3.5" /><span>Tarifi Değiştir</span>
                </button>
                {fullRecipe && (
                  <button type="button" onClick={() => { openDetail(fullRecipe); setSelectedRecipeDetail(null); }} className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-100 border border-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer text-xs transition-colors">
                    <ExternalLink className="w-3.5 h-3.5" /><span>Tüm Reçeteyi Aç</span>
                  </button>
                )}
              </div>
              <button type="button" onClick={() => setSelectedRecipeDetail(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold cursor-pointer text-xs transition-colors">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};