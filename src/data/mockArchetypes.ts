import { ClientProfile } from '../types/nutrition';

// TODO [ORBIO-INTEGRATION]: Bu 2 kişilik örnek danışan verisi (INITIAL_CLIENTS), Chia diyet planlama
// projesi Orbio uçtan uca diyetisyen paneline entegre edildiğinde silinecek ve doğrudan Orbio'daki
// merkezi Danışanlar modülünün state/veritabanı katmanına bağlanacaktır.
export const INITIAL_CLIENTS: ClientProfile[] = [
  {
    id: 'client_001',
    name: 'Merve Doğan',
    age: 32,
    gender: 'Kadın',
    heightCm: 168,
    weightKg: 67.5,
    dailyCalorieTarget: 1650,
    archetypeId: 'archetype_lowcarb',
    dietTypePreference: 'GF',
    allergies: ['Gluten', 'Kabuklu Deniz Ürünleri']
  },
  {
    id: 'client_002',
    name: 'Burak Yılmaz',
    age: 41,
    gender: 'Erkek',
    heightCm: 182,
    weightKg: 88.0,
    dailyCalorieTarget: 2100,
    archetypeId: 'archetype_mediterranean',
    dietTypePreference: 'STD',
    allergies: []
  }
];
