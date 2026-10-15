import os

files_to_bundle = [
    # 1. Konfigürasyon & Altyapı
    ("1. Konfigürasyon & Altyapı", "package.json", "json", "NPM bağımlılıkları, derleme komutları ve proje meta verileri"),
    ("1. Konfigürasyon & Altyapı", "vite.config.ts", "typescript", "Vite derleyici mimarisi ve yapılandırması"),
    ("1. Konfigürasyon & Altyapı", "tsconfig.json", "json", "TypeScript derleyici kuralları ve katı tip denetimi"),
    ("1. Konfigürasyon & Altyapı", "metadata.json", "json", "AI Studio uygulama üstveri ve yetki tanımları"),
    
    # 2. Giriş & Kök Dosyalar
    ("2. Giriş & Kök Dosyalar", "index.html", "html", "HTML5 ana şablonu, font yüklemeleri ve viewport meta tanımları"),
    ("2. Giriş & Kök Dosyalar", "src/main.tsx", "tsx", "React 18 kök bağlayıcı ve DOM montaj noktası"),
    ("2. Giriş & Kök Dosyalar", "src/App.tsx", "tsx", "Klinik ana arayüz yönlendirmesi, sekme yönetimi ve modül koordinatörü"),
    ("2. Giriş & Kök Dosyalar", "src/index.css", "css", "Tailwind CSS v4 direktifleri ve global tipografi/renk paleti"),
    
    # 3. Veri Tipleri & Şemalar (TypeScript Interfaces)
    ("3. Veri Tipleri & Şemalar", "src/types/nutrition.ts", "typescript", "Besin, makro/mikro, tarif, değişim listesi ve klinik anamnez veri modelleri"),
    ("3. Veri Tipleri & Şemalar", "src/types/menuPlanner.ts", "typescript", "Haftalık menü planı, öğün matrisi, swap modal ve hedef plan tipleri"),
    ("3. Veri Tipleri & Şemalar", "src/types/clientTracking.ts", "typescript", "Danışan klinik takip, antropometrik ölçüm, kan tahlilleri ve beslenme günlüğü tipleri"),
    ("3. Veri Tipleri & Şemalar", "src/types/document.ts", "typescript", "Klinik belgeler, diyet listesi şablonları ve evrak tipleri"),
    
    # 4. State & Context Yönetimi
    ("4. State & Context Yönetimi", "src/context/NutritionContext.tsx", "tsx", "Global klinik beslenme state, besin veritabanı ve sepet yönetimi"),
    ("4. State & Context Yönetimi", "src/context/ClientTrackingContext.tsx", "tsx", "Danışan klinik takip state: ölçümler, tahliller ve beslenme günlüğü takibi"),
    
    # 5. Algoritma, Hesaplama & Servisler
    ("5. Algoritmalar & Servisler", "src/services/menuPlanningEngine.ts", "typescript", "Otomatik haftalık menü üretim motoru, makro dengeleme ve kural çözümleyici"),
    ("5. Algoritmalar & Servisler", "src/services/recipePersonalizationEngine.ts", "typescript", "Kişiye özel tarif porsiyonlama ve alternatif ikame öneri algoritması"),
    ("5. Algoritmalar & Servisler", "src/services/turKompDatabaseService.ts", "typescript", "TürKomp ulusal gıda kompozisyon veritabanı sorgulama servisi"),
    ("5. Algoritmalar & Servisler", "src/services/pdfExportService.ts", "typescript", "Klinik PDF, yazdırma ve menü karnesi render servisi"),
    ("5. Algoritmalar & Servisler", "src/utils/nutritionCalculator.ts", "typescript", "BMR (Harris-Benedict/Mifflin), TDEE, makro yüzdeleri ve değişim hesaplayıcı"),
    
    # 6. Besin & Tarif Veri Tabanları
    ("6. Besin & Tarif Veri Tabanları", "src/data/mockFoods.ts", "typescript", "Kapsamlı Türk mutfağı ve uluslararası temel gıda veritabanı"),
    ("6. Besin & Tarif Veri Tabanları", "src/data/mockExchangeFoods.ts", "typescript", "Türkiye Diyetisyenler Derneği (TDD) standart değişim listeleri"),
    ("6. Besin & Tarif Veri Tabanları", "src/data/turkishRecipes.ts", "typescript", "Geleneksel ve modern zengin Türk mutfağı ana yemek tarifleri"),
    ("6. Besin & Tarif Veri Tabanları", "src/data/turkishBreakfastRecipes.ts", "typescript", "Geleneksel Türk kahvaltı tabakları, omletler ve fit tarifler"),
    ("6. Besin & Tarif Veri Tabanları", "src/data/turkishDinnerRecipes.ts", "typescript", "Dengeli akşam yemeği menüleri, çorbalar ve zeytinyağlılar"),
    ("6. Besin & Tarif Veri Tabanları", "src/data/turkishSnackRecipes.ts", "typescript", "Pratik ara öğünler, smoothie, çiğ tatlılar ve sağlıklı atıştırmalıklar"),
    ("6. Besin & Tarif Veri Tabanları", "src/data/mockRecipes.ts", "typescript", "Genel tarif arşivi, porsiyon gramajları ve hazırlama adımları"),
    ("6. Besin & Tarif Veri Tabanları", "src/data/mockArchetypes.ts", "typescript", "Beslenme arketipleri (Keto, Akdeniz, DASH, Aralıklı Oruç, Yüksek Protein vb.)"),
    ("6. Besin & Tarif Veri Tabanları", "src/data/mockBooklets.ts", "typescript", "Klinik bilgilendirme kitapçıkları, kılavuzlar ve eğitim materyalleri"),
    ("6. Besin & Tarif Veri Tabanları", "src/data/mockDocuments.ts", "typescript", "Danışan formları, onam metinleri ve klinik şablon evrakları"),
    ("6. Besin & Tarif Veri Tabanları", "src/data/mockClientTracking.ts", "typescript", "Danışan klinik ölçüm, tahlil ve beslenme günlüğü başlangıç verileri"),
    
    # 7. Arayüz & Layout
    ("7. Arayüz & Layout", "src/components/layout/Navbar.tsx", "tsx", "Klinik üst navigasyon barı, arama, modül geçişleri ve profil alanı"),
    
    # 8. Menü Planlama Modülü
    ("8. Menü Planlama Modülü (Planner)", "src/components/planner/MenuPlannerView.tsx", "tsx", "Haftalık menü planlama sihirbazı, arketip seçimi ve genel yönetim"),
    ("8. Menü Planlama Modülü (Planner)", "src/components/planner/WeeklyMatrixView.tsx", "tsx", "Foodzilla esintili tek planda haftalık matris tablosu ve makro denetimi"),
    ("8. Menü Planlama Modülü (Planner)", "src/components/planner/RecipeSwapModal.tsx", "tsx", "Hücre bazlı akıllı tarif değiştirme (swap) ve kalori eşleme modalı"),
    ("8. Menü Planlama Modülü (Planner)", "src/components/planner/GuideDietSection.tsx", "tsx", "Rehber diyet kuralları, serbest gıdalar ve yasaklar bölümü"),
    ("8. Menü Planlama Modülü (Planner)", "src/components/planner/MenuPrintModal.tsx", "tsx", "Klinik yazdırma ve görsel menü kartı oluşturma modalı"),
    
    # 9. Tarifler & Besin Yönetimi
    ("9. Tarifler & Besin Yönetimi", "src/components/recipes/RecipeList.tsx", "tsx", "Filtrelenebilir tarif arşivi ve kart katalog görünümü"),
    ("9. Tarifler & Besin Yönetimi", "src/components/recipes/RecipeWizard.tsx", "tsx", "Yeni tarif oluşturma, malzeme gramajı ve kalori hesaplama sihirbazı"),
    ("9. Tarifler & Besin Yönetimi", "src/components/recipes/RecipeDetailModal.tsx", "tsx", "Tarif detayları, besin değerleri ve pişirme adımları modalı"),
    ("9. Tarifler & Besin Yönetimi", "src/components/foods/FoodsDatabaseView.tsx", "tsx", "Gelişmiş besin arama, 100g değerleri ve özel besin ekleme paneli"),
    ("9. Tarifler & Besin Yönetimi", "src/components/exchanges/ExchangeRulesView.tsx", "tsx", "Diyetisyen değişim listeleri ve eşdeğer porsiyon kuralları"),
    
    # 10. Klinik, Danışanlar & Belgeler
    ("10. Klinik, Danışanlar & Belgeler", "src/components/clients/ClientsView.tsx", "tsx", "Danışan listesi, paket durumu, aktif randevular, tahliller ve anamnez"),
    ("10. Klinik, Danışanlar & Belgeler", "src/components/clients/MealColorCodeDisplay.tsx", "tsx", "Danışan öğün tüketim uyumunu renkli kart olarak gösteren klinik bileşen"),
    ("10. Klinik, Danışanlar & Belgeler", "src/components/archetypes/ArchetypesView.tsx", "tsx", "Beslenme modeli ve arketip yapılandırma paneli"),
    ("10. Klinik, Danışanlar & Belgeler", "src/components/documents/DocumentsView.tsx", "tsx", "Klinik belge arşivi, form oluşturma ve yazdırma"),
    ("10. Klinik, Danışanlar & Belgeler", "src/components/booklets/BookletsModal.tsx", "tsx", "Danışana özel bilgilendirme kitapçığı derleme penceresi"),
    ("10. Klinik, Danışanlar & Belgeler", "src/components/booklets/BookletPrintView.tsx", "tsx", "Kitapçık baskı ve PDF formatlama düzeni"),
    ("10. Klinik, Danışanlar & Belgeler", "src/components/templates/TemplatesView.tsx", "tsx", "Diyet ve menü şablonları kütüphanesi"),
    
    # 11. Yardımcı Betikler
    ("11. Yardımcı Betikler & Araçlar", "scripts/patch-html2canvas.js", "javascript", "HTML2Canvas PDF ve görsel dışa aktarım CSS uyumluluk yaması")
]

