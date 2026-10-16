import React, { useState, useMemo } from 'react';
import {
  X, Plus, BookOpen, Printer, Trash2, Edit2, FolderPlus, Check, ArrowLeft
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';
import { RecipeBooklet } from '../../types/nutrition';
import { BookletPrintView } from './BookletPrintView';
import { ConfirmModal } from '../common/ChiaMascot';

interface BookletsModalProps {
  isOpen: boolean; onClose: () => void; preSelectedRecipeIds?: string[];
}

const COVER_THEMES = [
  { id: 'amber', label: 'Kehribar (Amber)', class: 'bg-amber-900 text-white' },
  { id: 'emerald', label: 'Zümrüt Yeşili', class: 'bg-emerald-900 text-white' },
  { id: 'stone', label: 'Koyu Taş / Antrasit', class: 'bg-stone-900 text-white' },
  { id: 'indigo', label: 'Gece Mavisi', class: 'bg-indigo-900 text-white' },
  { id: 'rose', label: 'Gül / Mürdüm', class: 'bg-rose-900 text-white' }
] as const;

const createBookletForm = (b?: Partial<RecipeBooklet>, fallbackIds: string[] = []) => ({
  title: b?.title ?? (fallbackIds.length > 0 ? 'Glutensiz Tatlı Alternatifler - Diyetisyen Hale' : ''),
  subtitle: b?.subtitle ?? 'Hassas Sindirim & Özel Tarif Seçkisi',
  authorName: b?.authorName ?? 'Dyt. Zeynep Hale Kocaoğlu',
  description: b?.description ?? 'Diyetisyen tarafından özenle kurgulanmış porsiyonlu tarif kitapçığı.',
  coverTheme: (b?.coverTheme ?? 'amber') as 'amber' | 'emerald' | 'stone' | 'indigo' | 'rose',
  selectedRecipeIds: b?.recipeIds ?? fallbackIds,
  notes: b?.notes ?? ''
});

export const BookletsModal: React.FC<BookletsModalProps> = ({ isOpen, onClose, preSelectedRecipeIds = [] }) => {
  const { booklets, recipes, saveBooklet, deleteBooklet } = useNutrition();

  const [activePrintBooklet, setActivePrintBooklet] = useState<RecipeBooklet | null>(null);
  const [bookletToDelete, setBookletToDelete] = useState<RecipeBooklet | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(preSelectedRecipeIds.length > 0);
  const [editingBookletId, setEditingBookletId] = useState<string | null>(null);
  const [formData, setFormData] = useState(() => createBookletForm(undefined, preSelectedRecipeIds));
  const selectedSet = useMemo(() => new Set(formData.selectedRecipeIds), [formData.selectedRecipeIds]);

  if (!isOpen) return null;

  const handleOpenCreateForm = () => {
    setFormData(createBookletForm({ title: 'Glutensiz Tatlı Alternatifler - Diyetisyen Hale' }, preSelectedRecipeIds));
    setEditingBookletId(null);
    setIsCreatingNew(true);
  };

  const handleToggleRecipeInForm = (recipeId: string) => {
    setFormData(prev => ({
      ...prev,
      selectedRecipeIds: prev.selectedRecipeIds.includes(recipeId) ? prev.selectedRecipeIds.filter(id => id !== recipeId) : [...prev.selectedRecipeIds, recipeId]
    }));
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) { alert('Lütfen kitapçık başlığı giriniz.'); return; }
    saveBooklet({
      id: editingBookletId || undefined, title: formData.title.trim(), subtitle: formData.subtitle.trim(),
      authorName: formData.authorName.trim() || 'Dyt. Zeynep Hale Kocaoğlu', description: formData.description.trim(),
      coverTheme: formData.coverTheme, recipeIds: formData.selectedRecipeIds, notes: formData.notes.trim()
    });
    setIsCreatingNew(false);
    setEditingBookletId(null);
  };

  const handleEditBooklet = (b: RecipeBooklet) => {
    setFormData(createBookletForm(b));
    setEditingBookletId(b.id);
    setIsCreatingNew(true);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
          <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30"><BookOpen className="w-5 h-5" /></div>
              <div>
                <h2 className="text-lg font-bold">Kitapçıklar</h2>
                <p className="text-xs text-slate-400">Seçili tarifleri gruplayın ve yazdırılabilir profesyonel kitapçıklar oluşturun</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => { if (isCreatingNew) { setIsCreatingNew(false); setEditingBookletId(null); } else onClose(); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
              >
                <ArrowLeft className="w-4 h-4 text-amber-400" /><span>Geri</span>
              </button>
              {!isCreatingNew && (
                <button type="button" onClick={handleOpenCreateForm} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-amber-950 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs">
                  <Plus className="w-4 h-4" /><span>+ Yeni Kitapçık Oluştur</span>
                </button>
              )}
              <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto flex-1 space-y-6">
            {isCreatingNew ? (
              <form onSubmit={handleSaveForm} className="space-y-5 bg-slate-50 p-5 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FolderPlus className="w-4 h-4 text-amber-800" /><span>{editingBookletId ? 'Kitapçığı Düzenle' : 'Yeni Kitapçık Oluştur'}</span>
                  </h3>
                  <button type="button" onClick={() => { setIsCreatingNew(false); setEditingBookletId(null); }} className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer">Listeye Dön</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-800 mb-1">Kitapçık Başlığı *</label>
                    <input type="text" required value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Örn: Glutensiz Tatlı Alternatifler - Diyetisyen Hale" className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">Alt Başlık / Kapsam</label>
                    <input type="text" value={formData.subtitle} onChange={e => setFormData(p => ({ ...p, subtitle: e.target.value }))} placeholder="Örn: Hassas Sindirim & Özel Tarif Seçkisi" className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800" />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-800 mb-1">Hazırlayan Diyetisyen</label>
                    <input type="text" value={formData.authorName} onChange={e => setFormData(p => ({ ...p, authorName: e.target.value }))} placeholder="Dyt. Zeynep Hale Kocaoğlu" className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-800 mb-1.5">Kapak Teması / Renk Stili</label>
                    <div className="flex flex-wrap gap-2">
                      {COVER_THEMES.map(theme => (
                        <button key={theme.id} type="button" onClick={() => setFormData(p => ({ ...p, coverTheme: theme.id }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${theme.class} ${formData.coverTheme === theme.id ? 'ring-2 ring-offset-1 ring-amber-800 scale-105' : 'opacity-70 hover:opacity-100'}`}>
                          {theme.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-slate-800 mb-1">Kitapçık Açıklaması / Ön Söz</label>
                    <textarea rows={2} value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Danışanlara yönelik kısa açıklama..." className="w-full px-3 py-2 bg-white rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800" />
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-900">Kitapçığa Dahil Edilecek Reçeteler ({formData.selectedRecipeIds.length} Seçili)</label>
                    <span className="text-[11px] text-slate-500">Kütüphanedeki tüm tarifler listelenmiştir</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto p-2 bg-white rounded-xl border border-slate-200">
                    {recipes.map(recipe => {
                      const isSelected = selectedSet.has(recipe.id);
                      return (
                        <div key={recipe.id} onClick={() => handleToggleRecipeInForm(recipe.id)} className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${isSelected ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-semibold' : 'bg-stone-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                          <div className="flex items-center gap-2 overflow-hidden">
                            <span className={`w-4 h-4 rounded flex items-center justify-center text-[10px] shrink-0 border ${isSelected ? 'bg-amber-900 text-white border-amber-900' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <Check className="w-3 h-3" />}
                            </span>
                            <span className="text-xs truncate">{recipe.name}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-500 shrink-0">{recipe.dietType}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200">
                  {editingBookletId ? (
                    <button
                      type="button"
                      onClick={() => { const target = booklets.find(b => b.id === editingBookletId); if (target) setBookletToDelete(target); }}
                      className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" /><span>Kitapçığı Sil</span>
                    </button>
                  ) : <div />}
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => { setIsCreatingNew(false); setEditingBookletId(null); }} className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer">İptal</button>
                    <button type="submit" className="px-5 py-2 bg-amber-900 hover:bg-amber-950 text-white font-bold rounded-lg text-xs shadow-md transition-all cursor-pointer">Kitapçığı Kaydet</button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {booklets.map(b => (
                  <div key={b.id} className="bg-stone-50/70 rounded-2xl border border-slate-200/90 p-5 space-y-4 flex flex-col justify-between hover:border-slate-300 transition-all shadow-2xs">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-200">{b.recipeIds?.length || 0} Tarif İçerir</span>
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => handleEditBooklet(b)} className="p-1.5 text-slate-400 hover:text-slate-800 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer" title="Düzenle"><Edit2 className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => setBookletToDelete(b)} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer" title="Sil"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                      <h3 className="text-base font-bold font-serif text-slate-900 leading-snug">{b.title}</h3>
                      {b.subtitle && <p className="text-xs text-slate-500 font-medium">{b.subtitle}</p>}
                      {b.description && <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed pt-1">{b.description}</p>}
                    </div>

                    <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-amber-950">{b.authorName || 'Dyt. Zeynep Hale Kocaoğlu'}</span>
                      <button type="button" onClick={() => setActivePrintBooklet(b)} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-amber-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs">
                        <Printer className="w-3.5 h-3.5 text-amber-400" /><span>Kitapçığı İncele & Yazdır</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {activePrintBooklet && <BookletPrintView booklet={activePrintBooklet} recipes={recipes} onClose={() => setActivePrintBooklet(null)} />}

      <ConfirmModal
        isOpen={Boolean(bookletToDelete)}
        title="Silmek İstediğinize Emin Misiniz?"
        message={`"${bookletToDelete?.title || ''}" kitapçığı ve içeriğindeki gruplandırma silinecektir. Bu işlem geri alınamaz.`}
        confirmText="Evet, Kalıcı Olarak Sil"
        type="danger"
        onCancel={() => setBookletToDelete(null)}
        onConfirm={() => { if (bookletToDelete) deleteBooklet(bookletToDelete.id); setBookletToDelete(null); setIsCreatingNew(false); setEditingBookletId(null); }}
      />
    </>
  );
};