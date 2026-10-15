import React, { useState, useMemo, useEffect } from 'react';
import { ChiaAssistantBanner } from '../common/ChiaMascot';
import { Sparkles, User, Clock, CheckCircle2, RefreshCw, Printer, Utensils, Search, X, Shuffle, Settings, Grid, PieChart, Sliders } from 'lucide-react';
import { useNutrition } from '../../context/NutritionContext';
import { DietType } from '../../types/nutrition';
import {
  BMRFormula, CalorieArchetypeLevel, MealPoolOption, MealRole, PlannerClientData,
  SelectedMealConfig, DayScheduleConfig, WeeklyMenuPlan, PlannedMealItem,
  RecipeSourceType, RecipeVarietyStrategy, MacroRatioConfig
} from '../../types/menuPlanner';
import {
  DAYS_OF_WEEK, ARCHETYPE_PRESETS, sortMealsByCanonicalOrder, autoDistributeMealPercentages,
  calculateBMR, calculateBMI, calculateTargetEnergyFromPAL, determineDefaultArchetype,
  generateWeeklyMenuPlan, swapRecipeInDayMenu, optimizeDayMenuMacros
} from '../../services/menuPlanningEngine';
import { calculateTargetMacroGrams } from '../../utils/nutritionCalculator';
import { RecipeSwapModal } from './RecipeSwapModal';
import { MenuPrintModal } from './MenuPrintModal';
import { WeeklyMatrixView } from './WeeklyMatrixView';

const DIET_CRITERIA_OPTIONS: { id: DietType; label: string }[] = [
  { id: 'Standart (STD)', label: 'Standart (STD)' },
  { id: 'Glutensiz (GF)', label: 'Glutensiz (GF)' },
  { id: 'Laktozsuz (LF)', label: 'Laktozsuz (LF)' },
  { id: 'Ketojenik', label: 'Ketojenik' },
  { id: 'Eliminasyon (4\'lü)', label: 'Eliminasyon (4\'lü)' },
  { id: 'Düşük FODMAP', label: 'Düşük FODMAP' },
  { id: 'Histamin', label: 'Histamin' },
  { id: 'Fertilite', label: 'Fertilite' }
];

const normalizeDietCriterion = (pref?: DietType): DietType[] => {
  if (!pref || pref === 'STD' || pref === 'Standart (STD)') return ['Standart (STD)'];
  if (pref === 'GF' || pref === 'Glutensiz (GF)') return ['Glutensiz (GF)'];
  if (pref === 'LF' || pref === 'Laktozsuz (LF)') return ['Laktozsuz (LF)'];
  if (pref === 'GF + LF' || pref === 'GF+LF') return ['Glutensiz (GF)', 'Laktozsuz (LF)'];
  if (pref === 'Eliminasyon') return ['Eliminasyon (4\'lü)'];
  if (pref === 'FODMAP') return ['Düşük FODMAP'];
  return [pref];
};

const COMMON_ALLERGEN_SUGGESTIONS = ['Gluten', 'Laktoz', 'Yer Fıstığı', 'Kabuklu Deniz Ürünleri', 'Soya', 'Yumurta', 'Susam', 'Fındık / Ceviz'];

const ALL_AVAILABLE_MEAL_SLOTS: { name: MealPoolOption; role: MealRole; defaultPct: number; icon: string }[] = [
  { name: 'Kahvaltı', role: 'Ana Öğün', defaultPct: 25, icon: '🍳' },
  { name: 'Kuşluk', role: 'Ara Öğün', defaultPct: 10, icon: '🍏' },
  { name: 'Öğle', role: 'Ana Öğün', defaultPct: 30, icon: '🍲' },
  { name: 'İkindi', role: 'Ara Öğün', defaultPct: 10, icon: '🥜' },
  { name: 'Akşam', role: 'Ana Öğün', defaultPct: 25, icon: '🥗' },
  { name: 'Gece', role: 'Ara Öğün', defaultPct: 10, icon: '🥛' }
];

export interface MacroPreset {
  id: string; label: string; shortDesc: string; carbPct: number; proteinPct: number; fatPct: number; tag: string; description: string;
}

export const MACRO_PRESETS: MacroPreset[] = [
  { id: 'balanced', label: 'Dengeli (Akdeniz)', shortDesc: '%50 Karb · %20 Pro · %30 Yağ', carbPct: 50, proteinPct: 20, fatPct: 30, tag: 'Standart / DSÖ', description: 'Dünya Sağlık Örgütü ve Akdeniz tipi standart piramidi' },
  { id: 'low_carb', label: 'Düşük Karbonhidrat', shortDesc: '%25 Karb · %30 Pro · %45 Yağ', carbPct: 25, proteinPct: 30, fatPct: 45, tag: 'Low-Carb', description: 'İnsülin direnci ve yağ yakımı için optimize düşük karbonhidrat' },
  { id: 'keto', label: 'Ketojenik', shortDesc: '%5 Karb · %20 Pro · %75 Yağ', carbPct: 5, proteinPct: 20, fatPct: 75, tag: 'Keto', description: 'Terapötik ketozis ve minimal karbonhidrat' },
  { id: 'high_protein', label: 'Yüksek Protein', shortDesc: '%40 Karb · %35 Pro · %25 Yağ', carbPct: 40, proteinPct: 35, fatPct: 25, tag: 'Sporcu / Güç', description: 'Kas onarımı ve sporcu performans beslenmesi' },
  { id: 'zone', label: 'Zone (40-30-30)', shortDesc: '%40 Karb · %30 Pro · %30 Yağ', carbPct: 40, proteinPct: 30, fatPct: 30, tag: 'Zone Modeli', description: 'Stabil glikemi ve dengeli hormonal yanıt' },
  { id: 'low_fat', label: 'Düşük Yağ', shortDesc: '%60 Karb · %20 Pro · %20 Yağ', carbPct: 60, proteinPct: 20, fatPct: 20, tag: 'Kardiyo / DASH', description: 'Kardiyovasküler koruma ve DASH protokolü' }
];

