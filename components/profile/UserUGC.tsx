'use client';

import { Check, Copy, Edit3, FileText, Lightbulb, Send, Ticket } from 'lucide-react';
import { memo, useEffect, useState } from 'react';

interface Game {
  id: number;
  bet: number;
  crashPoint?: number;
  cashout?: number | null;
  profit: number;
  status: string;
  createdAt: string;
}

interface UserUGCProps {
  username?: string;
  games: Game[];
}

function UserUGC({ username = 'خلبان کیهانی', games }: UserUGCProps) {
  const [strategyNote, setStrategyNote] = useState<string>('');
  const [isEditingNote, setIsEditingNote] = useState<boolean>(false);
  const [copyFeedback, setCopyFeedback] = useState<boolean>(false);
  const [pinnedTag, setPinnedTag] = useState<string>('اسکالپ سریع');

  // بارگذاری یادداشت از مرورگر
  useEffect(() => {
    try {
      const saved = localStorage.getItem('crash_ugc_strategy');
      if (saved) {
        setStrategyNote(saved);
      } else {
        setStrategyNote('سود مداوم در ضریب ۱.۸x تا ۲.۵x؛ بدون طمع در فضا!');
      }
      const savedTag = localStorage.getItem('crash_ugc_tag');
      if (savedTag) {
        setPinnedTag(savedTag);
      }
    } catch {
      // fallback
    }
  }, []);

  const handleSaveStrategy = () => {
    try {
      localStorage.setItem('crash_ugc_strategy', strategyNote);
      localStorage.setItem('crash_ugc_tag', pinnedTag);
    } catch {
      // ignore
    }
    setIsEditingNote(false);
  };

  // بهترین بازی برای نمایش روی کارت افتخار
  const bestWinningGame = games
    .filter((g) => (g.cashout ?? 0) > 1.0)
    .sort((a, b) => (b.cashout || 0) - (a.cashout || 0))[0];

  const highestCashoutText = bestWinningGame?.cashout ? `${bestWinningGame.cashout.toFixed(2)}x` : '۳.۵۰x';
  const highestProfitText = bestWinningGame ? `+${bestWinningGame.profit.toFixed(1)} سکه` : '+150 سکه';

  const handleShareBrag = () => {
    const text = `کارت پرواز خلبان ${username} در بازی انفجار کیهانی:\nضریب خروج: ${highestCashoutText}\nسود ثبت‌شده: ${highestProfitText}\nاستراتژی: "${strategyNote}"\n\nبیا با هم رکورد بزنیم!`;
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(
      typeof window !== 'undefined' ? window.location.origin : ''
    )}&text=${encodeURIComponent(text)}`;

    if (typeof window !== 'undefined') {
      window.open(shareUrl, '_blank');
    }
  };

  const handleCopyCard = () => {
    const text = `کارت افتخار خلبان ${username}:\nضریب خروج: ${highestCashoutText}\nسود ثبت‌شده: ${highestProfitText}\nاستراتژی: "${strategyNote}"`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  };

  const STRATEGY_TAGS = ['محتاطانه (امن)', 'اسکالپ سریع', 'شکارچی ضریب بالا', 'ریسک هیجانی'];

  return (
    <div className="bg-gradient-to-b from-[#222b3a] via-[#1a212d] to-[#141820] border border-[#3b4758] rounded-2xl shadow-[0_16px_36px_rgba(0,0,0,0.85)] p-4 sm:p-5 mb-4 relative overflow-hidden">
      {/* هاله پس‌زمینه */}
      <div className="absolute top-0 left-0 w-36 h-36 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* سربرگ بخش UGC */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shadow-[0_0_12px_rgba(34,211,238,0.2)] select-none">
            <FileText className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white">
              استراتژی پرواز و کارت افتخار
            </h2>
            <p className="text-[11px] text-gray-400">
              یادداشت شخصی و کارت قابل اشتراک‌گذاری
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-bold text-cyan-300 bg-cyan-950/60 border border-cyan-500/40 px-2.5 py-1 rounded-xl dir-ltr">
          PILOT DOSSIER
        </span>
      </div>

      {/* ۱. یادداشت و استراتژی پرواز خلبان */}
      <div className="p-3.5 bg-[#141820]/90 border border-[#3b4758] rounded-xl mb-3.5 shadow-inner">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-gray-200 flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-yellow-400" />
            <span>استراتژی شخصی من در بازی:</span>
          </span>

          {!isEditingNote ? (
            <button
              type="button"
              onClick={() => setIsEditingNote(true)}
              className="text-xs font-bold text-yellow-400 hover:text-yellow-300 flex items-center gap-1 cursor-pointer bg-yellow-500/10 hover:bg-yellow-500/20 px-2.5 py-1 rounded-lg border border-yellow-400/30 transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>ویرایش</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSaveStrategy}
              className="text-xs font-bold text-green-300 hover:text-green-200 flex items-center gap-1 cursor-pointer bg-green-950/80 border border-green-500/50 px-3 py-1 rounded-lg transition-all"
            >
              <Check className="w-3.5 h-3.5" />
              <span>ذخیره</span>
            </button>
          )}
        </div>

        {isEditingNote ? (
          <div className="space-y-2.5 pt-1">
            <textarea
              value={strategyNote}
              onChange={(e) => setStrategyNote(e.target.value)}
              rows={2}
              maxLength={120}
              placeholder="استراتژی یا فرمول موفقیت خود را بنویسید..."
              className="w-full bg-[#0d1017] border border-[#3b4758] rounded-xl p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 shadow-inner"
            />
            {/* انتخاب تگ سبک پرواز */}
            <div className="flex flex-wrap gap-1.5">
              {STRATEGY_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setPinnedTag(tag)}
                  className={`text-[10px] px-2.5 py-1 rounded-lg font-bold cursor-pointer transition-all ${
                    pinnedTag === tag
                      ? 'bg-yellow-400 text-[#141820] shadow-[0_0_10px_rgba(250,204,21,0.4)]'
                      : 'bg-[#222b3a] text-gray-300 border border-[#3b4758] hover:text-white'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-2.5 pt-0.5">
            <p className="text-xs text-gray-200 leading-relaxed font-medium italic">
              «{strategyNote}»
            </p>
            <span className="text-[10px] bg-yellow-400/15 text-yellow-300 border border-yellow-400/40 px-2.5 py-1 rounded-full font-bold whitespace-nowrap flex-shrink-0">
              {pinnedTag}
            </span>
          </div>
        )}
      </div>

      {/* ۲. کارت پرواز طلایی برای افتخار و اشتراک (Cyber Flight Pass) */}
      <div className="bg-gradient-to-r from-amber-500/15 via-[#161c26] to-yellow-500/10 border border-yellow-400/50 rounded-2xl p-4 relative overflow-hidden shadow-[0_0_24px_rgba(250,204,21,0.12)]">
        {/* لبه تیکت هولوگرام */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3b4758]/80 mb-3">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-yellow-400 select-none" />
            <div>
              <div className="text-xs font-black text-white flex items-center gap-1.5">
                <span>کارت پرواز خلبان</span>
                <span className="text-yellow-400">({username})</span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono dir-ltr">
                COSMIC FLIGHT PASS • VIP
              </div>
            </div>
          </div>
          <span className="text-[10px] text-yellow-400 font-mono dir-ltr bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-md">
            PASS #77
          </span>
        </div>

        {/* دو متری بزرگ تله‌متری با چیدمان استاندارد و تمیز */}
        <div className="grid grid-cols-2 gap-3 py-1">
          {/* ستون راست: بهترین ضریب خروج */}
          <div className="p-2.5 bg-[#141820]/90 border border-[#3b4758] rounded-xl text-right">
            <div className="text-[10px] text-gray-400 mb-1 font-medium">بهترین ضریب خروج:</div>
            <div className="text-xl sm:text-2xl font-mono font-black text-yellow-400 dir-ltr drop-shadow-[0_0_12px_rgba(250,204,21,0.4)]">
              {highestCashoutText}
            </div>
          </div>

          {/* ستون چپ: سود ثبت‌شده */}
          <div className="p-2.5 bg-[#141820]/90 border border-[#3b4758] rounded-xl text-left">
            <div className="text-[10px] text-gray-400 mb-1 font-medium text-right">سود ثبت‌شده:</div>
            <div className="text-xl sm:text-2xl font-mono font-black text-green-400 dir-ltr drop-shadow-[0_0_12px_rgba(34,197,94,0.4)]">
              {highestProfitText}
            </div>
          </div>
        </div>

        {/* دکمه‌های اکشن اشتراک در تلگرام و کپی */}
        <div className="flex items-center gap-2.5 mt-3.5 pt-2 border-t border-[#3b4758]/60">
          <button
            type="button"
            onClick={handleShareBrag}
            className="flex-1 min-h-[42px] bg-gradient-to-r from-[#2AABEE] to-[#229ED9] hover:from-[#229ED9] hover:to-[#1b80b2] text-white text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 shadow-[0_0_16px_rgba(34,158,217,0.35)] cursor-pointer active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>اشتراک‌گذاری در تلگرام</span>
          </button>
          <button
            type="button"
            onClick={handleCopyCard}
            className="min-h-[42px] px-3.5 bg-[#222b3a] hover:bg-[#2d384c] border border-[#3b4758] text-gray-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
          >
            {copyFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-400" />
                <span>کپی شد!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-300" />
                <span>کپی متن</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(UserUGC);
