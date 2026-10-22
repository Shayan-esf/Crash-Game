'use client';

import { Coins, Trophy } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

interface TopRecord {
  id: number;
  username: string;
  bet: number;
  cashout: number;
  profit: number;
  winnings: number;
  crashPoint: number | null;
  createdAt: string;
}

function TopRecords() {
  const [records, setRecords] = useState<TopRecord[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      try {
        const response = await fetch('/api/session/records');
        if (response.ok) {
          const data = await response.json();
          setRecords(data.records || []);
        }
      } catch (error) {
        console.error('Error fetching top records:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecords();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-b from-[#1f2937] to-[#181a20] border border-[#374151]/80 rounded-2xl p-4 w-full shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
        <h3 className="text-xs sm:text-sm font-bold text-white mb-3 flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span>برترین رکوردهای بازی</span>
        </h3>
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-12 bg-[#374151]/40 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-gradient-to-b from-[#1f2937] to-[#181a20] border border-[#374151]/80 rounded-2xl p-4 w-full text-center shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
        <h3 className="text-xs sm:text-sm font-bold text-white mb-1.5 flex items-center justify-center gap-1.5">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span>برترین رکوردهای بازی</span>
        </h3>
        <p className="text-[#9ca3af] text-xs py-3 font-mono">هنوز رکوردی ثبت نشده است</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-b from-[#1f2937] to-[#181a20] border border-[#374151]/80 rounded-2xl p-3 sm:p-4 w-full shadow-[0_8px_24px_rgba(0,0,0,0.6)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
          <Trophy className="w-4 h-4 text-yellow-400" />
          <span>برترین رکوردهای بازی</span>
        </h3>
        <span className="text-[11px] text-[#9ca3af] font-mono dir-ltr bg-[#181a20] px-2.5 py-0.5 rounded-full border border-[#374151]">
          {records.length} رکورد برتر
        </span>
      </div>
      <div className="space-y-2">
        {records.map((record, index) => (
          <div
            key={record.id}
            className={`flex justify-between items-center p-2.5 rounded-xl border transition-all ${
              index === 0
                ? 'bg-[#181a20]/95 border-yellow-400/50 shadow-[0_0_12px_rgba(250,204,21,0.15)]'
                : 'bg-[#181a20]/90 border-[#374151]/80'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black font-mono dir-ltr select-none ${
                  index === 0
                    ? 'bg-gradient-to-br from-yellow-300 to-amber-500 text-[#181a20] shadow-[0_0_10px_rgba(250,204,21,0.6)]'
                    : index === 1
                    ? 'bg-gradient-to-br from-gray-200 to-slate-400 text-[#181a20]'
                    : index === 2
                    ? 'bg-gradient-to-br from-amber-600 to-amber-800 text-white'
                    : 'bg-[#374151] text-gray-300'
                }`}
              >
                {index + 1}
              </div>
              <div className="min-w-0">
                <div className="text-white text-xs sm:text-sm font-bold truncate max-w-[120px] sm:max-w-[180px]">
                  {record.username}
                </div>
                <div className="text-[#9ca3af] font-mono text-[11px] flex items-center gap-1">
                  <span>شرط:</span>
                  <span className="dir-ltr text-gray-300 font-bold">{record.bet.toFixed(0)}</span>
                  <Coins className="w-3 h-3 text-yellow-400" />
                </div>
              </div>
            </div>
            <div className="text-left flex-shrink-0 dir-ltr">
              <div className="text-green-400 font-mono text-xs sm:text-sm font-extrabold flex items-center justify-end gap-1">
                <span>+{record.profit.toFixed(1)}</span>
                <Coins className="w-3.5 h-3.5 text-green-400" />
              </div>
              <div className="text-yellow-400 font-mono text-[11px] font-bold">
                {record.cashout.toFixed(2)}x
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(TopRecords);
