import React, { useState, useMemo, useDeferredValue } from 'react';
import {
  Layers, Zap, Search, Plus, Edit, Trash2, X, Save, Filter, Info, RotateCcw
} from 'lucide-react';
import { ExchangeFoodItem, INITIAL_EXCHANGE_FOODS } from '../../data/mockExchangeFoods';
import { loadStoredArray, useDebouncedStorage } from '../../context/NutritionContext';
import { trLower } from '../../services/recipePersonalizationEngine';
import { ChiaAssistantBanner, ConfirmModal } from '../common/ChiaMascot';

const LOCAL_STORAGE_KEY = 'nutriplan_exchange_foods_v1';

const GROUPS = [
  'Tümü', 'Süt & Yoğurt Grubu', 'Et, Peynir, Yumurta Grubu', 'Ekmek, Tahıl, Kurubaklagil Grubu',
  'Meyve Grubu', 'Sebze Grubu', 'Yağ Grubu', 'Yağlı Tohumlar & Kuruyemiş Grubu'
];

const EXCHANGE_STANDARDS = [
  { group: 'Et / Protein Değişimi', protein: 6, carbs: 0, fat: 5, calories: 69 },
  { group: 'Ekmek / Tahıl Değişimi', protein: 2, carbs: 15, fat: 0, calories: 68 },
  { group: 'Süt / Yoğurt Değişimi', protein: 6, carbs: 9, fat: 6, calories: 114 },
  { group: 'Yağ Değişimi', protein: 0, carbs: 0, fat: 5, calories: 45 },
  { group: 'Sebze Değişimi', protein: 2, carbs: 6, fat: 0, calories: 32 },
  { group: 'Meyve Değişimi', protein: 0, carbs: 15, fat: 0, calories: 60 }
];

