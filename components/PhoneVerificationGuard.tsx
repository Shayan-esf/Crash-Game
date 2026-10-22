'use client';

import { useStore } from '@/lib/store';
import { Rocket, Shield, Smartphone } from 'lucide-react';
import { useState } from 'react';

export default function PhoneVerificationGuard() {
  const { user, setUser } = useStore();
  const [devPhone, setDevPhone] = useState('09121112233');
  const [isVerifying, setIsVerifying] = useState(false);

  const handleOpenBot = () => {
    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'CrashRocketGameBot';
    const botUrl = `https://t.me/${botUsername}?start=verify_phone`;

    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(botUrl);
      } else {
        window.open(botUrl, '_blank');
      }
    }
  };

  const handleDevVerify = async () => {
    if (!user) return;
    setIsVerifying(true);
    try {
      // شبیه‌سازی یا ذخیره تایید شماره در محیط توسعه
      setUser({
        ...user,
        phone: devPhone,
        phoneVerified: true,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#121316] flex items-center justify-center p-4 selection:bg-yellow-400/30">
      <div className="w-full max-w-md bg-[#181a20] rounded-2xl border border-yellow-400/30 p-6 shadow-[0_0_50px_rgba(250,204,21,0.15)] text-center space-y-6">
        {/* آیکون فضایی تایید شماره */}
        <div className="relative mx-auto w-20 h-20 rounded-2xl bg-gradient-to-tr from-yellow-500/20 to-amber-400/10 border border-yellow-400/40 flex items-center justify-center shadow-[0_0_25px_rgba(250,204,21,0.25)]">
          <Smartphone className="w-10 h-10 text-yellow-400 animate-bounce" />
          <span className="absolute -bottom-1 -right-1 p-1 bg-[#181a20] rounded-full border border-yellow-400/50 flex items-center justify-center shadow-md">
            <Shield className="w-4 h-4 text-emerald-400" />
          </span>
        </div>

        {/* عنوان و توضیحات */}
        <div className="space-y-2">
          <h2 className="text-xl font-black bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
            تایید شماره تماس خلبان
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 leading-relaxed">
            جهت امنیت پرواز، جلوگیری از حساب‌های تکراری و فعال‌سازی کیف‌پول TON، لازم است شماره تماس تلگرام خود را به اشتراک بگذارید.
          </p>
        </div>

        {/* دکمه ارسال شماره در ربات */}
        <div className="space-y-3 pt-2">
          <button
            type="button"
            onClick={handleOpenBot}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-sm tracking-wide shadow-[0_0_20px_rgba(245,158,11,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Rocket className="w-4 h-4 text-black" />
            <span>ارسال شماره تماس در ربات تلگرام</span>
          </button>

          <p className="text-[11px] text-gray-400">
            پس از ارسال شماره در چت ربات، بازی به طور خودکار فعال خواهد شد.
          </p>
        </div>

        {/* بخش توسعه‌دهنده (Dev Mode) برای تست مرورگر */}
        <div className="mt-6 pt-4 border-t border-[#374151]/60">
          <div className="text-[11px] text-yellow-400/80 mb-2 font-mono">
            حالت تستی لوکال (Dev Mode Bypass)
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={devPhone}
              onChange={(e) => setDevPhone(e.target.value)}
              className="flex-1 bg-[#141820] border border-gray-700 focus:border-yellow-400 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono text-center dir-ltr outline-none"
              placeholder="+98912..."
            />
            <button
              type="button"
              onClick={handleDevVerify}
              disabled={isVerifying}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-600 text-yellow-300 text-xs font-bold transition-all active:scale-95 cursor-pointer whitespace-nowrap"
            >
              تایید تستی
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