export { autoDistributeMealPercentages };

export const MenuPlannerView: React.FC = () => {
  const { recipes, booklets, clients, activePlannerClientId, setActivePlannerClientId } = useNutrition();

  const [activeView, setActiveView] = useState<'panel' | 'matrix'>('panel');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState<number>(30);
  const [gender, setGender] = useState<'Kadın' | 'Erkek'>('Kadın');
  const [heightCm, setHeightCm] = useState<number>(165);
  const [weightKg, setWeightKg] = useState<number>(65);
  const [targetWeightKg, setTargetWeightKg] = useState<number>(60);
  const [activityLevel, setActivityLevel] = useState<PlannerClientData['activityLevel']>('Hafif Aktif (1-2 Gün Spor)');
  const [bmrFormula] = useState<BMRFormula>('mifflin_st_jeor');

  const [dietCriteria, setDietCriteria] = useState<DietType[]>(['Standart (STD)']);
  const [selectedArchetypeOverride, setSelectedArchetypeOverride] = useState<CalorieArchetypeLevel | null>(null);
  const [recipeSourceType, setRecipeSourceType] = useState<RecipeSourceType>('all_recipes');
  const [practicalityPreference, setPracticalityPreference] = useState<'all' | 'kolay' | 'kolay_orta' | 'zor'>('all');
  const [selectedBookletIds, setSelectedBookletIds] = useState<string[]>(() => booklets.length > 0 ? [booklets[0].id] : []);
  const [bookletSearchQuery, setBookletSearchQuery] = useState('');
  const [excludedAllergiesInput, setExcludedAllergiesInput] = useState('');

  const [selectedMeals, setSelectedMeals] = useState<SelectedMealConfig[]>([
    { name: 'Kahvaltı', role: 'Ana Öğün', percentage: 25, note: 'Hızlı hazırlanmalı' },
    { name: 'Kuşluk', role: 'Ara Öğün', percentage: 10, note: '' },
    { name: 'Öğle', role: 'Ana Öğün', percentage: 30, note: 'İş yerinde tüketilecek' },
    { name: 'İkindi', role: 'Ara Öğün', percentage: 10, note: 'Ofiste pratik atıştırmalık' },
    { name: 'Akşam', role: 'Ana Öğün', percentage: 25, note: 'Evde taze pişirilebilir' }
  ]);

  const [varietyStrategy, setVarietyStrategy] = useState<RecipeVarietyStrategy>('balanced');
  const [maxRecipeRepeatPerWeek] = useState<number>(2);
  const [isWeekdayPortableEnabled, setIsWeekdayPortableEnabled] = useState<boolean>(true);

  const [daySchedules, setDaySchedules] = useState<DayScheduleConfig[]>(() =>
    DAYS_OF_WEEK.map((day, i) => {
      const isWork = i < 5;
      return {
        day, isWorkDay: isWork, location: isWork ? 'İşte / Dışarıda' : 'Evde', specialNote: isWork ? 'Ofis günü' : 'Evde dinlenme',
        mealPortability: { Sabah: false, Kahvaltı: false, Kuşluk: isWork, Öğle: isWork, İkindi: isWork, Akşam: false, Gece: false }
      };
    })
  );

  useEffect(() => {
    setDaySchedules(prev => prev.map((s, idx) => {
      const isWork = idx < 5;
      return { ...s, mealPortability: { ...s.mealPortability, Kuşluk: isWeekdayPortableEnabled && isWork, Öğle: isWeekdayPortableEnabled && isWork, İkindi: isWeekdayPortableEnabled && isWork } };
    }));
  }, [isWeekdayPortableEnabled]);

  const [macroRatios, setMacroRatios] = useState<MacroRatioConfig>({ proteinPct: 20, carbPct: 50, fatPct: 30 });
  const [showCustomMacroSliders, setShowCustomMacroSliders] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<WeeklyMenuPlan | null>(null);
  const [optimizationNotice, setOptimizationNotice] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const [swapModalState, setSwapModalState] = useState<{ isOpen: boolean; dayIndex: number; mealIndex: number; meal: PlannedMealItem | null; dayName: string }>({
    isOpen: false, dayIndex: 0, mealIndex: 0, meal: null, dayName: ''
  });

  const handleSelectRegisteredClient = (clientId: string) => {
    if (!clientId) { setSelectedClientId(null); return; }
    const found = clients.find(c => c.id === clientId);
    if (!found) return;
    setSelectedClientId(found.id); setFullName(found.name); setAge(found.age);
    setGender(found.gender); setHeightCm(found.heightCm); setWeightKg(found.weightKg);
    setDietCriteria(normalizeDietCriterion(found.dietTypePreference));
    if (found.allergies?.length) setExcludedAllergiesInput(found.allergies.join(', '));
  };

  useEffect(() => {
    if (activePlannerClientId) { handleSelectRegisteredClient(activePlannerClientId); setActivePlannerClientId(null); }
  }, [activePlannerClientId]);

  const calculatedBMIAnalysis = useMemo(() => calculateBMI(weightKg || 68, heightCm || 166, targetWeightKg), [weightKg, heightCm, targetWeightKg]);
  const calculatedBMR = useMemo(() => calculateBMR(gender, weightKg || 60, heightCm || 160, age || 30, bmrFormula), [gender, weightKg, heightCm, age, bmrFormula]);
  const energyAnalysis = useMemo(() => calculateTargetEnergyFromPAL(calculatedBMR, activityLevel, weightKg, targetWeightKg), [calculatedBMR, activityLevel, weightKg, targetWeightKg]);

  const archetypeRecommendation = useMemo(() => determineDefaultArchetype(energyAnalysis.targetEnergy), [energyAnalysis.targetEnergy]);
  const activeArchetypeLevel: CalorieArchetypeLevel = selectedArchetypeOverride || archetypeRecommendation.archetype;
  const activeArchetypePreset = ARCHETYPE_PRESETS[activeArchetypeLevel];
  const targetMacroGrams = useMemo(() => calculateTargetMacroGrams(activeArchetypePreset.targetCalories, macroRatios), [activeArchetypePreset.targetCalories, macroRatios]);

  const selectedBooklets = useMemo(() => booklets.filter(b => selectedBookletIds.includes(b.id)), [booklets, selectedBookletIds]);
  const filteredBooklets = useMemo(() => {
    const q = bookletSearchQuery.trim().toLowerCase();
    return !q ? booklets : booklets.filter(b => [b.title, b.subtitle, b.description, b.notes, ...(b.tags || [])].some(s => s?.toLowerCase().includes(q)));
  }, [booklets, bookletSearchQuery]);

  const combinedBookletRecipeIds = useMemo(() => {
    const set = new Set<string>();
    selectedBooklets.forEach(b => (b.recipeIds || []).forEach(id => set.add(id)));
    return Array.from(set);
  }, [selectedBooklets]);

  const handleGenerateMenu = () => {
    const effectiveSourceType = recipeSourceType === 'selected_booklet' && selectedBookletIds.length === 0 ? 'all_recipes' : recipeSourceType;
    const primaryBookletTitle = selectedBooklets.length === 1 ? selectedBooklets[0].title : selectedBooklets.length > 1 ? `${selectedBooklets.length} Kitapçık (${selectedBooklets.map(b => b.title).join(', ')})` : 'Seçili Kitapçıklar';
    const vScore = varietyStrategy === 'max_variety' ? 5 : varietyStrategy === 'batch_cooking' ? 2 : 3;

    const clientData: PlannerClientData = {
      clientId: selectedClientId || undefined, fullName: fullName.trim() || 'Danışan', age: Number(age) || 30, gender,
      heightCm: Number(heightCm) || 165, weightKg: Number(weightKg) || 65, targetWeightKg: Number(targetWeightKg) || undefined,
      activityLevel, bmrFormula, calculatedBMR, calculatedBMI: calculatedBMIAnalysis.bmi, bmiCategory: calculatedBMIAnalysis.category,
      calculatedTargetEnergy: energyAnalysis.targetEnergy, isEnergyBelowMinimumSafety: archetypeRecommendation.isBelowMinimumSafety,
      defaultArchetype: archetypeRecommendation.archetype, selectedArchetype: activeArchetypeLevel,
      selectionMode: selectedArchetypeOverride ? 'manual' : 'auto', targetMacroRatios: macroRatios, dietCriteria,
      recipeSource: {
        sourceType: effectiveSourceType,
        bookletId: effectiveSourceType === 'selected_booklet' ? selectedBookletIds[0] : undefined,
        bookletTitle: effectiveSourceType === 'selected_booklet' ? primaryBookletTitle : undefined,
        bookletIds: effectiveSourceType === 'selected_booklet' ? selectedBookletIds : undefined,
        bookletTitles: effectiveSourceType === 'selected_booklet' ? selectedBooklets.map(b => b.title) : undefined,
        bookletRecipeIds: effectiveSourceType === 'selected_booklet' ? combinedBookletRecipeIds : undefined
      },
      practicalityPreference, varietyStrategy, varietyScore: vScore, maxRecipeRepeatPerWeek,
      preferences: { likedFoods: [], dislikedFoods: [], excludedAllergies: excludedAllergiesInput.split(',').map(s => s.trim()).filter(Boolean) }
    };

    const newPlan = generateWeeklyMenuPlan(clientData, selectedMeals, daySchedules, recipes, 3, maxRecipeRepeatPerWeek, varietyStrategy, vScore);
    setGeneratedPlan(newPlan);
    setActiveView('matrix');
    return newPlan;
  };

  const handleReOptimizeDay = (dayIndex: number) => {
    if (!generatedPlan) return;
    const targetDay = generatedPlan.days[dayIndex];
    if (!targetDay) return;
    const targetMacros = generatedPlan.targetDailyMacros || calculateTargetMacroGrams(targetDay.targetCalories, macroRatios);
    const updatedDays = [...generatedPlan.days];
    updatedDays[dayIndex] = optimizeDayMenuMacros(targetDay, targetMacros, recipes, generatedPlan.client, 12);
    setGeneratedPlan({ ...generatedPlan, days: updatedDays, updatedAt: new Date().toISOString() });
    setOptimizationNotice(`✓ ${targetDay.day} menüsü başarıyla optimize edildi.`);
    setTimeout(() => setOptimizationNotice(null), 3500);
  };

  const handleReOptimizeAllDays = () => {
    if (!generatedPlan) return;
    const targetMacros = generatedPlan.targetDailyMacros || calculateTargetMacroGrams(activeArchetypePreset.targetCalories, macroRatios);
    setGeneratedPlan({
      ...generatedPlan,
      days: generatedPlan.days.map(d => optimizeDayMenuMacros(d, targetMacros, recipes, generatedPlan.client, 12)),
      updatedAt: new Date().toISOString()
    });
    setOptimizationNotice('✓ Tüm 7 günün menüsü hedeflere göre başarıyla yeniden optimize edildi.');
    setTimeout(() => setOptimizationNotice(null), 3500);
  };

  const toggleMealItem = (mealName: MealPoolOption, role: MealRole, defaultPct: number) => {
    setSelectedMeals(prev => {
      const exists = prev.some(m => m.name === mealName);
      if (exists && prev.length <= 1) return prev;
      return autoDistributeMealPercentages(exists ? prev.filter(m => m.name !== mealName) : sortMealsByCanonicalOrder([...prev, { name: mealName, role, percentage: defaultPct, note: '' }]));
    });
  };

  const handleMacroSliderChange = (macroKey: 'carb' | 'protein' | 'fat', rawValue: number) => {
    const clamped = Math.max(5, Math.min(85, rawValue));
    setMacroRatios(prev => {
      if (macroKey === 'carb') {
        let nextFat = prev.fatPct - (clamped - prev.carbPct), nextProtein = prev.proteinPct;
        if (nextFat < 10) { nextProtein = Math.max(10, nextProtein - (10 - nextFat)); nextFat = 10; }
        return { carbPct: clamped, proteinPct: nextProtein, fatPct: nextFat };
      }
      if (macroKey === 'protein') {
        let nextFat = prev.fatPct - (clamped - prev.proteinPct), nextCarb = prev.carbPct;
        if (nextFat < 10) { nextCarb = Math.max(5, nextCarb - (10 - nextFat)); nextFat = 10; }
        return { carbPct: nextCarb, proteinPct: clamped, fatPct: nextFat };
      }
      let nextCarb = prev.carbPct - (clamped - prev.fatPct), nextProtein = prev.proteinPct;
      if (nextCarb < 5) { nextProtein = Math.max(10, nextProtein - (5 - nextCarb)); nextCarb = 5; }
      return { carbPct: nextCarb, proteinPct: nextProtein, fatPct: clamped };
    });
  };

  const handleNormalizeMealPercentages = () => {
    if (selectedMeals.length === 0) return;
    const currentSum = selectedMeals.reduce((acc, m) => acc + (m.percentage || 0), 0);
    if (currentSum === 0) {
      const base = Math.floor(100 / selectedMeals.length), rem = 100 - base * selectedMeals.length;
      setSelectedMeals(prev => prev.map((m, idx) => ({ ...m, percentage: base + (idx === 0 ? rem : 0) })));
      return;
    }
    let allocated = 0;
    setSelectedMeals(selectedMeals.map((m, idx) => {
      if (idx === selectedMeals.length - 1) return { ...m, percentage: Math.max(1, 100 - allocated) };
      const prop = Math.max(1, Math.round((m.percentage / currentSum) * 100));
      allocated += prop;
      return { ...m, percentage: prop };
    }));
  };

  const macroSliderConfigs = [
    { key: 'carb' as const, title: 'Karbonhidrat (KH)', pct: macroRatios.carbPct, min: 5, max: 80, calFactor: 4, dotClass: 'bg-amber-500', boxClass: 'border-amber-200/80 bg-amber-50/40', badgeClass: 'text-amber-950 border-amber-300', rangeClass: 'bg-amber-200 accent-amber-600' },
    { key: 'protein' as const, title: 'Protein (PRT)', pct: macroRatios.proteinPct, min: 10, max: 60, calFactor: 4, dotClass: 'bg-emerald-600', boxClass: 'border-emerald-200/80 bg-emerald-50/40', badgeClass: 'text-emerald-950 border-emerald-300', rangeClass: 'bg-emerald-200 accent-emerald-600' },
    { key: 'fat' as const, title: 'Yağ (FAT)', pct: macroRatios.fatPct, min: 10, max: 80, calFactor: 9, dotClass: 'bg-rose-500', boxClass: 'border-rose-200/80 bg-rose-50/40', badgeClass: 'text-rose-950 border-rose-300', rangeClass: 'bg-rose-200 accent-rose-500' }
  ];

  const totalMealPct = selectedMeals.reduce((acc, m) => acc + (m.percentage || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16 font-sans">
      {generatedPlan && (
        <div className="flex items-center justify-end gap-4 pb-2 border-b border-slate-200">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
              <button type="button" onClick={() => setActiveView('panel')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeView === 'panel' ? 'bg-white text-slate-900 font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}>
                <Settings className="w-3.5 h-3.5 text-amber-900" /><span>Planlama Ayarları</span>
              </button>
              <button type="button" onClick={() => setActiveView('matrix')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${activeView === 'matrix' ? 'bg-amber-900 text-white font-bold shadow-2xs' : 'text-slate-600 hover:text-slate-900'}`}>
                <Grid className="w-3.5 h-3.5" /><span>Haftalık Matris</span>
              </button>
            </div>
            {activeView === 'matrix' && (
              <>
                <button type="button" onClick={() => setIsPrintModalOpen(true)} className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-2xs transition-all cursor-pointer">
                  <Printer className="w-3.5 h-3.5 text-amber-400" /><span>PDF & Yazdır</span>
                </button>
                <button type="button" onClick={handleGenerateMenu} className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-stone-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer">
                  <RefreshCw className="w-3.5 h-3.5 text-slate-500" /><span>Yeniden Oluştur</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {activeView === 'panel' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <ChiaAssistantBanner
            pose="planning" badgeText="Chia Robot Asistan" title="Akıllı Menü & Reçete Planlama"
            description="Danışanın kalori ve makro hedeflerine tam uyumlu 7 günlük fonksiyonel beslenme planı oluşturun."
            actionButton={
              <button type="button" onClick={handleGenerateMenu} className="flex items-center gap-2 px-5 py-2.5 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer whitespace-nowrap">
                <Sparkles className="w-4 h-4 text-amber-300" /><span>{generatedPlan ? 'Planı Güncelle ve Matrise Dön' : 'Haftalık Menüyü Oluştur'}</span>
              </button>
            }
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2"><User className="w-4 h-4 text-amber-900" /><h2 className="text-sm font-bold font-serif text-slate-900">Danışan & Kalori Hedefi</h2></div>
                {clients.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-slate-400">Kayıtlı:</span>
                    <select value={selectedClientId || ''} onChange={e => handleSelectRegisteredClient(e.target.value)} className="px-2.5 py-1 bg-stone-50 border border-slate-200 rounded-lg text-slate-800 font-semibold text-xs focus:ring-1 focus:ring-amber-900 focus:outline-none">
                      <option value="">Manuel Danışan</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.dailyCalorieTarget} kcal)</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ad Soyad</label>
                  <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-stone-50/50 focus:bg-white focus:ring-1 focus:ring-amber-900 font-medium" placeholder="Danışan Adı" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cinsiyet</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['Kadın', 'Erkek'] as const).map(g => (
                      <button key={g} type="button" onClick={() => setGender(g)} className={`py-1.5 px-3 rounded-lg border font-bold transition-all cursor-pointer text-xs ${gender === g ? 'bg-amber-900 border-amber-900 text-white' : 'border-slate-200 bg-stone-50 text-slate-700 hover:bg-slate-100'}`}>{g}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Yaş & Boy (cm)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" value={age} onChange={e => setAge(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-stone-50/50 font-medium text-center" placeholder="Yaş" />
                    <input type="number" value={heightCm} onChange={e => setHeightCm(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-stone-50/50 font-medium text-center" placeholder="Boy" />
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kilo (kg) & Hedef</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" step="0.5" value={weightKg} onChange={e => setWeightKg(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-stone-50/50 font-medium text-center" placeholder="Mevcut" />
                    <input type="number" step="0.5" value={targetWeightKg} onChange={e => setTargetWeightKg(Number(e.target.value))} className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-stone-50/50 font-medium text-center" placeholder="Hedef" />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Fiziksel Aktivite Faktörü (PAL)</label>
                    <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                      PAL: {energyAnalysis.pal}x · TDEE: {energyAnalysis.tdee} kcal
                    </span>
                  </div>
                  <select value={activityLevel} onChange={e => setActivityLevel(e.target.value as PlannerClientData['activityLevel'])} className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-stone-50/50 font-medium text-xs focus:outline-none focus:ring-1 focus:ring-amber-900">
                    <option value="Sedanter (Masa Başı, Sıfır Egzersiz)">Sedanter (Masa Başı, Minimum Hareket) — PAL 1.0x</option>
                    <option value="Hafif Aktif (1-2 Gün Spor)">Hafif Aktif (Haftada 1-2 Gün Spor/Yürüyüş) — PAL 1.1x</option>
                    <option value="Orta Derece Aktif (3-5 Gün Spor)">Orta Derece Aktif (Haftada 3-5 Gün Spor) — PAL 1.2x</option>
                    <option value="Çok Aktif (6-7 Gün Ağır Spor)">Çok Aktif (Haftada 6-7 Gün Yoğun Antrenman) — PAL 1.4x</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-semibold text-slate-700 text-xs">Kalori Arketipi</label>
                  {selectedArchetypeOverride && (
                    <button type="button" onClick={() => setSelectedArchetypeOverride(null)} className="text-[11px] text-amber-800 hover:underline cursor-pointer">
                      Önerilene Dön ({archetypeRecommendation.archetype})
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {(Object.keys(ARCHETYPE_PRESETS) as CalorieArchetypeLevel[]).map(arch => {
                    const isSelected = activeArchetypeLevel === arch;
                    return (
                      <button key={arch} type="button" onClick={() => setSelectedArchetypeOverride(arch)} className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${isSelected ? 'bg-amber-900 border-amber-900 text-white shadow-2xs font-bold' : 'bg-white border-slate-200 text-slate-700 hover:bg-stone-50'}`}>
                        <div className="text-xs font-bold">{arch}</div>
                        <div className={`text-[10px] font-mono ${isSelected ? 'text-amber-200' : 'text-slate-400'}`}>{ARCHETYPE_PRESETS[arch].targetCalories} kcal</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2"><Utensils className="w-4 h-4 text-amber-900" /><h2 className="text-sm font-bold font-serif text-slate-900">Diyet Tipi & Tarif Havuzu</h2></div>
                <span className="text-[11px] font-mono text-slate-400">{recipes.length} Aktif Tarif</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1.5">Diyet Modeli</label>
                <div className="flex flex-wrap gap-1.5">
                  {DIET_CRITERIA_OPTIONS.map(d => {
                    const isSelected = dietCriteria.includes(d.id);
                    return (
                      <button
                        key={d.id} type="button"
                        onClick={() => setDietCriteria(prev => {
                          if (d.id === 'Standart (STD)') return ['Standart (STD)'];
                          if (prev.includes(d.id)) {
                            const next = prev.filter(x => x !== d.id);
                            return next.length === 0 ? ['Standart (STD)'] : next;
                          }
                          return [...prev.filter(x => x !== 'STD' && x !== 'Standart (STD)'), d.id];
                        })}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer ${isSelected ? 'bg-amber-900 border-amber-900 text-white shadow-2xs' : 'bg-stone-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1.5">Tarif Kaynağı</label>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button type="button" onClick={() => setRecipeSourceType('all_recipes')} className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${recipeSourceType === 'all_recipes' ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-stone-50 text-slate-700 hover:bg-slate-100'}`}>Tüm Tarif Havuzu ({recipes.length})</button>
                  <button type="button" onClick={() => setRecipeSourceType('selected_booklet')} className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${recipeSourceType === 'selected_booklet' ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-200 bg-stone-50 text-slate-700 hover:bg-slate-100'}`}>Kitapçıklardan Seç ({booklets.length})</button>
                </div>

                {recipeSourceType === 'selected_booklet' && (
                  <div className="p-3 bg-stone-50 rounded-xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input type="text" value={bookletSearchQuery} onChange={e => setBookletSearchQuery(e.target.value)} placeholder="Kitapçık adı veya kategori ara..." className="w-full pl-8 pr-7 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium focus:outline-none focus:border-amber-800" />
                        {bookletSearchQuery && <button type="button" onClick={() => setBookletSearchQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"><X className="w-3 h-3" /></button>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => setSelectedBookletIds(prev => Array.from(new Set([...prev, ...filteredBooklets.map(b => b.id)])))} className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-700 cursor-pointer">Tümünü Seç</button>
                        <button type="button" onClick={() => { const v = new Set(filteredBooklets.map(b => b.id)); setSelectedBookletIds(prev => prev.filter(id => !v.has(id))); }} className="px-2 py-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 cursor-pointer">Temizle</button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 px-0.5">
                      <span>Seçili: <strong className="text-amber-950 font-bold">{selectedBookletIds.length}</strong> / {booklets.length} kitapçık</span>
                      <span className="font-mono text-emerald-800 font-bold">{combinedBookletRecipeIds.length} Havuz Tarifi</span>
                    </div>

                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                      {filteredBooklets.length > 0 ? filteredBooklets.map(b => {
                        const isChecked = selectedBookletIds.includes(b.id);
                        return (
                          <label key={b.id} className={`flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer text-xs ${isChecked ? 'bg-amber-50/80 border-amber-300 shadow-2xs font-semibold' : 'bg-white border-slate-200 hover:bg-stone-50/70 text-slate-700'}`}>
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <input type="checkbox" checked={isChecked} onChange={() => setSelectedBookletIds(prev => prev.includes(b.id) ? prev.filter(id => id !== b.id) : [...prev, b.id])} className="rounded border-slate-300 text-amber-900 focus:ring-amber-900 shrink-0" />
                              <span className={`truncate ${isChecked ? 'text-amber-950 font-bold' : 'text-slate-800'}`}>{b.title}</span>
                            </div>
                            <span className="text-slate-400 font-mono text-[11px] shrink-0 ml-2">({b.recipeIds?.length || 0} tarif)</span>
                          </label>
                        );
                      }) : (
                        <div className="py-4 text-center text-slate-400 text-xs italic bg-white rounded-lg border border-dashed border-slate-200">"{bookletSearchQuery}" aramasına uygun kitapçık bulunamadı.</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1.5">Tarif Pratiklik Filtresi</label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'all', label: 'Tümü' }, { id: 'kolay', label: 'Kolay' },
                    { id: 'kolay_orta', label: 'Kolay / Orta' }, { id: 'zor', label: 'Zor / İleri' }
                  ].map(p => (
                    <button key={p.id} type="button" onClick={() => setPracticalityPreference(p.id as any)} className={`py-1.5 px-2 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer text-center truncate ${practicalityPreference === p.id ? 'bg-amber-900 border-amber-900 text-white shadow-2xs' : 'border-slate-200 bg-stone-50 text-slate-700 hover:bg-slate-100'}`}>{p.label}</button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center gap-2"><Shuffle className="w-4 h-4 text-amber-900" /><h3 className="text-xs font-bold text-slate-900">Tarif Tekrar Stratejisi & Çeşitlilik</h3></div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'balanced', label: 'Dengeli', desc: 'Maks 2 tekrar' },
                    { id: 'max_variety', label: 'Yüksek Çeşitlilik', desc: 'Tekrarsız menü' },
                    { id: 'batch_cooking', label: 'Pratik / Batch', desc: '3 tekrar (kolay)' }
                  ].map(v => (
                    <button key={v.id} type="button" onClick={() => setVarietyStrategy(v.id as RecipeVarietyStrategy)} className={`p-2 rounded-xl border text-center transition-all cursor-pointer ${varietyStrategy === v.id ? 'bg-amber-900 border-amber-900 text-white shadow-2xs font-bold' : 'bg-stone-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>
                      <div className="text-xs font-bold">{v.label}</div>
                      <div className={`text-[10px] ${varietyStrategy === v.id ? 'text-amber-200' : 'text-slate-400'}`}>{v.desc}</div>
                    </button>
                  ))}
                </div>

                <div className="p-3 bg-stone-50 rounded-xl border border-slate-200">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input type="checkbox" checked={isWeekdayPortableEnabled} onChange={e => setIsWeekdayPortableEnabled(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-amber-900 focus:ring-amber-900 mt-0.5 cursor-pointer" />
                    <div>
                      <div className="text-xs font-bold text-slate-900">Hafta içi iş günlerinde taşınabilir tarifleri önceliklendir</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">Pazartesi'den Cuma'ya kadar öğle ve ikindi ara öğünleri için ofise ve taşımaya uygun pratik tarifler seçilir.</div>
                    </div>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 text-xs mb-1">Hariç Tutulacak Alerjen / Gıdalar</label>
                <div className="flex flex-wrap gap-1 mb-2">
                  {COMMON_ALLERGEN_SUGGESTIONS.map(allergen => {
                    const isSelected = excludedAllergiesInput.toLowerCase().includes(allergen.toLowerCase());
                    return (
                      <button
                        key={allergen} type="button"
                        onClick={() => {
                          const list = excludedAllergiesInput.split(',').map(s => s.trim()).filter(Boolean);
                          setExcludedAllergiesInput((list.includes(allergen) ? list.filter(a => a !== allergen) : [...list, allergen]).join(', '));
                        }}
                        className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-all cursor-pointer border ${isSelected ? 'bg-rose-100 text-rose-900 border-rose-300' : 'bg-white text-slate-600 border-slate-200 hover:bg-stone-50'}`}
                      >
                        {isSelected ? '✕ ' : '+ '}{allergen}
                      </button>
                    );
                  })}
                </div>
                <input type="text" value={excludedAllergiesInput} onChange={e => setExcludedAllergiesInput(e.target.value)} className="w-full px-3 py-1.5 rounded-xl border border-slate-200 bg-stone-50/50 focus:bg-white text-xs font-medium" placeholder="Virgülle ayırarak serbest gıda yazabilirsiniz (örn: dereotu, karides)" />
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-900" /><h2 className="text-sm font-bold font-serif text-slate-900">Öğün Düzeni & Dağılımı</h2></div>
                <div className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded-full ${totalMealPct === 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                    {selectedMeals.length} Öğün · Toplam: %{totalMealPct}
                  </span>
                  {totalMealPct !== 100 && (
                    <button type="button" onClick={handleNormalizeMealPercentages} className="text-[10px] text-amber-800 underline hover:text-amber-950 font-bold cursor-pointer">100'e Eşitle</button>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 px-1">
                  <span>Öğün Seçimi (İşaretleyin / Kaldırın)</span><span>Öğün Payı & Kalori</span>
                </div>
                {ALL_AVAILABLE_MEAL_SLOTS.map(slot => {
                  const selectedConfig = selectedMeals.find(m => m.name === slot.name);
                  const isChecked = !!selectedConfig;
                  const pct = selectedConfig?.percentage ?? slot.defaultPct;
                  const approxCal = Math.round((activeArchetypePreset.targetCalories * pct) / 100);

                  return (
                    <div key={slot.name} className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 text-xs ${isChecked ? 'bg-white border-amber-300 shadow-2xs' : 'bg-stone-50/70 border-slate-200/80 opacity-60 hover:opacity-100'}`}>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <input type="checkbox" id={`meal-slot-${slot.name}`} checked={isChecked} onChange={() => toggleMealItem(slot.name, slot.role, slot.defaultPct)} className="rounded border-slate-300 text-amber-900 focus:ring-amber-900 cursor-pointer w-4 h-4 shrink-0" />
                        <label htmlFor={`meal-slot-${slot.name}`} className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-slate-900">
                          <span className="text-sm">{slot.icon}</span><span>{slot.name}</span>
                        </label>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold shrink-0 ${slot.role === 'Ana Öğün' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100'}`}>{slot.role}</span>
                      </div>

                      {isChecked ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button type="button" onClick={() => setSelectedMeals(prev => prev.map(m => m.name === slot.name ? { ...m, percentage: Math.max(5, Math.min(80, (m.percentage || 20) - 5)) } : m))} disabled={pct <= 5} className="w-5 h-5 rounded bg-stone-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center justify-center cursor-pointer">-</button>
                          <div className="flex items-center bg-stone-50 rounded-lg border border-slate-200 px-1.5 py-0.5">
                            <span className="text-[10px] text-slate-400 font-bold mr-0.5">%</span>
                            <input type="number" min="5" max="80" step="5" value={pct} onChange={e => { const val = Math.max(1, Math.min(100, Number(e.target.value) || 0)); setSelectedMeals(prev => prev.map(m => m.name === slot.name ? { ...m, percentage: val } : m)); }} className="w-8 font-mono font-bold text-slate-900 text-center bg-transparent focus:outline-none text-xs" />
                          </div>
                          <button type="button" onClick={() => setSelectedMeals(prev => prev.map(m => m.name === slot.name ? { ...m, percentage: Math.max(5, Math.min(80, (m.percentage || 20) + 5)) } : m))} disabled={pct >= 70} className="w-5 h-5 rounded bg-stone-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 font-bold flex items-center justify-center cursor-pointer">+</button>
                          <span className="font-mono text-slate-500 text-[11px] min-w-[55px] text-right">~{approxCal} kcal</span>
                        </div>
                      ) : (
                        <button type="button" onClick={() => toggleMealItem(slot.name, slot.role, slot.defaultPct)} className="text-[11px] font-semibold text-amber-800 hover:underline cursor-pointer">+ Dahil Et (%{slot.defaultPct})</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                <div className="flex items-center gap-2"><PieChart className="w-4 h-4 text-amber-900" /><h2 className="text-sm font-bold font-serif text-slate-900">Hedef Makro Oranları & Dağılımı</h2></div>
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200/80 font-mono text-[11px] font-bold">
                  Toplam: %{macroRatios.carbPct + macroRatios.proteinPct + macroRatios.fatPct}
                </span>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-semibold text-slate-700 text-xs">Dağılım Modeli</label>
                  <button
                    type="button"
                    onClick={() => setShowCustomMacroSliders(!showCustomMacroSliders)}
                    className="flex items-center gap-1 text-[11px] text-amber-900 hover:underline font-bold cursor-pointer"
                  >
                    <Sliders className="w-3 h-3" /><span>{showCustomMacroSliders ? 'İnce Ayarı Gizle' : 'Özel Oran Ayarla'}</span>
                  </button>
                </div>
                <select
                  value={MACRO_PRESETS.find(p => p.carbPct === macroRatios.carbPct && p.proteinPct === macroRatios.proteinPct && p.fatPct === macroRatios.fatPct)?.id || 'custom'}
                  onChange={e => {
                    const found = MACRO_PRESETS.find(p => p.id === e.target.value);
                    if (found) setMacroRatios({ carbPct: found.carbPct, proteinPct: found.proteinPct, fatPct: found.fatPct });
                    else setShowCustomMacroSliders(true);
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-stone-50/70 text-xs font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-900 cursor-pointer"
                >
                  {MACRO_PRESETS.map(preset => (
                    <option key={preset.id} value={preset.id}>{preset.label} — {preset.shortDesc}</option>
                  ))}
                  <option value="custom">Özel Makro Oranı (%{macroRatios.carbPct} KH · %{macroRatios.proteinPct} P · %{macroRatios.fatPct} Y)</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                  <span>Hedef Gramaj Özeti</span>
                  <span className="font-mono text-slate-800 font-bold">{targetMacroGrams.carbG}g KH · {targetMacroGrams.proteinG}g P · {targetMacroGrams.fatG}g Y</span>
                </div>
                <div className="h-4 w-full bg-slate-100 rounded-lg overflow-hidden flex shadow-inner border border-slate-200/80">
                  <div style={{ width: `${macroRatios.carbPct}%` }} className="bg-amber-500 flex items-center justify-center text-[9px] font-bold text-white">{macroRatios.carbPct >= 12 && `%${macroRatios.carbPct} KH`}</div>
                  <div style={{ width: `${macroRatios.proteinPct}%` }} className="bg-emerald-600 flex items-center justify-center text-[9px] font-bold text-white">{macroRatios.proteinPct >= 12 && `%${macroRatios.proteinPct} PRT`}</div>
                  <div style={{ width: `${macroRatios.fatPct}%` }} className="bg-rose-500 flex items-center justify-center text-[9px] font-bold text-white">{macroRatios.fatPct >= 12 && `%${macroRatios.fatPct} YAĞ`}</div>
                </div>
              </div>

              {showCustomMacroSliders && (
                <div className="space-y-2.5 pt-1 animate-in fade-in">
                  {macroSliderConfigs.map(cfg => {
                    const macroCal = Math.round((activeArchetypePreset.targetCalories * cfg.pct) / 100);
                    const macroG = Math.round(macroCal / cfg.calFactor);
                    return (
                      <div key={cfg.key} className={`p-2.5 rounded-xl border ${cfg.boxClass} space-y-1.5`}>
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${cfg.dotClass} shrink-0`} />
                            <span className="font-bold text-slate-900">{cfg.title}</span>
                            <span className="text-[10px] text-slate-500 font-mono">~{macroG}g ({macroCal} kcal)</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button type="button" onClick={() => handleMacroSliderChange(cfg.key, cfg.pct - 5)} disabled={cfg.pct <= cfg.min} className="w-5 h-5 rounded bg-white hover:bg-slate-200 disabled:opacity-40 border border-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer text-xs">-</button>
                            <span className={`font-mono font-bold text-xs px-2 py-0.5 bg-white rounded border ${cfg.badgeClass} min-w-[42px] text-center`}>%{cfg.pct}</span>
                            <button type="button" onClick={() => handleMacroSliderChange(cfg.key, cfg.pct + 5)} disabled={cfg.pct >= cfg.max} className="w-5 h-5 rounded bg-white hover:bg-slate-200 disabled:opacity-40 border border-slate-200 text-slate-700 font-bold flex items-center justify-center cursor-pointer text-xs">+</button>
                          </div>
                        </div>
                        <input type="range" min={cfg.min} max={cfg.max} step="5" value={cfg.pct} onChange={e => handleMacroSliderChange(cfg.key, Number(e.target.value))} className={`w-full h-1.5 ${cfg.rangeClass} rounded-lg appearance-none cursor-pointer focus:outline-none`} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-slate-600">
              <strong className="text-slate-900">{fullName || 'Danışan'}</strong> için <strong className="text-amber-900 font-mono">{activeArchetypePreset.targetCalories} kcal</strong> hedefli 7 günlük menü oluşturulacak.
            </div>
            <div className="flex items-center gap-3">
              {generatedPlan && (
                <button type="button" onClick={() => setActiveView('matrix')} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer">Mevcut Matrisi Görüntüle</button>
              )}
              <button type="button" onClick={handleGenerateMenu} className="flex items-center gap-2 px-6 py-2.5 bg-amber-900 hover:bg-amber-950 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer">
                <Sparkles className="w-4 h-4 text-amber-300" /><span>{generatedPlan ? 'Planı Güncelle ve Matrise Dön' : 'Haftalık Menüyü Oluştur'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeView === 'matrix' && generatedPlan && (
        <div className="space-y-4 animate-in fade-in duration-150">
          <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-bold text-slate-900 font-serif text-sm">{generatedPlan.client.fullName}</span>
              <span className="text-slate-300">·</span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-slate-700 font-semibold font-mono text-[11px]">Hedef: <strong className="text-slate-900 font-bold">{activeArchetypePreset.targetCalories} kcal</strong></span>
              <span className="text-slate-300">·</span>
              <span className="px-2 py-0.5 rounded-md bg-stone-100 text-slate-600 font-mono text-[11px]">%{macroRatios.proteinPct}P · %{macroRatios.carbPct}KH · %{macroRatios.fatPct}Y</span>
              <span className="text-slate-300">·</span>
              <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 font-bold border border-amber-200/60 text-[11px]">
                {Array.isArray(generatedPlan.client.dietCriteria) ? generatedPlan.client.dietCriteria.join(' + ') : (generatedPlan.client.dietCriteria || 'Standart')}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] text-slate-500">Haftalık Ort: <strong className="text-slate-900">{generatedPlan.weeklyStats.averageDailyCalories} kcal</strong></span>
              <button type="button" onClick={() => setActiveView('panel')} className="flex items-center gap-1 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer transition-colors">
                <Settings className="w-3.5 h-3.5 text-amber-900" /><span>Ayarları Düzenle</span>
              </button>
            </div>
          </div>

          {optimizationNotice && (
            <div className="p-3 rounded-xl bg-emerald-900 text-white text-xs font-semibold shadow-xs flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" /><span>{optimizationNotice}</span></div>
              <button type="button" onClick={() => setOptimizationNotice(null)} className="text-emerald-200 hover:text-white cursor-pointer">✕</button>
            </div>
          )}

          <WeeklyMatrixView
            plan={generatedPlan}
            allRecipes={recipes}
            targetMacroGrams={targetMacroGrams}
            activeArchetypeTargetCalories={activeArchetypePreset.targetCalories}
            onSwapRecipeClick={(dayIdx, mealIdx, meal, dayName) => setSwapModalState({ isOpen: true, dayIndex: dayIdx, mealIndex: mealIdx, meal, dayName })}
            onReOptimizeDay={handleReOptimizeDay}
            onReOptimizeAllDays={handleReOptimizeAllDays}
            onUpdatePlanTitle={newTitle => setGeneratedPlan(prev => (prev ? { ...prev, planTitle: newTitle } : null))}
          />
        </div>
      )}

      <RecipeSwapModal
        isOpen={swapModalState.isOpen}
        onClose={() => setSwapModalState(prev => ({ ...prev, isOpen: false, meal: null }))}
        meal={swapModalState.meal}
        dayName={swapModalState.dayName}
        allRecipes={recipes}
        clientName={fullName}
        dietCriteria={dietCriteria}
        excludedAllergies={excludedAllergiesInput.split(',').map(s => s.trim()).filter(Boolean)}
        activeBookletRecipeIds={recipeSourceType === 'selected_booklet' ? combinedBookletRecipeIds : undefined}
        onSelectRecipe={(newRecipe, newAdapted) => {
          if (!generatedPlan) return;
          const targetDay = generatedPlan.days[swapModalState.dayIndex];
          if (!targetDay) return;
          const updatedDays = [...generatedPlan.days];
          updatedDays[swapModalState.dayIndex] = swapRecipeInDayMenu(targetDay, swapModalState.mealIndex, newRecipe, 3, activeArchetypeLevel, fullName, newAdapted);
          setGeneratedPlan({ ...generatedPlan, days: updatedDays, updatedAt: new Date().toISOString() });
          setSwapModalState(prev => ({ ...prev, isOpen: false, meal: null }));
          setOptimizationNotice(`✓ ${targetDay.day} ${swapModalState.meal?.mealName || 'öğünü'} tarifi başarıyla değiştirildi!`);
          setTimeout(() => setOptimizationNotice(null), 3500);
        }}
      />

      {generatedPlan && <MenuPrintModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} plan={generatedPlan} />}
    </div>
  );
};