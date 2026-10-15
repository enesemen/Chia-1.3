import React, { useMemo } from 'react';
import { Printer, X, BookOpen, Clock, Sparkles, UserCheck, FileText } from 'lucide-react';
import { RecipeBooklet, Recipe } from '../../types/nutrition';
import { getUnifiedRecipeIngredients } from '../../data/turkishRecipes';
import { printElementStandalone, downloadElementAsHTML } from '../../services/pdfExportService';

interface BookletPrintViewProps {
  booklet: RecipeBooklet; recipes: Recipe[]; onClose: () => void;
}

const THEME_BG: Record<string, string> = {
  amber: 'bg-amber-900', emerald: 'bg-emerald-900', stone: 'bg-stone-900', indigo: 'bg-indigo-900', rose: 'bg-rose-900'
};

export const BookletPrintView: React.FC<BookletPrintViewProps> = ({ booklet, recipes, onClose }) => {
  const bookletRecipes = useMemo(() => {
    const idSet = new Set(booklet.recipeIds);
    return recipes.filter(r => idSet.has(r.id));
  }, [recipes, booklet.recipeIds]);
  const coverBg = THEME_BG[booklet.coverTheme || 'amber'] || THEME_BG.amber;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md overflow-y-auto flex flex-col items-center p-2 sm:p-4 print:p-0 print:bg-white print:static booklet-printable-root">
      <div className="sticky top-2 z-[101] w-full max-w-4xl bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex flex-wrap items-center justify-between gap-3 mb-4 print:hidden border border-slate-700 no-print">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <span className="font-bold text-sm block leading-tight">{booklet.title}</span>
            <span className="text-[11px] text-slate-400">Yayın & Baskı Merkezi · {bookletRecipes.length} Tarif</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" onClick={e => { e.stopPropagation(); printElementStandalone('booklet-printable-content', booklet.title); }} className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold rounded-lg text-xs shadow-md transition-all cursor-pointer">
            <Printer className="w-4 h-4" /><span>PDF / Yazdır</span>
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); downloadElementAsHTML('booklet-printable-content', booklet.title, 'El_Kitapcigi'); }} className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg text-xs border border-slate-700 transition-all cursor-pointer">
            <FileText className="w-3.5 h-3.5" /><span>HTML İndir</span>
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); onClose(); }} className="p-2 text-slate-300 hover:text-white rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 transition-colors cursor-pointer" title="Pencereyi Kapat">
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div id="booklet-printable-content" className="w-full max-w-4xl bg-white shadow-2xl rounded-2xl overflow-hidden print:shadow-none print:w-full print:max-w-none print:rounded-none">
        <div className={`p-8 sm:p-14 min-h-[600px] flex flex-col justify-between relative text-white ${coverBg} page-break-after print:min-h-screen`}>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center font-serif text-xl font-bold border border-white/20">C</div>
              <div>
                <span className="block text-xs font-bold tracking-widest uppercase text-amber-200">CHIA NutriPlan</span>
                <span className="text-[10px] text-white/70 font-mono">Klinik Beslenme & Tarif Sistemi</span>
              </div>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 backdrop-blur-md border border-white/20">Kişiye Özel Tarif Kitapçığı</span>
          </div>

          <div className="my-12 space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-white/15 text-xs font-medium backdrop-blur-md border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" /><span>Diyetisyen Onaylı Özel Seçki</span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-extrabold font-serif tracking-tight leading-tight text-white drop-shadow-xs">{booklet.title}</h1>
            {booklet.subtitle && <p className="text-lg sm:text-xl font-medium text-amber-100/90 font-sans max-w-2xl leading-relaxed">{booklet.subtitle}</p>}
            {booklet.description && <p className="text-xs sm:text-sm text-white/80 max-w-xl leading-relaxed pt-2 border-t border-white/15">{booklet.description}</p>}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-6 border-t border-white/20 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white text-slate-900 flex items-center justify-center font-bold text-sm shadow-md"><UserCheck className="w-5 h-5 text-amber-900" /></div>
              <div>
                <span className="block font-bold text-sm text-white">{booklet.authorName || 'Dyt. Zeynep Hale Kocaoğlu'}</span>
                <span className="text-[11px] text-amber-200">Uzman Diyetisyen & Beslenme Danışmanı</span>
              </div>
            </div>
            <div className="text-right text-white/70 font-mono text-[11px]">
              <div>{bookletRecipes.length} Özel Tarif</div>
              <div>Tarih: {new Date().toLocaleDateString('tr-TR')}</div>
            </div>
          </div>
        </div>

        <div className="p-8 sm:p-12 border-b border-slate-200 bg-stone-50/50 page-break-after">
          <div className="flex items-center justify-between mb-6 pb-3 border-b-2 border-slate-900">
            <div><h2 className="text-xl font-bold font-serif text-slate-900">İçindekiler & Reçete Özeti</h2><p className="text-xs text-slate-500">Bu kitapçıkta yer alan reçetelerin genel bakış tablosu</p></div>
            <span className="text-xs font-mono font-bold px-3 py-1 rounded bg-slate-200 text-slate-800">{bookletRecipes.length} Reçete</span>
          </div>

          <div className="space-y-3">
            {bookletRecipes.map((recipe, index) => (
              <div key={recipe.id} className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-slate-900 text-white font-bold text-xs flex items-center justify-center font-mono">{index + 1}</span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{recipe.name}</h3>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>{recipe.category}</span><span>·</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3 text-slate-400" />{recipe.prepTimeMinutes} dk</span>
                      <span>·</span><span className="font-semibold text-emerald-800">{recipe.dietType}</span>
                    </div>
                  </div>
                </div>
                <span className="inline-block px-2.5 py-1 rounded bg-amber-50 text-amber-950 border border-amber-200 font-mono text-xs font-bold">{recipe.exchangeSummary || 'Değişim Profili Var'}</span>
              </div>
            ))}
          </div>

          {booklet.notes && (
            <div className="mt-8 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs">
              <span className="font-bold block mb-1">Diyetisyen Notu:</span>
              <p className="leading-relaxed text-amber-900">{booklet.notes}</p>
            </div>
          )}
        </div>

        <div className="divide-y divide-slate-200">
          {bookletRecipes.map((recipe, idx) => {
            const unifiedIngs = getUnifiedRecipeIngredients(recipe);
            return (
              <div key={recipe.id} className="p-8 sm:p-12 space-y-6 bg-white page-break-after print:p-8">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-950 font-mono font-bold text-[11px]">Tarif #{idx + 1}</span>
                      <span className="text-xs font-semibold text-slate-500">{recipe.category}</span>
                    </div>
                    <h2 className="text-2xl font-bold font-serif text-slate-900">{recipe.name}</h2>
                  </div>
                  <span className="inline-block px-3 py-1 rounded-lg bg-emerald-100 text-emerald-900 font-bold text-xs border border-emerald-200">{recipe.dietType}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="sm:col-span-1 rounded-xl overflow-hidden aspect-4/3 bg-slate-100 border border-slate-200 relative shadow-2xs">
                    <img src={recipe.imageUrl || 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80'} alt={recipe.name} className="w-full h-full object-cover" />
                  </div>

                  <div className="sm:col-span-2 space-y-3 flex flex-col justify-between">
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      {[
                        { label: 'Hazırlık', val: `${recipe.prepTimeMinutes} Dk` },
                        { label: 'Porsiyon', val: `${recipe.servings || 1} Kişilik` },
                        { label: 'Pratiklik', val: recipe.practicality }
                      ].map(box => (
                        <div key={box.label} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                          <span className="text-[10px] text-slate-400 font-medium block">{box.label}</span>
                          <span className="font-bold text-slate-900">{box.val}</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-3 rounded-xl bg-amber-900 text-white text-xs flex items-center justify-between">
                      <span className="font-semibold text-amber-200">Değişim Profili:</span>
                      <span className="font-mono font-bold text-sm">{recipe.exchangeSummary || 'Serbest'}</span>
                    </div>

                    {recipe.totalNutrition && (
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[11px] font-mono bg-stone-50 p-2 rounded-xl border border-stone-200">
                        {[
                          { label: 'Kalori', val: `${recipe.totalNutrition.calories} kcal` },
                          { label: 'Prot', val: `${recipe.totalNutrition.protein}g` },
                          { label: 'Karb', val: `${recipe.totalNutrition.carbs}g` },
                          { label: 'Yağ', val: `${recipe.totalNutrition.fat}g` }
                        ].map(m => (
                          <div key={m.label}><span className="block text-[9px] text-slate-400 uppercase">{m.label}</span><span className="font-bold text-slate-900">{m.val}</span></div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 border-b pb-1.5 flex items-center justify-between">
                      <span>Malzemeler</span><span className="text-xs font-normal text-slate-500">({unifiedIngs.length} İçerik)</span>
                    </h3>
                    <ul className="space-y-1.5 text-xs text-slate-800">
                      {unifiedIngs.map((ing, i) => (
                        <li key={i} className="flex items-start justify-between p-1.5 rounded hover:bg-slate-50">
                          <span className="font-semibold text-slate-900">{ing.foodName}{ing.preparationNote && <span className="text-[10px] text-slate-500 font-normal ml-1">({ing.preparationNote})</span>}</span>
                          <span className="font-mono font-bold text-slate-700">{ing.amountDisplay || `${ing.amount} ${ing.unit}`}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 border-b pb-1.5">Hazırlanışı</h3>
                    <div className="space-y-2.5 text-xs text-slate-700">
                      {recipe.steps?.length ? recipe.steps.map(step => (
                        <div key={step.stepNumber} className="flex gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center shrink-0">{step.stepNumber}</span>
                          <p className="leading-relaxed">{step.instruction}</p>
                        </div>
                      )) : <p className="italic text-slate-400">{recipe.instructions || 'Hazırlık adımları belirtilmemiştir.'}</p>}
                    </div>
                  </div>
                </div>

                {recipe.clinicalNote && (
                  <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200/90 text-xs text-amber-950">
                    <span className="font-bold text-amber-900 block mb-0.5">Diyetisyen Klinik Tavsiyesi:</span>
                    <p className="leading-relaxed">{recipe.clinicalNote}</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 flex justify-between items-center text-[10px] text-slate-400">
                  <span>{booklet.title} · {booklet.authorName}</span><span>Sayfa #{idx + 1}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};