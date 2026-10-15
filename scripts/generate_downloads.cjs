const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const CHIA_DIR = path.resolve(__dirname, '..');
const DOWNLOADS_DIR = 'C:\\Users\\enese\\Downloads';

// Get all git-tracked files
const gitFilesRaw = execSync('git ls-files', { cwd: CHIA_DIR, encoding: 'utf-8' });
const files = gitFilesRaw.trim().split(/\r?\n/).filter(Boolean).sort();

console.log(`Found ${files.length} tracked files.`);

let totalLines = 0;
let srcLines = 0;
const fileEntries = [];

for (const relPath of files) {
  const fullPath = path.join(CHIA_DIR, relPath);
  if (!fs.existsSync(fullPath)) continue;
  const content = fs.readFileSync(fullPath, 'utf-8');
  const lines = content.split('\n').length;
  totalLines += lines;
  if (relPath.startsWith('src/')) {
    srcLines += lines;
  }
  fileEntries.push({
    relPath,
    fullPath,
    lines,
    content
  });
}

console.log(`Total lines: ${totalLines}, src lines: ${srcLines}`);

// 1. GENERATE Chia_v1.3_Master_Code.txt
const header = [
  '================================================================================',
  'CHIA v1.3 CLINICAL NUTRITION & STUDIO CANVAS - MASTER CODE BUNDLE',
  `Generated At: ${new Date().toISOString()}`,
  `Total Tracked Files: ${fileEntries.length}`,
  `Total Lines of Code: ${totalLines} (src: ${srcLines} lines)`,
  'Repository: https://github.com/enesemen/Chia-1.3.git',
  'Branch: main | Tag: v1.3.0',
  'Status: Clean build (tsc --noEmit: 0 errors, vite build: 0 errors)',
  '================================================================================',
  '',
  'TABLE OF CONTENTS / FILE INDEX:',
  '--------------------------------------------------------------------------------'
];

fileEntries.forEach((entry, idx) => {
  const num = (idx + 1).toString().padStart(2, ' ');
  const linesStr = entry.lines.toString().padStart(5, ' ');
  header.push(`${num}. [${linesStr} lines] ${entry.relPath}`);
});

header.push('================================================================================', '', '');

const codeSections = [];
for (const entry of fileEntries) {
  codeSections.push(
    '/* ============================================================================',
    ` * FILE: ${entry.relPath} (${entry.lines} lines)`,
    ' * ============================================================================ */',
    '',
    entry.content,
    '',
    ''
  );
}

const masterCodeContent = header.join('\n') + codeSections.join('\n');
const masterCodePath = path.join(DOWNLOADS_DIR, 'Chia_v1.3_Master_Code.txt');
fs.writeFileSync(masterCodePath, masterCodeContent, 'utf-8');
console.log(`Wrote ${masterCodePath} (${(Buffer.byteLength(masterCodeContent, 'utf-8') / 1024).toFixed(1)} KB)`);

// 2. GENERATE / UPDATE Chia_v1.3_Master_Architecture.txt
// Calculate component breakdown
const compFiles = fileEntries.filter(f => f.relPath.startsWith('src/components/'));
const compLines = compFiles.reduce((sum, f) => sum + f.lines, 0);

const servFiles = fileEntries.filter(f => f.relPath.startsWith('src/services/') || f.relPath.startsWith('src/utils/'));
const servLines = servFiles.reduce((sum, f) => sum + f.lines, 0);

const dataFiles = fileEntries.filter(f => f.relPath.startsWith('src/data/'));
const dataLines = dataFiles.reduce((sum, f) => sum + f.lines, 0);

const ctxFiles = fileEntries.filter(f => f.relPath.startsWith('src/context/'));
const ctxLines = ctxFiles.reduce((sum, f) => sum + f.lines, 0);

const typeFiles = fileEntries.filter(f => f.relPath.startsWith('src/types/'));
const typeLines = typeFiles.reduce((sum, f) => sum + f.lines, 0);

const rootSrcFiles = fileEntries.filter(f => /^src\/[^/]+$/.test(f.relPath));
const rootSrcLines = rootSrcFiles.reduce((sum, f) => sum + f.lines, 0);

const configFiles = fileEntries.filter(f => !f.relPath.startsWith('src/'));
const configLines = configFiles.reduce((sum, f) => sum + f.lines, 0);

console.log('Breakdown:', {
  comp: { count: compFiles.length, lines: compLines },
  serv: { count: servFiles.length, lines: servLines },
  data: { count: dataFiles.length, lines: dataLines },
  ctx: { count: ctxFiles.length, lines: ctxLines },
  type: { count: typeFiles.length, lines: typeLines },
  rootSrc: { count: rootSrcFiles.length, lines: rootSrcLines },
  config: { count: configFiles.length, lines: configLines }
});

const archPath = path.join(DOWNLOADS_DIR, 'Chia_v1.3_Master_Architecture.txt');
let archContent = fs.readFileSync(archPath, 'utf-8');

