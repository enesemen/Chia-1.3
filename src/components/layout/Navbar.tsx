import React from 'react';
import { useNutrition, ActiveModule } from '../../context/NutritionContext';
import { ChiaLogo } from '../common/ChiaMascot';

const NAV_ITEMS: { id: ActiveModule; label: string }[] = [
  { id: 'recipes', label: 'Tarif Kütüphanesi' },
  { id: 'templates', label: 'Menü Planlama' },
  { id: 'exchanges', label: 'Değişim Sistemi' },
  { id: 'foods', label: 'Besin Veritabanı' }
];

export const Navbar: React.FC = () => {
  const { activeModule, setActiveModule } = useNutrition();
  return (
    <header className="h-14 border-b border-[#C9D8C3] bg-[#FAF8F3] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
      <div className="flex items-center gap-3 shrink-0"><ChiaLogo size="md" /></div>
      <nav className="flex items-center h-[44px] gap-1 sm:gap-1.5 text-sm font-semibold text-[#3B5434] overflow-x-auto py-1">
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActiveModule(item.id)}
            className={`px-3 py-1.5 text-xs sm:text-sm rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              activeModule === item.id ? 'bg-[#3F5338] text-white font-bold shadow-2xs' : 'hover:bg-[#E3ECE0] text-[#2F432A]'
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="flex items-center gap-2 shrink-0"><span className="text-xs font-bold text-[#1F2B1D]">by Diyetisyen Hâle</span></div>
    </header>
  );
};