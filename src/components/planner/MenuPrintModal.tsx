import React from 'react';
import { X, Printer, Layers } from 'lucide-react';
import { WeeklyMenuPlan } from '../../types/menuPlanner';
import { ARCHETYPE_PRESETS } from '../../services/menuPlanningEngine';

interface MenuPrintModalProps {
  isOpen: boolean; plan: WeeklyMenuPlan | null; onClose: () => void;
}

export const MenuPrintModal: React.FC<MenuPrintModalProps> = ({ isOpen, plan, onClose }) => {
  if (!isOpen || !plan) return null;
  const preset = ARCHETYPE_PRESETS[plan.client.selectedArchetype] || ARCHETYPE_PRESETS.M1400;

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 animate-in zoom-in-95">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-stone-50/80 no-print">
          <div>
            <h3 className="text-base font-bold font-serif text-slate-900">Yazdırma & PDF Raporu Önizleme</h3>
            <p className="text-xs text-slate-500 mt-0.5">{plan.client.fullName} · {plan.client.selectedArchetype} ({preset.targetCalories} kcal Hedef)</p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 px-4 py-2 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer">
              <Printer className="w-4 h-4 text-amber-300" /><span>Yazdır / PDF</span>
            </button>
            <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div id="printable-weekly-menu" className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 bg-white">
          <div className="border-b-2 border-amber-900 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-bold text-amber-800 tracking-wider uppercase font-mono">Dyt. Zeynep Hale Kocaoğlu · Kişiselleştirilmiş Beslenme Planı</div>
              <h1 className="text-2xl font-bold font-serif text-slate-900 mt-1">{plan.client.fullName} İçin Beslenme Programı</h1>
              <div className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                <span>{plan.client.gender} · {plan.client.age} Yaş</span><span>·</span>
                <span>Boy: {plan.client.heightCm} cm · Kilo: {plan.client.weightKg} kg</span><span>·</span>
                <span className="font-semibold text-amber-900">Diyet: {Array.isArray(plan.client.dietCriteria) ? plan.client.dietCriteria.join(' + ') : (plan.client.dietCriteria || 'Standart')}</span><span>·</span>
                <span className="text-slate-600 font-medium">{plan.client.recipeSource?.sourceType === 'selected_booklet' ? `Kitapçık: ${plan.client.recipeSource.bookletTitle || 'Özel Kitapçık'}` : 'Kaynak: Genel Kütüphane'}</span>
              </div>
            </div>
            <div className="text-right p-3 bg-stone-50 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-400 font-mono">HEDEF GÜNLÜK ENERJİ</div>
              <div className="text-xl font-bold text-slate-900 font-mono">{plan.weeklyStats.averageDailyCalories} <span className="text-xs text-slate-500 font-sans">kcal/gün</span></div>
              <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">Arketip: {plan.client.selectedArchetype}</div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2"><Layers className="w-5 h-5 text-amber-900" /><h2 className="text-lg font-bold font-serif text-slate-900">7 Günlük Kişiselleştirilmiş Menü Planı</h2></div>
            {plan.days.map((dayPlan, idx) => (
              <div key={dayPlan.day} className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs avoid-page-break">
                <div className="px-4 py-2.5 bg-stone-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900 font-serif">{idx + 1}. Gün · {dayPlan.day}</span>
                    {dayPlan.isWorkDay ? (
                      <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[10px] font-semibold">Çalışma Günü ({dayPlan.location})</span>
                    ) : (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-semibold">İzinli / Evde</span>
                    )}
                  </div>
                  <div className="text-xs font-mono font-bold text-slate-800 flex items-center gap-2">
                    <span>Toplam: {dayPlan.totalCalories} kcal</span>
                    <span className="text-slate-400 font-sans font-normal text-[11px]">(P: {dayPlan.totalNutrition.protein}g · KH: {dayPlan.totalNutrition.carbs}g · Y: {dayPlan.totalNutrition.fat}g)</span>
                  </div>
                </div>

                <div className="divide-y divide-slate-100 p-2">
                  {dayPlan.meals.map(meal => (
                    <div key={meal.mealName} className="p-2.5 flex items-start justify-between gap-4 text-xs hover:bg-stone-50/50">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-950 min-w-[70px]">{meal.mealName}:</span>
                          <span className="font-semibold text-slate-900">{meal.selectedRecipe?.name || 'Reçete atanmadı'}</span>
                          {meal.isPortableOnly && <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">📦 Taşınabilir</span>}
                        </div>
                        {meal.note && <div className="text-[11px] text-slate-500 italic pl-[78px]">Not: {meal.note}</div>}
                      </div>
                      <div className="text-right font-mono text-[11px] text-slate-600 whitespace-nowrap">
                        <span className="font-bold text-slate-900">{meal.calculatedNutrition.calories} kcal</span>
                        <span className="text-slate-400 block text-[10px]">
                          P:{meal.calculatedExchanges?.protein || 0} KH:{meal.calculatedExchanges?.carb || 0} Y:{meal.calculatedExchanges?.fat || 0} Seb:{meal.calculatedExchanges?.vegetable || 0}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-stone-50 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 font-sans">
            <div className="font-bold text-slate-900">Diyetisyen Notu & Hatırlatmalar:</div>
            <p>• Günlük minimum 2 - 2.5 litre (30-35 ml/kg) su tüketimine özen gösteriniz.</p>
            <p>• Taşınabilir olarak işaretlenen öğünleri sabah yanınıza alacak şekilde planlayınız.</p>
            <p>• Öğün saatleri ve porsiyon gramajlarına tarif detaylarında belirtilen şekilde uyulması tavsiye edilir.</p>
          </div>
        </div>
      </div>
    </div>
  );
};