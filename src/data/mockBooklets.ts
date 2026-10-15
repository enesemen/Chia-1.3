import { RecipeBooklet } from '../types/nutrition';

export const INITIAL_BOOKLETS: RecipeBooklet[] = [
  {
    id: 'booklet-001', title: 'Glutensiz Tatlı Alternatifler - Diyetisyen Hale', subtitle: 'Hassas Sindirim & Şekersiz Lezzet Kitapçığı',
    authorName: 'Dyt. Zeynep Hale Kocaoğlu', description: 'Glutensiz beslenen ve kan şekeri dengesini korumak isteyen danışanlar için özel olarak kurgulanmış, fonksiyonel tatlı alternatifleri kütüphanesi.',
    coverTheme: 'amber', recipeIds: ['REC-2026-004', 'REC-2026-008', 'REC-2026-012'], tags: ['Glutensiz', 'Tatlı', 'Hassas Sindirim', 'El Kitapçığı'],
    notes: 'Her tarif porsiyon ve değişim tablosu ile birlikte danışana sunulmaya hazırdır.', createdAt: '2026-09-20T10:00:00.000Z', updatedAt: '2026-09-24T11:00:00.000Z'
  },
  {
    id: 'booklet-002', title: 'Yüksek Proteinli Pratik Öğünler', subtitle: 'Kas Kütlesi & Yoğun Tempolu Günler',
    authorName: 'Dyt. Zeynep Hale Kocaoğlu', description: 'Sporcu ve aktif yaşam süren danışanların öğün ihtiyaçları için hazırlama süresi 20 dakikayı geçmeyen yüksek proteinli özel tarif seçkisi.',
    coverTheme: 'emerald', recipeIds: ['REC-2026-001', 'REC-2026-003', 'REC-2026-005', 'REC-2026-009'], tags: ['Yüksek Protein', 'Pratik', 'Ofis & Spor'],
    notes: 'Öğün saklama ve dondurucu tavsiyeleri içerir.', createdAt: '2026-09-21T14:30:00.000Z', updatedAt: '2026-09-24T11:00:00.000Z'
  },
  {
    id: 'booklet-003', title: 'Eliminasyon & İBS Dostu Mutfak Rehberi', subtitle: 'Düşük FODMAP & Şişkinlik Karşıtı Reçeteler',
    authorName: 'Dyt. Zeynep Hale Kocaoğlu', description: 'Bağırsak mikrobiyotası onarımında ve eliminasyon protokolü birinci evresinde güvenle uygulanabilecek anti-enflamatuar tarifler.',
    coverTheme: 'stone', recipeIds: ['REC-2026-002', 'REC-2026-006', 'REC-2026-010'], tags: ['Eliminasyon', 'Low-FODMAP', 'Bağırsak Sağlığı'],
    notes: 'Alerjen ve laktoz/gluten bildirimleri sayfalarda vurgulanmıştır.', createdAt: '2026-09-22T09:15:00.000Z', updatedAt: '2026-09-24T11:00:00.000Z'
  }
];
