'use client';

import { useStore } from '@/lib/store';
import { Coins, Gift, LifeBuoy, Rocket, User } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { DailyBonusModal } from './DailyBonusModal';

interface HeaderProps {
  onBalanceClick?: () => void;
  onSupportClick?: () => void;
  currency?: string;
  setCurrency?: (c: any) => void;
  balance: number;
  demoBalance?: number;
  connected?: boolean;
}

export function Header({ onBalanceClick, onSupportClick, balance, connected }: HeaderProps) {
  const { user } = useStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBonusOpen, setIsBonusOpen] = useState(false);
  const router = useRouter();

  // نام نمایشی کاربر
  let displayName = 'بازیکن';
  if (user) {
    if (user.username && user.username.trim()) {
      displayName = user.username;
    } else if ((user.firstName && user.firstName.trim()) || (user.name && user.name.trim())) {
      displayName = user.firstName || user.name || 'بازیکن';
    }
  }

  return (
    <header className="flex items-center justify-between h-14 bg-gradient-to-b from-[#1f2937] to-[#181a20] border-b border-[#374151]/80 rounded-b-2xl px-3 py-2 shadow-[0_4px_20px_rgba(0,0,0,0.5)] z-30 select-none">
      {/* ۱. برند و وضعیت اتصال */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <Rocket className="w-4 h-4 text-yellow-400" />
        <span className="text-xs sm:text-sm font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent tracking-wide">
          انفجار کیهانی
        </span>
        {connected !== undefined && (
          <span
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              connected
                ? 'bg-[#16a34a] shadow-[0_0_8px_rgba(22,163,74,0.8)]'
                : 'bg-[#dc2626] shadow-[0_0_8px_rgba(220,38,38,0.8)] animate-pulse'
            }`}
            title={connected ? 'اتصال برقرار است' : 'قطع ارتباط'}
          />
        )}
      </div>

      {/* ۲. کپسول مرکزی موجودی سکه خلبان - کلیک‌پذیر جهت خرید با TON */}
      <div className="flex items-center justify-center flex-1 px-2">
        <button
          type="button"
          onClick={onBalanceClick}
          className="flex items-center gap-1.5 bg-[#141820]/90 hover:bg-[#1f2430] active:scale-95 rounded-full px-3 py-1 border border-yellow-400/60 hover:border-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.18)] hover:shadow-[0_0_18px_rgba(250,204,21,0.35)] transition-all cursor-pointer group select-none"
          style={{ height: 32 }}
          title="خرید سکه با TON و دریافت پاداش دعوت"
        >
          <Coins className="w-3.5 h-3.5 text-yellow-400 group-hover:scale-110 transition-transform" />
          <span className="font-mono text-xs sm:text-sm font-black text-white dir-ltr">
            {balance.toFixed(0)}
          </span>
          <span className="text-[10px] text-yellow-400 font-bold bg-yellow-400/10 px-1 rounded border border-yellow-400/30 mr-0.5">
            +
          </span>
        </button>
      </div>

      {/* ۳. دکمه پاداش و پروفایل کاربر */}
      <div className="relative flex items-center gap-1.5 flex-shrink-0">
        {/* دکمه آیکونی استریک ورود و پاداش روزانه */}
        <button
          type="button"
          onClick={() => setIsBonusOpen(true)}
          className="relative w-8 h-8 rounded-full bg-[#1f2937] hover:bg-yellow-500/20 text-yellow-400 border border-yellow-400/40 flex items-center justify-center text-sm transition-all shadow-[0_0_10px_rgba(250,204,21,0.2)] cursor-pointer active:scale-95"
          title="استریک ورود روزانه و جوایز سکه رایگان"
        >
          <Gift className="w-4 h-4 text-yellow-400" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 border border-black shadow-[0_0_6px_rgba(245,158,11,0.8)] animate-pulse" />
        </button>

        {/* دکمه آواتار و منوی کاربر */}
        <button
          type="button"
          className="w-8 h-8 rounded-full bg-[#1f2937] border border-[#374151] hover:border-yellow-400/60 transition-all flex items-center justify-center overflow-hidden cursor-pointer shadow-sm active:scale-95"
          onClick={() => setIsMenuOpen((v) => !v)}
          title={`پروفایل خلبان: ${displayName}`}
        >
          {user?.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-[#2a3547] flex items-center justify-center text-yellow-400 text-xs font-bold font-mono">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
        </button>

        {isMenuOpen && (
          <>
            {/* لایه پس‌زمینه برای بستن منو */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsMenuOpen(false)}
            />
            {/* منوی کاربری */}
            <div className="absolute left-0 top-10 min-w-[160px] bg-[#1a212d] border border-[#3b4758] rounded-xl shadow-2xl py-1.5 z-50 text-xs font-medium backdrop-blur-md">
              <div className="px-3 py-1.5 border-b border-[#3b4758]/60 text-[11px] text-gray-400 truncate">
                خلبان: <span className="text-white font-bold">{displayName}</span>
              </div>
              <button
                type="button"
                className="w-full text-gray-200 px-3.5 py-2 hover:bg-[#283548] hover:text-yellow-400 text-right transition-colors flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setIsMenuOpen(false);
                  router.push('/profile');
                }}
              >
                <User className="w-4 h-4 text-gray-400" />
                <span>پروفایل خلبان</span>
              </button>
              <button
                type="button"
                className="w-full text-gray-200 px-3.5 py-2 hover:bg-[#283548] hover:text-yellow-400 text-right transition-colors flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setIsMenuOpen(false);
                  setIsBonusOpen(true);
                }}
              >
                <Gift className="w-4 h-4 text-gray-400" />
                <span>پاداش روزانه</span>
              </button>
              <button
                type="button"
                className="w-full text-gray-200 px-3.5 py-2 hover:bg-[#283548] hover:text-yellow-400 text-right transition-colors flex items-center gap-2 cursor-pointer"
                onClick={() => {
                  setIsMenuOpen(false);
                  onSupportClick?.();
                }}
              >
                <LifeBuoy className="w-4 h-4 text-gray-400" />
                <span>پشتیبانی</span>
              </button>
            </div>
          </>
        )}
      </div>

      <DailyBonusModal isOpen={isBonusOpen} onCloseAction={() => setIsBonusOpen(false)} />
    </header>
  );
}
