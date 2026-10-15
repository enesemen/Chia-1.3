# 🌿 Chia 1.3 — Klinik Menü, Türk Mutfağı Reçeteleri ve Besin Planlama Stüdyosu

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Vite](https://img.shields.io/badge/Vite-6.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)

**Chia 1.3**, diyetisyenler ve klinik beslenme uzmanları için geliştirilmiş; deterministik hesaplama motoruna, 59 zengin Türk mutfağı reçetesine, TürKomp 100g referanslı besin havuzuna ve 7 günlük kişiselleştirilmiş menü planlama mimarisine sahip modern bir beslenme stüdyosudur.

---

## ✨ Temel Özellikler

### 🥗 1. 59 Zengin Türk Mutfağı Reçete Kütüphanesi
* **Eksiksiz Klinik Reçeteler:** Kahvaltı, ana yemek ve ara öğün kategorilerinde 59 adet denenmiş, tam gramajlı ve adımlı Türk mutfağı tarifi.
* **Detaylı Klinik Notlar & Mutfak Tüyoları:** Her tarifte diyetisyene özel klinik rehberlik, pişirme teknikleri ve saklama koşulları.
* **Deterministik Değişim Karşılıkları:** Her porsiyonun Et, Tahıl, Sebze, Meyve, Süt ve Yağ değişim değerleri otomatik hesaplanır.

### 🔬 2. TürKomp & USDA FoodData Central Besin Havuzu
* **Resmi Standart:** T.C. Tarım ve Orman Bakanlığı & TÜBİTAK MAM Ulusal Gıda Kompozisyon Veri Tabanı (TürKomp) 100g referansları.
* **Atwater Faktörleri:** Protein $4\text{ kcal/g}$, Karbonhidrat $4\text{ kcal/g}$, Yağ $9\text{ kcal/g}$, Lif $2.4\text{ kcal/g}$ deterministik enerji doğrulaması.

### 🗓️ 3. 7 Günlük Menü Planlama Matrisi
* **Kişiselleştirilmiş Enerji:** Mifflin-St Jeor ve Harris-Benedict formülleriyle BMR, PAL (Fiziksel Aktivite Düzeyi) ve TDEE hesaplama.
* **5 Kalori Seviyesi (XS1000 — XL1800):** Danışanın hedefine göre otomatik arketip önerisi ve porsiyon çarpanları.
* **İnteraktif Makro Slider:** Karbonhidrat, protein ve yağ yüzdelerini gerçek zamanlı ayarlama ve tek tıkla Akdeniz/Dengeli, Low-Carb, Ketojenik, Yüksek Protein şablonları uygulama.
* **Akıllı Tarif Değiştirme (Swap):** Hedef makrolara ve kaloriye en uygun alternatif tarifleri saniyeler içinde önerme.

### 🖨️ 4. Bağımsız A4 PDF & Standalone HTML Dışa Aktarma
* **Hasta Reçete Kartı:** Tek tıkla görselleri, porsiyon gramajlarını ve hazırlanış adımlarını içeren A4 baskı / PDF formatında çıktı alma.
* **HTML İndirme:** İnternet bağlantısı olmadan her tarayıcıda çalışan tekil `.html` reçete kartı üretme.
* **Pano Kopyalama:** WhatsApp veya e-posta ile danışana göndermek üzere tek tuşla biçimlendirilmiş metin formatında kopyalama.

### 🖼️ 5. İstemci Taraflı Canvas WebP Görsel Sıkıştırma
* Yüklenen yüksek çözünürlüklü fotoğraflar tarayıcı belleğinde otomatik olarak **800px WebP** formatına (~40 KB) dönüştürülür; depolama kotalarının dolması önlenir.

---

## 🛠️ Teknoloji Yığını

* **Çekirdek:** React 19, TypeScript
* **Stil & Arayüz:** Tailwind CSS v4 (@tailwindcss/vite), Lucide React
* **Yapı Aracı:** Vite 6
* **Tasarım Kimliği:** Organik Adaçayı Yeşili (`#58724F`), Sıcak Krem (`#F8F6F0`) ve Chia Maskot Estetiği

---

## 🚀 Hızlı Başlangıç

### Gereksinimler
* Node.js (v18 veya üzeri)
* npm veya pnpm / yarn / bun

### Kurulum

1. Depoyu klonlayın:
   ```bash
   git clone https://github.com/enesemen/Chia-1.3.git
   cd Chia-1.3
   ```

2. Bağımlılıkları yükleyin:
   ```bash
   npm install
   ```

3. Geliştirme sunucusunu başlatın:
   ```bash
   npm run dev
   ```

4. Tarayıcınızda açın:
   ```
   http://localhost:4000/
   ```

### Derleme (Production Build)
```bash
npm run build
npm run preview
```

---

## 📂 Proje Yapısı

```
chia/
├── src/
│   ├── components/
│   │   ├── booklets/        # Reçete kitapçıkları & baskı görünümleri
│   │   ├── common/          # Chia maskot ve ortak UI bileşenleri
│   │   ├── exchanges/       # TDD değişim sistemi referans tablosu
│   │   ├── foods/           # TürKomp & USDA besin veritabanı
│   │   ├── layout/          # Navbar ve üst navigasyon
│   │   ├── planner/         # 7 Günlük Menü Planlama Matrisi & Swap Modalları
│   │   └── recipes/         # Reçete Sihirbazı, Liste ve Detay Modalları
│   ├── context/             # NutritionContext state yönetimi
│   ├── data/                # 59 Türk tarifi, TürKomp besinleri ve değişim verileri
│   ├── services/            # Menü motoru, TürKomp servisi ve PDF/HTML dışa aktarma
│   ├── types/               # Beslenme, reçete ve menü planlama tip tanımları
│   ├── utils/               # Atwater hesaplayıcı ve TDD katsayıları
│   ├── App.tsx              # Ana uygulama kabuğu
│   ├── index.css            # Tailwind CSS v4 & @theme tanımları
│   └── main.tsx             # React DOM kök girişi
├── index.html               # Uygulama HTML şablonu
├── package.json             # Bağımlılıklar ve scriptler
├── tsconfig.json            # TypeScript konfigürasyonu
└── vite.config.ts           # Vite ve Tailwind CSS v4 eklentisi
```

---

## 📄 Lisans

Bu proje [MIT](LICENSE) lisansı ile lisanslanmıştır.
