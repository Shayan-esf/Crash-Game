'use client';

import { useLobbySocket } from '@/hooks/useLobbySocket';
import { useStore } from '@/lib/store';
import { triggerHaptic, triggerHapticCashout, triggerHapticCrash } from '@/lib/telegramHaptics';
import { init, retrieveRawInitData } from '@telegram-apps/sdk';
import { Crown, History, Rocket, Search, ShieldCheck, TrendingUp, Trophy, Users, Zap } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import CrashBetControls from './CrashBetControls';
import GameHistory from './GameHistory';
import LiveReactionsOverlay from './LiveReactionsOverlay';
import { MultiplayerLiveBets } from './MultiplayerLiveBets';
import PhaserGame from './PhaserGame';
import { ProvablyFairModal } from './ProvablyFairModal';
import SessionHistory from './SessionHistory';
import { CrashTheme, ThemeSelector } from './ThemeSelector';
import TopRecords from './TopRecords';

export default function CrashGameArea() {
  const [phase, setPhase] = useState<'betting' | 'flying' | 'crashed'>('betting');
  const [startTime, setStartTime] = useState<number>(0);
  const [crashPoint, setCrashPoint] = useState<number>(2);
  const [crashTime, setCrashTime] = useState<number>(20000);
  const [duration, setDuration] = useState<number>(10000);
  const [betEndTime, setBetEndTime] = useState<number>(0);
  const [seed, setSeed] = useState<string>('');
  const [roundHash, setRoundHash] = useState<string>('');
  const [salt, setSalt] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [userBet, setUserBet] = useState<number | null>(null);
  const [userCashout, setUserCashout] = useState<number | null>(null);
  const [userBetAmount, setUserBetAmount] = useState<number>(0);
  const [initData, setInitData] = useState<string>('');
  const [isProcessingBet, setIsProcessingBet] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'players' | 'sessions' | 'records'>('history');
  const [isProvablyFairOpen, setIsProvablyFairOpen] = useState(false);
  const [currentMultiplier, setCurrentMultiplier] = useState(1.0);
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false);
  const [autoCashoutTarget, setAutoCashoutTarget] = useState(2.0);
  const [currentTheme, setCurrentTheme] = useState<CrashTheme>('racing');
  const [selectedBetAmount, setSelectedBetAmount] = useState<number>(10);
  const [upgradePulse, setUpgradePulse] = useState<{ tier: number; id: number }>({ tier: 1, id: 0 });
  const [latestReaction, setLatestReaction] = useState<{
    id: string;
    reaction: 'rocket' | 'flame' | 'zap' | 'trophy';
    multiplier?: number;
    username?: string;
  } | null>(null);
  const betTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // بازیابی تم ذخیره‌شده کاربر
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedTheme = localStorage.getItem('crash_game_active_theme') as CrashTheme | null;
      if (savedTheme && (savedTheme === 'rocket' || savedTheme === 'racing' || savedTheme === 'chart')) {
        setCurrentTheme(savedTheme);
      }
    } catch (e) {
      console.warn('خطا در خواندن تم از حافظه محلی:', e);
    }
  }, []);

  const handleSelectTheme = useCallback((theme: CrashTheme) => {
    setCurrentTheme(theme);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('crash_game_active_theme', theme);
      } catch (e) {
        console.warn('خطا در ذخیره تم در حافظه محلی:', e);
      }
    }
  }, []);

  const handleAutoCashoutChange = useCallback((enabled: boolean, target: number) => {
    setAutoCashoutEnabled(enabled);
    setAutoCashoutTarget(target);
    triggerHaptic('selection');
  }, []);

  const { balance, setBalance } = useStore();

  // دریافت initData برای احراز هویت وب‌سوکت
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      init();
      const initDataRaw = retrieveRawInitData();
      if (initDataRaw) {
        setInitData(initDataRaw);
      } else {
        console.warn('[CrashGameArea] بدون initDataRaw — اجرای خارج از وب‌ویو تلگرام؟');
        setInitData('dev');
      }
    } catch (error) {
      console.warn('[CrashGameArea] خطا در مقداردهی Telegram SDK، استفاده از حالت توسعه:', error);
      setInitData('dev');
    }
  }, []);

  const { connected, user: wsUser, lobbyEvents, sendBet, sendCashout, sendReaction } = useLobbySocket({ initData });

  // پاکسازی تایمر هنگام خارج شدن از کامپوننت
  useEffect(() => {
    return () => {
      if (betTimeoutRef.current) {
        clearTimeout(betTimeoutRef.current);
      }
    };
  }, []);

  // پاکسازی وضعیت بازی هنگام آن‌مانت شدن
  useEffect(() => {
    return () => {
      setPhase('betting');
      setUserBet(null);
      setUserCashout(null);
      setUserBetAmount(0);
      setIsProcessingBet(false);
    };
  }, []);

  // انیمیشن محاسبه ضریب پرواز در مدار برای هماهنگی با بخش شبیه‌سازی
  useEffect(() => {
    if (phase !== 'flying' || !startTime) {
      if (phase === 'crashed') {
        setCurrentMultiplier(crashPoint || 1.0);
      } else {
        setCurrentMultiplier(1.0);
      }
      return;
    }

    let animId: number;
    const calculateCrashTime = (cp: number) => {
      const seconds = Math.log(Math.max(1.01, cp)) / 0.06;
      return Math.max(800, Math.round(seconds * 1000));
    };

    const effectiveCrashTime = crashTime > 0 ? crashTime : calculateCrashTime(crashPoint || 1.0);
    const targetCrashPoint = crashPoint > 1.0 ? crashPoint : null;

    const tick = () => {
      const elapsed = Math.max(0, Date.now() - startTime);

      if (elapsed >= effectiveCrashTime) {
        setCurrentMultiplier(targetCrashPoint || Math.max(1.0, Math.exp(0.06 * (effectiveCrashTime / 1000))));
      } else {
        const rawMult = Math.max(1.0, Math.exp(0.06 * (elapsed / 1000)));
        const mult = targetCrashPoint ? Math.min(targetCrashPoint, rawMult) : rawMult;
        setCurrentMultiplier(mult);
        animId = requestAnimationFrame(tick);
      }
    };

    animId = requestAnimationFrame(tick);
    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [phase, startTime, crashTime, crashPoint]);

  // گوش دادن به رویدادهای وب‌سوکت
  useEffect(() => {
    const lastEvent = lobbyEvents[lobbyEvents.length - 1];
    if (!lastEvent) return;

    const calculateCrashTime = (cp: number) => {
      const seconds = Math.log(Math.max(1.01, cp)) / 0.06;
      return Math.max(800, Math.round(seconds * 1000));
    };

    // در صورت تغییر sessionId (بازی جدید) — بازنشانی وضعیت
    if (lastEvent.type === 'game-start' && lastEvent.sessionId && lastEvent.sessionId !== sessionId) {
      const cp = lastEvent.crashPoint || 1.0;
      const ct = lastEvent.crashTime || calculateCrashTime(cp);
      setPhase('betting');
      setCrashPoint(cp);
      setCrashTime(ct);
      setStartTime(lastEvent.startTime || 0);
      setDuration(ct);
      setBetEndTime(lastEvent.betEndTime || 0);
      setSeed(String(lastEvent.seed ?? ''));
      setRoundHash(lastEvent.roundHash || '');
      setSalt('');
      setSessionId(lastEvent.sessionId);
      setUserBet(null);
      setUserCashout(null);
      setUserBetAmount(0);
      setCurrentMultiplier(1.0);
      setIsProcessingBet(false);
      return;
    }

    if (lastEvent.sessionId && lastEvent.sessionId !== sessionId && sessionId !== '') {
      return;
    }

    if (lastEvent.type === 'sync') {
      const cp = lastEvent.crashPoint || 1.0;
      const ct = lastEvent.crashTime || calculateCrashTime(cp);
      setPhase(lastEvent.phase);
      setCrashPoint(cp);
      setCrashTime(ct);
      setStartTime(lastEvent.startTime);
      setDuration(ct);
      setBetEndTime(lastEvent.betEndTime);
      setSeed(String(lastEvent.seed ?? ''));
      setRoundHash(lastEvent.roundHash || '');
      if (lastEvent.salt) setSalt(lastEvent.salt);
      setSessionId(lastEvent.sessionId || '');
      if (lastEvent.currentMultiplier) setCurrentMultiplier(lastEvent.currentMultiplier);
      if (lastEvent.userBet) {
        setUserBet(lastEvent.userBet);
        setUserBetAmount(lastEvent.userBetAmount || lastEvent.userBet);
      } else {
        setUserBet(null);
        setUserBetAmount(0);
      }
      if (lastEvent.userCashout) {
        setUserCashout(lastEvent.userCashout);
      } else {
        setUserCashout(null);
      }
      setIsProcessingBet(false);
    } else if (lastEvent.type === 'game-start') {
      const cp = lastEvent.crashPoint || 1.0;
      const ct = lastEvent.crashTime || calculateCrashTime(cp);
      setPhase('betting');
      setCrashPoint(cp);
      setCrashTime(ct);
      setStartTime(lastEvent.startTime);
      setDuration(ct);
      setBetEndTime(lastEvent.betEndTime);
      setSeed(String(lastEvent.seed ?? ''));
      setRoundHash(lastEvent.roundHash || '');
      setSalt('');
      setSessionId(lastEvent.sessionId || '');
      setUserBet(null);
      setUserCashout(null);
      setUserBetAmount(0);
      setCurrentMultiplier(1.0);
      setIsProcessingBet(false);
    } else if (lastEvent.type === 'game-flying') {
      const cp = lastEvent.crashPoint || crashPoint || 1.0;
      const ct = lastEvent.crashTime || calculateCrashTime(cp);
      setPhase('flying');
      setCrashPoint(cp);
      setCrashTime(ct);
      setStartTime(lastEvent.startTime);
      setDuration(ct);
      setSeed(String(lastEvent.seed ?? ''));
      setSessionId(lastEvent.sessionId || '');
      setIsProcessingBet(false);
    } else if (lastEvent.type === 'game-crash') {
      const cp = lastEvent.crashPoint || 1.0;
      const ct = lastEvent.crashTime || calculateCrashTime(cp);
      triggerHapticCrash();
      setPhase('crashed');
      setCrashPoint(cp);
      setCrashTime(ct);
      setStartTime(lastEvent.startTime);
      setDuration(ct);
      setSeed(String(lastEvent.seed ?? ''));
      setRoundHash(lastEvent.roundHash || '');
      setSalt(lastEvent.salt || '');
      setSessionId(lastEvent.sessionId || '');
      setCurrentMultiplier(cp);
      setIsProcessingBet(false);
      // حفظ userBet و userCashout در فاز crashed برای نمایش وضعیت برد/باخت تا شروع راند بعدی
    } else if (lastEvent.type === 'balance-update') {
      setBalance(lastEvent.balance);
    } else if (lastEvent.type === 'bet-success' || (lastEvent.type === 'bet' && (lastEvent.userId === wsUser?.id || !lastEvent.userId))) {
      setUserBet(lastEvent.bet);
      setUserBetAmount(lastEvent.bet);
      setIsProcessingBet(false);
      if (betTimeoutRef.current) {
        clearTimeout(betTimeoutRef.current);
      }
    } else if (lastEvent.type === 'cashout-success' || (lastEvent.type === 'cashout' && (lastEvent.userId === wsUser?.id || !lastEvent.userId))) {
      triggerHapticCashout();
      setUserCashout(lastEvent.multiplier);
      setIsProcessingBet(false);
      if (betTimeoutRef.current) {
        clearTimeout(betTimeoutRef.current);
      }
    } else if (lastEvent.type === 'reaction') {
      setLatestReaction({
        id: lastEvent.id,
        reaction: lastEvent.reaction,
        multiplier: lastEvent.multiplier,
        username: lastEvent.username,
      });
    }
  }, [lobbyEvents, setBalance, wsUser?.id, sessionId, crashPoint]);

  // شبیه‌ساز خودکار آفلاین برای زمانی که وب‌سوکت هنوز وصل نشده (دمو زنده)
  useEffect(() => {
    if (connected) return;

    let timeoutId: NodeJS.Timeout;
    const runSimulationLoop = () => {
      // ۱. شروع فاز ثبت شرط (۴ ثانیه)
      setPhase('betting');
      const now = Date.now();
      const bEndTime = now + 4000;
      setBetEndTime(bEndTime);
      setDuration(4000);
      setCurrentMultiplier(1.0);
      setUserBet(null);
      setUserCashout(null);
      setUserBetAmount(0);

      timeoutId = setTimeout(() => {
        // ۲. شروع فاز پرواز موشک (بین ۱.۳x تا ۴.۵x رندوم)
        const simCrashPoint = parseFloat((1.3 + Math.random() * 3.2).toFixed(2));
        const simCrashTime = Math.max(2500, Math.round((Math.log(simCrashPoint) / 0.06) * 1000));
        const flightStart = Date.now();

        setPhase('flying');
        setStartTime(flightStart);
        setCrashPoint(simCrashPoint);
        setCrashTime(simCrashTime);
        setDuration(simCrashTime);

        timeoutId = setTimeout(() => {
          // ۳. کرش موشک
          setPhase('crashed');
          triggerHapticCrash();
          setCurrentMultiplier(simCrashPoint);

          timeoutId = setTimeout(() => {
            runSimulationLoop();
          }, 3000);
        }, simCrashTime);
      }, 4000);
    };

    runSimulationLoop();

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [connected]);

  const handlePlaceBet = useCallback(
    (amount: number) => {
      if (!connected) {
        alert('⚠️ سرور آنلاین وب‌سوکت در حال حاضر متصل نیست. در حالت نمایشی امکان ثبت شرط واقعی وجود ندارد.');
        return;
      }
      if (phase !== 'betting' || balance < amount || isProcessingBet) {
        return;
      }
      setIsProcessingBet(true);
      sendBet(amount, currentTheme);
      if (betTimeoutRef.current) {
        clearTimeout(betTimeoutRef.current);
      }
      betTimeoutRef.current = setTimeout(() => {
        setIsProcessingBet(false);
      }, 2000);
    },
    [phase, balance, isProcessingBet, connected, sendBet, currentTheme]
  );

  const handleCashout = useCallback(() => {
    if (!connected) {
      alert('⚠️ سرور آنلاین وب‌سوکت در حال حاضر متصل نیست.');
      return;
    }
    const betToCashout = userBetAmount > 0 ? userBetAmount : (userBet || 0);
    if (phase !== 'flying' || betToCashout === 0 || userCashout) return;

    setIsProcessingBet(true);
    sendCashout(betToCashout);

    if (betTimeoutRef.current) {
      clearTimeout(betTimeoutRef.current);
    }
    betTimeoutRef.current = setTimeout(() => {
      setIsProcessingBet(false);
    }, 1500);
  }, [phase, userBetAmount, userBet, userCashout, connected, sendCashout]);

  const handleBetAmountChange = useCallback((amount: number) => {
    setSelectedBetAmount(amount);
    const tier = amount >= 100 ? 3 : amount >= 50 ? 2 : 1;
    if (tier >= 2) {
      setUpgradePulse({ tier, id: Date.now() });
    }
  }, []);

  // فعال‌سازی و تغییر ضریب اختصاصی از طریق داک ری‌اکشن‌ها روی بوم
  const handleSelectReactionMultiplier = useCallback(
    (multiplier: number) => {
      // در صورت کلیک مجدد روی همان ضریب، غیرفعال می‌شود (Toggle)
      if (autoCashoutEnabled && autoCashoutTarget === multiplier) {
        setAutoCashoutEnabled(false);
        triggerHaptic('selection');
      } else {
        setAutoCashoutEnabled(true);
        setAutoCashoutTarget(multiplier);
        triggerHaptic('medium');

        // اگر در حال پرواز بوده و کاربر شرط ثبت کرده و ضریب فعلی از تارگت بیشتر شده، بلافاصله برداشت انجام شود
        const hasActiveBet = (userBet ?? userBetAmount) > 0 && !userCashout;
        if (phase === 'flying' && hasActiveBet && currentMultiplier >= multiplier) {
          handleCashout();
        }
      }
    },
    [autoCashoutEnabled, autoCashoutTarget, phase, userBet, userBetAmount, userCashout, currentMultiplier, handleCashout]
  );

  // نمایش مستقیم بازی بدون گیر کردن در لودینگ؛ وضعیت اتصال زنده با نشانگر در بالای بوم نشان داده می‌شود

  return (
    <div className="w-full flex flex-col items-center">
      {/* هشدار قطع ارتباط */}
      {!connected && (
        <div
          role="alert"
          className="w-full max-w-[483px] mx-auto mb-3 px-3 py-2 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(220,38,38,0.25)] font-mono"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping motion-reduce:animate-none" aria-hidden="true" />
          <span>ارتباط با سرور بازی قطع شد. در حال تلاش برای اتصال مجدد...</span>
        </div>
      )}

      {/* نوار مدرن انتخاب ۳ تم بازی */}
      <ThemeSelector currentTheme={currentTheme} onSelectTheme={handleSelectTheme} />

      {/* پنجره کابین و بوم پرواز کیهانی (The Cockpit Viewport) */}
      <div className="w-full max-w-[483px] mx-auto flex justify-center items-center">
        {(() => {
          const effectiveBet = (userBetAmount > 0 ? userBetAmount : selectedBetAmount) || 10;
          const betTier = effectiveBet >= 100 ? 3 : effectiveBet >= 50 ? 2 : 1;

          const containerBorderClass =
            phase === 'crashed'
              ? 'border-red-500/60 shadow-[0_0_35px_rgba(220,38,38,0.35)]'
              : betTier === 3
              ? 'border-amber-400/80 shadow-[0_0_35px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/30'
              : betTier === 2
              ? 'border-cyan-400/70 shadow-[0_0_30px_rgba(6,182,212,0.3)] ring-1 ring-cyan-400/25'
              : phase === 'betting'
              ? currentTheme === 'racing'
                ? 'border-amber-500/40 shadow-[0_0_25px_rgba(245,158,11,0.2)]'
                : currentTheme === 'chart'
                ? 'border-emerald-500/40 shadow-[0_0_25px_rgba(16,185,129,0.2)]'
                : 'border-emerald-500/40 shadow-[0_0_25px_rgba(22,163,74,0.18)]'
              : currentTheme === 'racing'
              ? 'border-amber-400/50 shadow-[0_0_35px_rgba(245,158,11,0.25)]'
              : currentTheme === 'chart'
              ? 'border-emerald-400/50 shadow-[0_0_35px_rgba(16,185,129,0.25)]'
              : 'border-yellow-400/50 shadow-[0_0_35px_rgba(250,204,21,0.22)]';

          const tierTitle =
            currentTheme === 'racing'
              ? betTier === 3
                ? 'هایپرکار ۱۰۰'
                : betTier === 2
                ? 'توربو V12 ۵۰'
                : 'اسپرت کوپه ۱۰'
              : currentTheme === 'chart'
              ? betTier === 3
                ? 'وال VIP ۱۰۰'
                : betTier === 2
                ? 'حرفه‌ای ۵۰'
                : 'ترید استاندارد ۱۰'
              : betTier === 3
              ? 'ناوبر طلایی ۱۰۰'
              : betTier === 2
              ? 'فانتوم ۵۰'
              : 'راکت فالکون ۱۰';

          const phaseTitle =
            phase === 'betting'
              ? currentTheme === 'racing'
                ? 'خط استارت'
                : currentTheme === 'chart'
                ? 'پیش‌گشایش'
                : 'ثبت شرط'
              : phase === 'flying'
              ? currentTheme === 'racing'
                ? 'شتاب پیست'
                : currentTheme === 'chart'
                ? 'صعود بازار'
                : 'پرواز در مدار'
              : currentTheme === 'racing'
              ? 'تصادف پیست'
              : currentTheme === 'chart'
              ? 'ریزش قیمت'
              : 'انفجار';

          return (
            <div
              className={`relative flex flex-col items-center w-full aspect-[16/10] rounded-2xl overflow-hidden transition-all duration-300 bg-[#070810] border ${containerBorderClass}`}
            >
              {/* نوار وضعیت کابین و تله‌متری بازی (Minimal HUD) */}
              <div className="absolute top-2 inset-x-3 z-10 flex items-center justify-between pointer-events-none select-none">
                {/* شناسه راند و نشانگر سطح فضاپیما / خودرو بر اساس مبلغ شرط */}
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50 border border-white/5 text-[10px] font-mono text-gray-400">
                    <span className="text-gray-500">#</span>
                    <span className="text-yellow-400/90 font-bold">{sessionId ? sessionId.slice(-6) : '---'}</span>
                  </div>

                  <div
                    className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border backdrop-blur-sm ${
                      betTier === 3
                        ? 'bg-amber-400/20 text-amber-300 border-amber-400/50 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                        : betTier === 2
                        ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-400/30'
                    }`}
                  >
                    <span className="flex items-center gap-1">
                      {betTier === 3 ? (
                        <Crown className="w-3 h-3 text-amber-300" />
                      ) : betTier === 2 ? (
                        <Zap className="w-3 h-3 text-cyan-300" />
                      ) : (
                        <Rocket className="w-3 h-3 text-emerald-300" />
                      )}
                      <span>{tierTitle}</span>
                    </span>
                  </div>

                  {autoCashoutEnabled && (
                    <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono border bg-black/40 border-white/5 text-gray-300">
                      <span>تارگت:</span>
                      <span className="text-yellow-400 font-bold dir-ltr">{autoCashoutTarget.toFixed(1)}x</span>
                    </div>
                  )}
                </div>

                {/* نشانگر فاز بازی */}
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/40 border border-white/5 text-[10px] font-medium text-gray-300">
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      phase === 'betting'
                        ? 'bg-emerald-400 animate-pulse'
                        : phase === 'flying'
                        ? 'bg-yellow-400 animate-ping'
                        : 'bg-red-500'
                    }`}
                  />
                  <span className={phase === 'betting' ? 'text-emerald-400' : phase === 'flying' ? 'text-yellow-300' : 'text-red-400'}>
                    {phaseTitle}
                  </span>
                </div>
              </div>

              <PhaserGame
                phase={phase}
                startTime={startTime}
                crashPoint={crashPoint}
                crashTime={crashTime}
                duration={duration}
                betEndTime={betEndTime}
                userBet={userBet ?? (userBetAmount > 0 ? userBetAmount : null)}
                userCashout={userCashout}
                sessionId={sessionId}
                targetMultiplier={autoCashoutEnabled ? autoCashoutTarget : null}
                theme={currentTheme}
                betTier={betTier}
                betAmount={effectiveBet}
                upgradePulse={upgradePulse}
              />

              {/* ری‌اکشن‌های زنده پرواز و نشانگرهای تعاملی خلبان با ضرایب اختصاصی */}
              <LiveReactionsOverlay
                onSendReaction={sendReaction}
                incomingReaction={latestReaction}
                activeMultiplierTarget={autoCashoutEnabled ? autoCashoutTarget : null}
                onSelectMultiplier={handleSelectReactionMultiplier}
              />
            </div>
          );
        })()}
      </div>

      {/* پنل لمسی کنترل شرط‌بندی (Thumb Zone Dock) */}
      <div className="w-full max-w-[483px] mx-auto mt-3 sm:mt-4">
        <CrashBetControls
          gameState={phase}
          startTime={startTime}
          crashTime={crashTime}
          crashPoint={crashPoint}
          onPlaceBetAction={handlePlaceBet}
          onCashoutAction={handleCashout}
          onAutoCashoutChange={handleAutoCashoutChange}
          onBetAmountChange={handleBetAmountChange}
          externalAutoCashoutEnabled={autoCashoutEnabled}
          externalAutoCashoutTarget={autoCashoutTarget}
          userBet={userBetAmount > 0 ? userBetAmount : null}
          userCashout={userCashout}
          balance={balance}
          connected={connected}
        />
      </div>

      {/* تب‌های تله‌متری و اطلاعات دورها */}
      <div className="w-full max-w-[483px] mx-auto mt-4 sm:mt-5">
        <div
          role="tablist"
          aria-label="پنل‌های تله‌متری بازی"
          className="bg-[#181a20] border border-[#374151]/80 p-1 rounded-xl flex gap-1 mb-3 shadow-inner"
        >
          <button
            type="button"
            role="tab"
            id="tab-history"
            aria-selected={activeTab === 'history'}
            aria-controls="panel-history"
            onClick={() => setActiveTab('history')}
            className={`flex-1 min-h-[44px] py-2 px-1 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#1f2937] text-yellow-400 border border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-[#1f2937]/40'
            }`}
          >
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">بازی‌های من</span>
            <span className="sm:hidden">تاریخچه</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-players"
            aria-selected={activeTab === 'players'}
            aria-controls="panel-players"
            onClick={() => setActiveTab('players')}
            className={`flex-1 min-h-[44px] py-2 px-1 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'players'
                ? 'bg-[#1f2937] text-yellow-400 border border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-[#1f2937]/40'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>هم‌راندها</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-sessions"
            aria-selected={activeTab === 'sessions'}
            aria-controls="panel-sessions"
            onClick={() => setActiveTab('sessions')}
            className={`flex-1 min-h-[44px] py-2 px-1 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'sessions'
                ? 'bg-[#1f2937] text-yellow-400 border border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-[#1f2937]/40'
            }`}
          >
            <TrendingUp className="w-4 h-4" />
            <span>دورها</span>
          </button>
          <button
            type="button"
            role="tab"
            id="tab-records"
            aria-selected={activeTab === 'records'}
            aria-controls="panel-records"
            onClick={() => setActiveTab('records')}
            className={`flex-1 min-h-[44px] py-2 px-1 text-xs sm:text-sm font-semibold rounded-lg transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'records'
                ? 'bg-[#1f2937] text-yellow-400 border border-yellow-400/60 shadow-[0_0_12px_rgba(250,204,21,0.2)]'
                : 'text-gray-400 hover:text-white hover:bg-[#1f2937]/40'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span>برترین‌ها</span>
          </button>
        </div>

        {/* محتوای تب فعال */}
        <div
          role="tabpanel"
          id={`panel-${activeTab}`}
          aria-labelledby={`tab-${activeTab}`}
        >
          {activeTab === 'history' && (
            <GameHistory userId={wsUser?.telegramId} refreshTrigger={phase} />
          )}
          {activeTab === 'players' && (
            <MultiplayerLiveBets
              sessionId={sessionId}
              phase={phase}
              currentMultiplier={currentMultiplier}
              crashPoint={crashPoint}
              userBet={userBetAmount > 0 ? userBetAmount : null}
              userCashout={userCashout}
              userName={wsUser?.username || wsUser?.name || 'شما'}
            />
          )}
          {activeTab === 'sessions' && (
            <SessionHistory />
          )}
          {activeTab === 'records' && (
            <TopRecords />
          )}
        </div>
      </div>

      {/* نشانگر راند منصفانه (Provably Fair) */}
      <button
        type="button"
        onClick={() => setIsProvablyFairOpen(true)}
        className="w-full max-w-[483px] mx-auto mt-3.5 mb-2 px-3 py-2 bg-[#181a20]/90 hover:bg-[#1f2937] border border-[#374151]/80 hover:border-yellow-400/50 rounded-xl text-center flex items-center justify-between gap-2 text-xs font-mono text-gray-300 shadow-sm cursor-pointer transition-all"
        title="مشاهده جزئیات و راستی‌آزمایی هش رمزنگاری‌شده"
      >
        <span className="flex items-center gap-1.5 truncate">
          <ShieldCheck className="w-4 h-4 text-yellow-400 shrink-0" />
          <span className="text-xs font-bold text-gray-300">منصفانه بودن (Provably Fair)</span>
          {roundHash && (
            <span className="text-[10px] text-gray-400 dir-ltr font-mono truncate max-w-[120px]">
              {roundHash.slice(0, 12)}...
            </span>
          )}
        </span>
        <span className="text-[11px] text-yellow-400 font-bold bg-yellow-400/10 px-2 py-0.5 rounded border border-yellow-400/30 whitespace-nowrap flex items-center gap-1">
          <span>بررسی و صحت‌سنجی</span>
          <Search className="w-3 h-3" />
        </span>
      </button>

      <ProvablyFairModal
        isOpen={isProvablyFairOpen}
        onCloseAction={() => setIsProvablyFairOpen(false)}
        sessionId={sessionId}
        roundHash={roundHash}
        seed={seed}
        salt={salt}
        crashPoint={crashPoint}
        phase={phase}
      />
    </div>
  );
}
