'use client';

import { Coins, Gem, Globe, Info, Rocket, Shield, Sparkles, Star, Target, User, Users, Zap } from 'lucide-react';
import { useMemo } from 'react';

interface SimulatedPlayer {
  id: string;
  name: string;
  icon: string;
  bet: number;
  targetMultiplier: number;
}

interface MultiplayerLiveBetsProps {
  sessionId: string;
  phase: 'betting' | 'flying' | 'crashed';
  currentMultiplier: number;
  crashPoint?: number;
  userBet: number | null;
  userCashout: number | null;
  userName?: string;
}

const BOT_PROFILES = [
  { name: 'Amir_BTC', icon: 'rocket' },
  { name: 'Sara_Crypto', icon: 'sparkles' },
  { name: 'Reza_Trader', icon: 'zap' },
  { name: 'Elena_Nova', icon: 'star' },
  { name: 'Kian_Moon', icon: 'globe' },
  { name: 'Arman_Apex', icon: 'target' },
  { name: 'Niloufar_X', icon: 'gem' },
  { name: 'Farhad_HODL', icon: 'shield' },
];

function PlayerIcon({ icon }: { icon: string }) {
  switch (icon) {
    case 'rocket':
      return <Rocket className="w-3.5 h-3.5 text-yellow-400" />;
    case 'sparkles':
      return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
    case 'zap':
      return <Zap className="w-3.5 h-3.5 text-amber-400" />;
    case 'star':
      return <Star className="w-3.5 h-3.5 text-yellow-300" />;
    case 'globe':
      return <Globe className="w-3.5 h-3.5 text-cyan-400" />;
    case 'target':
      return <Target className="w-3.5 h-3.5 text-rose-400" />;
    case 'gem':
      return <Gem className="w-3.5 h-3.5 text-emerald-400" />;
    case 'shield':
      return <Shield className="w-3.5 h-3.5 text-blue-400" />;
    default:
      return <User className="w-3.5 h-3.5 text-gray-400" />;
  }
}