def main():
    total_lines = 0
    file_stats = []

    for category, filepath, lang, desc in files_to_bundle:
        if not os.path.exists(filepath):
            print(f"Warning: File not found: {filepath}")
            continue
        with open(filepath, "r", encoding="utf-8") as f:
            content = f.read()
        lines = len(content.splitlines())
        size_kb = len(content.encode("utf-8")) / 1024
        total_lines += lines
        file_stats.append((category, filepath, lang, desc, lines, size_kb, content))

    print(f"Loaded {len(file_stats)} files, {total_lines:,} total lines.")

    out = []
    out.append("# 🌿 NUTRIPLAN / CHIA — MASTER CODE & ARCHITECTURAL MANIFEST")
    out.append("")
    out.append("> **Resmi Ana Kod Deposu (Single-File Master Architecture & Complete Source Bundle)**  ")
    out.append(f"> **Toplam Dosya Sayısı:** {len(file_stats)} Dosya  ")
    out.append(f"> **Toplam Kod Hacmi:** {total_lines:,} Satır  ")
    out.append("> **Teknoloji Yığını:** React 18 (SPA), TypeScript (Strict Mode), Vite, Tailwind CSS v4, Lucide React  ")
    out.append("> **Mimari Odak:** Bütüncül Klinik Diyetisyen Çalışma Alanı, Foodzilla Stili Menü Planlama Motoru, TürKomp Besin Veritabanı, Değişim Sistemi & Klinik Danışan Takibi  ")
    out.append("")
    out.append("---")
    out.append("")
    out.append("## 📑 İÇİNDEKİLER VE MODÜL HARİTASI")
    out.append("")

    current_cat = None
    for cat, path, lang, desc, lines, size_kb, _ in file_stats:
        if cat != current_cat:
            current_cat = cat
            out.append(f"\n### 🔹 {current_cat}\n")
        anchor = path.replace("/", "-").replace(".", "-").lower()
        out.append(f"- [{path}](#{anchor}) — *{lines:,} satır | {size_kb:.1f} KB* — {desc}")

    out.append("")
    out.append("---")
    out.append("")
    out.append("## 📂 TÜM KAYNAK KODLAR (FULL SOURCE CODE)")
    out.append("")

    for cat, path, lang, desc, lines, size_kb, content in file_stats:
        anchor = path.replace("/", "-").replace(".", "-").lower()
        out.append(f'<a id="{anchor}"></a>')
        out.append(f"### 📄 `{path}`")
        out.append(f"**Kategori:** {cat} | **Satır:** {lines:,} satır | **Boyut:** {size_kb:.1f} KB  ")
        out.append(f"**Açıklama:** {desc}  ")
        out.append(f"[⬆️ Başa Dön](#i̇çi̇ndeki̇ler-ve-modül-hari̇tasi)")
        out.append("")
        out.append(f"```{lang}")
        out.append(content)
        out.append("```")
        out.append("")
        out.append("---")
        out.append("")

    master_content = "\n".join(out)

    target_root = "Nutriplan_Master_Code.md"
    with open(target_root, "w", encoding="utf-8") as f:
        f.write(master_content)
    print(f"Generated {target_root} ({len(master_content.encode('utf-8')) / 1024:.1f} KB)")

    artifact_dir = ".aistudio/artifacts/brain/2a3b585b-bb27-4757-97a9-16911761e96e"
    os.makedirs(artifact_dir, exist_ok=True)
    target_artifact = os.path.join(artifact_dir, "Nutriplan_Master_Code.md")
    with open(target_artifact, "w", encoding="utf-8") as f:
        f.write(master_content)
    print(f"Generated artifact: {target_artifact}")

if __name__ == "__main__":
    main()
