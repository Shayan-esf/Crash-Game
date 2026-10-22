'use client';

import { TrendingUp } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

interface SessionHistoryItem {
  id: string;
  crashPoint: number;
  createdAt: string;
}

function SessionHistory() {
  const [history, setHistory] = useState<SessionHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/session/history');
        if (response.ok) {
          const data = await response.json();
          setHistory(data.history || []);
        }
      } catch (error) {
        console.error('Error fetching session history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-[#1f2937] to-[#181a20] border border-[#374151]/80 rounded-2xl p-4 w-full shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
        <h3 className="text-xs sm:text-sm font-bold text-white mb-3 flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-yellow-400" />
          <span>ضرایب اخیر دورها</span>
        </h3>
        <div className="flex space-x-2 overflow-x-auto pb-1 no-scrollbar">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-16 h-8 bg-[#374151]/40 rounded-xl animate-pulse flex-shrink-0" />
          ))}
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="bg-gradient-to-b from-[#1f2937] to-[#181a20] border border-[#374151]/80 rounded-2xl p-4 w-full text-center shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
        <h3 className="text-xs sm:text-sm font-bold text-white mb-1.5 flex items-center justify-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-yellow-400" />
          <span>ضرایب اخیر دورها</span>
        </h3>
        <p className="text-[#9ca3af] text-xs py-3 font-mono">هنوز دوری در تاریخچه ثبت نشده است</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#1f2937] to-[#181a20] border border-[#374151]/80 rounded-2xl p-3 sm:p-4 w-full shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
          <TrendingUp className="w-4 h-4 text-yellow-400" />
          <span>ضرایب اخیر دورها</span>
        </h3>
        <span className="text-[11px] text-[#9ca3af] font-mono dir-ltr bg-[#181a20] px-2.5 py-0.5 rounded-full border border-[#374151]">
          {history.length} دور اخیر
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1.5 no-scrollbar">
        {history.map((item) => {
          const isHigh = item.crashPoint >= 2;
          const isMedium = item.crashPoint >= 1.5;

          return (
            <div
              key={item.id}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-extrabold flex-shrink-0 border transition-all dir-ltr ${
                isHigh
                  ? 'bg-green-950/70 border-green-500/60 text-green-300 shadow-[0_0_10px_rgba(34,197,94,0.3)]'
                  : isMedium
                  ? 'bg-yellow-950/70 border-yellow-500/60 text-yellow-300 shadow-[0_0_10px_rgba(250,204,21,0.25)]'
                  : 'bg-red-950/70 border-red-500/50 text-red-300'
              }`}
            >
              {item.crashPoint.toFixed(2)}x
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default memo(SessionHistory);