export function MultiplayerLiveBets({
  sessionId,
  phase,
  currentMultiplier,
  crashPoint = 2.0,
  userBet,
  userCashout,
  userName = 'شما',
}: MultiplayerLiveBetsProps) {
  // تولید قطعی اما شبه‌تصادفی بازیکنان برای هر sessionId
  const simulatedPlayers = useMemo(() => {
    if (!sessionId) return [];

    let seedNum = 0;
    for (let i = 0; i < sessionId.length; i++) {
      seedNum = (seedNum * 31 + sessionId.charCodeAt(i)) >>> 0;
    }

    const random = () => {
      seedNum = (seedNum * 1664525 + 1013904223) >>> 0;
      return (seedNum & 0xfffffff) / 0x10000000;
    };

    const count = 4 + Math.floor(random() * 4); // 4 تا 7 بازیکن
    const players: SimulatedPlayer[] = [];
    const usedIndices = new Set<number>();

    for (let i = 0; i < count; i++) {
      let idx = Math.floor(random() * BOT_PROFILES.length);
      while (usedIndices.has(idx)) {
        idx = (idx + 1) % BOT_PROFILES.length;
      }
      usedIndices.add(idx);

      const profile = BOT_PROFILES[idx];
      const betOptions = [10, 50, 100];
      const bet = betOptions[Math.floor(random() * betOptions.length)];

      // توزیع هدف برداشت تصادفی بین 1.25x تا 7.50x
      const randMult = 1.2 + random() * 4.5;
      const targetMultiplier = parseFloat(randMult.toFixed(2));

      players.push({
        id: `bot_${sessionId}_${i}`,
        name: profile.name,
        icon: profile.icon,
        bet,
        targetMultiplier,
      });
    }

    return players;
  }, [sessionId]);

  const liveEffectiveMultiplier = phase === 'crashed' ? crashPoint : currentMultiplier;

  // آمار خلاصه
  const totalBets =
    simulatedPlayers.reduce((sum, p) => sum + p.bet, 0) + (userBet || 0);

  return (
    <div className="bg-gradient-to-b from-[#1f2937] to-[#181a20] border border-[#374151]/80 rounded-2xl p-3.5 sm:p-4 w-full shadow-[0_8px_24px_rgba(0,0,0,0.6)] space-y-3">
      {/* هدر بخش شبیه‌سازی چندنفره */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Users className="w-4 h-4 text-gray-300" />
          <h3 className="text-xs sm:text-sm font-bold text-white">بازیکنان هم‌راند</h3>
          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded">
            شبیه‌سازی
          </span>
        </div>
        <div className="text-[11px] font-mono text-gray-400 dir-ltr bg-[#181a20] px-2 py-0.5 rounded-lg border border-[#374151] flex items-center gap-1">
          <span>{simulatedPlayers.length + (userBet ? 1 : 0)} بازیکن • مجموع: {totalBets}</span>
          <Coins className="w-3 h-3 text-yellow-400" />
        </div>
      </div>

      {/* توضیح شفافیت برچسب شبیه‌سازی طبق سند */}
      <div className="text-[10px] text-gray-400 bg-[#181a20]/80 px-2.5 py-1.5 rounded-lg border border-[#374151]/50 leading-relaxed flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-blue-400 shrink-0" />
        <span>بازیکنان این بخش به‌صورت شبیه‌سازی‌شده رندر می‌شوند تا هیجان محیط چندنفره زنده را به تصویر بکشند.</span>
      </div>

      {/* لیست شرکت‌کنندگان راند */}
      <div className="space-y-1.5 max-h-56 overflow-y-auto no-scrollbar">
        {/* شرط کاربر جاری (در صورت وجود) */}
        {userBet && (
          <div className="flex items-center justify-between p-2 rounded-xl bg-yellow-500/10 border border-yellow-400/50 shadow-sm text-xs">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-yellow-400/20 border border-yellow-400/60 flex items-center justify-center text-xs">
                <User className="w-3.5 h-3.5 text-yellow-400" />
              </span>
              <div>
                <span className="font-bold text-white">{userName}</span>
                <span className="text-[10px] text-yellow-400 mr-1.5 font-bold">(شما)</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-mono text-gray-300 dir-ltr flex items-center gap-1">
                <span>{userBet}</span>
                <Coins className="w-3 h-3 text-yellow-400" />
              </span>
              {phase === 'betting' ? (
                <span className="text-gray-400 font-mono text-[11px]">در صف</span>
              ) : userCashout ? (
                <span className="font-mono text-green-400 font-extrabold dir-ltr bg-green-950/60 px-2 py-0.5 rounded border border-green-500/40">
                  {userCashout.toFixed(2)}x (+{(userBet * userCashout).toFixed(1)})
                </span>
              ) : phase === 'crashed' ? (
                <span className="font-mono text-red-400 font-bold dir-ltr bg-red-950/60 px-2 py-0.5 rounded border border-red-500/40">
                  انفجار (-{userBet})
                </span>
              ) : (
                <span className="font-mono text-yellow-400 font-bold dir-ltr animate-pulse">
                  در مدار...
                </span>
              )}
            </div>
          </div>
        )}

        {/* بازیکنان شبیه‌سازی‌شده */}
        {simulatedPlayers.map((player) => {
          const hasCashedOut =
            (phase === 'flying' || phase === 'crashed') &&
            liveEffectiveMultiplier >= player.targetMultiplier &&
            player.targetMultiplier <= crashPoint;

          const isCrashedOut =
            phase === 'crashed' && player.targetMultiplier > crashPoint;

          return (
            <div
              key={player.id}
              className="flex items-center justify-between p-2 rounded-xl bg-[#181a20]/90 border border-[#374151]/60 text-xs transition-colors hover:border-[#374151]"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-6 h-6 rounded-full bg-[#374151]/50 border border-[#4b5563] flex items-center justify-center text-xs select-none">
                  <PlayerIcon icon={player.icon} />
                </span>
                <div className="truncate flex items-center gap-1.5">
                  <span className="font-semibold text-gray-200 truncate">{player.name}</span>
                  <span className="text-[9px] text-gray-400 font-mono bg-gray-800/80 px-1 py-0.2 rounded border border-gray-700 select-none">
                    شبیه‌سازی
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="font-mono text-gray-400 dir-ltr flex items-center gap-1">
                  <span>{player.bet}</span>
                  <Coins className="w-3 h-3 text-yellow-400/80" />
                </span>
                {phase === 'betting' ? (
                  <span className="text-gray-500 font-mono text-[11px]">در صف</span>
                ) : hasCashedOut ? (
                  <span className="font-mono text-green-400 font-bold dir-ltr bg-green-950/60 px-2 py-0.5 rounded border border-green-500/30 text-[11px]">
                    {player.targetMultiplier.toFixed(2)}x (+{(player.bet * player.targetMultiplier).toFixed(0)})
                  </span>
                ) : isCrashedOut ? (
                  <span className="font-mono text-red-400 font-medium dir-ltr bg-red-950/60 px-2 py-0.5 rounded border border-red-500/30 text-[11px]">
                    انفجار (-{player.bet})
                  </span>
                ) : (
                  <span className="font-mono text-yellow-400 text-[11px] dir-ltr">
                    هدف: {player.targetMultiplier.toFixed(2)}x
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
