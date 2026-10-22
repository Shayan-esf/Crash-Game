'use client';

import { isSoundEnabled, toggleSound } from '@/lib/soundEffects';
import { triggerHapticReaction } from '@/lib/telegramHaptics';
import { Flame, Rocket, Trophy, Volume2, VolumeX, Zap } from 'lucide-react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

export type ReactionType = 'rocket' | 'flame' | 'zap' | 'trophy';

export interface FloatingReaction {
  id: string;
  reaction: ReactionType;
  username?: string;
  isSelf: boolean;
  startX: number; // percentage (40% - 60%)
  driftOffset: number; // px drift
}

interface LiveReactionsOverlayProps {
  onSendReaction: (reaction: ReactionType) => void;
  incomingReaction?: {
    id: string;
    reaction: ReactionType;
    username?: string;
  } | null;
}

const REACTION_CONFIGS = [
  {
    type: 'rocket' as const,
    label: 'شتاب موشک',
    icon: Rocket,
    color: '#38bdf8',
    glow: 'rgba(56, 189, 248, 0.4)',
    border: 'border-sky-400/50',
    bg: 'bg-sky-500/15',
    text: 'text-sky-300',
  },
  {
    type: 'flame' as const,
    label: 'آتش و هیجان',
    icon: Flame,
    color: '#facc15',
    glow: 'rgba(250, 204, 21, 0.4)',
    border: 'border-yellow-400/50',
    bg: 'bg-yellow-500/15',
    text: 'text-yellow-300',
  },
  {
    type: 'zap' as const,
    label: 'آدرنالین ضریب',
    icon: Zap,
    color: '#ef4444',
    glow: 'rgba(239, 68, 68, 0.4)',
    border: 'border-red-400/50',
    bg: 'bg-red-500/15',
    text: 'text-red-300',
  },
  {
    type: 'trophy' as const,
    label: 'پیروزی پرواز',
    icon: Trophy,
    color: '#22c55e',
    glow: 'rgba(34, 197, 94, 0.4)',
    border: 'border-emerald-400/50',
    bg: 'bg-emerald-500/15',
    text: 'text-emerald-300',
  },
];

function LiveReactionsOverlay({
  onSendReaction,
  incomingReaction,
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

  // اضافه کردن ذره شناور روی بوم
  const spawnFloater = useCallback(
    (reaction: ReactionType, username?: string, isSelf: boolean = false) => {
      const id = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      // تنوع تصادفی در موقعیت افقی (اطراف موشک)
      const startX = 42 + Math.random() * 16; // 42% تا 58% عرض بوم
      const driftOffset = (Math.random() - 0.5) * 48; // انحراف به چپ یا راست

      const newFloater: FloatingReaction = {
        id,
        reaction,
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
      spawnFloater(incomingReaction.reaction, incomingReaction.username, false);
    }
  }, [incomingReaction, spawnFloater]);

  // ارسال ری‌اکشن توسط خود کاربر
  const handleReactionClick = (type: ReactionType) => {
    if (cooldown) return;

    // ۱. هپتیک + صدای اختصاصی
    triggerHapticReaction();

    // ۲. انیمیشن فوری و مستقل (Optimistic)
    spawnFloater(type, 'شما', true);

    // ۳. ارسال به وب‌سوکت برای بقیه بازیکنان
    onSendReaction(type);

    // ۴. محدودکننده کلیک (۲۵۰ میلی‌ثانیه)
    setCooldown(true);
    setTimeout(() => {
      setCooldown(false);
    }, 250);
  };

  return (
    <>
      {/* ۱. ذرات شناور ری‌اکشن روی بوم پرواز (Floating Vector Reactions) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
        {activeFloaters.map((floater) => {
          const config = REACTION_CONFIGS.find((c) => c.type === floater.reaction) || REACTION_CONFIGS[0];
          const IconComponent = config.icon;

          return (
            <div
              key={floater.id}
              className="absolute flex flex-col items-center animate-float-up"
              style={{
                left: `${floater.startX}%`,
                bottom: '38%',
                ['--drift' as any]: `${floater.driftOffset}px`,
              }}
            >
              <div
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center border ${config.border} ${config.bg} shadow-lg backdrop-blur-sm`}
                style={{
                  boxShadow: `0 0 14px ${config.glow}`,
                }}
              >
                <IconComponent className={`w-4 h-4 sm:w-4.5 sm:h-4.5 ${config.text}`} />
              </div>
              {floater.username && !floater.isSelf && (
                <span className="text-[9px] font-mono text-gray-300 bg-black/60 px-1.5 py-0.2 rounded-full border border-white/10 mt-1 max-w-[65px] truncate">
                  {floater.username}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* ۲. داک کنترل ری‌اکشن‌های سریع آیکونی روی بوم (Reaction Dock) */}
      <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 bg-black/55 backdrop-blur-md border border-white/10 p-1 rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.6)] select-none">
        {REACTION_CONFIGS.map((config) => {
          const Icon = config.icon;
          return (
            <button
              key={config.type}
              type="button"
              onClick={() => handleReactionClick(config.type)}
              disabled={cooldown}
              className={`w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center transition-all duration-100 cursor-pointer active:scale-90 hover:scale-110 ${config.bg} border ${config.border} shadow-sm`}
              title={config.label}
              style={{
                boxShadow: `0 0 8px ${config.glow}`,
              }}
            >
              <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${config.text}`} />
            </button>
          );
        })}

        {/* دکمه قطع/وصل صدا */}
        <button
          type="button"
          onClick={handleToggleSound}
          className="w-7 h-7 sm:w-7.5 sm:h-7.5 rounded-full flex items-center justify-center transition-all duration-100 cursor-pointer active:scale-90 bg-white/5 border border-white/10 text-gray-300 hover:text-white hover:bg-white/10"
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
