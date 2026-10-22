'use client';

import { shareScoreToTelegram } from '@/lib/telegramHaptics';
import { Coins, History, Share2 } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

interface Game {
  id: number;
  bet: number;
  cashout: number | null;
  profit: number;
  status: string;
  crashPoint: number | null;
  createdAt: string;
}

interface GameHistoryProps {
  userId?: string;
  refreshTrigger?: any;
}

function GameHistory({ userId, refreshTrigger }: GameHistoryProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;

    let timeoutId: NodeJS.Timeout;

    const fetchGames = async () => {
      try {
        const response = await fetch(`/api/profile/games?telegram_id=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setGames(data.games || []);
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
          return (
            <div
              key={game.id}
              className={`p-2.5 sm:p-3 rounded-xl border transition-all ${
                isWin
                  ? 'bg-[#181a20]/90 border-green-500/40 hover:border-green-500/60 shadow-[0_0_12px_rgba(34,197,94,0.12)]'
                  : 'bg-[#181a20]/90 border-red-500/30 hover:border-red-500/50'
              }`}
            >
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isWin ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.7)]' : 'bg-red-400'
                    }`}
                  />
                  <span className="text-white text-xs sm:text-sm font-medium flex items-center gap-1">
                    <span>شرط:</span>
                    <span className="font-mono text-yellow-400 font-extrabold dir-ltr">
                      {game.bet.toFixed(0)}
                    </span>
                    <Coins className="w-3 h-3 text-yellow-400" />
                  </span>
                </div>
                <div
                  className={`text-xs sm:text-sm font-mono font-bold px-2 py-0.5 rounded-lg border dir-ltr flex items-center gap-1 ${
                    isWin
                      ? 'text-green-300 bg-green-950/60 border-green-500/40'
                      : 'text-red-300 bg-red-950/60 border-red-500/40'
                  }`}
                >
                  <span>{game.profit >= 0 ? '+' : ''}{game.profit.toFixed(0)}</span>
                  <Coins className={`w-3 h-3 ${isWin ? 'text-green-300' : 'text-red-300'}`} />
                </div>
              </div>

              <div className="flex justify-between items-center text-[11px] sm:text-xs text-gray-300 pt-1.5 border-t border-[#374151]/60">
                <div className="flex items-center gap-2 font-mono">
                  <span>
                    انفجار:{' '}
                    <strong className="text-white dir-ltr">
                      {game.crashPoint ? game.crashPoint.toFixed(2) + 'x' : '—'}
                    </strong>
                  </span>
                  <span className="text-[#374151]">|</span>
                  <span>
                    برداشت:{' '}
                    {game.cashout ? (
                      <strong className="text-green-400 dir-ltr font-bold">{game.cashout.toFixed(2)}x</strong>
                    ) : (
                      <strong className="text-gray-500">—</strong>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isWin && game.cashout && (
                    <button
                      type="button"
                      onClick={() => shareScoreToTelegram(game.cashout!, game.profit)}
                      className="text-[10px] text-sky-400 hover:text-sky-300 font-bold bg-sky-950/70 hover:bg-sky-900/80 px-2 py-0.5 rounded-md border border-sky-500/40 transition-colors flex items-center gap-1 cursor-pointer"
                      title="اشتراک این رکورد در تلگرام"
                    >
                      <Share2 className="w-3 h-3 text-sky-400" />
                      <span>اشتراک</span>
                    </button>
                  )}
                  <span className="text-[#9ca3af] font-mono text-[11px] dir-ltr">
                    {new Date(game.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
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