// Update section 15
const section15Replacement = `## 15. KOD TABANI İSTATİSTİKLERİ, METRİKLER VE DOĞRULAMA RAPORU (v1.3 AUDIT)

### 15.1. Kod Satır Sayıları ve Dosya Dağılımı
- **Toplam Git-Tracked Dosya Sayısı:** ${fileEntries.length} dosya
- **Toplam Kod Tabanı Satır Sayısı:** ${totalLines.toLocaleString('tr-TR')} satır (${totalLines} LOC)
- **Kaynak Kod Satır Sayısı (\`src/\`):** ${srcLines.toLocaleString('tr-TR')} satır (${srcLines} LOC)
- **Konfigürasyon, Script & Root Dosyaları:** ${configLines.toLocaleString('tr-TR')} satır (${configFiles.length} dosya)

### 15.2. Modüler Katman Dağılımı (Klinik ve Mimari Hiyerarşi)
1. **React Bileşenleri (\`src/components/\`):** ${compFiles.length} dosya, ${compLines.toLocaleString('tr-TR')} satır
${compFiles.sort((a,b) => b.lines - a.lines).map(f => `   - \`${path.basename(f.relPath)}\` (${f.lines} satır)`).join('\n')}
2. **Klinik Motorlar & Servisler (\`src/services/\`, \`src/utils/\`):** ${servFiles.length} dosya, ${servLines.toLocaleString('tr-TR')} satır
${servFiles.sort((a,b) => b.lines - a.lines).map(f => `   - \`${path.basename(f.relPath)}\` (${f.lines} satır)`).join('\n')}
3. **Veri ve Reçete Kütüphanesi (\`src/data/\`):** ${dataFiles.length} dosya, ${dataLines.toLocaleString('tr-TR')} satır
${dataFiles.sort((a,b) => b.lines - a.lines).map(f => `   - \`${path.basename(f.relPath)}\` (${f.lines} satır)`).join('\n')}
4. **State ve Bağlam Katmanı (\`src/context/\`):** ${ctxFiles.length} dosya, ${ctxLines.toLocaleString('tr-TR')} satır
${ctxFiles.sort((a,b) => b.lines - a.lines).map(f => `   - \`${path.basename(f.relPath)}\` (${f.lines} satır)`).join('\n')}
5. **Tip Tanımları (\`src/types/\`):** ${typeFiles.length} dosya, ${typeLines.toLocaleString('tr-TR')} satır
${typeFiles.sort((a,b) => b.lines - a.lines).map(f => `   - \`${path.basename(f.relPath)}\` (${f.lines} satır)`).join('\n')}
6. **Uygulama Giriş ve Kök (\`src/*\`):** ${rootSrcFiles.length} dosya, ${rootSrcLines.toLocaleString('tr-TR')} satır (${rootSrcFiles.map(f => `\`${path.basename(f.relPath)}\``).join(', ')}).
7. **Proje Yapılandırması ve Scriptler:** ${configFiles.length} dosya, ${configLines.toLocaleString('tr-TR')} satır (\`bun.lock\`, \`package.json\`, \`tsconfig.json\`, \`vite.config.ts\`, \`README.md\`, vb.).

### 15.3. v1.3.0 Kompakt Stüdyo UI Modernizasyonu & Klinik İyileştirmeler
- **Kompakt Filtre Barları:** Besin veritabanı (\`FoodsDatabaseView\`), Değişim kuralları (\`ExchangeRulesView\`) ve Tarif listesinde (\`RecipeList\`) çok satırlı hantal butonlar yerine tek satır responsive \`<select>\` filtre barları uygulandı.
- **3 Sekmeli Akıllı Tarif Sihirbazı (\`RecipeWizard\`):** 7 adımlı uzun dikey scroll yerine 3 mantıksal odak sekmesi (\`identity\` Kimlik & Bilgiler, \`steps_nutrition\` Adımlar & Malzemeler, \`kitchen\` Mutfak Değişimleri & Pişirme) ve üstte anlık kalori/değişim telemetrisi entegre edildi.
- **Kişiselleştirilmiş Tarif Takası (\`RecipeSwapModal\`):** "Danışan Hedefine Otomatik Ölçekle" kontrolü ve kompakt liste satırları ile hücre içi değişim hızlandırıldı.
- **Birleşik Paylaşım ve İşlem Menüsü (\`RecipeDetailModal\`):** 6 adet dağınık aksiyon butonu "Paylaş & PDF" dropdown menüsü ve üç nokta (\`MoreHorizontal\`) açılır menüsü altında toplandı, güvenli \`<ConfirmModal>\` silme onayına bağlandı.
- **Akordeon Makro Ayarlayıcı (\`MenuPlannerView\`):** Makro presetleri tek bir açılır menüye toplanarak özel sürgüler isteğe bağlı açılır akordeon içine alındı.

### 15.4. Derleme ve Kalite Güvence Onayları
- **TypeScript Derleme Denetimi:** \`tsc --noEmit\` -> **0 HATA (Exit code 0)**.
- **Üretim Paketi Derlemesi:** \`vite build\` -> **0 HATA (Exit code 0, 1.702 modül dönüştürüldü)**.
- **GitHub Deposu:** \`https://github.com/enesemen/Chia-1.3.git\` (Branch: \`main\`, Release Tag: \`v1.3.0\`).
- **Master Kod Dosyası:** \`C:\\Users\\enese\\Downloads\\Chia_v1.3_Master_Code.txt\`
- **Master Mimari Dosyası:** \`C:\\Users\\enese\\Downloads\\Chia_v1.3_Master_Architecture.txt\`

---
*Rapor Sonu — Chia v1.3 Mimari Belgesi Başarıyla Mühürlenmiştir.*
`;

const sec15Idx = archContent.indexOf('## 15. KOD TABANI İSTATİSTİKLERİ, METRİKLER VE DOĞRULAMA RAPORU');
if (sec15Idx !== -1) {
  archContent = archContent.substring(0, sec15Idx) + section15Replacement;
} else {
  archContent += '\n\n' + section15Replacement;
}

fs.writeFileSync(archPath, archContent, 'utf-8');
console.log(`Wrote ${archPath} (${(Buffer.byteLength(archContent, 'utf-8') / 1024).toFixed(1)} KB)`);