export const ExchangeRulesView: React.FC = () => {
  const [showRulesInfo, setShowRulesInfo] = useState(false);
  const [exchangeFoods, setExchangeFoods] = useState<ExchangeFoodItem[]>(() => loadStoredArray(LOCAL_STORAGE_KEY, INITIAL_EXCHANGE_FOODS));
  useDebouncedStorage(LOCAL_STORAGE_KEY, exchangeFoods);

  const [searchQuery, setSearchQuery] = useState('');
  const deferredQuery = useDeferredValue(searchQuery);
  const [selectedGroup, setSelectedGroup] = useState<string>('Tümü');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExchangeFoodItem | null>(null);
  const [itemToDelete, setItemToDelete] = useState<{ id: string; name: string } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const [formData, setFormData] = useState<Omit<ExchangeFoodItem, 'id'>>({
    name: '', group: 'Et, Peynir, Yumurta Grubu', subGroup: 'Peynirler',
    portion: '1 porsiyon', amountNet: '30 g', stateNote: '30 g', equivalents: '', clinicalNote: ''
  });

  const filteredFoods = useMemo(() => {
    const query = trLower(deferredQuery).trim();
    return exchangeFoods.filter(item => {
      if (selectedGroup !== 'Tümü' && item.group !== selectedGroup) return false;
      if (!query) return true;
      return (
        trLower(item.name).includes(query) || trLower(item.group).includes(query) ||
        trLower(item.subGroup).includes(query) || trLower(item.equivalents).includes(query) || trLower(item.clinicalNote).includes(query)
      );
    });
  }, [exchangeFoods, selectedGroup, deferredQuery]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '', group: selectedGroup !== 'Tümü' ? selectedGroup : 'Et, Peynir, Yumurta Grubu',
      subGroup: 'Kırmızı Et (Yağsız)', portion: '1 porsiyon', amountNet: '30 g', stateNote: '30 g', equivalents: '', clinicalNote: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: ExchangeFoodItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name, group: item.group, subGroup: item.subGroup, portion: item.portion,
      amountNet: item.amountNet, stateNote: item.stateNote, equivalents: item.equivalents, clinicalNote: item.clinicalNote
    });
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    if (editingItem) setExchangeFoods(prev => prev.map(f => (f.id === editingItem.id ? { ...f, ...formData } : f)));
    else setExchangeFoods(prev => [{ id: `ex-custom-${Date.now()}`, ...formData }, ...prev]);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold font-serif text-slate-900 tracking-tight flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-900" /><span>Klinik Değişim Sistemi</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">Süt, et, tahıl, meyve, sebze ve yağ gruplarının ölçü, gramaj, klinik eşdeğer alternatifleri ve fonksiyon notları.</p>
        </div>

        <button
          type="button" onClick={() => setShowRulesInfo(!showRulesInfo)}
          className={`px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
            showRulesInfo ? 'bg-[#3F5338] border-[#3F5338] text-white shadow-2xs' : 'border-[#C9D8C3] bg-[#FAF8F3] text-[#2F432A] hover:bg-[#E3ECE0]'
          }`}
        >
          <Info className="w-4 h-4" /><span>Şablon Dağılım & Değişim Kuralları Bilgisi</span>
        </button>
      </div>

      <ChiaAssistantBanner
        pose="suggesting" badgeText="Chia Değişim Asistanı" title="Sana Özel Öneriler Sunuyor"
        description="Besinlerin porsiyon, gramaj, kalori ve makro değerlerini inceleyin. Hastalık ve diyet tipine göre alternatif değişim eşdeğerlerini kullanarak danışanlarınıza tam uyumlu listeler hazırlayabilirsiniz."
      />

      {showRulesInfo && (
        <div className="p-5 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-amber-950 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-800" />Şablon Dağılım & Değişim Kuralları Mimarisi</h3>
            <button type="button" onClick={() => setShowRulesInfo(false)} className="text-xs text-slate-500 hover:text-slate-900 font-semibold cursor-pointer">Kapat ✕</button>
          </div>
          <p className="text-xs text-amber-950/80 leading-relaxed">
            NutriPlan mimarisinde tarifler sabit değişimlerle kısıtlanmaz; seçilen klinik arketip ve diyet modellerine göre dinamik olarak yorumlanır. Menü motoru belirlenen protein, karbonhidrat ve yağ sınır kurallarına tam uyum sağlar.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {EXCHANGE_STANDARDS.map(item => (
              <div key={item.group} className="p-3 bg-white rounded-xl border border-amber-200/60 space-y-2">
                <div className="font-bold text-xs text-slate-900">{item.group}</div>
                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[11px] bg-slate-50 p-1.5 rounded border border-slate-100">
                  <div><span className="text-[9px] text-slate-400 block">Kcal</span><strong className="text-slate-900">{item.calories}</strong></div>
                  <div><span className="text-[9px] text-slate-400 block">P</span><strong className="text-slate-700">{item.protein}g</strong></div>
                  <div><span className="text-[9px] text-slate-400 block">K</span><strong className="text-slate-700">{item.carbs}g</strong></div>
                  <div><span className="text-[9px] text-slate-400 block">Y</span><strong className="text-slate-700">{item.fat}g</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-5">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Yiyecek adı, grup, klinik alternatif veya fonksiyon ara..." className="w-full pl-9 pr-8 py-2 bg-stone-50/70 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-800" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"><X className="w-4 h-4" /></button>}
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <select value={selectedGroup} onChange={e => setSelectedGroup(e.target.value)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-800 cursor-pointer">
                {GROUPS.map(grp => <option key={grp} value={grp}>{grp === 'Tümü' ? `Tüm Değişim Grupları (${exchangeFoods.length})` : grp}</option>)}
              </select>
            </div>
            <span className="text-slate-500 font-mono px-1 hidden sm:inline"><strong>{filteredFoods.length}</strong> kayıt</span>
            <button onClick={handleOpenAddModal} className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer whitespace-nowrap">
              <Plus className="w-4 h-4" /><span>Yeni Ekle</span>
            </button>
            <button onClick={() => setShowResetConfirm(true)} title="Listeyi Varsayılana Sıfırla" className="p-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-medium transition-colors cursor-pointer">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3.5">Yiyecek Adı</th>
                  <th className="py-3 px-3">Grup & Alt Grup</th>
                  <th className="py-3 px-3">Ortalama Ölçü (1 Değişim)</th>
                  <th className="py-3 px-3">Miktar / Net (g)</th>
                  <th className="py-3 px-3">Çiğ/Pişmiş veya Brüt/Net</th>
                  <th className="py-3 px-3 min-w-[180px]">Klinik Eşdeğer Alternatifler</th>
                  <th className="py-3 px-3 min-w-[200px]">Klinik Not & Fonksiyon</th>
                  <th className="py-3 px-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {filteredFoods.length === 0 ? (
                  <tr><td colSpan={8} className="py-12 text-center text-slate-400">Arama veya filtre kriterlerinize uygun değişim besini bulunamadı.</td></tr>
                ) : (
                  filteredFoods.map(item => (
                    <tr key={item.id} className="hover:bg-amber-50/40 transition-colors group">
                      <td className="py-2.5 px-3.5 font-bold text-slate-900">{item.name}</td>
                      <td className="py-2.5 px-3"><div className="font-semibold text-slate-900">{item.group}</div><div className="text-[10px] text-slate-500 font-normal">{item.subGroup}</div></td>
                      <td className="py-2.5 px-3 font-semibold text-amber-950 bg-amber-50/30">{item.portion}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{item.amountNet}</td>
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px]">{item.stateNote}</td>
                      <td className="py-2.5 px-3 text-slate-700 leading-snug">{item.equivalents || '-'}</td>
                      <td className="py-2.5 px-3 text-slate-600 italic leading-snug">{item.clinicalNote || '-'}</td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleOpenEditModal(item)} className="px-2 py-1 text-slate-600 hover:text-amber-900 hover:bg-amber-100/60 rounded font-semibold transition-colors cursor-pointer flex items-center gap-1">
                            <Edit className="w-3.5 h-3.5" /><span>Düzenle</span>
                          </button>
                          <button onClick={() => setItemToDelete({ id: item.id, name: item.name })} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer" title="Sil">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">{editingItem ? 'Değişim Besinini Düzenle' : 'Yeni Değişim Besini Ekle'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 p-1 rounded-lg"><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleSaveItem} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-900 mb-1">Yiyecek Adı *</label>
                  <input type="text" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="Örn: Ev Yoğurdu" className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-900 mb-1">Grup</label>
                  <select value={formData.group} onChange={e => setFormData({ ...formData, group: e.target.value })} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900">
                    {GROUPS.filter(g => g !== 'Tümü').map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                {[
                  { key: 'subGroup' as const, label: 'Alt Grup', ph: 'Örn: Süt & Yoğurt' },
                  { key: 'portion' as const, label: 'Ortalama Ölçü (1 Değişim)', ph: 'Örn: 1 su bardağı' },
                  { key: 'amountNet' as const, label: 'Miktar / Net (g)', ph: 'Örn: 200 g' }
                ].map(f => (
                  <div key={f.key}>
                    <label className="block font-semibold text-slate-900 mb-1">{f.label}</label>
                    <input type="text" value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} placeholder={f.ph} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900" />
                  </div>
                ))}
                {[
                  { key: 'stateNote' as const, label: 'Çiğ/Pişmiş veya Brüt/Net Durumu', ph: 'Örn: 30g Çiğ / 20g Pişmiş' },
                  { key: 'equivalents' as const, label: 'Klinik Eşdeğer Alternatifler', ph: 'Örn: 200g Ev Yoğurdu, 200g Kefir' }
                ].map(f => (
                  <div key={f.key} className="sm:col-span-2">
                    <label className="block font-semibold text-slate-900 mb-1">{f.label}</label>
                    <input type="text" value={formData[f.key]} onChange={e => setFormData({ ...formData, [f.key]: e.target.value })} placeholder={f.ph} className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900" />
                  </div>
                ))}
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-900 mb-1">Klinik Not & Fonksiyon</label>
                  <textarea rows={2} value={formData.clinicalNote} onChange={e => setFormData({ ...formData, clinicalNote: e.target.value })} placeholder="Örn: Doğal kalsiyum ve fosfor kaynağı." className="w-full px-3 py-1.5 rounded-lg border border-slate-300 font-medium text-slate-900" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-100 rounded-lg font-semibold cursor-pointer">İptal</button>
                <button type="submit" className="px-4 py-2 bg-amber-900 hover:bg-amber-800 text-white rounded-lg font-semibold cursor-pointer flex items-center gap-1.5">
                  <Save className="w-4 h-4" /><span>{editingItem ? 'Güncelle' : 'Kaydet'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={Boolean(itemToDelete)}
        title="Değişim Besinini Sil"
        message={`"${itemToDelete?.name || ''}" isimli değişim besinini listeden silmek istediğinize emin misiniz?`}
        confirmText="Evet, Sil"
        type="danger"
        onCancel={() => setItemToDelete(null)}
        onConfirm={() => { if (itemToDelete) setExchangeFoods(prev => prev.filter(f => f.id !== itemToDelete.id)); setItemToDelete(null); }}
      />

      <ConfirmModal
        isOpen={showResetConfirm}
        title="Varsayılan Listeye Sıfırla"
        message="Tüm değişim besinleri orijinal 159 besinlik klinik referans listesine sıfırlansın mı?"
        confirmText="Sıfırla"
        type="warning"
        onCancel={() => setShowResetConfirm(false)}
        onConfirm={() => { setExchangeFoods(INITIAL_EXCHANGE_FOODS); localStorage.removeItem(LOCAL_STORAGE_KEY); setShowResetConfirm(false); }}
      />
    </div>
  );
};