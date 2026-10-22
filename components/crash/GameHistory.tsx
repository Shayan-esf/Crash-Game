'use client';

import { shareScoreToTelegram, triggerHaptic } from '@/lib/telegramHaptics';
import { CandlestickChart, Car, Coins, History, Rocket, Share2 } from 'lucide-react';
import { memo, useEffect, useRef, useState } from 'react';

interface Game {
  id: number;
  bet: number;
  cashout: number | null;
  profit: number;
  status: string;
  crashPoint: number | null;
  theme?: string;
  createdAt: string;
}

const getGameMeta = (theme?: string) => {
  switch (theme) {
    case 'racing':
      return {
        name: 'ماشین مسابقه',
        crashLabel: 'تصادف در',
        icon: Car,
        avatarClass: 'bg-amber-500/15 border-amber-500/30 text-amber-300 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
        iconClass: 'text-amber-300',
      };
    case 'chart':
      return {
        name: 'نمودار سهام',
        crashLabel: 'ریزش در',
        icon: CandlestickChart,
        avatarClass: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
        iconClass: 'text-emerald-300',
      };
    case 'rocket':
    default:
      return {
        name: 'موشک کیهانی',
        crashLabel: 'انفجار در',
        icon: Rocket,
        avatarClass: 'bg-yellow-500/15 border-yellow-500/30 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.2)]',
        iconClass: 'text-yellow-300',
      };
  }
};

interface GameHistoryProps {
  userId?: string;
  refreshTrigger?: any;
}

