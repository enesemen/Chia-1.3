import React, { useState } from 'react';
import {
  Search, Plus, Clock, Trash2, ChevronRight, AlertTriangle, X, BookOpen, FolderPlus, Check, CheckSquare, Square
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';
import { Recipe } from '../../types/nutrition';
import { BookletsModal } from '../booklets/BookletsModal';
import { ChiaAssistantBanner } from '../common/ChiaMascot';

const DIET_TYPE_FILTER_OPTIONS = [
  { value: 'Tümü', label: 'Tümü' },
  { value: 'STD', label: 'Standart (STD)' },
  { value: 'GF', label: 'Glutensiz (GF)' },
  { value: 'LF', label: 'Laktozsuz (LF)' },
  { value: 'GF + LF', label: 'Glutensiz + Laktozsuz' },
  { value: 'Ketojenik', label: 'Ketojenik' },
  { value: 'Eliminasyon', label: 'Eliminasyon (4\'lü)' },
  { value: 'Düşük FODMAP', label: 'Düşük FODMAP' },
  { value: 'Vejetaryen', label: 'Vejetaryen' }
];

const MEAL_OPTIONS = ['Tümü', 'Kahvaltı', 'Öğle', 'Ara Öğün', 'Akşam'];
const PRACTICALITY_OPTIONS = ['Tümü', 'Kolay', 'Orta', 'Zor', 'İleri'];
const TRANSPORT_OPTIONS = ['Tümü', 'Taşımaya Uygun', 'Taşınmaz'];

const DEFAULT_FILTERS = {
  search: '', dietType: 'Tümü', mealType: 'Tümü', practicality: 'Tümü',
  transportability: 'Tümü', category: 'Tümü', season: 'Tümü', status: 'Tümü' as const
};

export const RecipeList: React.FC = () => {
  const { filteredRecipes, filters, setFilters, openWizard, openDetail, deleteRecipe, booklets, addRecipesToBooklet } = useNutrition();

  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [isBookletsModalOpen, setIsBookletsModalOpen] = useState(false);
  const [targetBookletId, setTargetBookletId] = useState('');

  const toggleSelectRecipe = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedRecipeIds(prev => prev.includes(id) ? prev.filter(rId => rId !== id) : [...prev, id]);
  };

  const handleSelectAll = () => {
    setSelectedRecipeIds(selectedRecipeIds.length === filteredRecipes.length ? [] : filteredRecipes.map(r => r.id));
  };

  const handleAddToExistingBooklet = (bId: string) => {
    if (!bId || selectedRecipeIds.length === 0) return;
    addRecipesToBooklet(bId, selectedRecipeIds);
    const bObj = booklets.find(b => b.id === bId);
    alert(`${selectedRecipeIds.length} tarif "${bObj?.title}" kitapçığına eklendi!`);
    setSelectedRecipeIds([]);
    setTargetBookletId('');
  };

  const hasActiveFilters =
    Boolean(filters.search) || filters.dietType !== 'Tümü' || filters.mealType !== 'Tümü' ||
    filters.practicality !== 'Tümü' || filters.transportability !== 'Tümü';

  return (
    <div className="space-y-6 relative pb-24 h-full overflow-y-auto pr-2">
      <ChiaAssistantBanner
        pose="suggesting" badgeText="Chia Tarif Asistanı" title="Diyetisyen Reçeteleri ve Kitapçık Yönetimi"
        description="Tarif kütüphanesindeki zengin reçeteleri inceleyin, yeni şablon ve kitapçıklar oluşturun veya besin değerlerini detaylandırın."
        actionButton={
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setIsBookletsModalOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer whitespace-nowrap">
              <BookOpen className="w-4 h-4 text-amber-400" /><span>Kitapçıklar ({booklets.length})</span>
            </button>
            <button type="button" onClick={() => openWizard()} className="flex items-center gap-1.5 px-4 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors whitespace-nowrap cursor-pointer">
              <Plus className="w-4 h-4" /><span>+ Yeni Reçete Oluştur</span>
            </button>
          </div>
        }
      />

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col lg:flex-row items-stretch lg:items-center gap-2.5 text-xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input type="text" value={filters.search} onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))} placeholder="Tarif, aile veya içerik ara (Örn: Somon, Etli Pilav, Eliminasyon, omega3)..." className="w-full pl-10 pr-4 py-2 text-xs rounded-lg border border-slate-200 bg-stone-50/60 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800 transition-all font-medium" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          <select value={filters.dietType} onChange={e => setFilters(prev => ({ ...prev, dietType: e.target.value }))} className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-800 text-xs cursor-pointer">
            {DIET_TYPE_FILTER_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.value === 'Tümü' ? 'Diyet: Tümü' : opt.label}</option>)}
          </select>
          <select value={filters.mealType} onChange={e => setFilters(prev => ({ ...prev, mealType: e.target.value }))} className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-800 text-xs cursor-pointer">
            {MEAL_OPTIONS.map(opt => <option key={opt} value={opt}>{opt === 'Tümü' ? 'Öğün: Tümü' : opt}</option>)}
          </select>
          <select value={filters.practicality} onChange={e => setFilters(prev => ({ ...prev, practicality: e.target.value }))} className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-800 text-xs cursor-pointer">
            {PRACTICALITY_OPTIONS.map(opt => <option key={opt} value={opt}>{opt === 'Tümü' ? 'Pratiklik: Tümü' : opt}</option>)}
          </select>
          <select value={filters.transportability} onChange={e => setFilters(prev => ({ ...prev, transportability: e.target.value }))} className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-800 text-xs cursor-pointer">
            {TRANSPORT_OPTIONS.map(opt => <option key={opt} value={opt}>{opt === 'Tümü' ? 'Taşıma: Tümü' : opt}</option>)}
          </select>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div><h2 className="text-base font-bold text-slate-900">Aktif Reçeteler</h2><p className="text-xs text-slate-500">Toplam {filteredRecipes.length} reçete listeleniyor</p></div>
          <button type="button" onClick={handleSelectAll} className="flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer">
            {selectedRecipeIds.length === filteredRecipes.length && filteredRecipes.length > 0 ? <CheckSquare className="w-3.5 h-3.5 text-amber-900" /> : <Square className="w-3.5 h-3.5 text-slate-400" />}
            <span>Tümünü Seç ({selectedRecipeIds.length})</span>
          </button>
        </div>
        {hasActiveFilters && <button onClick={() => setFilters(DEFAULT_FILTERS)} className="text-xs text-amber-900 hover:underline font-semibold cursor-pointer">Filtreleri Temizle</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRecipes.map(recipe => {
          const isSelected = selectedRecipeIds.includes(recipe.id);
          return (
            <div
              key={recipe.id} onClick={() => openDetail(recipe)}
              className={`bg-white rounded-2xl border transition-all duration-300 flex flex-col justify-between cursor-pointer group overflow-hidden relative ${
                isSelected ? 'border-amber-900 ring-2 ring-amber-800/20 shadow-md' : 'border-slate-200/90 hover:border-amber-900/60 hover:shadow-lg'
              }`}
            >
              <div
                onClick={e => toggleSelectRecipe(e, recipe.id)}
                className={`absolute top-2.5 right-2.5 z-20 w-7 h-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-md ${
                  isSelected ? 'bg-amber-900 text-white font-bold scale-105' : 'bg-white/85 text-slate-600 hover:bg-white hover:text-amber-900 backdrop-blur-xs'
                }`}
                title="Kitapçık Seçimi"
              >
                {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : <Square className="w-4 h-4 text-slate-400" />}
              </div>

              <div className="relative aspect-16/10 sm:aspect-16/9 w-full overflow-hidden bg-slate-100 shrink-0">
                <img
                  src={recipe.imageUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'}
                  alt={recipe.name} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-black/50 pointer-events-none" />
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 flex-wrap max-w-[65%]">
                  <span className="bg-zinc-900/90 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded uppercase shadow-2xs">{recipe.category}</span>
                  {(recipe.mealTypes || [recipe.mealType]).map(m => (
                    <span key={m} className="bg-emerald-950/85 backdrop-blur-xs text-emerald-200 text-[10px] font-semibold px-2 py-0.5 rounded shadow-2xs">{m}</span>
                  ))}
                </div>
                <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between text-white text-[11px]">
                  <span className="bg-black/60 backdrop-blur-xs px-2 py-0.5 rounded flex items-center gap-1 font-mono"><Clock className="w-3.5 h-3.5 text-amber-300" /><span>{recipe.prepTimeMinutes} dk</span></span>
                  <span className="bg-emerald-700/90 backdrop-blur-xs text-white px-2 py-0.5 rounded font-semibold text-[10px]">{recipe.practicality}</span>
                </div>
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 font-mono text-[10px] bg-stone-50 font-medium">{recipe.family}</span>
                    <span className="px-2 py-0.5 rounded border border-slate-200 text-slate-600 text-[10px] bg-slate-50">{recipe.transportability}</span>
                    <span className="text-[10px] text-slate-400 font-mono ml-auto">{recipe.planCount} kez planlandı</span>
                  </div>
                  <h3 className="text-base font-bold font-serif text-slate-900 mt-2 group-hover:text-amber-950 transition-colors leading-snug">{recipe.name}</h3>
                  <div className="mt-2.5 p-2.5 bg-stone-50 rounded-xl border border-stone-200/80 text-xs">
                    <div className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">Temel Değişim Profili:</div>
                    <div className="font-bold font-mono text-slate-900 mt-0.5 tabular-nums">{recipe.exchangeSummary}</div>
                  </div>
                  <div className="mt-2 text-xs flex items-center justify-between text-slate-600">
                    <span className="text-[11px] text-slate-500">Enerji Değeri:</span>
                    <span className="font-mono font-bold text-slate-800 text-[11px]">{recipe.totalNutrition?.calories ? `${recipe.totalNutrition.calories} kcal` : '1 Porsiyon Reçete'}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
                  <button type="button" onClick={e => { e.stopPropagation(); setRecipeToDelete(recipe); }} className="flex items-center gap-1.5 text-xs font-semibold text-rose-600 hover:text-rose-800 transition-colors cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /><span>Sil</span>
                  </button>
                  <button type="button" onClick={() => openDetail(recipe)} className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer">
                    <span>Reçeteyi İncele</span><ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredRecipes.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300 p-8">
          <h3 className="text-base font-semibold text-slate-900">Aradığınız kriterlere uygun reçete bulunamadı</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">Filtreleri sıfırlayarak tüm aktif reçeteleri görüntüleyebilirsiniz.</p>
          <button onClick={() => setFilters(DEFAULT_FILTERS)} className="px-4 py-2 bg-amber-900 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer">Filtreleri Sıfırla</button>
        </div>
      )}

      {recipeToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden text-slate-900 animate-in zoom-in-95 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto"><AlertTriangle className="w-6 h-6 text-rose-600" /></div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Silmek İstediğinize Emin Misiniz?</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed"><span className="font-semibold text-slate-800">"{recipeToDelete.name}"</span> reçetesi ve ilgili tüm klinik detaylar kalıcı olarak silinecektir. Bu işlem geri alınamaz.</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button type="button" onClick={() => setRecipeToDelete(null)} className="px-4 py-2 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-colors cursor-pointer flex-1">Vazgeç</button>
              <button type="button" onClick={() => { deleteRecipe(recipeToDelete.id); setRecipeToDelete(null); }} className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer flex-1 shadow-2xs">Evet, Kalıcı Olarak Sil</button>
            </div>
          </div>
        </div>
      )}

      {selectedRecipeIds.length > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-2xl bg-slate-900 text-white p-3 sm:p-4 rounded-2xl shadow-2xl border border-slate-700 flex flex-col sm:flex-row items-center justify-between gap-3 animate-in slide-in-from-bottom-5">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-amber-500 text-amber-950 font-bold text-xs flex items-center justify-center font-mono">{selectedRecipeIds.length}</span>
            <div><span className="text-xs font-bold block">{selectedRecipeIds.length} Tarif Seçildi</span><span className="text-[10px] text-slate-400">Gruplayıp El Kitapçığına Dönüştürün</span></div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {booklets.length > 0 && (
              <select
                value={targetBookletId}
                onChange={e => { setTargetBookletId(e.target.value); if (e.target.value) handleAddToExistingBooklet(e.target.value); }}
                className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-xs text-white rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                <option value="">Var Olan Kitapçığa Ekle...</option>
                {booklets.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}
              </select>
            )}
            <button type="button" onClick={() => setIsBookletsModalOpen(true)} className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5">
              <FolderPlus className="w-4 h-4" /><span>Yeni Kitapçık Oluştur</span>
            </button>
            <button type="button" onClick={() => setSelectedRecipeIds([])} className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer" title="Seçimi Temizle"><X className="w-4 h-4" /></button>
          </div>
        </div>
      )}

      <BookletsModal isOpen={isBookletsModalOpen} onClose={() => setIsBookletsModalOpen(false)} preSelectedRecipeIds={selectedRecipeIds} />
    </div>
  );
};