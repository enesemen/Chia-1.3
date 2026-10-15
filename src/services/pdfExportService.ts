import { Recipe } from '../types/nutrition';

export const compressImageFile = (file: File, maxWidth = 800, quality = 0.8): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = e => {
      const dataUrl = e.target?.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        const scale = img.width > maxWidth ? maxWidth / img.width : 1;
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/webp', quality));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });

export const buildStandalonePrintHTML = (title: string, innerHtml: string, autoPrint: boolean): string => `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8"><title>${title}</title><script src="https://cdn.tailwindcss.com"></script>
  <style>
    @media print {
      @page { size: A4 portrait; margin: 10mm; }
      .no-print { display: none !important; }
      body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; background: white !important; margin: 0 !important; padding: 0 !important; }
      .page-break-after { page-break-after: always !important; break-after: page !important; }
    }
    body { font-family: system-ui, -apple-system, sans-serif; background-color: #f8fafc; }
  </style>
</head>
<body class="p-0 sm:p-6">
  ${autoPrint ? `<div class="no-print bg-slate-900 text-white p-4 mb-6 rounded-xl shadow-lg flex items-center justify-between gap-4 max-w-4xl mx-auto">
    <div><h1 class="font-bold text-base">${title}</h1><p class="text-xs text-slate-400">Yazdırılabilir Doküman · Yazıcı İletişim Penceresi</p></div>
    <div class="flex items-center gap-2">
      <button onclick="window.print()" style="background:#f59e0b;color:#451a03;font-weight:bold;padding:8px 16px;border-radius:8px;border:none;cursor:pointer;">🖨️ YAZDIR / PDF KAYDET</button>
      <button onclick="window.close()" style="background:#334155;color:white;padding:8px 12px;border-radius:8px;border:none;cursor:pointer;">Kapat</button>
    </div>
  </div>` : ''}
  <div class="max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden">${innerHtml}</div>
  ${autoPrint ? `<script>window.onload=function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},300);};</script>` : ''}
</body></html>`;

export const printElementStandalone = (elementId: string, title: string) => {
  const el = document.getElementById(elementId);
  if (!el) { window.print(); return; }
  const html = buildStandalonePrintHTML(title, el.innerHTML, true);
  try {
    const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    if (!window.open(blobUrl, '_blank')) { window.focus(); window.print(); }
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch { window.focus(); window.print(); }
};

export const downloadElementAsHTML = (elementId: string, title: string, suffix = 'El_Kitapcigi') => {
  const el = document.getElementById(elementId);
  if (!el) return;
  const url = URL.createObjectURL(new Blob([buildStandalonePrintHTML(title, el.innerHTML, false)], { type: 'text/html;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9çğıöşüÇĞİÖŞÜ ]/g, '_')}_${suffix}.html`;
  a.click();
  URL.revokeObjectURL(url);
};

export const generateRecipeCardPrintableHtml = (recipe: Recipe, ingredientLines: string[], steps: { stepNumber: number; instruction: string }[]) => {
  const ingList = ingredientLines.map(line => `<li style="margin-bottom:0.4rem;color:#1e293b;">${line}</li>`).join('');
  const stepList = steps.map(s => `<li style="margin-bottom:0.5rem;color:#1e293b;"><strong style="color:#065f46;">Adım ${s.stepNumber}:</strong> ${s.instruction}</li>`).join('');
  const energyStr = recipe.energyDisplay || (recipe.totalNutrition?.calories ? `${recipe.totalNutrition.calories} kcal` : 'Enerji hesabı yok');
  return `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${recipe.name} - Hasta Diyet & Reçete Kartı</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
  * { box-sizing: border-box; }
  body { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #0f172a; background: #ffffff; padding: 2rem; max-width: 780px; margin: 0 auto; line-height: 1.5; }
  .header { border-bottom: 2px solid #065f46; padding-bottom: 1rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-start; }
  .badge { font-size: 10px; font-weight: 800; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; }
  .title { font-size: 22px; font-weight: 800; margin-top: 8px; color: #0f172a; }
  .subtitle { font-size: 12px; color: #475569; margin-top: 4px; }
  .meta { text-align: right; font-size: 11px; color: #64748b; font-family: monospace; }
  .box-container { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1.25rem; border-radius: 12px; margin: 1.25rem 0; }
  .box-label { font-size: 10px; font-weight: 800; color: #065f46; text-transform: uppercase; }
  .box-value { font-size: 15px; font-weight: 800; color: #022c22; margin-top: 4px; }
  h3 { font-size: 12px; font-weight: 800; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-top: 1.5rem; margin-bottom: 0.75rem; color: #334155; }
  ul, ol { padding-left: 1.25rem; font-size: 13px; }
  .note { background: #fffbeb; border: 1px solid #fde68a; padding: 1rem 1.25rem; border-radius: 10px; font-size: 12px; color: #78350f; margin-top: 1.5rem; font-style: italic; }
  .footer { font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; margin-top: 2.5rem; padding-top: 0.75rem; display: flex; justify-content: space-between; }
  .print-bar { background: #065f46; color: white; padding: 12px 20px; border-radius: 12px; margin-bottom: 2rem; display: flex; justify-content: space-between; align-items: center; font-size: 13px; }
  .btn-print { background: white; color: #065f46; font-weight: bold; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 12px; }
  @media print { .print-bar { display: none !important; } body { padding: 0 !important; } @page { size: A4; margin: 1.5cm; } }
</style></head><body>
  <div class="print-bar"><span>🖨️ <strong>${recipe.name}</strong> - Diyet Reçete Kartı</span><button class="btn-print" onclick="window.print()">Yazdır / PDF Olarak Kaydet</button></div>
  <div class="header">
    <div><span class="badge">Klinik Diyet Reçetesi</span><div class="title">${recipe.name}</div><div class="subtitle">Dyt. Zeynep Hale - Beslenme & Diyet Kliniği</div></div>
    <div class="meta"><div>Kod: <strong>${recipe.id}</strong></div><div>Tarih: ${new Date().toLocaleDateString('tr-TR')}</div>${recipe.category ? `<div>Kategori: ${recipe.category}</div>` : ''}</div>
  </div>
  ${recipe.imageUrl ? `<div style="margin:1rem 0;width:100%;max-height:260px;overflow:hidden;border-radius:12px;border:1px solid #e2e8f0;"><img src="${recipe.imageUrl}" alt="${recipe.name}" style="width:100%;height:260px;object-fit:cover;display:block;" /></div>` : ''}
  <div class="box-container">
    <div><div class="box-label">Temel Değişim Karşılığı</div><div class="box-value">${recipe.exchangeSummary || 'Değişim tanımlanmadı'}</div></div>
    <div><div class="box-label">Enerji & Besin Değerleri (1 Porsiyon)</div><div class="box-value">${energyStr}</div></div>
  </div>
  <h3>Reçete Malzemeleri & Gramajlar</h3><ul>${ingList}</ul>
  <h3>Hazırlanış Adımları</h3><ol>${stepList}</ol>
  ${recipe.clinicalNote ? `<div class="note"><strong>Diyetisyen Notu:</strong> "${recipe.clinicalNote}"</div>` : ''}
  <div class="footer"><span>Dyt. Zeynep Hale Kliniği · Hasta Bilgilendirme Kartı</span><span>Sağlıklı Günler Dileriz</span></div>
  <script>window.onload=function(){setTimeout(function(){window.print();},400);};</script>
</body></html>`;
};
