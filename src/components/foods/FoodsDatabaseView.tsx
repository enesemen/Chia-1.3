import React, { useState, useMemo } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';
import { FoodCategory, FoodItem, FoodSource } from '../../types/nutrition';
import { ChiaAssistantBanner } from '../common/ChiaMascot';

const FOOD_CATEGORIES: (FoodCategory | 'Tümü')[] = [
  'Tümü', 'Tahıllar & Ekmek', 'Et, Tavuk & Balık', 'Süt & Süt Ürünleri',
  'Yağlar & Yağlı Tohumlar', 'Baklagiller', 'Sebzeler', 'Meyveler', 'Baharat & Diğer'
];

const INITIAL_FOOD_FORM = {
  name: '', source: 'TürKomp' as FoodSource, foodCode: '', latinName: '', notes: '',
  category: 'Tahıllar & Ekmek' as FoodCategory, defaultUnit: 'g', calories: 100, protein: 0, carbs: 0, fat: 0, fiber: 0
};

const DEFAULT_UNIT_WEIGHTS: Record<string, number> = {
  g: 1, gr: 1, gram: 1, ml: 1, 'çay kaşığı': 3, 'tatlı kaşığı': 5, 'yemek kaşığı': 15,
  dilim: 30, adet: 50, porsiyon: 100, kase: 150, 'su bardağı': 200
};

