'use client';

import { triggerHaptic } from '@/lib/telegramHaptics';
import { CandlestickChart, Car, Flame, Rocket } from 'lucide-react';
import { memo } from 'react';

export type CrashTheme = 'rocket' | 'racing' | 'chart';

interface ThemeSelectorProps {
  currentTheme: CrashTheme;
  onSelectTheme: (theme: CrashTheme) => void;
}

const THEMES: Array<{
  id: CrashTheme;
  title: string;
  icon: typeof Rocket;
  badge?: string;
  badgeIcon?: typeof Flame;
  badgeClass?: string;
  activeBorder: string;
  activeGlow: string;
  activeText: string;
}> = [
  {
    id: 'racing',
    title: 'ماشین مسابقه',
    icon: Car,
    badge: 'پیشنهادی',
    badgeIcon: Flame,
    badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_8px_rgba(245,158,11,0.35)]',
    activeBorder: 'border-amber-400/80',
    activeGlow: 'bg-amber-500/15 shadow-[0_0_16px_rgba(245,158,11,0.25)]',
    activeText: 'text-amber-300',
  },
  {
    id: 'rocket',
    title: 'موشک کیهانی',
    icon: Rocket,
    activeBorder: 'border-yellow-400/80',
    activeGlow: 'bg-yellow-500/15 shadow-[0_0_16px_rgba(250,204,21,0.2)]',
    activeText: 'text-yellow-300',
  },
  {
    id: 'chart',
    title: 'نمودار سهام',
    icon: CandlestickChart,
    activeBorder: 'border-emerald-400/80',
    activeGlow: 'bg-emerald-500/15 shadow-[0_0_16px_rgba(16,185,129,0.25)]',
    activeText: 'text-emerald-300',
  },
];

export const ThemeSelector = memo(function ThemeSelector({
  currentTheme,
  onSelectTheme,
}: ThemeSelectorProps) {
  const handleSelect = (id: CrashTheme) => {
    if (id === currentTheme) return;
    triggerHaptic('selection');
    onSelectTheme(id);
  };

  return (
    <div
      role="group"
      aria-label="انتخاب تم بازی کرش"
      className="w-full max-w-[483px] mx-auto mb-2.5 px-1 py-1 rounded-xl bg-[#14161d]/90 border border-white/5 backdrop-blur-md flex items-center gap-1.5 shadow-lg select-none"
    >
      {THEMES.map((theme) => {
        const Icon = theme.icon;
        const isActive = currentTheme === theme.id;

        return (
          <button
            key={theme.id}
            type="button"
            onClick={() => handleSelect(theme.id)}
            className={`relative flex-1 min-h-[38px] py-1.5 px-2 rounded-lg font-bold text-[11px] sm:text-xs transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer border ${
              isActive
                ? `${theme.activeBorder} ${theme.activeGlow} ${theme.activeText} scale-[1.01]`
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-white/5'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? theme.activeText : 'text-gray-400'}`} />
            <span className="truncate">{theme.title}</span>

            {theme.badge && (
              <span
                className={`absolute -top-2 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-extrabold border leading-none tracking-tight flex items-center gap-0.5 animate-pulse motion-reduce:animate-none ${theme.badgeClass}`}
              >
                {theme.badgeIcon && <theme.badgeIcon className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />}
                <span>{theme.badge}</span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
});
