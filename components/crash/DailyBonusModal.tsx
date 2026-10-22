'use client';

import { useStore } from '@/lib/store';
import { triggerHaptic } from '@/lib/telegramHaptics';
import { Check, Coins, Crown, Flame, Lock, RotateCw, Sparkles, Star, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DailyBonusModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
}

interface WheelSlice {
  id: number;
  amount: number;
  color: string;
  label: string;
}

const DEFAULT_WHEEL_SLICES: WheelSlice[] = [
  { id: 0, amount: 50, color: '#0284c7', label: '50' },
  { id: 1, amount: 100, color: '#059669', label: '100' },
  { id: 2, amount: 150, color: '#7c3aed', label: '150' },
  { id: 3, amount: 200, color: '#d97706', label: '200' },
  { id: 4, amount: 250, color: '#2563eb', label: '250' },
  { id: 5, amount: 350, color: '#ea580c', label: '350' },
  { id: 6, amount: 500, color: '#db2777', label: '500' },
  { id: 7, amount: 1000, color: '#eab308', label: '1,000' },
];

const DEFAULT_STREAK_MULTIPLIERS = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5];

export function DailyBonusModal({ isOpen, onCloseAction }: DailyBonusModalProps) {
  const { user, setBalance } = useStore();
  const [loading, setLoading] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [isStarsPurchasing, setIsStarsPurchasing] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [nextStreakDay, setNextStreakDay] = useState(1);
  const [streakMultiplier, setStreakMultiplier] = useState(1.0);
  const [streakMultipliers, setStreakMultipliers] = useState<number[]>(DEFAULT_STREAK_MULTIPLIERS);
  const [wheelSlices, setWheelSlices] = useState<WheelSlice[]>(DEFAULT_WHEEL_SLICES);
  const [rotationDegrees, setRotationDegrees] = useState(0);
  const [lastWin, setLastWin] = useState<{
    baseReward: number;
    multiplier: number;
    totalReward: number;
    streakDay: number;
    spinType: 'free' | 'stars';
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const spinIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // واکشی وضعیت گردونه و استریک روزانه
  const fetchStatus = useCallback(() => {
    const targetTelegramId = user?.telegramId || 'dev-test-user';

    setLoading(true);
    setError(null);

    fetch(`/api/wallet/daily-bonus?telegram_id=${encodeURIComponent(targetTelegramId)}`)
      .then((res) => {
        if (!res.ok) throw new Error('خطا در دریافت اطلاعات گردونه');
        return res.json();
      })
      .then((data) => {
        if (data.canClaim !== undefined) {
          const isReady = Boolean(data.canClaim) || (data.remainingMs ?? 0) <= 0;
          setCanClaim(isReady);
          setRemainingMs(isReady ? 0 : Math.max(0, data.remainingMs || 0));
          setCurrentStreak(data.currentStreak || 0);
          setNextStreakDay(data.nextStreakDay || 1);
          setStreakMultiplier(data.streakMultiplier || 1.0);
          if (Array.isArray(data.streakMultipliers)) {
            setStreakMultipliers(data.streakMultipliers);
          }
          if (Array.isArray(data.wheelSlices)) {
            setWheelSlices(data.wheelSlices);
          }
        }
      })
      .catch((err) => {
        console.warn('Daily bonus status fetch error:', err);
        setCanClaim(true);
        setRemainingMs(0);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [user?.telegramId]);

  useEffect(() => {
    if (isOpen) {
      setLastWin(null);
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  // شمارنده معکوس تا نوبت چرخش رایگان بعدی
  useEffect(() => {
    if (remainingMs <= 0) {
      if (!loading && !isSpinning && !canClaim) {
        setCanClaim(true);
      }
      return;
    }

    const timer = setInterval(() => {
      setRemainingMs((prev) => {
        if (prev <= 1000) {
          setCanClaim(true);
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [remainingMs, loading, isSpinning, canClaim]);

  // پاکسازی تایمر افکت لرزش
  useEffect(() => {
    return () => {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
    };
  }, []);

  // اجرای انیمیشن چرخش و دریافت نتیجه از سرور
  const handleSpin = async (spinType: 'free' | 'stars' = 'free') => {
    const targetTelegramId = user?.telegramId || 'dev-test-user';
    const isFreeReady = canClaim || remainingMs <= 0;
    if (!targetTelegramId || isSpinning || (spinType === 'free' && !isFreeReady)) return;

    setIsSpinning(true);
    setError(null);
    setLastWin(null);
    triggerHaptic('medium');

    // ایجاد ارتعاش متوالی هپتیک در حین چرخش
    spinIntervalRef.current = setInterval(() => {
      triggerHaptic('light');
    }, 280);

    try {
      const res = await fetch('/api/wallet/daily-bonus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: targetTelegramId,
          spinType,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'خطا در ثبت چرخش گردونه');
      }

      const winningIndex = data.winningIndex ?? 0;

      // محاسبه زاویه فرود دقیق روی نوک پیکان (۱۲ ظهر = 0 درجه)
      // خانه index در حالت پایه در زاویه (index * 45) درجه است
      const sliceCenterAngle = winningIndex * 45;
      const targetRemainder = (360 - sliceCenterAngle) % 360;

      // حداقل ۶ دور کامل (۲۱۶۰ درجه) چرخش به جلو
      const minFullRotations = 6 * 360;
      const currentMod = rotationDegrees % 360;
      const forwardDelta = (targetRemainder - currentMod + 360) % 360;
      const newTotalDegrees = rotationDegrees + minFullRotations + forwardDelta;

      setRotationDegrees(newTotalDegrees);

      // پس از اتمام چرخش (۴.۵ ثانیه)
      setTimeout(() => {
        if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
        triggerHaptic('success');
        setIsSpinning(false);
        setBalance(data.newBalance);
        setLastWin({
          baseReward: data.baseReward,
          multiplier: data.streakMultiplier,
          totalReward: data.totalReward,
          streakDay: data.streakDay,
          spinType,
        });

        if (spinType === 'free') {
          setCanClaim(false);
          setCurrentStreak(data.streakDay);
          setNextStreakDay((data.streakDay % 7) + 1);
          setRemainingMs(24 * 60 * 60 * 1000);
        }
      }, 4500);
    } catch (err: any) {
      if (spinIntervalRef.current) clearInterval(spinIntervalRef.current);
      setIsSpinning(false);
      triggerHaptic('error');
      setError(err?.message || 'خطا در چرخش گردونه شانس');
    }
  };

  // چرخش مجدد از طریق درگاه پرداخت ستاره تلگرام (Telegram Stars)
  const handleStarsSpin = async () => {
    const targetTelegramId = user?.telegramId || 'dev-test-user';
    if (!targetTelegramId || isSpinning || isStarsPurchasing) return;

    setIsStarsPurchasing(true);
    setError(null);
    triggerHaptic('medium');

    try {
      const res = await fetch('/api/wallet/stars/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: 'spin_extra',
          telegramId: targetTelegramId,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'خطا در ایجاد فاکتور ستاره تلگرام');
      }

      const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

      if (tg?.openInvoice && !data.isMock) {
        tg.openInvoice(data.invoiceLink, async (status: string) => {
          if (status === 'paid') {
            await confirmAndExecuteStarsSpin(data.package);
          } else if (status === 'failed') {
            triggerHaptic('error');
            setError('پرداخت ستاره لغو شد یا با خطا مواجه گردید.');
            setIsStarsPurchasing(false);
          } else {
            setIsStarsPurchasing(false);
          }
        });
      } else {
        // شبیه‌سازی خرید ستاره در محیط لوکال و تست
        await confirmAndExecuteStarsSpin(data.package);
      }
    } catch (err: any) {
      console.error('Stars spin invoice error:', err);
      triggerHaptic('error');
      setError(err?.message || 'خطا در درگاه ستاره تلگرام');
      setIsStarsPurchasing(false);
    }
  };

  const confirmAndExecuteStarsSpin = async (pkg: any) => {
    const targetTelegramId = user?.telegramId || 'dev-test-user';
    try {
      const confirmRes = await fetch('/api/wallet/stars/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: targetTelegramId,
          packageId: pkg.id,
          itemType: pkg.itemType,
          starsAmount: pkg.stars,
          rewardCoins: 0,
        }),
      });

      const resData = await confirmRes.json();
      if (resData.success) {
        setIsStarsPurchasing(false);
        // اجرای چرخش با ستاره
        await handleSpin('stars');
      } else {
        throw new Error(resData.error || 'خطا در تایید تراکنش ستاره');
      }
    } catch (err: any) {
      triggerHaptic('error');
      setError(err?.message || 'خطا در نهایی‌سازی پرداخت ستاره');
      setIsStarsPurchasing(false);
    }
  };

  if (!isOpen) return null;

  const hours = Math.floor(remainingMs / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="relative w-full max-w-sm sm:max-w-md bg-gradient-to-b from-[#1f2937] via-[#1a222e] to-[#181a20] border border-[#374151] rounded-3xl p-4 sm:p-5 shadow-[0_20px_50px_rgba(0,0,0,0.95)] text-center space-y-3.5 select-none my-auto">
        {/* نورهای پس‌زمینه تزئینی */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* دکمه بستن */}
        <button
          type="button"
          onClick={onCloseAction}
          disabled={isSpinning}
          className="absolute top-3 left-3 text-gray-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer z-10 disabled:opacity-40"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ۱. هدر استریک روزانه */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-yellow-400/50 shadow-[0_0_12px_rgba(250,204,21,0.25)]">
            <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
            <span className="text-xs font-black text-yellow-300">
              استریک ورود: {currentStreak} روز متوالی
            </span>
            <span className="text-[11px] font-mono font-bold bg-yellow-400/20 text-yellow-200 px-1.5 py-0.2 rounded border border-yellow-400/40">
              ضریب {streakMultiplier.toFixed(1)}x
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center justify-center gap-1.5">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            <span>گردونه شانس کیهانی (Spin Wheel)</span>
          </h3>
        </div>

        {/* ۲. زنجیره ۷ روزه استریک */}
        <div className="grid grid-cols-7 gap-1 pt-1">
          {streakMultipliers.map((mult, idx) => {
            const dayNum = idx + 1;
            const isCompleted = currentStreak >= dayNum;
            const isCurrentTarget = nextStreakDay === dayNum;
            const isDay7 = dayNum === 7;

            return (
              <div
                key={dayNum}
                className={`py-1.5 px-0.5 rounded-lg border flex flex-col items-center justify-between text-center transition-all ${
                  isCompleted
                    ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300 shadow-[0_0_8px_rgba(16,185,129,0.2)]'
                    : isCurrentTarget
                    ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300 shadow-[0_0_12px_rgba(250,204,21,0.4)] scale-105 z-10'
                    : isDay7
                    ? 'bg-amber-500/10 border-amber-500/40 text-amber-300/80'
                    : 'bg-[#181a20]/70 border-[#374151]/70 text-gray-400'
                }`}
              >
                <span className="text-[9px] font-bold text-gray-400">روز {dayNum}</span>
                <span className="text-[10px] font-black font-mono my-0.5 dir-ltr">
                  {mult.toFixed(1)}x
                </span>
                {isCompleted ? (
                  <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                ) : isCurrentTarget ? (
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
                ) : isDay7 ? (
                  <Crown className="w-3 h-3 text-amber-400" />
                ) : (
                  <Lock className="w-2.5 h-2.5 text-gray-500" />
                )}
              </div>
            );
          })}
        </div>

        {/* ۳. گردونه شانس بصری (SVG Fortune Wheel) */}
        <div className="relative w-[260px] h-[260px] mx-auto my-2 flex items-center justify-center">
          {/* نشانگر بالای گردونه (پیکان طلایی متوقف‌کننده) */}
          <div className="absolute -top-3 z-20 flex flex-col items-center filter drop-shadow-[0_2px_8px_rgba(250,204,21,0.8)]">
            <div className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[16px] border-t-yellow-400" />
            <div className="w-2 h-2 rounded-full bg-amber-400 -mt-1 shadow-sm" />
          </div>

          {/* حلقه بیرونی درخشان گردونه */}
          <div className="w-[256px] h-[256px] rounded-full p-1.5 bg-gradient-to-tr from-yellow-500 via-amber-400 to-yellow-600 shadow-[0_0_30px_rgba(250,204,21,0.4)] border-2 border-yellow-300">
            {/* صفحه چرخان SVG */}
            <svg
              viewBox="0 0 260 260"
              className="w-full h-full rounded-full"
              style={{
                transform: `rotate(${rotationDegrees}deg)`,
                transition: isSpinning
                  ? 'transform 4.5s cubic-bezier(0.15, 0.85, 0.15, 1.0)'
                  : 'none',
              }}
            >
              {wheelSlices.map((slice, i) => (
                <g key={slice.id} transform={`rotate(${i * 45}, 130, 130)`}>
                  {/* قطاع زاویه‌ای ۴۵ درجه */}
                  <path
                    d="M 130 130 L 84.08 19.13 A 120 120 0 0 1 175.92 19.13 Z"
                    fill={slice.color}
                    stroke="#181a20"
                    strokeWidth="2.5"
                  />
                  {/* برچسب عدد سکه داخل قطاع */}
                  <g transform="translate(130, 52) rotate(90)">
                    <text
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#ffffff"
                      fontWeight="900"
                      fontSize="13"
                      fontFamily="monospace"
                      filter="drop-shadow(0 1px 2px rgba(0,0,0,0.8))"
                    >
                      {slice.label}
                    </text>
                  </g>
                </g>
              ))}

              {/* خطوط جداکننده طلایی */}
              <circle cx="130" cy="130" r="120" fill="none" stroke="#facc15" strokeWidth="3" />
            </svg>
          </div>

          {/* توپی مرکزی گردونه (Hub) */}
          <div className="absolute z-10 w-14 h-14 rounded-full bg-gradient-to-b from-[#2a303c] to-[#141820] border-2 border-yellow-400 shadow-[0_0_16px_rgba(0,0,0,0.8)] flex items-center justify-center">
            <Coins className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
        </div>

        {/* ۴. نمایش پیام برد آخرین چرخش */}
        {lastWin && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-950/80 to-green-950/80 border border-emerald-400/60 shadow-[0_0_18px_rgba(16,185,129,0.35)] animate-in zoom-in-95 duration-200">
            <div className="text-xs text-emerald-300 font-bold flex items-center justify-center gap-1.5 mb-1">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>تبریک! پاداش گردونه دریافت شد</span>
            </div>
            <div className="text-xl sm:text-2xl font-mono font-black text-yellow-300 flex items-center justify-center gap-1.5 dir-ltr">
              <span>+{lastWin.totalReward}</span>
              <Coins className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-[11px] text-gray-300 mt-1">
              ({lastWin.baseReward} سکه پایه × ضریب استریک {lastWin.multiplier.toFixed(1)}x)
            </div>
          </div>
        )}

        {error && (
          <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-500/50 text-red-300 text-xs font-bold">
            {error}
          </div>
        )}

        {/* ۵. دکمه‌های اکشن: چرخش رایگان روزانه و چرخش با تلگرام استارز */}
        <div className="space-y-2 pt-1">
          {/* دکمه چرخش رایگان */}
          <button
            type="button"
            onClick={() => handleSpin('free')}
            disabled={loading || (!canClaim && remainingMs > 0) || isSpinning || isStarsPurchasing}
            className={`w-full min-h-[50px] rounded-2xl font-black text-sm sm:text-base transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              !loading && (canClaim || remainingMs <= 0) && !isSpinning
                ? 'bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-400 text-black shadow-[0_0_24px_rgba(250,204,21,0.6)] active:scale-95 animate-pulse'
                : 'bg-[#374151]/60 text-gray-400 cursor-not-allowed border border-[#374151]'
            }`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-gray-400" />
                <span>در حال واکشی وضعیت گردونه...</span>
              </span>
            ) : isSpinning ? (
              <span className="flex items-center gap-2">
                <RotateCw className="w-4 h-4 animate-spin text-black" />
                <span>در حال چرخش گردونه شانس...</span>
              </span>
            ) : canClaim || remainingMs <= 0 ? (
              <span className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-black" />
                <span>چرخش رایگان روزانه (روز {nextStreakDay})</span>
              </span>
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm">
                <span>چرخش رایگان بعدی در:</span>
                <span className="font-mono text-yellow-400 font-bold dir-ltr bg-black/40 px-2 py-0.5 rounded border border-yellow-400/30">
                  {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
                </span>
              </div>
            )}
          </button>

          {/* دکمه چرخش اضافه با تلگرام استارز (Telegram Stars) */}
          <button
            type="button"
            onClick={handleStarsSpin}
            disabled={isSpinning || isStarsPurchasing}
            className="w-full min-h-[46px] rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_20px_rgba(14,165,233,0.4)] active:scale-95 border border-sky-300/40 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isStarsPurchasing ? (
              <span>در حال ارتباط با درگاه تلگرام استارز...</span>
            ) : (
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>چرخش مجدد با ۱۵ ستاره تلگرام (Telegram Stars)</span>
                <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