function GameHistory({ userId, refreshTrigger }: GameHistoryProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);
  const [flashingGameId, setFlashingGameId] = useState<number | null>(null);
  const initialLoadedRef = useRef<boolean>(false);
  const prevGamesRef = useRef<Game[]>([]);

  useEffect(() => {
    prevGamesRef.current = games;
  }, [games]);

  useEffect(() => {
    if (!flashingGameId) return;
    const timer = setTimeout(() => {
      setFlashingGameId(null);
    }, 4000);
    return () => clearTimeout(timer);
  }, [flashingGameId]);

  useEffect(() => {
    if (!userId) return;

    let timeoutId: NodeJS.Timeout;

    const fetchGames = async () => {
      try {
        const response = await fetch(`/api/profile/games?telegram_id=${userId}`);
        if (response.ok) {
          const data = await response.json();
          const incoming: Game[] = data.games || [];

          if (incoming.length > 0) {
            if (initialLoadedRef.current) {
              const newest = incoming[0];
              const alreadyExists = prevGamesRef.current.some((g) => g.id === newest.id);
              if (!alreadyExists) {
                setFlashingGameId(newest.id);
                triggerHaptic(newest.profit > 0 ? 'success' : 'medium');
              }
            } else {
              initialLoadedRef.current = true;
            }
          }

          setGames(incoming);
        }
      } catch (error) {
        console.error('Error fetching games:', error);
      } finally {
        setLoading(false);
      }
    };

    if (refreshTrigger === 'crashed') {
      timeoutId = setTimeout(fetchGames, 1000);
    } else {
      fetchGames();
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [userId, refreshTrigger]);

  if (loading && games.length === 0) {
    return (
      <div className="bg-gradient-to-b from-[#1f2937] to-[#181a20] rounded-2xl p-4 w-full border border-[#374151]/80 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
        <h3 className="text-xs sm:text-sm font-bold text-white mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-yellow-400" />
          <span>۱۰ بازی اخیر</span>
        </h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-[#374151]/40 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="bg-gradient-to-b from-[#1f2937] to-[#181a20] rounded-2xl p-4 w-full border border-[#374151]/80 shadow-[0_8px_24px_rgba(0,0,0,0.6)] text-center">
        <h3 className="text-xs sm:text-sm font-bold text-white mb-1.5 flex items-center justify-center gap-2">
          <History className="w-4 h-4 text-yellow-400" />
          <span>۱۰ بازی اخیر</span>
        </h3>
        <p className="text-[#9ca3af] text-xs py-3 font-mono">هنوز دوری در این نشست بازی نشده است</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#1f2937] to-[#181a20] rounded-2xl p-3 sm:p-4 w-full border border-[#374151]/80 shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
          <History className="w-4 h-4 text-yellow-400" />
          <span>۱۰ بازی اخیر</span>
        </h3>
        <span className="text-[11px] text-gray-300 font-mono bg-[#181a20] border border-[#374151] px-2.5 py-0.5 rounded-full dir-ltr">
          {games.length} دور
        </span>
      </div>

      <div className="space-y-2">
        {games.map((game) => {
          const isWin = game.profit > 0;
          const isNew = game.id === flashingGameId;
          const gameMeta = getGameMeta(game.theme);
          const GameIcon = gameMeta.icon;

          return (
            <div
              key={game.id}
              className={`group relative overflow-hidden rounded-xl p-2.5 sm:p-3 transition-all duration-300 border ${
                isNew
                  ? isWin
                    ? 'animate-in fade-in-0 slide-in-from-top-3 duration-500 ring-2 ring-green-400 shadow-[0_0_24px_rgba(74,222,128,0.5)] border-green-400/90 bg-gradient-to-r from-[#181a20] via-[#1a2e23] to-[#14261d]'
                    : 'animate-in fade-in-0 slide-in-from-top-3 duration-500 ring-2 ring-red-400 shadow-[0_0_24px_rgba(248,113,113,0.45)] border-red-500/90 bg-gradient-to-r from-[#181a20] via-[#2d191d] to-[#251518]'
                  : isWin
                  ? 'bg-gradient-to-r from-[#181a20] via-[#1a232e] to-[#14261d]/80 border-green-500/30 hover:border-green-500/50 shadow-[0_4px_16px_rgba(34,197,94,0.08)]'
                  : 'bg-gradient-to-r from-[#181a20] via-[#1b1c24] to-[#251518]/70 border-[#374151]/60 hover:border-red-500/30 shadow-[0_4px_14px_rgba(0,0,0,0.4)]'
              }`}
            >
              {/* خط نشانگر عمودی وضعیت نتیجه */}
              <div
                className={`absolute top-0 right-0 bottom-0 w-1 ${
                  isNew
                    ? isWin
                      ? 'bg-green-400 shadow-[0_0_12px_rgba(74,222,128,0.9)] animate-pulse'
                      : 'bg-red-400 shadow-[0_0_12px_rgba(248,113,113,0.9)] animate-pulse'
                    : isWin
                    ? 'bg-gradient-to-b from-green-400 to-emerald-500 shadow-[0_0_8px_rgba(74,222,128,0.6)]'
                    : 'bg-gradient-to-b from-red-500/80 to-red-700/60'
                }`}
              />

              <div className="flex items-center justify-between gap-2.5 pr-2">
                {/* بخش راست: آیکون تم گرافیکی + عنوان و اطلاعات راند */}
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${gameMeta.avatarClass}`}
                  >
                    <GameIcon className={`w-4 h-4 ${gameMeta.iconClass}`} />
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{gameMeta.name}</span>
                      {isNew ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-yellow-400/20 text-yellow-300 border border-yellow-400/50 animate-pulse flex items-center gap-1 shadow-[0_0_8px_rgba(250,204,21,0.3)]">
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-ping" />
                          <span>راند تازه</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-mono">
                          {new Date(game.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-[11px] font-mono mt-0.5">
                      <span className="text-gray-400 flex items-center gap-1">
                        <span>شرط</span>
                        <strong className="text-yellow-400 font-bold dir-ltr">{game.bet.toFixed(0)}</strong>
                      </span>
                      <span className="text-[#374151]">·</span>
                      {game.cashout ? (
                        <span className="text-green-400 font-bold dir-ltr">
                          {game.cashout.toFixed(2)}x <span className="text-[10px] font-normal text-green-300">برداشت</span>
                        </span>
                      ) : (
                        <span className="text-red-400/90 dir-ltr">
                          {game.crashPoint ? `${game.crashPoint.toFixed(2)}x` : '—'}{' '}
                          <span className="text-[10px] font-normal text-red-400/70">{gameMeta.crashLabel}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* بخش چپ: سود خالص و دکمه اشتراک */}
                <div className="flex items-center gap-2 shrink-0 dir-ltr">
                  <div
                    className={`px-2.5 py-1 rounded-lg font-mono font-bold text-xs sm:text-sm flex items-center gap-1 border ${
                      isWin
                        ? 'bg-green-500/10 text-green-300 border-green-500/30 shadow-[0_0_12px_rgba(34,197,94,0.15)]'
                        : 'bg-red-500/10 text-red-300/90 border-red-500/20'
                    }`}
                  >
                    <span>{game.profit >= 0 ? '+' : ''}{game.profit.toFixed(0)}</span>
                    <Coins className={`w-3.5 h-3.5 ${isWin ? 'text-green-300' : 'text-red-300/80'}`} />
                  </div>

                  {isWin && game.cashout && (
                    <button
                      type="button"
                      onClick={() => shareScoreToTelegram(game.cashout!, game.profit)}
                      className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/20 hover:border-sky-500/40 transition-all cursor-pointer"
                      title="اشتراک در تلگرام"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(GameHistory);
