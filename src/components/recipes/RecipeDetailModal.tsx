import React, { useState } from 'react';
import {
  Edit3, Plus, Trash2, Archive, X, UtensilsCrossed, BookOpen,
  Clock, Layers, Sparkles, Info, CheckCircle2, ShieldCheck, Share2,
  Printer, FileText, Download, Upload, MoreHorizontal, ChevronDown
} from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';
import { getUnifiedRecipeIngredients } from '../../data/turkishRecipes';
import { compressImageFile, generateRecipeCardPrintableHtml } from '../../services/pdfExportService';
import { ConfirmModal } from '../common/ChiaMascot';

export const RecipeDetailModal: React.FC = () => {
  const { selectedRecipeForDetail: recipe, closeDetail, openWizard, deleteRecipe, saveRecipe } = useNutrition();

  const [activeTab, setActiveTab] = useState<'ingredients' | 'steps' | 'kitchen' | 'variations'>('ingredients');
  const [openMenu, setOpenMenu] = useState<'share' | 'more' | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  if (!recipe) return null;

  const triggerToast = (msg: string) => {
    setCopiedNotification(msg);
    setTimeout(() => setCopiedNotification(null), 3000);
  };

  const handleImageFileUploadInDetail = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedDataUrl = await compressImageFile(file, 800, 0.82);
      saveRecipe({ ...recipe, imageUrl: compressedDataUrl, updatedAt: new Date().toISOString() });
      triggerToast('Görsel optimize edilerek tarife kaydedildi!');
    } catch { alert('Görsel işlenirken bir hata oluştu.'); }
  };

  const handleCreateVariation = () => {
    const now = new Date().toISOString();
    closeDetail();
    openWizard({
      ...recipe, id: `REC-VAR-${Date.now().toString().slice(-6)}`,
      name: `${recipe.name} (Varyasyon)`, planCount: 0, isDraft: false, createdAt: now, updatedAt: now
    });
  };

  const unifiedIngredients = getUnifiedRecipeIngredients(recipe);
  const displayIngredients = unifiedIngredients.length > 0
    ? unifiedIngredients.map((item, idx) => ({
        order: idx + 1, name: item.foodName, amountDisplay: item.amountDisplay || `${item.amount} ${item.unit}`, note: item.preparationNote
      }))
    : [{ order: 1, name: recipe.name, amountDisplay: recipe.portionDescription || '1 Porsiyon', note: undefined }];

  const displaySteps = recipe.steps?.length
    ? recipe.steps
    : [
        { stepNumber: 1, instruction: 'Malzemeleri yıkayıp hazırlayın.' },
        { stepNumber: 2, instruction: 'Baharat ve zeytinyağı ile harmanlayın.' },
        { stepNumber: 3, instruction: 'Önerilen pişirme tekniğiyle pişirip sıcak servis yapın.' }
      ];

  const getIngredientLines = () =>
    displayIngredients.map(item => `${item.order}. ${item.name} - ${item.amountDisplay}${item.note ? ` (${item.note})` : ''}`.trim());

  const handlePrintPDF = () => {
    try {
      const printWin = window.open('', '_blank', 'width=800,height=900');
      if (printWin) {
        printWin.document.open();
        printWin.document.write(generateRecipeCardPrintableHtml(recipe, getIngredientLines(), displaySteps));
        printWin.document.close();
        triggerToast('PDF baskı penceresi açıldı!');
      } else window.print();
    } catch { window.print(); }
  };

  const handleDownloadHtmlCard = () => {
    const html = generateRecipeCardPrintableHtml(recipe, getIngredientLines(), displaySteps);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `Hale_Diyet_Recete_${recipe.name.replace(/\s+/g, '_')}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    triggerToast('Reçete PDF kartı indirildi! Dosyayı açıp hemen yazdırabilirsiniz.');
  };

  const handleCopyFullRecipe = () => {
    const ingList = getIngredientLines().join('\n');
    const stepList = displaySteps.map(s => `${s.stepNumber}. ${s.instruction}`).join('\n');
    const energyStr = recipe.energyDisplay || (recipe.totalNutrition?.calories ? `${recipe.totalNutrition.calories} kcal` : 'Enerji hesabı yok');
    const formattedText = `🥗 HALE BESLENME & DİYET - HASTA REÇETESİ\n--------------------------------------------------\n📌 Reçete: ${recipe.name}\n📁 Kategori: ${recipe.category || 'Ana Yemek'} | Diyet: ${(recipe.dietTypes || ['STD']).join(', ')}\n⏱️ Süre: Hazırlık ${recipe.prepTimeMinutes || 10} dk / Pişirme ${recipe.cookTimeMinutes || 20} dk\n\n📊 DEĞİŞİM KARŞILIKLARI:\n${recipe.exchangeSummary || 'Değişim tanımlanmadı'}\n\n🔥 BESİN DEĞERLERİ (1 PORSİYON):\n${energyStr}\n\n🛒 MALZEMELER:\n${ingList}\n\n🍳 HAZIRLANIŞ ADIMLARI:\n${stepList}\n\n💡 DİYETİSYEN KLİNİK NOTU:\n"${recipe.clinicalNote || 'Taze ve kaliteli malzemelerle hazırlayınız.'}"\n--------------------------------------------------\nDyt. Zeynep Hale - Sağlıklı Beslenme ve Diyet Kliniği`;
    navigator.clipboard.writeText(formattedText);
    triggerToast('Tüm reçete metni panoya kopyalandı! WhatsApp veya E-Posta ile gönderebilirsiniz.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-auto overflow-hidden flex flex-col max-h-[95vh] text-slate-900">
        <div className="px-5 py-3 border-b border-slate-200 bg-stone-50/70 flex items-center justify-between gap-2 relative">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2.5 py-0.5 rounded-md bg-amber-900 text-white text-[10px] font-bold uppercase tracking-wider shrink-0">{recipe.category || 'Reçete'}</span>
            <span className="text-xs font-mono text-slate-400 truncate hidden sm:inline">{recipe.id}</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'share' ? null : 'share')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" /><span>Paylaş & PDF</span><ChevronDown className="w-3.5 h-3.5 opacity-80" />
              </button>
              {openMenu === 'share' && (
                <div className="absolute right-0 mt-1.5 w-60 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95">
                  <button type="button" onClick={() => { setOpenMenu(null); handlePrintPDF(); }} className="w-full px-3.5 py-2 text-left hover:bg-emerald-50 hover:text-emerald-900 flex items-center gap-2.5 cursor-pointer">
                    <Printer className="w-4 h-4 text-emerald-700" /><div><div className="font-bold">A4 Reçete Kartı Yazdır / PDF</div><div className="text-[10px] text-slate-400">Tek tıkla hasta teslim kartı</div></div>
                  </button>
                  <button type="button" onClick={() => { setOpenMenu(null); handleCopyFullRecipe(); }} className="w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer">
                    <FileText className="w-4 h-4 text-slate-600" /><div><div className="font-bold">WhatsApp / Metin Kopyala</div><div className="text-[10px] text-slate-400">Biçimlendirilmiş tam metin</div></div>
                  </button>
                  <button type="button" onClick={() => { setOpenMenu(null); handleDownloadHtmlCard(); }} className="w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2.5 cursor-pointer">
                    <Download className="w-4 h-4 text-blue-600" /><div><div className="font-bold">Bağımsız Kart İndir (.html)</div><div className="text-[10px] text-slate-400">Çevrimdışı açılabilir dosya</div></div>
                  </button>
                </div>
              )}
            </div>

            <button onClick={() => { closeDetail(); openWizard(recipe); }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer">
              <Edit3 className="w-3.5 h-3.5" /><span>Düzenle</span>
            </button>

            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenMenu(openMenu === 'more' ? null : 'more')}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                title="Diğer İşlemler"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {openMenu === 'more' && (
                <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1 z-50 text-xs font-semibold text-slate-700 animate-in fade-in zoom-in-95">
                  <button type="button" onClick={() => { setOpenMenu(null); handleCreateVariation(); }} className="w-full px-3.5 py-2 text-left hover:bg-amber-50 text-amber-950 flex items-center gap-2 cursor-pointer">
                    <Plus className="w-3.5 h-3.5 text-amber-800" /><span>Varyasyon Oluştur</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpenMenu(null);
                      const nextDraft = !recipe.isDraft;
                      saveRecipe({ ...recipe, isDraft: nextDraft, updatedAt: new Date().toISOString() });
                      triggerToast(nextDraft ? `"${recipe.name}" taslak/arşiv durumuna alındı.` : `"${recipe.name}" tekrar aktif kütüphaneye alındı.`);
                    }}
                    className="w-full px-3.5 py-2 text-left hover:bg-stone-50 flex items-center gap-2 cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5 text-slate-500" /><span>{recipe.isDraft ? 'Aktifleştir' : 'Arşivle / Taslağa Al'}</span>
                  </button>
                  <div className="my-1 border-t border-slate-100" />
                  <button type="button" onClick={() => { setOpenMenu(null); setShowDeleteConfirm(true); }} className="w-full px-3.5 py-2 text-left hover:bg-rose-50 text-rose-600 flex items-center gap-2 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" /><span>Tarifi Kalıcı Sil</span>
                  </button>
                </div>
              )}
            </div>

            <button onClick={closeDetail} className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors ml-1 cursor-pointer" title="Kapat"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {copiedNotification && (
          <div className="bg-emerald-900 text-white px-5 py-2.5 text-xs font-semibold flex items-center justify-between shadow-xs shrink-0 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" /><span>{copiedNotification}</span></div>
            <button type="button" onClick={() => setCopiedNotification(null)} className="text-white/80 hover:text-white p-0.5 cursor-pointer"><X className="w-4 h-4" /></button>
          </div>
        )}

        <div className="p-6 border-b border-slate-100 bg-white">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
            <div className="md:col-span-4 relative rounded-xl overflow-hidden aspect-4/3 bg-slate-100 shadow-sm border border-slate-200/80 group">
              <img
                src={recipe.imageUrl || 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80'}
                alt={recipe.name} className="w-full h-full object-cover"
                onError={e => { (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80'; }}
              />
              <div className="absolute top-3 left-3 flex items-center gap-1.5 flex-wrap max-w-[85%]">
                {(recipe.categories?.length ? recipe.categories : [recipe.category || 'Ana Yemek']).map(cat => (
                  <span key={cat} className="bg-zinc-900/90 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider px-2 py-0.5 rounded-md uppercase">{cat}</span>
                ))}
              </div>
              <label className="absolute bottom-3 right-3 bg-slate-900/85 hover:bg-zinc-900 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-md">
                <Upload className="w-3.5 h-3.5" /><span>Görsel Yükle</span>
                <input type="file" accept="image/*" onChange={handleImageFileUploadInDetail} className="hidden" />
              </label>
            </div>

            <div className="md:col-span-8 space-y-3.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full border border-slate-300 text-slate-700 font-mono text-[11px] font-semibold uppercase tracking-wider bg-white">{recipe.family || 'AİLE: GENEL'}</span>
                <span className="px-2.5 py-0.5 rounded-full border border-emerald-400 text-emerald-700 font-mono text-[11px] font-bold uppercase tracking-wider bg-white">{recipe.practicality || 'KOLAY'}</span>
                <span className="px-2.5 py-0.5 rounded-full border border-slate-300 text-slate-700 font-mono text-[11px] font-semibold uppercase tracking-wider bg-white">{recipe.transportability || 'TAŞINMAZ'}</span>
                <span className="text-xs font-mono text-slate-500 ml-1">{recipe.planCount || 42} kez planlandı</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold font-serif text-slate-900 tracking-tight leading-tight">{recipe.name}</h1>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="p-3.5 bg-stone-50/80 rounded-xl border border-stone-200/90">
                  <div className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-wider">TEMEL DEĞİŞİM PROFİLİ</div>
                  <div className="text-base font-bold font-mono text-slate-900 mt-1 tabular-nums">{recipe.exchangeSummary || '3 P · 0.5 K · 1.5 Y · 1 Seb'}</div>
                </div>
                <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-200/70">
                  <div className="text-[10px] font-bold font-mono text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" /> ENERJİ (1 PORSİYON)
                  </div>
                  <div className="text-sm font-medium text-slate-700 mt-1">
                    {recipe.energyDisplay || (recipe.totalNutrition?.calories ? `${recipe.totalNutrition.calories} kcal` : 'Enerji hesabı yapılmadı')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                <span className="text-slate-500 font-medium">Diyet & Öğünler:</span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {(recipe.dietTypes || ['STD', 'GF', 'LF', 'GF + LF']).map(dt => (
                    <span key={dt} className="bg-zinc-800 text-white font-bold text-[11px] px-2.5 py-0.5 rounded-md tracking-tight">{dt}</span>
                  ))}
                  {(recipe.mealTypes || [recipe.mealType || 'Akşam']).map(m => (
                    <span key={m} className="bg-stone-100 text-stone-700 font-semibold text-[11px] px-2.5 py-0.5 rounded-md border border-stone-200/70">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 border-b border-slate-200 bg-stone-50/60 flex items-center gap-6 text-xs font-semibold">
          {([
            { id: 'ingredients', label: `Malzemeler (${displayIngredients.length})`, icon: UtensilsCrossed },
            { id: 'steps', label: `Hazırlanış (${displaySteps.length} Adım)`, icon: BookOpen },
            { id: 'kitchen', label: 'Mutfak & Saklama', icon: Clock },
            { id: 'variations', label: 'Varyasyonlar (0)', icon: Layers }
          ] as const).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`py-3.5 flex items-center gap-2 border-b-2 transition-colors ${activeTab === tab.id ? 'border-emerald-700 text-emerald-900 font-bold' : 'border-transparent text-slate-600 hover:text-slate-900'}`}
              >
                <Icon className="w-4 h-4 text-slate-500" /><span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="p-6 overflow-y-auto flex-1 bg-white space-y-6">
          {activeTab === 'ingredients' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-slate-100 gap-1">
                <h3 className="text-sm font-bold text-slate-900">Tek Kişilik Reçete Malzemeleri</h3>
                <span className="text-xs font-mono text-slate-500">{recipe.portionSub || 'Porsiyon: 3 Protein Değişimi Temelli Master Reçete'}</span>
              </div>
              <div className="space-y-2">
                {displayIngredients.map(item => (
                  <div key={item.order} className="p-3 bg-stone-50/70 hover:bg-stone-100/60 rounded-xl border border-stone-200/70 flex items-center justify-between transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-700 text-xs font-bold font-mono flex items-center justify-center shrink-0 shadow-2xs">{item.order}</span>
                      <span className="text-sm font-semibold text-slate-900">{item.name}</span>
                    </div>
                    <div className="px-3 py-1 rounded-lg bg-white border border-slate-200/90 font-mono text-xs font-bold text-slate-800 shadow-2xs">{item.amountDisplay}</div>
                  </div>
                ))}
              </div>
              <div className="mt-5 p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
                <div className="text-xs font-bold text-amber-950 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-amber-700" /> Diyetisyen Zeynep Hale Klinik & Pratik Notu
                </div>
                <p className="text-xs text-amber-900/90 italic leading-relaxed">
                  "{recipe.clinicalNote || 'Somon çok yüksek kaliteli Omega-3 içerir. Fırında fazla kurutmamak lezzetin ve besin değerinin anahtarıdır.'}"
                </p>
              </div>
            </div>
          )}

          {activeTab === 'steps' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Adım Adım Hazırlanış ve Pişirme Talimatı</h3>
                <span className="text-xs text-slate-500 font-mono">Süre: {recipe.prepTimeMinutes} dakika</span>
              </div>
              <div className="space-y-3">
                {displaySteps.map(st => (
                  <div key={st.stepNumber} className="p-3.5 bg-stone-50/70 rounded-xl border border-stone-200/70 flex items-start gap-3">
                    <span className="w-7 h-7 rounded-full bg-emerald-700 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-mono">{st.stepNumber}</span>
                    <div className="text-xs text-slate-800 leading-relaxed pt-1">{st.instruction}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'kitchen' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-2">Mutfak Tüyoları & Saklama Koşulları</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-stone-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5"><Clock className="w-4 h-4 text-slate-500" /> Buzdolabında Saklama</div>
                  <p className="text-slate-600 leading-relaxed">{recipe.kitchenNotes || 'Pişirildikten sonra hava geçirmez cam saklama kabında buzdolabında (4°C) 48 saate kadar tazeliğini korur.'}</p>
                </div>
                <div className="p-4 bg-stone-50 rounded-xl border border-slate-200 space-y-2">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5"><Info className="w-4 h-4 text-slate-500" /> Taşınabilirlik Tavsiyesi</div>
                  <p className="text-slate-600 leading-relaxed">
                    {recipe.transportability === 'Taşımaya Uygun'
                      ? 'Termos çanta ve soğutucu jel ile ofise ve seyahatlere taşınabilir.'
                      : 'Balık kokusu ve dokusu gereği taze sıcak tüketim önerilir; uzun süre kapalı taşınması tavsiye edilmez.'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'variations' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Klinik Beslenme Varyasyonları</h3>
                <button type="button" onClick={handleCreateVariation} className="text-xs font-semibold text-emerald-800 hover:underline cursor-pointer">+ Bu Reçeteden Varyasyon Oluştur</button>
              </div>
              <div className="p-6 text-center bg-stone-50 rounded-xl border border-dashed border-slate-300 space-y-2">
                <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                <div className="text-xs font-bold text-slate-700">Henüz kaydedilmiş alt varyasyon yok</div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">Bu reçeteyi temel alarak Ketojenik, Eliminasyon veya Düşük Karbonhidrat danışanları için farklı porsiyon veya yağ/karbonhidrat profiliyle varyasyonlar oluşturabilirsiniz.</p>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-2.5 bg-stone-100/70 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>Reçete Kodu: {recipe.id}</span>
          <span>Diyet Planlama Robotu · Klinik Karar Mimarisi</span>
        </div>
      </div>

      <ConfirmModal
        isOpen={showDeleteConfirm}
        title="Silmek İstediğinize Emin Misiniz?"
        message={`"${recipe.name}" reçetesi ve ilgili tüm klinik detaylar kalıcı olarak silinecektir. Bu işlem geri alınamaz.`}
        confirmText="Evet, Kalıcı Olarak Sil"
        cancelText="Vazgeç"
        type="danger"
        onConfirm={() => { deleteRecipe(recipe.id); setShowDeleteConfirm(false); closeDetail(); }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
};