'use client';

import { Card, CardContent } from '@/components/ui/card';
import { shareScoreToTelegram, triggerHaptic, triggerHapticCashout } from '@/lib/telegramHaptics';
import { Coins, Crown, Flame, Rocket, Share2, Trophy, Zap } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

interface CrashBetControlsProps {
  gameState: 'betting' | 'flying' | 'crashed';
  startTime?: number;
  crashTime?: number;
  crashPoint?: number;
  currentMultiplier?: number;
  onPlaceBetAction: (amount: number) => void;
  onCashoutAction: () => void;
  onAutoCashoutChange?: (enabled: boolean, target: number) => void;
  onBetAmountChange?: (amount: number) => void;
  externalAutoCashoutEnabled?: boolean;
  externalAutoCashoutTarget?: number;
  userBet: number | null;
  userCashout: number | null;
  balance: number;
  connected: boolean;
}

function CrashBetControls({
  gameState,
  startTime = 0,
  crashTime = 20000,
  crashPoint = 1.0,
  currentMultiplier,
  onPlaceBetAction,
  onCashoutAction,
  onAutoCashoutChange,
  onBetAmountChange,
  externalAutoCashoutEnabled,
  externalAutoCashoutTarget,
  userBet,
  userCashout,
  balance,
  connected,
}: CrashBetControlsProps) {
  const allowedBets = [10, 50, 100];
  const [betAmount, setBetAmount] = useState<number>(10);
  const [internalMultiplier, setInternalMultiplier] = useState<number>(1.0);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // برداشت خودکار کنترل‌شده از کامپوننت والد (بدون وضعیت موازی برای جلوگیری از نیاز به دوبار کلیک)
  const autoCashoutEnabled = externalAutoCashoutEnabled ?? false;
  const autoCashoutTarget = externalAutoCashoutTarget ?? 2.0;

  // ارسال مبلغ شرط انتخاب‌شده به کامپوننت والد جهت ارتقای ظاهر وسیله/موشک
  useEffect(() => {
    if (onBetAmountChange) {
      onBetAmountChange(betAmount);
    }
  }, [betAmount, onBetAmountChange]);

  // محاسبه ایزوله ضریب بازی هماهنگ با فرمول سرور
  useEffect(() => {
    if (currentMultiplier !== undefined) return; // در صورت دریافت ضریب بیرونی، از آن استفاده می‌شود

    if (gameState !== 'flying') {
      if (gameState === 'crashed') {
        setInternalMultiplier(crashPoint || 1.0);
      } else {
        setInternalMultiplier(1.0);
      }
      return;
    }

    let animationFrameId: number;
    const calculateCrashTime = (cp: number) => {
      const seconds = Math.log(Math.max(1.01, cp)) / 0.06;
      return Math.max(800, Math.round(seconds * 1000));
    };

    const effectiveCrashTime =
      crashTime > 0 ? crashTime : calculateCrashTime(crashPoint || 1.0);
    const targetCrashPoint = crashPoint > 1.0 ? crashPoint : null;

    const tick = () => {
      const elapsed = Math.max(0, Date.now() - startTime);

      if (elapsed >= effectiveCrashTime) {
        setInternalMultiplier(targetCrashPoint || Math.max(1.0, Math.exp(0.06 * (effectiveCrashTime / 1000))));
      } else {
        const rawMult = Math.max(1.0, Math.exp(0.06 * (elapsed / 1000)));
        const mult = targetCrashPoint ? Math.min(targetCrashPoint, rawMult) : rawMult;
        setInternalMultiplier(mult);
        animationFrameId = requestAnimationFrame(tick);
      }
    };

    animationFrameId = requestAnimationFrame(tick);
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [gameState, startTime, crashTime, crashPoint, currentMultiplier]);

  const activeMultiplier = currentMultiplier ?? internalMultiplier;

  // پاکسازی تایمر پردازش
  useEffect(() => {
    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, []);

  const handlePlaceBet = () => {
    if (!allowedBets.includes(betAmount) || balance < betAmount || isProcessing || !connected) {
      return;
    }

    triggerHaptic('medium');
    setIsProcessing(true);
    onPlaceBetAction(betAmount);

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
    }, 1000);
  };

  const handleSelectBet = (amount: number) => {
    if (allowedBets.includes(amount) && (!userBet || gameState === 'crashed')) {
      const isUpgrade = amount >= 50;
      triggerHaptic(isUpgrade ? 'heavy' : 'selection');
      setBetAmount(amount);
      if (onBetAmountChange) {
        onBetAmountChange(amount);
      }
    }
  };

  const handleCashoutClick = () => {
    if (!userBet || userCashout || gameState !== 'flying') {
      return;
    }

    triggerHapticCashout();
    setIsProcessing(true);
    onCashoutAction();

    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    processingTimeoutRef.current = setTimeout(() => {
      setIsProcessing(false);
    }, 800);
  };

  // بررسی اجرای خودکار برداشت در صورت رسیدن به ضریب هدف (Auto Cash Out)
  useEffect(() => {
    if (
      autoCashoutEnabled &&
      gameState === 'flying' &&
      Boolean(userBet) &&
      !userCashout &&
      !isProcessing &&
      activeMultiplier >= autoCashoutTarget
    ) {
      handleCashoutClick();
    }
  }, [activeMultiplier, autoCashoutEnabled, autoCashoutTarget, gameState, userBet, userCashout, isProcessing]);

  const hasEnoughBalance = balance >= betAmount;
  const canBet =
    gameState === 'betting' &&
    hasEnoughBalance &&
    !userBet &&
    !isProcessing &&
    connected;
  const canCashout =
    gameState === 'flying' &&
    Boolean(userBet) &&
    !userCashout;

  const livePayout = userBet ? (userBet * activeMultiplier).toFixed(1) : '0.0';

  return (
    <Card className="bg-gradient-to-b from-[#1f2937] via-[#1a222e] to-[#181a20] border border-[#374151]/90 rounded-2xl shadow-[0_12px_32px_rgba(0,0,0,0.8)] px-3.5 sm:px-4 py-3 sm:py-3.5 relative overflow-hidden">
      <CardContent className="p-0 space-y-3">
        {/* انتخاب مبلغ شرط (Arcade Chips) */}
        <div>
          <div className="flex justify-between items-center mb-1.5 text-xs">
            <span className="text-[#9ca3af] font-semibold">مبلغ شرط:</span>
            {!hasEnoughBalance && gameState === 'betting' ? (
              <span className="text-red-400 font-bold">موجودی کافی نیست</span>
            ) : (
              <span className="text-gray-400 font-mono text-[11px] dir-ltr flex items-center gap-1">
                <span>موجودی:</span>
                <span className="text-yellow-400/90 font-bold">{balance.toFixed(0)}</span>
                <Coins className="w-3 h-3 text-yellow-400" />
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {allowedBets.map((amount) => {
              const isSelected = betAmount === amount;
              const isLocked = Boolean(userBet) && gameState !== 'crashed';
              const isTier3 = amount === 100;
              const isTier2 = amount === 50;

              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => handleSelectBet(amount)}
                  disabled={isLocked}
                  className={`min-h-[50px] py-1.5 px-2 rounded-xl font-extrabold font-mono transition-all duration-150 flex flex-col items-center justify-center cursor-pointer ${
                    isSelected
                      ? isTier3
                        ? 'bg-gradient-to-b from-amber-500/30 to-yellow-500/20 text-yellow-300 border-2 border-yellow-400 shadow-[0_0_18px_rgba(250,204,21,0.5)] scale-[1.03]'
                        : isTier2
                        ? 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400 shadow-[0_0_16px_rgba(6,182,212,0.4)] scale-[1.02]'
                        : 'bg-yellow-500/20 text-yellow-300 border-2 border-yellow-400 shadow-[0_0_14px_rgba(250,204,21,0.35)] scale-[1.02]'
                      : isTier3
                      ? 'bg-[#374151]/80 text-yellow-400/80 border-2 border-amber-500/30 hover:border-yellow-400/60 hover:text-yellow-300'
                      : isTier2
                      ? 'bg-[#374151]/80 text-cyan-400/80 border-2 border-cyan-500/30 hover:border-cyan-400/60 hover:text-cyan-300'
                      : 'bg-[#374151]/80 text-gray-200 border-2 border-transparent hover:border-[#374151] hover:text-white hover:bg-[#374151]'
                  } ${isLocked ? 'opacity-40 cursor-not-allowed scale-100' : 'active:scale-95'}`}
                >
                  <div className="flex items-center gap-1">
                    <span className="dir-ltr text-sm sm:text-base">{amount}</span>
                    <Coins className="w-3.5 h-3.5 text-yellow-400/90" />
                  </div>
                  <div className="flex items-center gap-0.5 text-[9px] font-sans font-bold leading-tight mt-0.5">
                    {isTier3 ? (
                      <>
                        <Crown className="w-2.5 h-2.5 text-yellow-300" />
                        <span className="text-yellow-300">هایپر 👑</span>
                      </>
                    ) : isTier2 ? (
                      <>
                        <Zap className="w-2.5 h-2.5 text-cyan-300" />
                        <span className="text-cyan-300">توربو ⚡</span>
                      </>
                    ) : (
                      <span className="text-gray-400">کلاسیک</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* قابلیت بونوس: برداشت خودکار و ارتقای ناوگان سفینه */}
        <div className="bg-[#181a20]/90 p-2.5 sm:p-3 rounded-xl border border-[#374151]/90 shadow-inner space-y-2">
          <div className="flex justify-between items-center">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoCashoutEnabled}
                onChange={(e) => onAutoCashoutChange?.(e.target.checked, autoCashoutTarget)}
                className="w-4 h-4 rounded text-yellow-500 bg-gray-800 border-gray-600 focus:ring-0 cursor-pointer accent-yellow-400"
              />
              <span className="text-xs font-bold text-gray-200">برداشت خودکار و ارتقای سفینه</span>
            </label>
            {autoCashoutEnabled ? (
              <span className="text-[11px] font-mono font-extrabold dir-ltr px-2 py-0.5 rounded border bg-yellow-400/10 text-yellow-300 border-yellow-400/40 shadow-[0_0_8px_rgba(250,204,21,0.2)]">
                هدف: {autoCashoutTarget.toFixed(1)}x
              </span>
            ) : (
              <span className="text-[10px] text-gray-500 font-mono">سفینه پایه</span>
            )}
          </div>

          {autoCashoutEnabled && (
            <div className="pt-2 border-t border-[#374151]/60 space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-gray-400">انتخاب ضریب هدف پرواز:</span>
                <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1">
                  {autoCashoutTarget >= 10 ? (
                    <>
                      <Crown className="w-3 h-3 text-yellow-300" />
                      <span>ناوبر کیهانی طلایی (سطح ۴)</span>
                    </>
                  ) : autoCashoutTarget >= 5 ? (
                    <>
                      <Zap className="w-3 h-3 text-purple-300" />
                      <span>ناوشکن هایپردایو (سطح ۳)</span>
                    </>
                  ) : autoCashoutTarget >= 2 ? (
                    <>
                      <Flame className="w-3 h-3 text-cyan-300" />
                      <span>جنگنده فانتوم (سطح ۲)</span>
                    </>
                  ) : (
                    <>
                      <Rocket className="w-3 h-3 text-emerald-300" />
                      <span>راکت فالکون (سطح ۱)</span>
                    </>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-6 gap-1">
                {[1.5, 2.0, 3.0, 5.0, 10.0, 20.0].map((preset) => {
                  const isSelected = autoCashoutTarget === preset;
                  const isTier4 = preset >= 10;
                  const isTier3 = preset >= 5 && preset < 10;
                  const isTier2 = preset >= 2 && preset < 5;

                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onAutoCashoutChange?.(true, preset)}
                      className={`min-h-[36px] py-1 px-1 rounded-lg text-xs font-mono font-extrabold transition-all duration-150 flex flex-col items-center justify-center cursor-pointer ${
                        isSelected
                          ? isTier4
                            ? 'bg-gradient-to-b from-yellow-300 to-amber-500 text-black border border-yellow-200 shadow-[0_0_12px_rgba(250,204,21,0.6)] scale-[1.05]'
                            : isTier3
                            ? 'bg-purple-600 text-white border border-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.5)] scale-[1.03]'
                            : isTier2
                            ? 'bg-cyan-500 text-black border border-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.4)] scale-[1.03]'
                            : 'bg-emerald-500 text-black border border-emerald-300 shadow-sm scale-[1.03]'
                          : 'bg-[#374151]/80 text-gray-300 hover:text-white hover:bg-[#374151]'
                      }`}
                    >
                      <span>{preset >= 10 ? `${preset}x` : `${preset.toFixed(1)}x`}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* دکمه اصلی عملکرد (The Cosmic Arcade Action Trigger) */}
        <div>
          {gameState === 'betting' ? (
            userBet ? (
              <button
                type="button"
                disabled
                className="w-full min-h-[56px] rounded-xl bg-green-950/60 border border-green-500/50 text-green-300 font-extrabold text-base flex items-center justify-center gap-2 cursor-not-allowed shadow-[0_0_14px_rgba(34,197,94,0.25)]"
              >
                <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" aria-hidden="true" />
                <span className="flex items-center gap-1">
                  <span>شرط ثبت شد (</span>
                  <span className="dir-ltr font-mono">{userBet}</span>
                  <Coins className="w-3.5 h-3.5 text-green-400" />
                  <span>) • در انتظار پرتاب</span>
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePlaceBet}
                disabled={!canBet}
                className={`w-full min-h-[56px] rounded-xl font-extrabold text-base sm:text-lg transition-all duration-150 flex items-center justify-center gap-2.5 cursor-pointer shadow-[0_0_20px_rgba(22,163,74,0.45)] border border-green-400/40 active:scale-[0.98] ${
                  canBet
                    ? 'bg-[#16a34a] hover:bg-[#15803d] text-white'
                    : 'bg-[#374151]/60 border-[#374151] text-gray-400 cursor-not-allowed opacity-60 shadow-none'
                }`}
              >
                {isProcessing ? (
                  <span>در حال ارسال تله‌متری شرط...</span>
                ) : !hasEnoughBalance ? (
                  <span>موجودی سکه کافی نیست</span>
                ) : (
                  <>
                    <span>ثبت شرط</span>
                    <span className="font-mono bg-black/30 px-2.5 py-0.5 rounded-lg text-sm sm:text-base dir-ltr border border-white/20 flex items-center gap-1">
                      <span>{betAmount}</span>
                      <Coins className="w-3.5 h-3.5 text-yellow-400" />
                    </span>
                  </>
                )}
              </button>
            )
          ) : canCashout ? (
            <button
              type="button"
              onClick={handleCashoutClick}
              disabled={isProcessing}
              className="w-full min-h-[56px] rounded-xl bg-[#facc15] hover:bg-[#eab308] text-[#181a20] font-black text-base sm:text-lg transition-all duration-100 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_26px_rgba(250,204,21,0.65)] active:scale-[0.98] animate-pulse"
            >
              <span>برداشت سود</span>
              <span className="font-mono text-lg sm:text-xl dir-ltr font-extrabold flex items-center gap-1">
                <span>{livePayout}</span>
                <Coins className="w-4 h-4 text-[#181a20]" />
              </span>
              <span className="text-xs bg-[#181a20]/30 px-2 py-0.5 rounded-md font-mono font-bold dir-ltr border border-black/10">
                {activeMultiplier.toFixed(2)}x
              </span>
            </button>
          ) : userBet && userCashout ? (
            <div className="space-y-2">
              <div className="w-full min-h-[52px] rounded-xl bg-green-950/80 border border-green-500/70 text-green-300 font-extrabold text-sm sm:text-base flex items-center justify-between px-3 shadow-[0_0_18px_rgba(34,197,94,0.3)]">
                <span className="flex items-center gap-1.5">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                  <span>برداشت در ضریب <strong className="dir-ltr font-mono text-yellow-300">{userCashout.toFixed(2)}x</strong></span>
                </span>
                <span className="font-mono text-green-400 font-extrabold dir-ltr bg-black/40 px-2.5 py-1 rounded-lg border border-green-500/40 flex items-center gap-1">
                  <span>+{(userBet * userCashout).toFixed(1)}</span>
                  <Coins className="w-3.5 h-3.5 text-green-400" />
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  shareScoreToTelegram(userCashout, userBet * userCashout - userBet);
                }}
                className="w-full min-h-[44px] rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-extrabold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer shadow-[0_0_18px_rgba(14,165,233,0.45)] active:scale-95 border border-sky-300/30"
              >
                <Share2 className="w-4 h-4 text-sky-200" />
                <span>اشتراک‌گذاری برد در تلگرام (Share)</span>
              </button>
            </div>
          ) : userBet && gameState === 'crashed' ? (
            <button
              type="button"
              disabled
              className="w-full min-h-[56px] rounded-xl bg-red-950/70 border border-red-500/60 text-red-300 font-extrabold text-base flex items-center justify-center gap-2 cursor-not-allowed shadow-[0_0_16px_rgba(220,38,38,0.3)]"
            >
              <span>انفجار موشک (<span className="dir-ltr font-mono">{activeMultiplier.toFixed(2)}x</span>)</span>
            </button>
          ) : gameState === 'flying' ? (
            <button
              type="button"
              disabled
              className="w-full min-h-[56px] rounded-xl bg-[#181a20] border border-[#374151] text-gray-400 font-bold text-base flex items-center justify-center gap-2 cursor-not-allowed shadow-inner"
            >
              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-ping" aria-hidden="true" />
              <span>موشک در حال اوج‌گیری • <span className="dir-ltr font-mono text-yellow-400">{activeMultiplier.toFixed(2)}x</span></span>
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="w-full min-h-[56px] rounded-xl bg-[#181a20] border border-[#374151] text-gray-400 font-bold text-base flex items-center justify-center gap-2 cursor-not-allowed shadow-inner"
            >
              <span>انفجار در <span className="dir-ltr font-mono text-red-400">{activeMultiplier.toFixed(2)}x</span> • شروع دور بعد</span>
            </button>
          )}
        </div>

        {/* وضعیت شرط کاربر در دور جاری */}
        {userBet && (
          <div className="px-3 py-2 bg-[#181a20]/90 border border-[#374151]/80 rounded-xl flex items-center justify-between text-xs sm:text-sm">
            <span className="text-[#9ca3af] flex items-center gap-1">
              <span>شرط شما:</span>
              <span className="font-mono text-white font-extrabold dir-ltr">{userBet.toFixed(0)}</span>
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
            </span>
            {userCashout ? (
              <span className="text-green-400 font-bold font-mono dir-ltr flex items-center gap-1">
                <span>سود خالص: +{(userBet * userCashout).toFixed(1)}</span>
                <Coins className="w-3.5 h-3.5 text-green-400" />
              </span>
            ) : gameState === 'flying' ? (
              <span className="text-yellow-400 font-bold font-mono dir-ltr flex items-center gap-1">
                <span>قابل برداشت: {livePayout}</span>
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
              </span>
            ) : gameState === 'crashed' ? (
              <span className="text-red-400 font-bold font-mono dir-ltr flex items-center gap-1">
                <span>باخت: -{userBet.toFixed(0)}</span>
                <Coins className="w-3.5 h-3.5 text-red-400" />
              </span>
            ) : (
              <span className="text-gray-400 font-mono">در انتظار پرتاب</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default memo(CrashBetControls);
