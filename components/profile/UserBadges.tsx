'use client';

import { Check, Crown, Gem, Lock, Medal, Rocket, Shield, Trophy, X, Zap } from 'lucide-react';
import React, { memo, useState } from 'react';

interface Game {
  id: number;
  bet: number;
  crashPoint?: number;
  cashout?: number | null;
  profit: number;
  status: string;
  createdAt: string;
}

interface UserBadgesProps {
  games: Game[];
  balance: number;
  phoneVerified: boolean;
}

interface BadgeItem {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  rarityFa: string;
  isUnlocked: boolean;
  progressPercent: number;
  progressLabel: string;
}

function UserBadges({ games, balance, phoneVerified }: UserBadgesProps) {
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);

  // محاسبه دقیق آمار کاربر
  const gamesCount = games.length;
  const bestCashout = games.reduce((max, g) => (g.cashout && g.cashout > max ? g.cashout : max), 0);
  const highestBet = games.reduce((max, g) => (g.bet > max ? g.bet : max), 0);
  const totalProfit = games.reduce((sum, g) => (g.profit > 0 ? sum + g.profit : sum), 0);

  const badges: BadgeItem[] = [
    {
      id: 'first-flight',
      title: 'خلبان تازه‌کار',
      description: 'ورود به کابین و انجام حداقل یک دور پرواز آزمایشی.',
      icon: Rocket,
      rarity: 'common',
      rarityFa: 'عادی',
      isUnlocked: gamesCount >= 1,
      progressPercent: Math.min(100, (gamesCount / 1) * 100),
      progressLabel: gamesCount >= 1 ? 'تکمیل شد' : '۰/۱ پرواز',
    },
    {
      id: 'high-multiplier',
      title: 'شکارچی ضریب ۵x',
      description: 'خروج موفق از موشک در ضریب ۵.۰۰x یا بالاتر.',
      icon: Zap,
      rarity: 'rare',
      rarityFa: 'کمیاب',
      isUnlocked: bestCashout >= 5,
      progressPercent: Math.min(100, (bestCashout / 5) * 100),
      progressLabel: bestCashout >= 5 ? `ثبت شد (${bestCashout.toFixed(2)}x)` : `${bestCashout.toFixed(2)}x از ۵.۰۰x`,
    },
    {
      id: 'cosmic-whale',
      title: 'نهنگ کیهانی',
      description: 'شرط‌بندی شجاعانه با حداکثر چیپ مجاز (۱۰۰ سکه).',
      icon: Crown,
      rarity: 'rare',
      rarityFa: 'کمیاب',
      isUnlocked: highestBet >= 100,
      progressPercent: Math.min(100, (highestBet / 100) * 100),
      progressLabel: highestBet >= 100 ? 'کسب شد' : `${highestBet.toFixed(0)}/۱۰۰ سکه`,
    },
    {
      id: 'safe-landing',
      title: 'خلبان معتبر',
      description: 'احراز هویت و اتصال رسمی شماره تلفن تلگرام.',
      icon: Shield,
      rarity: 'epic',
      rarityFa: 'حماسی',
      isUnlocked: phoneVerified,
      progressPercent: phoneVerified ? 100 : 0,
      progressLabel: phoneVerified ? 'تایید شده' : 'نیازمند اتصال',
    },
    {
      id: 'ace-pilot',
      title: 'کهنه‌سرباز فضا',
      description: 'ثبت و تکمیل بیش از ۱۰ دور پرواز در کهکشان کرش.',
      icon: Trophy,
      rarity: 'epic',
      rarityFa: 'حماسی',
      isUnlocked: gamesCount >= 10,
      progressPercent: Math.min(100, (gamesCount / 10) * 100),
      progressLabel: gamesCount >= 10 ? 'کسب شد' : `${gamesCount}/۱۰ دور`,
    },
    {
      id: 'legend-profit',
      title: 'میلیاردر ستاره‌ای',
      description: 'کسب مجموع سود بیش از ۵۰۰ سکه یا موجودی بیش از ۲,۰۰۰ سکه.',
      icon: Gem,
      rarity: 'legendary',
      rarityFa: 'افسانه‌ای',
      isUnlocked: totalProfit >= 500 || balance >= 2000,
      progressPercent: Math.min(100, Math.max((totalProfit / 500) * 100, (balance / 2000) * 100)),
      progressLabel: balance >= 2000 ? `${balance.toFixed(0)} سکه` : `${totalProfit.toFixed(0)}/۵۰۰ سود`,
    },
  ];

  const unlockedCount = badges.filter((b) => b.isUnlocked).length;

  const getRarityBadgeStyle = (rarity: BadgeItem['rarity'], isUnlocked: boolean) => {
    if (!isUnlocked) return 'bg-[#374151]/60 text-gray-400 border-gray-600/50';
    switch (rarity) {
      case 'legendary':
        return 'bg-amber-500/20 text-yellow-300 border-yellow-400/60 shadow-[0_0_8px_rgba(250,204,21,0.3)]';
      case 'epic':
        return 'bg-purple-500/20 text-purple-300 border-purple-400/60 shadow-[0_0_8px_rgba(192,132,252,0.3)]';
      case 'rare':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-400/60 shadow-[0_0_8px_rgba(34,211,238,0.3)]';
      default:
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-400/60 shadow-[0_0_8px_rgba(52,211,153,0.3)]';
    }
  };

  const getRarityCardGlow = (rarity: BadgeItem['rarity'], isUnlocked: boolean) => {
    if (!isUnlocked) {
      return 'bg-gradient-to-b from-[#1c222d] to-[#161a22] border-[#2f3846] opacity-70 grayscale-[35%] hover:opacity-90';
    }
    switch (rarity) {
      case 'legendary':
        return 'bg-gradient-to-b from-amber-950/40 via-[#1c222d] to-[#181a20] border-yellow-400/60 shadow-[0_0_18px_rgba(250,204,21,0.22)] hover:border-yellow-300';
      case 'epic':
        return 'bg-gradient-to-b from-purple-950/40 via-[#1c222d] to-[#181a20] border-purple-400/60 shadow-[0_0_16px_rgba(192,132,252,0.2)] hover:border-purple-300';
      case 'rare':
        return 'bg-gradient-to-b from-cyan-950/40 via-[#1c222d] to-[#181a20] border-cyan-400/60 shadow-[0_0_16px_rgba(34,211,238,0.2)] hover:border-cyan-300';
      default:
        return 'bg-gradient-to-b from-emerald-950/40 via-[#1c222d] to-[#181a20] border-emerald-400/60 shadow-[0_0_14px_rgba(52,211,153,0.2)] hover:border-emerald-300';
    }
  };

  const getProgressBarColor = (rarity: BadgeItem['rarity'], isUnlocked: boolean) => {
    if (!isUnlocked) return 'bg-gray-600';
    switch (rarity) {
      case 'legendary':
        return 'bg-gradient-to-r from-amber-500 to-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.5)]';
      case 'epic':
        return 'bg-gradient-to-r from-purple-500 to-indigo-400 shadow-[0_0_8px_rgba(192,132,252,0.5)]';
      case 'rare':
        return 'bg-gradient-to-r from-cyan-500 to-blue-400 shadow-[0_0_8px_rgba(34,211,238,0.5)]';
      default:
        return 'bg-gradient-to-r from-emerald-500 to-green-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]';
    }
  };

  return (
    <div className="bg-gradient-to-b from-[#222b3a] via-[#1a212d] to-[#141820] border border-[#3b4758] rounded-2xl shadow-[0_16px_36px_rgba(0,0,0,0.85)] p-4 sm:p-5 mb-4 relative overflow-hidden">
      {/* هاله نورانی گوشه کارت */}
      <div className="absolute top-0 right-0 w-36 h-36 bg-yellow-400/5 rounded-full blur-3xl pointer-events-none" />

      {/* سربرگ بخش نشان‌ها */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center shadow-[0_0_12px_rgba(250,204,21,0.2)] select-none">
            <Medal className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>نشان‌ها و مدال‌های پرواز</span>
            </h2>
            <p className="text-[11px] text-gray-400">
              دستاوردهای ثبت‌شده در کابین انفجار
            </p>
          </div>
        </div>

        {/* کپسول وضعیت پیشرفت */}
        <div className="flex items-center gap-1.5 bg-[#141820] px-3 py-1.5 rounded-xl border border-[#3b4758] shadow-inner">
          <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
          <span className="text-yellow-400 font-mono font-black text-sm dir-ltr">
            {unlockedCount}/{badges.length}
          </span>
          <span className="text-[11px] text-gray-400 font-bold">آزاد</span>
        </div>
      </div>

      {/* شبکه ۲ ستونه نشان‌ها - خوانایی کامل عنوان و پیشرفت بدون شکستگی */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
        {badges.map((badge) => {
          const isSelected = selectedBadge?.id === badge.id;
          const BadgeIcon = badge.icon;
          return (
            <button
              key={badge.id}
              type="button"
              onClick={() => setSelectedBadge(badge)}
              className={`p-3 rounded-xl border text-right transition-all duration-150 cursor-pointer relative group flex flex-col justify-between min-h-[110px] ${getRarityCardGlow(
                badge.rarity,
                badge.isUnlocked
              )} ${isSelected ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#141820]' : 'active:scale-[0.98]'}`}
            >
              {/* ردیف بالا: آیکون + تگ کمیابی */}
              <div className="flex items-start justify-between w-full mb-2">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center select-none relative ${
                    badge.isUnlocked
                      ? 'bg-black/40 border border-white/10 group-hover:scale-105 transition-transform'
                      : 'bg-black/30 border border-gray-700/60'
                  }`}
                >
                  <BadgeIcon className={`w-5 h-5 ${badge.isUnlocked ? 'text-yellow-400' : 'text-gray-500'}`} />
                  {!badge.isUnlocked && (
                    <span className="absolute -bottom-1 -right-1 p-0.5 bg-black/90 rounded-full border border-gray-600 flex items-center justify-center">
                      <Lock className="w-2.5 h-2.5 text-gray-400" />
                    </span>
                  )}
                </div>

                <span
                  className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getRarityBadgeStyle(
                    badge.rarity,
                    badge.isUnlocked
                  )}`}
                >
                  {badge.rarityFa}
                </span>
              </div>

              {/* عنوان نشان */}
              <div className="w-full">
                <h3 className="text-xs font-black text-white leading-tight mb-1 truncate">
                  {badge.title}
                </h3>

                {/* پیشرفت متنی */}
                <div className="flex items-center justify-between text-[10px] font-mono text-gray-400 mb-1.5 dir-ltr">
                  <span>{badge.progressLabel}</span>
                  <span className={badge.isUnlocked ? 'text-green-400 font-bold flex items-center' : 'text-gray-500'}>
                    {badge.isUnlocked ? <Check className="w-3 h-3 stroke-[3]" /> : `${Math.round(badge.progressPercent)}%`}
                  </span>
                </div>

                {/* نوار پیشرفت مینی */}
                <div className="w-full h-1 bg-black/50 rounded-full overflow-hidden border border-white/5">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${getProgressBarColor(
                      badge.rarity,
                      badge.isUnlocked
                    )}`}
                    style={{ width: `${badge.progressPercent}%` }}
                  />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* جزئیات بج انتخاب‌شده با طراحی کارت هولوگرام */}
      {selectedBadge && (
        <div className="mt-3.5 p-3.5 bg-[#141820]/95 border border-[#3b4758] rounded-xl flex items-start justify-between gap-3 text-xs shadow-2xl animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-black/50 border border-white/10 flex items-center justify-center flex-shrink-0 shadow-inner">
              <selectedBadge.icon className={`w-6 h-6 ${selectedBadge.isUnlocked ? 'text-yellow-400' : 'text-gray-500'}`} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className="font-black text-white text-sm">{selectedBadge.title}</span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${getRarityBadgeStyle(
                    selectedBadge.rarity,
                    selectedBadge.isUnlocked
                  )}`}
                >
                  {selectedBadge.rarityFa}
                </span>
                <span
                  className={`text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                    selectedBadge.isUnlocked
                      ? 'bg-green-950/80 text-green-300 border border-green-500/40'
                      : 'bg-gray-800 text-gray-400 border border-gray-700'
                  }`}
                >
                  {selectedBadge.isUnlocked ? (
                    <>
                      <span>آزاد شده</span>
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </>
                  ) : (
                    <>
                      <span>هنوز قفل است</span>
                      <Lock className="w-2.5 h-2.5" />
                    </>
                  )}
                </span>
              </div>
              <p className="text-gray-300 text-[11px] leading-relaxed font-medium">
                {selectedBadge.description}
              </p>
              <div className="mt-1.5 text-[10px] font-mono text-yellow-400/90 dir-ltr">
                وضعیت: {selectedBadge.progressLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedBadge(null)}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-gray-800 text-sm select-none flex-shrink-0 cursor-pointer"
            aria-label="بستن"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

export default memo(UserBadges);
