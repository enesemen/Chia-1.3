import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2, Check, Sparkles, Save, FileEdit, ChefHat, Info, Image as ImageIcon, Upload } from 'lucide-react';
import { Recipe, MealType, DietType, RecipeIngredient, RecipeExchanges, FoodItem, RecipeStep } from '../../types/nutrition';
import { useNutrition } from '../../context/NutritionContext';
import { calculateRecipeTotalNutrition, estimateExchangesFromIngredients } from '../../utils/nutritionCalculator';
import { compressImageFile } from '../../services/pdfExportService';

const MEAL_TYPES: MealType[] = ['Kahvaltı', 'Öğle', 'Ara Öğün', 'Akşam'];
const CATEGORY_OPTIONS = [
  'Ana Yemek', 'Kahvaltılıklar', 'Çorbalar', 'Salatalar & Bowllar',
  'Ara Öğün & Atıştırmalık', 'Tatlı & Sağlıklı Kaçamak', 'İçecek & Smoothie', 'Sos & Garnitür'
];
const DIET_TYPES: { id: DietType; label: string }[] = [
  { id: 'STD', label: 'STD' }, { id: 'GF', label: 'GF' }, { id: 'LF', label: 'LF' },
  { id: 'Ketojenik', label: 'Keto' }, { id: 'Eliminasyon', label: 'Elim' },
  { id: 'Düşük FODMAP', label: 'FODMAP' }, { id: 'Histamin', label: 'Histamin' }, { id: 'Fertilite', label: 'Fertilite' }
];
const COOKING_METHODS = ['Tencere / Sote', 'Fırın', 'Izgara', 'Tencere / Haşlama', 'Çiğ / Isıl İşlemsiz', 'Airfryer', 'Buharda Pişirme'];
const PRESET_IMAGE_CATEGORIES = [
  { name: 'Somon & Balık', url: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=800&q=80' },
  { name: 'Et & Bonfile', url: 'https://images.unsplash.com/photo-1529042410759-befb1204b468?auto=format&fit=crop&w=800&q=80' },
  { name: 'Tavuk & Hindi', url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80' },
  { name: 'Salata & Meze', url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80' },
  { name: 'Çorba', url: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80' },
  { name: 'Yulaf & Bowl', url: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=800&q=80' },
  { name: 'Atıştırmalık & Tatlı', url: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=800&q=80' }
];
const EXCHANGE_FIELDS: { key: keyof RecipeExchanges; label: string }[] = [
  { key: 'protein', label: 'Protein (P)' }, { key: 'carb', label: 'Karb (K)' }, { key: 'fat', label: 'Yağ (Y)' },
  { key: 'vegetable', label: 'Sebze (Seb)' }, { key: 'fruit', label: 'Meyve (Mey)' }, { key: 'dairy', label: 'Süt / Yoğurt' }
];
const UNIT_OPTIONS = ['g', 'ml', 'yemek kaşığı', 'tatlı kaşığı', 'çay kaşığı', 'dilim', 'porsiyon', 'su bardağı', 'adet'];

export const RecipeWizard: React.FC = () => {
  const { isWizardOpen, closeWizard, editingRecipe, saveRecipe, foods, turKompService, calculateIngredientNutrition, calculateRecipeTotals } = useNutrition();

  const [name, setName] = useState('');
  const [family, setFamily] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [practicality, setPracticality] = useState<'Kolay' | 'Orta' | 'Zor' | 'İleri' | null>(null);
  const [transportability, setTransportability] = useState<'Taşımaya Uygun' | 'Taşınmaz' | null>(null);
  const [selectedDietTypes, setSelectedDietTypes] = useState<string[]>([]);
  const [selectedMealTypes, setSelectedMealTypes] = useState<MealType[]>([]);
  const [imageUrl, setImageUrl] = useState('');
  const [exchanges, setExchanges] = useState<RecipeExchanges>({ protein: 0, carb: 0, fat: 0, vegetable: 0, fruit: 0, dairy: 0 });
  const [isManualExchangeModified, setIsManualExchangeModified] = useState(false);
  const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiCalculated, setAiCalculated] = useState(false);
  const [showManualNutrition, setShowManualNutrition] = useState(false);
  const [manualNut, setManualNut] = useState<{ calories: number | ''; protein: number | ''; carbs: number | ''; fat: number | ''; fiber: number | '' }>({ calories: '', protein: '', carbs: '', fat: '', fiber: '' });
  const [steps, setSteps] = useState<string[]>(['']);
  const [cookingMethod, setCookingMethod] = useState('');
  const [servings, setServings] = useState(1);
  const [portionDescription, setPortionDescription] = useState('1 Porsiyon');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(10);
  const [cookTimeMinutes, setCookTimeMinutes] = useState(20);
  const [fridgeStorageDays, setFridgeStorageDays] = useState(3);
  const [isFreezerSuitable, setIsFreezerSuitable] = useState(false);
  const [isBatchCookingSuitable, setIsBatchCookingSuitable] = useState(false);
  const [storageAndServiceAdvice, setStorageAndServiceAdvice] = useState('');
  const [clinicalNote, setClinicalNote] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (editingRecipe) {
      setName(editingRecipe.name || '');
      setFamily(editingRecipe.family ? editingRecipe.family.replace(/^Aile:\s*/, '') : 'Genel');
      setDescription(editingRecipe.description || editingRecipe.instructions || '');
      setSelectedCategory(editingRecipe.category || '');
      setPracticality(editingRecipe.practicality || null);
      setTransportability(editingRecipe.transportability || null);
      setSelectedDietTypes(editingRecipe.dietTypes?.length ? editingRecipe.dietTypes : (editingRecipe.dietType ? [editingRecipe.dietType] : []));
      setSelectedMealTypes(editingRecipe.mealTypes?.length ? (editingRecipe.mealTypes as MealType[]) : (editingRecipe.mealType ? [editingRecipe.mealType] : []));
      setImageUrl(editingRecipe.imageUrl || '');
      setExchanges(editingRecipe.exchanges || { protein: 0, carb: 0, fat: 0, vegetable: 0, fruit: 0, dairy: 0 });
      setIngredients(editingRecipe.ingredients || []);
      setSteps(editingRecipe.steps?.length ? editingRecipe.steps.map(s => s.instruction) : ['']);
      setCookingMethod(editingRecipe.cookingMethod || '');
      setServings(editingRecipe.servings || 1);
      setPortionDescription(editingRecipe.portionDescription || '1 Porsiyon');
      setPrepTimeMinutes(editingRecipe.prepTimeMinutes || 10);
      setCookTimeMinutes(editingRecipe.cookTimeMinutes || 20);
      setFridgeStorageDays(editingRecipe.fridgeStorageDays || 3);
      setIsFreezerSuitable(editingRecipe.isFreezerSuitable ?? false);
      setIsBatchCookingSuitable(editingRecipe.isBatchCookingSuitable ?? false);
      setStorageAndServiceAdvice(editingRecipe.storageAndServiceAdvice || '');
      setClinicalNote(editingRecipe.clinicalNote || '');
      setTagsInput(editingRecipe.tags ? editingRecipe.tags.join(', ') : '');
      setAiCalculated(true);
    } else {
      setName(''); setFamily(''); setDescription(''); setSelectedCategory('');
      setPracticality(null); setTransportability(null); setSelectedDietTypes([]); setSelectedMealTypes([]);
      setImageUrl(''); setExchanges({ protein: 0, carb: 0, fat: 0, vegetable: 0, fruit: 0, dairy: 0 });
      setIsManualExchangeModified(false); setIngredients([]); setAiCalculated(false); setShowManualNutrition(false);
      setManualNut({ calories: '', protein: '', carbs: '', fat: '', fiber: '' });
      setSteps(['']); setCookingMethod(''); setServings(1); setPortionDescription('1 Porsiyon');
      setPrepTimeMinutes(10); setCookTimeMinutes(20); setFridgeStorageDays(3);
      setIsFreezerSuitable(false); setIsBatchCookingSuitable(false);
      setStorageAndServiceAdvice(''); setClinicalNote(''); setTagsInput('');
    }
    setValidationError(null);
  }, [editingRecipe, isWizardOpen]);

  const autoCalculatedExchanges = useMemo(() => estimateExchangesFromIngredients(ingredients, foods), [ingredients, foods]);

  useEffect(() => {
    if (!isManualExchangeModified && ingredients.length > 0) setExchanges(autoCalculatedExchanges);
  }, [autoCalculatedExchanges, ingredients.length, isManualExchangeModified]);

  if (!isWizardOpen) return null;

  const calculatedTotalNutrition = calculateRecipeTotalNutrition(ingredients);
  const filteredFoodsForSearch = searchQuery.trim() ? turKompService.searchFoods(searchQuery).slice(0, 8) : foods.slice(0, 8);

  const handleImageFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setImageUrl(await compressImageFile(file, 800, 0.82));
    } catch { alert('Görsel işlenirken bir hata oluştu.'); }
  };

  const handleAddIngredient = () => {
    const defaultFood = foods[0] || { id: 'food_1', name: 'Yeni Malzeme', defaultUnit: 'g' };
    const nut = calculateIngredientNutrition(defaultFood, 100, 'g');
    setIngredients(prev => [...prev, {
      id: `ing_${Date.now()}`, foodId: defaultFood.id, foodName: defaultFood.name, amount: 100, unit: 'g', preparationNote: '',
      calculatedCalories: nut.calories, calculatedProtein: nut.protein, calculatedCarbs: nut.carbs, calculatedFat: nut.fat, calculatedFiber: nut.fiber
    }]);
  };

  const updateIngredientWithFoodCalc = (index: number, patch: Partial<RecipeIngredient>, foodOverride?: FoodItem) => {
    setIngredients(prev => {
      const updated = [...prev];
      const curr = { ...updated[index], ...patch };
      const food = foodOverride || foods.find(f => f.id === curr.foodId) || foods[0];
      const nut = calculateIngredientNutrition(food, curr.amount, curr.unit);
      updated[index] = { ...curr, calculatedCalories: nut.calories, calculatedProtein: nut.protein, calculatedCarbs: nut.carbs, calculatedFat: nut.fat, calculatedFiber: nut.fiber };
      return updated;
    });
  };

  const handleRunAICalculation = () => {
    const calcResult = calculateRecipeTotals(ingredients);
    if (calcResult.updatedIngredients?.length) setIngredients(calcResult.updatedIngredients);
    if (!isManualExchangeModified && calcResult.exchanges) setExchanges(calcResult.exchanges);
    setAiCalculated(true);
  };

  const handleSave = (isDraft: boolean) => {
    if (!name.trim()) { setValidationError('Lütfen Tarif Adı alanını doldurunuz.'); return; }
    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean);
    const formattedSteps: RecipeStep[] = steps.filter(s => s.trim().length > 0).map((s, i) => ({ stepNumber: i + 1, instruction: s.trim() }));

    const finalNutrition = showManualNutrition && typeof manualNut.calories === 'number'
      ? {
          calories: Number(manualNut.calories) || calculatedTotalNutrition.calories,
          protein: Number(manualNut.protein) || calculatedTotalNutrition.protein,
          carbs: Number(manualNut.carbs) || calculatedTotalNutrition.carbs,
          fat: Number(manualNut.fat) || calculatedTotalNutrition.fat,
          fiber: Number(manualNut.fiber) || calculatedTotalNutrition.fiber
        }
      : calculatedTotalNutrition;

    saveRecipe({
      id: editingRecipe?.id || `REC-${Date.now().toString().slice(-6)}`,
      name: name.trim(), description: description.trim(),
      mealType: selectedMealTypes[0] || 'Öğle', mealTypes: selectedMealTypes.length > 0 ? selectedMealTypes : ['Öğle'],
      category: selectedCategory || 'Genel', categories: selectedCategory ? [selectedCategory] : ['Genel'],
      family: family.trim() ? (family.trim().startsWith('Aile:') ? family.trim() : `Aile: ${family.trim()}`) : 'Aile: Genel',
      prepTimeMinutes, cookTimeMinutes, cookingMethod: cookingMethod || undefined,
      portionDescription, fridgeStorageDays, isFreezerSuitable, isBatchCookingSuitable,
      storageAndServiceAdvice: storageAndServiceAdvice.trim(),
      practicality: practicality || 'Kolay', transportability: transportability || 'Taşınmaz',
      planCount: editingRecipe?.planCount || 0, servings,
      seasonMonths: editingRecipe?.seasonMonths || ['Tüm Yıl'],
      dietType: (selectedDietTypes[0] as DietType) || 'STD', dietTypes: selectedDietTypes.length > 0 ? selectedDietTypes : ['STD'],
      tags, exchangeSummary: `${exchanges.protein} P · ${exchanges.carb} K · ${exchanges.fat} Y · ${exchanges.vegetable} Seb`,
      energyDisplay: `${finalNutrition.calories} kcal`,
      imageUrl: imageUrl.trim() || PRESET_IMAGE_CATEGORIES[0].url,
      ingredients,
      detailedIngredients: ingredients.map((ing, i) => ({
        order: i + 1, name: ing.foodName, amountDisplay: `${ing.amount} ${ing.unit} ${ing.preparationNote ? `(${ing.preparationNote})` : ''}`.trim()
      })),
      steps: formattedSteps, clinicalNote: clinicalNote.trim(), totalNutrition: finalNutrition, exchanges,
      instructions: description.trim() || undefined, isDraft,
      version: editingRecipe ? editingRecipe.version : '1.0',
      createdAt: editingRecipe ? editingRecipe.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    closeWizard();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-auto flex flex-col overflow-hidden max-h-[94vh]">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div>
            <div className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
              <ChefHat className="w-4 h-4 text-amber-800" /><span>{editingRecipe ? 'Tarif Düzenleme' : 'Yeni Reçete Tanımlama'}</span>
            </div>
            <h2 className="text-lg font-bold text-slate-900 mt-0.5">{name.trim() ? name : 'Yeni Reçete Oluştur'}</h2>
          </div>
          <button onClick={closeWizard} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer" title="Kapat"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8 divide-y divide-slate-200">
          {validationError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center justify-between">
              <span>{validationError}</span>
              <button onClick={() => setValidationError(null)} className="text-rose-500 hover:text-rose-900"><X className="w-4 h-4" /></button>
            </div>
          )}

          <div className="space-y-4 pt-1">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-bold text-xs flex items-center justify-center">1</span>
              <h3 className="text-base font-bold">Reçete Kimliği & Kategorizasyon</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">Tarif Adı <span className="text-rose-600">*</span></label>
                <input type="text" value={name} onChange={e => { setName(e.target.value); if (validationError) setValidationError(null); }} placeholder="Örn: Sarımsaklı Ballı Fırın Somon" className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">Tarif Ailesi (Grup Adı)</label>
                <input type="text" value={family} onChange={e => setFamily(e.target.value)} placeholder="Genel" className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-sm font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-900 mb-1">Açıklama / Kısa Tanım</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Örn: Fırında sarımsak, bal ve limon marinasyonlu somon fileto" className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800" />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">Kategori</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_OPTIONS.map(cat => (
                    <button key={cat} type="button" onClick={() => setSelectedCategory(cat)} className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${selectedCategory === cat ? 'bg-amber-900 border-amber-900 text-white font-semibold shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{cat}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">Pratiklik</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['Kolay', 'Orta', 'Zor'] as const).map(p => (
                    <button key={p} type="button" onClick={() => setPracticality(p)} className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer text-center ${practicality === p ? 'bg-amber-900 border-amber-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{p}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">Taşıma</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Taşımaya Uygun', 'Taşınmaz'] as const).map(t => (
                    <button key={t} type="button" onClick={() => setTransportability(t)} className={`py-1.5 px-2 rounded-lg border text-xs font-semibold transition-all cursor-pointer text-center ${transportability === t ? 'bg-amber-900 border-amber-900 text-white' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>{t}</button>
                  ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">Uygun Diyet Tipleri</label>
                <div className="flex flex-wrap gap-2">
                  {DIET_TYPES.map(dt => {
                    const isSelected = selectedDietTypes.includes(dt.id);
                    return (
                      <button key={dt.id} type="button" onClick={() => setSelectedDietTypes(prev => isSelected ? prev.filter(i => i !== dt.id) : [...prev, dt.id])} className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${isSelected ? 'bg-emerald-800 border-emerald-800 text-white shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        {isSelected && <Check className="w-3.5 h-3.5" />}<span>{dt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-900 mb-1.5">Uygulanabileceği Öğünler</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {MEAL_TYPES.map(meal => {
                    const isSelected = selectedMealTypes.includes(meal);
                    return (
                      <button key={meal} type="button" onClick={() => setSelectedMealTypes(prev => prev.includes(meal) ? (prev.length === 1 ? prev : prev.filter(m => m !== meal)) : [...prev, meal])} className={`py-2 px-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${isSelected ? 'bg-amber-900 border-amber-900 text-white shadow-2xs' : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'}`}>
                        <span>{meal}</span>{isSelected && <Check className="w-3.5 h-3.5" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="sm:col-span-2 space-y-3 pt-1">
                <label className="block text-xs font-semibold text-slate-900">Reçete Görseli</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                  <div className="sm:col-span-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-900 hover:bg-amber-950 text-white text-xs font-semibold cursor-pointer shadow-2xs transition-all">
                      <Upload className="w-4 h-4" /><span>Bilgisayardan Görsel Yükle</span>
                      <input type="file" accept="image/*" onChange={handleImageFileUpload} className="hidden" />
                    </label>
                    {imageUrl && (
                      <button type="button" onClick={() => setImageUrl('')} className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" /><span>Görseli Kaldır</span>
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2 sm:justify-end">
                    <span className="text-[11px] text-slate-500 font-medium">Önizleme:</span>
                    <div className="w-14 h-12 rounded-lg border border-slate-300 overflow-hidden bg-slate-100 shadow-2xs shrink-0 flex items-center justify-center">
                      {imageUrl ? <img src={imageUrl} alt="Önizleme" className="w-full h-full object-cover" /> : <ImageIcon className="w-5 h-5 text-slate-400" />}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="block text-[11px] font-medium text-slate-500 mb-1.5">veya Hazır Stok Görsellerden Seçin:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_IMAGE_CATEGORIES.map(preset => (
                      <button key={preset.name} type="button" onClick={() => setImageUrl(preset.url)} className={`px-2.5 py-1 rounded-md border text-xs font-medium transition-all cursor-pointer ${imageUrl === preset.url ? 'bg-amber-900 border-amber-900 text-white font-semibold' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'}`}>{preset.name}</button>
                    ))}
                  </div>
                </div>
                <input type="url" value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="Veya web görsel URL adresi yapıştırın (https://...)" className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-800 placeholder:font-sans" />
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-bold text-xs flex items-center justify-center">2</span>
                <h3 className="text-base font-bold">Reçete Malzemeleri</h3>
                <span className="text-xs text-slate-500 font-semibold">({ingredients.length} malzeme)</span>
              </div>
              <button type="button" onClick={handleAddIngredient} className="flex items-center gap-1 px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5" /><span>Malzeme Ekle</span>
              </button>
            </div>

            <div className="space-y-3">
              {ingredients.map((ing, idx) => {
                const isSearchingThis = activeSearchIndex === idx;
                return (
                  <div key={ing.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2.5 transition-all hover:border-slate-300">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">{idx + 1}</span>
                      <div className="flex-1 relative">
                        <input
                          type="text"
                          value={isSearchingThis ? searchQuery : ing.foodName}
                          onFocus={() => { setActiveSearchIndex(idx); setSearchQuery(''); }}
                          onBlur={() => setTimeout(() => setActiveSearchIndex(prev => (prev === idx ? null : prev)), 180)}
                          onChange={e => { setActiveSearchIndex(idx); setSearchQuery(e.target.value); }}
                          placeholder="Malzeme adı (örn: Somon Fileto, Yulaf, Yumurta)..."
                          className="w-full px-3 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800"
                        />
                        {isSearchingThis && (
                          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-xl border border-slate-200 z-30 max-h-52 overflow-y-auto">
                            <div className="p-1.5 text-[10px] text-slate-400 font-bold border-b border-slate-100 bg-slate-50">Ulusal Veritabanı & Malzemeler:</div>
                            {filteredFoodsForSearch.map(food => (
                              <button
                                key={food.id} type="button"
                                onClick={() => { updateIngredientWithFoodCalc(idx, { foodId: food.id, foodName: food.name }, food); setActiveSearchIndex(null); setSearchQuery(''); }}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-amber-50 flex items-center justify-between border-b border-slate-50 last:border-0 cursor-pointer"
                              >
                                <span className="font-semibold text-slate-900">{food.name}</span>
                                <span className="text-[10px] text-slate-500 font-mono">100g: {food.per100g.calories} kcal</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="w-24">
                        <input type="number" min="0" step="0.5" value={ing.amount} onChange={e => updateIngredientWithFoodCalc(idx, { amount: Math.max(0, parseFloat(e.target.value) || 0) })} className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800" />
                      </div>
                      <div className="w-28">
                        <select value={ing.unit} onChange={e => updateIngredientWithFoodCalc(idx, { unit: e.target.value })} className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800 cursor-pointer">
                          {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={() => setIngredients(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer" title="Malzemeyi Sil"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <input type="text" value={ing.preparationNote || ''} onChange={e => { const val = e.target.value; setIngredients(prev => prev.map((item, i) => (i === idx ? { ...item, preparationNote: val } : item))); }} placeholder="Hazırlık / İşleme notu (Örn: Küp doğranmış, ızgaralık, kabuğu soyulmuş)..." className="w-full px-3 py-1 bg-white rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-800" />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-bold text-xs flex items-center justify-center">3</span>
                <h3 className="text-base font-bold">Temel Değişim Profili (Manuel)</h3>
                <span className="text-[11px] font-semibold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md border border-amber-200">Sadece Diyetisyen Düzenler</span>
              </div>
              <div className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-mono font-bold">
                Özet: {exchanges.protein} P · {exchanges.carb} K · {exchanges.fat} Y · {exchanges.vegetable} Seb
              </div>
            </div>

            <div className="p-3 bg-emerald-50/80 border border-emerald-200/90 rounded-xl text-xs text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-900">Arka Plan Değişim Hesabı:</span>{' '}
                  <span className="font-mono font-bold text-emerald-800">
                    {autoCalculatedExchanges.protein} P · {autoCalculatedExchanges.carb} K · {autoCalculatedExchanges.fat} Y · {autoCalculatedExchanges.vegetable} Seb · {autoCalculatedExchanges.fruit} Mey · {autoCalculatedExchanges.dairy} Süt
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isManualExchangeModified && <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">Manuel Düzenlendi</span>}
                <button type="button" onClick={() => { setExchanges(autoCalculatedExchanges); setIsManualExchangeModified(false); }} className="px-3 py-1 bg-emerald-800 hover:bg-emerald-900 text-white font-semibold rounded-lg text-xs shadow-2xs transition-colors cursor-pointer whitespace-nowrap">
                  Otomatik Değerleri Yerleştir
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
              {EXCHANGE_FIELDS.map(f => (
                <div key={f.key} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-800 mb-1">{f.label}</label>
                  <input type="number" min="0" step="0.5" value={exchanges[f.key]} onChange={e => { setIsManualExchangeModified(true); setExchanges(prev => ({ ...prev, [f.key]: Math.max(0, parseFloat(e.target.value) || 0) })); }} className="w-full px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 text-center font-mono font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-800" />
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-bold text-xs flex items-center justify-center">4</span>
                <h3 className="text-base font-bold">Enerji & Besin Değeri Hesabı</h3>
              </div>
              <button type="button" onClick={handleRunAICalculation} className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer">
                <Sparkles className="w-3.5 h-3.5" /><span>AI ile Hesapla</span>
              </button>
            </div>

            {!aiCalculated ? (
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-800 shrink-0 mt-0.5" />
                <div>Henüz AI enerji hesabı çalıştırılmadı. Malzemelerinizi tamamladıktan sonra yukarıdaki <strong>"AI ile Hesapla"</strong> butonuna basarak TürKomp & USDA veritabanına dayalı besin değerlerini alabilirsiniz.</div>
              </div>
            ) : (
              <div className="bg-slate-900 text-white p-4 rounded-xl shadow-xs space-y-3 font-mono tabular-nums">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 flex-wrap gap-2">
                  <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" /> TürKomp + USDA Deterministik Analiz</span>
                  <span className="text-[10px] text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60 font-sans font-semibold">Ulusal Veritabanı Onaylı</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                  {[
                    { label: 'Kalori', val: `${calculatedTotalNutrition.calories} kcal`, color: 'text-amber-300' },
                    { label: 'Protein', val: `${calculatedTotalNutrition.protein} g`, color: 'text-emerald-300' },
                    { label: 'Karbonhidrat', val: `${calculatedTotalNutrition.carbs} g`, color: 'text-blue-300' },
                    { label: 'Yağ', val: `${calculatedTotalNutrition.fat} g`, color: 'text-rose-300' },
                    { label: 'Lif', val: `${calculatedTotalNutrition.fiber} g`, color: 'text-purple-300' }
                  ].map(m => (
                    <div key={m.label} className="p-2 bg-slate-800/80 rounded-lg">
                      <div className="text-[10px] text-slate-400">{m.label}</div><div className={`text-sm font-bold ${m.color} mt-0.5`}>{m.val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-1">
              <button type="button" onClick={() => setShowManualNutrition(!showManualNutrition)} className="text-xs font-semibold text-slate-700 hover:text-amber-900 transition-colors flex items-center gap-1 cursor-pointer">
                <span>+ Manuel Doğrulanmış Besin Değeri Ekle (Opsiyonel)</span>
              </button>
              {showManualNutrition && (
                <div className="mt-3 p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {([
                    { key: 'calories', label: 'Enerji (kcal)', ph: '206' },
                    { key: 'protein', label: 'Protein (g)', ph: '22' },
                    { key: 'carbs', label: 'Karb (g)', ph: '0' },
                    { key: 'fat', label: 'Yağ (g)', ph: '12' },
                    { key: 'fiber', label: 'Lif (g)', ph: '0' }
                  ] as const).map(inp => (
                    <div key={inp.key}>
                      <label className="block text-[10px] font-bold text-slate-600 mb-1">{inp.label}</label>
                      <input type="number" value={manualNut[inp.key]} onChange={e => setManualNut(prev => ({ ...prev, [inp.key]: e.target.value ? parseFloat(e.target.value) : '' }))} placeholder={inp.ph} className="w-full px-2 py-1 bg-white border border-slate-300 rounded text-xs font-mono" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900">
                <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-bold text-xs flex items-center justify-center">5</span>
                <h3 className="text-base font-bold">Hazırlanış Adımları</h3>
                <span className="text-xs text-slate-500 font-semibold">({steps.length} adım)</span>
              </div>
              <button type="button" onClick={() => setSteps(prev => [...prev, ''])} className="flex items-center gap-1 px-3 py-1.5 bg-amber-900 hover:bg-amber-800 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer">
                <Plus className="w-3.5 h-3.5" /><span>Adım Ekle</span>
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((st, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">{idx + 1}</span>
                  <textarea rows={2} value={st} onChange={e => { const val = e.target.value; setSteps(prev => prev.map((s, i) => (i === idx ? val : s))); }} placeholder={`Adım ${idx + 1} açıklamasını girin...`} className="flex-1 px-3.5 py-2 bg-white rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800" />
                  <button type="button" onClick={() => setSteps(prev => prev.filter((_, i) => i !== idx))} className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer mt-1" title="Adımı Sil"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-bold text-xs flex items-center justify-center">6</span>
              <h3 className="text-base font-bold">Pişirme, Porsiyon & Saklama Koşulları</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">Pişirme Yöntemi</label>
                <select value={cookingMethod} onChange={e => setCookingMethod(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-800 cursor-pointer">
                  <option value="">Seçiniz...</option>
                  {COOKING_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">Porsiyon Sayısı</label>
                <input type="number" min="1" value={servings} onChange={e => setServings(parseInt(e.target.value) || 1)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-center text-slate-900 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-900 mb-1">Porsiyon Tanımı</label>
                <input type="text" value={portionDescription} onChange={e => setPortionDescription(e.target.value)} placeholder="1 Porsiyon" className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-medium text-slate-900" />
              </div>
              {[
                { label: 'Hazırlama Süresi (dk)', val: prepTimeMinutes, set: setPrepTimeMinutes },
                { label: 'Pişirme Süresi (dk)', val: cookTimeMinutes, set: setCookTimeMinutes },
                { label: 'Dolapta Saklama (Gün)', val: fridgeStorageDays, set: setFridgeStorageDays }
              ].map(num => (
                <div key={num.label}>
                  <label className="block text-xs font-semibold text-slate-900 mb-1">{num.label}</label>
                  <input type="number" min="0" value={num.val} onChange={e => num.set(parseInt(e.target.value) || 0)} className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-bold text-center text-slate-900 font-mono" />
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input type="checkbox" checked={isFreezerSuitable} onChange={e => setIsFreezerSuitable(e.target.checked)} className="rounded border-slate-300 text-amber-900 focus:ring-amber-800 w-4 h-4 cursor-pointer" />
                <span>Dondurucuda Saklamaya Uygun</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
                <input type="checkbox" checked={isBatchCookingSuitable} onChange={e => setIsBatchCookingSuitable(e.target.checked)} className="rounded border-slate-300 text-amber-900 focus:ring-amber-800 w-4 h-4 cursor-pointer" />
                <span>Toplu Hazırlığa (Batch Cooking) Uygun</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Saklama & Servis Tavsiyesi</label>
              <input type="text" value={storageAndServiceAdvice} onChange={e => setStorageAndServiceAdvice(e.target.value)} placeholder="Örn: Cam saklama kabında 2 gün muhafaza edin. Servis öncesi ısıtın." className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900" />
            </div>
          </div>

          <div className="space-y-4 pt-6">
            <div className="flex items-center gap-2 text-slate-900">
              <span className="w-6 h-6 rounded-full bg-amber-900 text-white font-bold text-xs flex items-center justify-center">7</span>
              <h3 className="text-base font-bold">Diyetisyen Özel Notları & Etiketler</h3>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Diyetisyen Zeynep Hale Notu</label>
              <textarea rows={2} value={clinicalNote} onChange={e => setClinicalNote(e.target.value)} placeholder="Danışanlara aktarılacak klinik veya pratik hazırlık önerisi..." className="w-full px-3.5 py-2 rounded-xl border border-slate-300 text-xs text-slate-900" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-900 mb-1">Etiketler (Virgül ile ayırın)</label>
              <input type="text" value={tagsInput} onChange={e => setTagsInput(e.target.value)} placeholder="Örn: omega3, antiinflamatuar, pratik, ofis" className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs text-slate-900" />
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button type="button" onClick={closeWizard} className="px-4 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer">Vazgeç</button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => handleSave(true)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold transition-colors cursor-pointer">
              <FileEdit className="w-4 h-4 text-slate-500" /><span>Taslak Olarak Kaydet</span>
            </button>
            <button type="button" onClick={() => handleSave(false)} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-900 hover:bg-amber-800 text-white text-xs font-bold shadow-sm transition-colors cursor-pointer">
              <Save className="w-4 h-4" /><span>+ Reçeteyi Kaydet</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};