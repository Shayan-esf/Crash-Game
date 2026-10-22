'use client';

import { isSoundEnabled, toggleSound } from '@/lib/soundEffects';
import { triggerHapticReaction } from '@/lib/telegramHaptics';
import { Flame, Rocket, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

export type ReactionType = 'rocket' | 'flame' | 'zap' | 'trophy';

export interface FloatingReaction {
  id: string;
  reaction: ReactionType;
  multiplier: number;
  username?: string;
  isSelf: boolean;
  startX: number; // percentage (40% - 60%)
  driftOffset: number; // px drift
}

export interface ReactionConfig {
  type: ReactionType;
  multiplier: number;
  multiplierLabel: string;
  label: string;
  icon: typeof Rocket;
  color: string;
  glow: string;
  border: string;
  activeBorder: string;
  bg: string;
  activeBg: string;
  text: string;
}

export const REACTION_CONFIGS: ReactionConfig[] = [
  {
    type: 'rocket',
    multiplier: 1.5,
    multiplierLabel: '1.5x',
    label: 'شتاب موشک (1.5x)',
    icon: Rocket,
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.5)',
    border: 'border-sky-400/50',
    activeBorder: 'border-sky-300 ring-2 ring-sky-400',
    bg: 'bg-sky-500/15',
    activeBg: 'bg-sky-500/35',
    text: 'text-sky-300',
  },
  {
    type: 'flame',
    multiplier: 2.0,
    multiplierLabel: '2.0x',
    label: 'آتش و هیجان (2.0x)',
    icon: Flame,
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.5)',
    border: 'border-yellow-400/50',
    activeBorder: 'border-yellow-300 ring-2 ring-yellow-400',
    bg: 'bg-yellow-500/15',
    activeBg: 'bg-yellow-500/35',
    text: 'text-yellow-300',
  },
  {
    type: 'zap',
    multiplier: 5.0,
    multiplierLabel: '5.0x',
    label: 'آدرنالین ضریب (5.0x)',
    icon: Zap,
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.5)',
    border: 'border-red-400/50',
    activeBorder: 'border-red-300 ring-2 ring-red-400',
    bg: 'bg-red-500/15',
    activeBg: 'bg-red-500/35',
    text: 'text-red-300',
  },
  {
    type: 'trophy',
    multiplier: 10.0,
    multiplierLabel: '10.0x',
    label: 'پیروزی پرواز (10.0x)',
    icon: Trophy,
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.5)',
    border: 'border-emerald-400/50',
    activeBorder: 'border-emerald-300 ring-2 ring-emerald-400',
    bg: 'bg-emerald-500/15',
    activeBg: 'bg-emerald-500/35',
    text: 'text-emerald-300',
  },
];

interface LiveReactionsOverlayProps {
  onSendReaction: (reaction: ReactionType, multiplier: number) => void;
  incomingReaction?: {
    id: string;
    reaction: ReactionType;
    multiplier?: number;
    username?: string;
  } | null;
  activeMultiplierTarget?: number | null;
  onSelectMultiplier?: (multiplier: number, reaction: ReactionType) => void;
}