export const FoodsDatabaseView: React.FC = () => {
  const { foods, addCustomFood } = useNutrition();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FoodCategory | 'Tümü'>('Tümü');
  const [sourceFilter, setSourceFilter] = useState<'Tümü' | 'TürKomp' | 'USDA'>('Tümü');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newFoodForm, setNewFoodForm] = useState(INITIAL_FOOD_FORM);

  const { turkompCount, usdaCount } = useMemo(() => {
    const tk = foods.filter(f => f.source === 'TürKomp' || !f.source).length;
    return { turkompCount: tk, usdaCount: foods.length - tk };
  }, [foods]);

  const filteredFoods = useMemo(() => {
    const q = search.trim().toLowerCase();
    return foods.filter(food => {
      if (sourceFilter === 'TürKomp' && food.source !== 'TürKomp' && food.source) return false;
      if (sourceFilter === 'USDA' && food.source !== 'USDA') return false;
      if (selectedCategory !== 'Tümü' && food.category !== selectedCategory) return false;
      if (!q) return true;
      return (
        food.name.toLowerCase().includes(q) || food.category.toLowerCase().includes(q) ||
        food.foodCode?.toLowerCase().includes(q) || food.latinName?.toLowerCase().includes(q)
      );
    });
  }, [foods, search, sourceFilter, selectedCategory]);

  const handleSaveCustomFood = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFoodForm.name.trim()) return;
    const unitKey = newFoodForm.defaultUnit.trim() || 'g';
    const unitGrams = DEFAULT_UNIT_WEIGHTS[unitKey.toLowerCase()] ?? 10;

    const newFood: FoodItem = {
      id: `custom_food_${Date.now()}`,
      name: newFoodForm.name.trim(),
      source: newFoodForm.source,
      foodCode: newFoodForm.foodCode.trim() || (newFoodForm.source === 'TürKomp' ? `TK-${Date.now().toString().slice(-4)}` : `USDA-${Date.now().toString().slice(-6)}`),
      latinName: newFoodForm.latinName.trim() || undefined,
      notes: newFoodForm.notes.trim() || undefined,
      category: newFoodForm.category,
      defaultUnit: unitKey,
      availableUnits: Array.from(new Set([unitKey, 'g'])),
      unitWeightGrams: { g: 1, [unitKey]: unitGrams },
      per100g: {
        calories: Number(newFoodForm.calories) || 0,
        protein: Number(newFoodForm.protein) || 0,
        carbs: Number(newFoodForm.carbs) || 0,
        fat: Number(newFoodForm.fat) || 0,
        fiber: Number(newFoodForm.fiber) || 0
      }
    };

    addCustomFood(newFood);
    setIsAddModalOpen(false);
    setNewFoodForm(INITIAL_FOOD_FORM);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight flex items-center gap-2.5">Besin Havuzu</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">TürKomp + USDA</span>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-3xl leading-relaxed">
            Türkiye'de üretilen ve tüketilen gıdalar için <strong className="text-slate-900">TürKomp (Ulusal Gıda Kompozisyon Veri Tabanı)</strong>;
            yerel kütüphanede bulunmayan fonksiyonel ve egzotik besinler için <strong className="text-slate-900">USDA FoodData Central</strong> doğrulanmış 100g laboratuvar değerleri.
          </p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors self-start whitespace-nowrap">
          <Plus className="w-4 h-4" />Yeni Besin Ekle
        </button>
      </div>

      <ChiaAssistantBanner
        pose="habits" badgeText="Chia Besin Havuzu Asistanı" title="Sağlıklı Alışkanlıklar Kazandırıyor"
        description="TürKomp ve USDA laboratuvar verileriyle doğrulanmış 100g besin değerleri. Kendi özel klinik besinlerinizi ekleyebilir, makro ve mikro besin içeriklerini detaylı sorgulayabilirsiniz."
      />

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Besin adı, TürKomp kodu (TK-...), USDA veya botanik ara..." className="w-full pl-10 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-stone-50/70 text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-700 font-medium" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap sm:flex-nowrap">
          <select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value as any)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer">
            {FOOD_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat === 'Tümü' ? 'Tüm Kategoriler' : cat}</option>)}
          </select>
          <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value as any)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-700 cursor-pointer">
            <option value="Tümü">Tüm Kaynaklar ({foods.length})</option>
            <option value="TürKomp">🇹🇷 TürKomp ({turkompCount})</option>
            <option value="USDA">🌐 USDA ({usdaCount})</option>
          </select>
          <span className="text-slate-500 font-mono whitespace-nowrap px-1"><strong>{filteredFoods.length}</strong> kayıt</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Besin & Kaynak Kodu</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-3">Ölçü / Porsiyon</th>
                <th className="py-3 px-3 text-right">Kalori (100g)</th>
                <th className="py-3 px-3 text-right">Protein</th>
                <th className="py-3 px-3 text-right">Karbonhidrat</th>
                <th className="py-3 px-3 text-right">Yağ</th>
                <th className="py-3 px-3 text-right">Lif</th>
                <th className="py-3 px-4 text-left">Diyetisyen Değişimi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredFoods.map(food => {
                const isTurkomp = food.source === 'TürKomp' || !food.source;
                const ex = food.exchangeContributionPer100g;
                return (
                  <tr key={food.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-start gap-2">
                        <span className={`mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded uppercase font-mono tracking-tight shrink-0 ${isTurkomp ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' : 'bg-blue-100 text-blue-900 border border-blue-300'}`} title={isTurkomp ? 'TürKomp Ulusal Gıda Kompozisyon Veri Tabanı' : 'USDA FoodData Central Referansı'}>
                          {isTurkomp ? 'TürKomp' : 'USDA'}
                        </span>
                        <div>
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <span>{food.name}</span>
                            {food.foodCode && <span className="font-mono text-[10px] text-slate-600 bg-slate-100 px-1 rounded">{food.foodCode}</span>}
                          </div>
                          {food.latinName && <div className="text-[10px] italic text-slate-500 font-serif">{food.latinName}</div>}
                          {food.notes && <div className="text-[11px] text-slate-500 line-clamp-1 max-w-sm mt-0.5">{food.notes}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600 text-[11px] whitespace-nowrap">{food.category}</td>
                    <td className="py-3 px-3 text-slate-700 text-[11px]">
                      <span className="font-medium">{food.defaultUnit}</span>
                      {food.unitWeightGrams[food.defaultUnit] && food.defaultUnit !== 'g' && <span className="text-slate-400 ml-1 font-mono">(~{food.unitWeightGrams[food.defaultUnit]}g)</span>}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 tabular-nums">{food.per100g.calories} kcal</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">{food.per100g.protein}g</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">{food.per100g.carbs}g</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-700 tabular-nums">{food.per100g.fat}g</td>
                    <td className="py-3 px-3 text-right font-mono text-slate-500 tabular-nums">{food.per100g.fiber}g</td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                      {ex ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {ex.protein ? <span className="bg-red-50 text-red-800 px-1.5 py-0.5 rounded border border-red-200">{ex.protein} P</span> : null}
                          {ex.carb ? <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">{ex.carb} K</span> : null}
                          {ex.fat ? <span className="bg-yellow-50 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200">{ex.fat} Y</span> : null}
                          {ex.vegetable ? <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded border border-emerald-200">{ex.vegetable} Seb</span> : null}
                          {ex.fruit ? <span className="bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded border border-purple-200">{ex.fruit} Mey</span> : null}
                          {ex.dairy ? <span className="bg-cyan-50 text-cyan-800 px-1.5 py-0.5 rounded border border-cyan-200">{ex.dairy} Süt</span> : null}
                        </div>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div><h3 className="text-base font-bold text-slate-900">Yeni Besin Ekle</h3><p className="text-[11px] text-slate-500">TürKomp veya USDA referanslı besin ekleme formu</p></div>
              <button onClick={() => setIsAddModalOpen(false)} className="w-7 h-7 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 flex items-center justify-center text-xs font-bold">✕</button>
            </div>

            <form onSubmit={handleSaveCustomFood} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-slate-800 font-semibold mb-1.5">Veri Tabanı Kaynağı</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setNewFoodForm(p => ({ ...p, source: 'TürKomp' }))} className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${newFoodForm.source === 'TürKomp' ? 'border-emerald-700 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                    <div><span className="font-bold block text-xs">🇹🇷 TürKomp</span><span className="text-[10px] text-slate-500">Ulusal Kompozisyon</span></div>
                    {newFoodForm.source === 'TürKomp' && <Check className="w-4 h-4 text-emerald-700" />}
                  </button>
                  <button type="button" onClick={() => setNewFoodForm(p => ({ ...p, source: 'USDA' }))} className={`p-2.5 rounded-xl border text-left transition-all flex items-center justify-between ${newFoodForm.source === 'USDA' ? 'border-blue-700 bg-blue-50 text-blue-950 ring-1 ring-blue-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>
                    <div><span className="font-bold block text-xs">🌐 USDA</span><span className="text-[10px] text-slate-500">FoodData Central</span></div>
                    {newFoodForm.source === 'USDA' && <Check className="w-4 h-4 text-blue-700" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-slate-800 font-semibold mb-1">Besin Adı *</label>
                  <input type="text" required value={newFoodForm.name} onChange={e => setNewFoodForm(p => ({ ...p, name: e.target.value }))} placeholder="Örn: Siyez Unu veya Karabuğday Patlağı" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-emerald-700 outline-none" />
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">Gıda Kodu</label>
                  <input type="text" value={newFoodForm.foodCode} onChange={e => setNewFoodForm(p => ({ ...p, foodCode: e.target.value }))} placeholder={newFoodForm.source === 'TürKomp' ? 'Örn: TK-01.045' : 'Örn: USDA-172440'} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs font-mono focus:ring-2 focus:ring-emerald-700 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">Kategori</label>
                  <select value={newFoodForm.category} onChange={e => setNewFoodForm(p => ({ ...p, category: e.target.value as FoodCategory }))} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-emerald-700 outline-none">
                    {FOOD_CATEGORIES.filter(c => c !== 'Tümü').map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-800 font-semibold mb-1">Varsayılan Birim</label>
                  <input type="text" value={newFoodForm.defaultUnit} onChange={e => setNewFoodForm(p => ({ ...p, defaultUnit: e.target.value }))} placeholder="Örn: yemek kaşığı, dilim, adet" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-900 text-xs focus:ring-2 focus:ring-emerald-700 outline-none" />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100">
                <span className="block text-[11px] font-bold text-slate-700 uppercase tracking-wide mb-2">100 Gram İçin Analiz Değerleri</span>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'calories' as const, label: 'Kalori', step: '1' },
                    { key: 'protein' as const, label: 'Protein', step: '0.1' },
                    { key: 'carbs' as const, label: 'Karb', step: '0.1' },
                    { key: 'fat' as const, label: 'Yağ', step: '0.1' },
                    { key: 'fiber' as const, label: 'Lif', step: '0.1' }
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-slate-500 mb-0.5">{field.label}</label>
                      <input type="number" step={field.step} value={newFoodForm[field.key]} onChange={e => setNewFoodForm(p => ({ ...p, [field.key]: Number(e.target.value) }))} className="w-full px-2 py-1.5 border border-slate-300 rounded-md text-xs font-mono" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium">Vazgeç</button>
                <button type="submit" className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg font-semibold shadow-xs">Besini Kaydet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};