function LiveReactionsOverlay({
  onSendReaction,
  incomingReaction,
  activeMultiplierTarget,
  onSelectMultiplier,
}: LiveReactionsOverlayProps) {
  const [activeFloaters, setActiveFloaters] = useState<FloatingReaction[]>([]);
  const [cooldown, setCooldown] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const lastProcessedReactionId = useRef<string | null>(null);

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const handleToggleSound = useCallback(() => {
    const next = toggleSound();
    setSoundOn(next);
  }, []);

  // اضافه کردن ذره شناور روی بوم با نمایش آیکون و ضریب
  const spawnFloater = useCallback(
    (reaction: ReactionType, multiplier: number, username?: string, isSelf: boolean = false) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      // تنوع تصادفی در موقعیت افقی (اطراف موشک)
      const startX = 40 + Math.random() * 20; // 40% تا 60% عرض بوم
      const driftOffset = (Math.random() - 0.5) * 50; // انحراف به چپ یا راست

      const newFloater: FloatingReaction = {
        id,
        reaction,
        multiplier,
        username,
        isSelf,
        startX,
        driftOffset,
      };

      setActiveFloaters((prev) => [...prev.slice(-12), newFloater]);

      // پاکسازی خودکار پس از پایان انیمیشن (۲ ثانیه)
      setTimeout(() => {
        setActiveFloaters((prev) => prev.filter((f) => f.id !== id));
      }, 2000);
    },
    []
  );

  // دریافت ری‌اکشن‌های زنده از سایر بازیکنان در لابی
  useEffect(() => {
    if (incomingReaction && incomingReaction.id !== lastProcessedReactionId.current) {
      lastProcessedReactionId.current = incomingReaction.id;
      const defaultMultiplier =
        incomingReaction.reaction === 'rocket'
          ? 1.5
          : incomingReaction.reaction === 'flame'
          ? 2.0
          : incomingReaction.reaction === 'zap'
          ? 5.0
          : 10.0;
      spawnFloater(
        incomingReaction.reaction,
        incomingReaction.multiplier || defaultMultiplier,
        incomingReaction.username,
        false
      );
    }
  }, [incomingReaction, spawnFloater]);

  // ارسال ری‌اکشن و فعال‌سازی ضریب اختصاصی
  const handleReactionClick = (type: ReactionType, multiplier: number) => {
    if (cooldown) return;

    // ۱. هپتیک + صدای اختصاصی
    triggerHapticReaction();

    // ۲. انیمیشن فوری و مستقل شناور روی بوم با ضریب اختصاصی
    spawnFloater(type, multiplier, 'شما', true);

    // ۳. ارسال به وب‌سوکت برای بقیه بازیکنان همراه با ضریب
    onSendReaction(type, multiplier);

    // ۴. فعال‌سازی یا تغییر ضریب هدف برای خلبان
    onSelectMultiplier?.(multiplier, type);

    // ۵. محدودکننده کلیک (۲۵۰ میلی‌ثانیه)
    setCooldown(true);
    setTimeout(() => {
      setCooldown(false);
    }, 250);
  };

  return (
    <>
      {/* ۱. ذرات شناور ری‌اکشن روی بوم پرواز همراه با برچسب ضریب (Floating Vector Reactions & Multipliers) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {activeFloaters.map((floater) => {
          const config = REACTION_CONFIGS.find((c) => c.type === floater.reaction) || REACTION_CONFIGS[0];
          const IconComponent = config.icon;

          return (
            <div
              key={floater.id}
              className="absolute flex flex-col items-center animate-float-up pointer-events-none select-none"
              style={{
                left: `${floater.startX}%`,
                bottom: '38%',
                ['--drift' as any]: `${floater.driftOffset}px`,
              }}
            >
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full border ${config.border} ${config.bg} shadow-lg backdrop-blur-md`}
                style={{
                  boxShadow: `0 0 16px ${config.glow}`,
                }}
              >
                <IconComponent className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${config.text}`} />
                <span className="text-[10px] sm:text-xs font-mono font-black text-white dir-ltr">
                  {floater.multiplier.toFixed(1)}x
                </span>
              </div>
              {floater.username && (
                <span className="text-[9px] font-mono text-gray-300 bg-black/60 px-1.5 py-0.2 rounded-full border border-white/10 mt-1 max-w-[70px] truncate">
                  {floater.username}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ۲. داک کنترل ری‌اکشن‌های سریع آیکونی و ضرایب روی بوم (Multiplier & Reaction Dock) */}
      <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 bg-black/65 backdrop-blur-md border border-white/10 p-1 rounded-full shadow-[0_4px_18px_rgba(0,0,0,0.65)] select-none">
        {REACTION_CONFIGS.map((config) => {
          const Icon = config.icon;
          const isActive = activeMultiplierTarget === config.multiplier;

          return (
            <button
              key={config.type}
              type="button"
              onClick={() => handleReactionClick(config.type, config.multiplier)}
              disabled={cooldown}
              className={`h-7 sm:h-7.5 px-1.5 sm:px-2 rounded-full flex items-center gap-1 transition-all duration-150 cursor-pointer active:scale-95 ${
                isActive
                  ? `${config.activeBg} ${config.activeBorder} scale-105`
                  : `${config.bg} border ${config.border} hover:scale-105 hover:bg-white/10`
              }`}
              title={`${config.label} - کلیک جهت فعال‌سازی ضریب هدف`}
              style={{
                boxShadow: isActive ? `0 0 14px ${config.glow}` : `0 0 6px ${config.glow}`,
              }}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${config.text} ${isActive ? 'animate-pulse' : ''}`} />
              <span
                className={`text-[9px] sm:text-[10px] font-mono font-black ${
                  isActive ? 'text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.8)]' : config.text
                }`}
              >
                {config.multiplierLabel}
              </span>
            </button>
          );
        })}

        {/* دکمه قطع/وصل صدا */}
        <button
          type="button"
          onClick={handleToggleSound}
          className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center transition-all duration-100 cursor-pointer active:scale-90 bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10 ml-0.5"
          title={soundOn ? 'قطع صدای بازی' : 'وصل صدای بازی'}
        >
          {soundOn ? (
            <Volume2 className="w-3.5 h-3.5 text-yellow-400" />
          ) : (
            <VolumeX className="w-3.5 h-3.5 text-gray-400" />
          )}
        </button>
      </div>
    </>
  );
}

export default memo(LiveReactionsOverlay);
