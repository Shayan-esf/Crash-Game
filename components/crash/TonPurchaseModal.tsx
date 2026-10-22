'use client';

import { useStore } from '@/lib/store';
import { triggerHaptic } from '@/lib/telegramHaptics';
import { TonConnectButton, useTonAddress, useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Check, Coins, Copy, Flame, Gift, Rocket, Share2, Sparkles, Star, Users, Wallet, X, Zap } from 'lucide-react';
import React, { useEffect, useState } from 'react';

interface TonPurchaseModalProps {
  isOpen: boolean;
  onCloseAction: () => void;
}

interface PackageOption {
  ton: number;
  coins: number;
  bonusPercent: number;
  label?: string;
  icon?: typeof Flame;
}

const TON_PACKAGES: PackageOption[] = [
  { ton: 0.5, coins: 500, bonusPercent: 0 },
  { ton: 1.0, coins: 1100, bonusPercent: 10, label: 'محبوب‌ترین', icon: Flame },
  { ton: 2.0, coins: 2500, bonusPercent: 25, label: 'بیشترین سود', icon: Zap },
];

const STARS_COIN_PACKAGES = [
  { id: 'coins_small', stars: 25, coins: 500, bonus: 0, label: 'بسته پایه' },
  { id: 'coins_medium', stars: 50, coins: 1100, bonus: 10, label: 'محبوب‌ترین', icon: Flame },
  { id: 'coins_large', stars: 100, coins: 2500, bonus: 25, label: 'بیشترین ارزش', icon: Zap },
];

const STARS_SKIN_PACKAGES = [
  {
    id: 'skin_phoenix',
    skinId: 'phoenix',
    title: 'ققنوس آتشین',
    stars: 75,
    icon: Flame,
    color: 'from-orange-500 to-red-600',
    borderColor: 'border-orange-500/60',
    desc: 'هاله آتشین با رد سوخت متمرکز',
  },
  {
    id: 'skin_cyberpunk',
    skinId: 'cyberpunk',
    title: 'سایبرپانک نئونی',
    stars: 100,
    icon: Zap,
    color: 'from-cyan-400 to-fuchsia-500',
    borderColor: 'border-cyan-400/60',
    desc: 'استایل نئونی آینده‌نگر با شعله دوگانه',
  },
  {
    id: 'skin_golden',
    skinId: 'golden',
    title: 'طلایی کیهانی',
    stars: 150,
    icon: Sparkles,
    color: 'from-yellow-300 via-amber-400 to-yellow-600',
    borderColor: 'border-yellow-400/80',
    desc: 'پوشش طلای خالص VIP با ذرات نورانی',
  },
];

export function TonPurchaseModal({ isOpen, onCloseAction }: TonPurchaseModalProps) {
  const { user, adjustBalance, selectedSkin, unlockedSkins, setSelectedSkin, unlockSkin } = useStore();
  const wallet = useTonWallet();
  const userFriendlyAddress = useTonAddress();
  const [tonConnectUI] = useTonConnectUI();

  const [activeTab, setActiveTab] = useState<'ton' | 'stars' | 'referral'>('ton');
  const [selectedTonPackage, setSelectedTonPackage] = useState<PackageOption>(TON_PACKAGES[1]);
  const [customTon, setCustomTon] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [referralStats, setReferralStats] = useState({
    totalInvited: 0,
    totalCoinsEarned: 0,
  });

  const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || 'CrashRocketGameBot';
  const referralLink = `https://t.me/${botUsername}?start=ref_${user?.telegramId || 'guest'}`;

  // محاسبه سکه برای ورودی دلخواه TON
  const parsedCustomTon = parseFloat(customTon) || 0;
  const customCoins = Math.floor(parsedCustomTon * 1000);

  // واکشی آمار ریفرال
  useEffect(() => {
    if (!isOpen || !user?.telegramId) return;

    fetch(`/api/profile/referrals?telegram_id=${user.telegramId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setReferralStats({
            totalInvited: data.totalInvited || 0,
            totalCoinsEarned: data.totalCoinsEarned || 0,
          });
        }
      })
      .catch(() => {});
  }, [isOpen, user?.telegramId]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    triggerHaptic('selection');
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareTelegram = () => {
    triggerHaptic('light');
    const text = encodeURIComponent('بیا توی مینی‌اپ بازی انفجار تلگرام، با هم موشک سواری کنیم و سکه هدیه ببریم!');
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`;

    if (typeof window !== 'undefined') {
      const tg = (window as any).Telegram?.WebApp;
      if (tg && tg.openTelegramLink) {
        tg.openTelegramLink(shareUrl);
      } else {
        window.open(shareUrl, '_blank');
      }
    }
  };

  // خرید از طریق TON Connect
  const handleTonPurchase = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const tonAmount = customTon ? parsedCustomTon : selectedTonPackage.ton;
    const coinsToReceive = customTon ? customCoins : selectedTonPackage.coins;

    if (tonAmount <= 0) {
      setErrorMessage('لطفاً یک بسته معتبر یا مقدار TON بیشتر از صفر وارد کنید.');
      return;
    }

    triggerHaptic('medium');
    setIsProcessing(true);

    try {
      const recipientAddress =
        process.env.NEXT_PUBLIC_TON_RECIPIENT_WALLET ||
        'UQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJKZ';

      let txHash = `mock_tx_${Date.now()}`;
      let bocString = '';

      if (wallet && tonConnectUI) {
        const nanoAmount = Math.floor(tonAmount * 1e9).toString();
        const transaction = {
          validUntil: Math.floor(Date.now() / 1000) + 600,
          messages: [
            {
              address: recipientAddress,
              amount: nanoAmount,
              payload: btoa(`ref_${user?.telegramId || 'anon'}`),
            },
          ],
        };

        const result = await tonConnectUI.sendTransaction(transaction);
        bocString = result.boc;
        txHash = `ton_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      }

      const response = await fetch('/api/wallet/ton/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user?.telegramId || 'dev-test-user',
          amountTon: tonAmount,
          coinsReceived: coinsToReceive,
          txHash,
          boc: bocString,
        }),
      });

      const resData = await response.json();

      if (resData.success) {
        adjustBalance(coinsToReceive);
        triggerHaptic('success');
        setSuccessMessage(`${coinsToReceive.toLocaleString('fa-IR')} سکه با موفقیت به موجودی شما افزوده شد!`);
      } else {
        throw new Error(resData.error || 'خطا در ثبت تراکنش');
      }
    } catch (err: any) {
      console.error('Purchase error:', err);
      triggerHaptic('error');
      setErrorMessage(err?.message || 'تراکنش توسط کاربر لغو شد یا با خطا مواجه گردید.');
    } finally {
      setIsProcessing(false);
    }
  };

  // خرید از طریق درگاه مستقیم ستاره تلگرام (Telegram Stars IAP)
  const handleBuyWithStars = async (pkgId: string) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    triggerHaptic('medium');
    setIsProcessing(true);

    try {
      const res = await fetch('/api/wallet/stars/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          packageId: pkgId,
          telegramId: user?.telegramId || 'dev-test-user',
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'خطا در ایجاد لینک پرداخت ستاره تلگرام');
      }

      const tg = typeof window !== 'undefined' ? (window as any).Telegram?.WebApp : null;

      if (tg?.openInvoice && !data.isMock) {
        // باز کردن رسمی پنجره پرداخت ستاره در تلگرام
        tg.openInvoice(data.invoiceLink, async (status: string) => {
          if (status === 'paid') {
            await confirmStarsPayment(data.package);
          } else if (status === 'failed') {
            triggerHaptic('error');
            setErrorMessage('پرداخت ستاره ناموفق بود یا لغو گردید.');
          }
        });
      } else {
        // حالت توسعه / شبیه‌سازی پرداخت برای مرورگر و تست
        await confirmStarsPayment(data.package);
      }
    } catch (err: any) {
      console.error('Stars invoice error:', err);
      triggerHaptic('error');
      setErrorMessage(err?.message || 'خطا در پردازش درگاه ستاره تلگرام');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmStarsPayment = async (pkg: any) => {
    try {
      const confirmRes = await fetch('/api/wallet/stars/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          telegramId: user?.telegramId || 'dev-test-user',
          packageId: pkg.id,
          itemType: pkg.itemType,
          starsAmount: pkg.stars,
          rewardCoins: pkg.rewardCoins || 0,
          skinId: pkg.skinId || null,
        }),
      });

      const resData = await confirmRes.json();
      if (resData.success) {
        triggerHaptic('success');
        if (pkg.itemType === 'coins') {
          adjustBalance(pkg.rewardCoins);
          setSuccessMessage(`${pkg.rewardCoins.toLocaleString('fa-IR')} سکه با موفقیت به موجودی شما اضافه شد!`);
        } else if (pkg.itemType === 'skin') {
          unlockSkin(pkg.skinId);
          setSuccessMessage(`اسکین «${pkg.title}» بازگشایی و در بازی فعال شد!`);
        }
      } else {
        throw new Error(resData.error || 'خطا در تایید تراکنش');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'خطا در تایید نهایی پرداخت ستاره');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-sm select-none animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#181a20] rounded-2xl border border-yellow-400/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]">
        {/* سربرگ مدال */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#1f2430] border-b border-[#374151]/80">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-yellow-400" />
            <h3 className="text-sm font-black text-white">فروشگاه کیهانی و پاداش</h3>
          </div>
          <button
            type="button"
            onClick={onCloseAction}
            className="w-7 h-7 rounded-full bg-[#181a20] hover:bg-gray-700 text-gray-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* نوار انتخاب تب‌ها */}
        <div className="flex border-b border-[#374151]/80 bg-[#141820]">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ton');
              triggerHaptic('selection');
            }}
            className={`flex-1 py-2.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'ton'
                ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Wallet className="w-3.5 h-3.5" />
            <span>شارژ با TON</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('stars');
              triggerHaptic('selection');
            }}
            className={`flex-1 py-2.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'stars'
                ? 'text-amber-400 border-b-2 border-amber-400 bg-amber-400/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span>ستاره تلگرام (Stars)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('referral');
              triggerHaptic('selection');
            }}
            className={`flex-1 py-2.5 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'referral'
                ? 'text-yellow-400 border-b-2 border-yellow-400 bg-yellow-400/10'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>دعوت دوستان (+۲۵۰)</span>
          </button>
        </div>

        {/* پیام‌های اطلاع‌رسانی */}
        {errorMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs text-center">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-green-500/20 border border-green-500/40 text-green-300 text-xs text-center font-bold flex items-center justify-center gap-1.5">
            <Check className="w-4 h-4 text-green-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* محتوای تب‌ها */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'ton' ? (
            <>
              {/* وضعیت اتصال ولت TON */}
              <div className="bg-[#141820] rounded-xl p-3 border border-[#374151]/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${wallet ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' : 'bg-gray-500'}`}
                  />
                  <div>
                    <div className="text-[11px] text-gray-400 font-medium">کیف‌پول شبکه TON:</div>
                    <div className="text-xs font-mono text-white font-bold dir-ltr">
                      {wallet
                        ? `${userFriendlyAddress.slice(0, 4)}...${userFriendlyAddress.slice(-4)}`
                        : 'متصل نیست'}
                    </div>
                  </div>
                </div>

                <div className="scale-90 origin-left">
                  <TonConnectButton />
                </div>
              </div>

              {/* بسته‌های پیشنهادی TON */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-gray-300 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>انتخاب بسته سکه با TON:</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {TON_PACKAGES.map((pkg) => {
                    const isSelected = !customTon && selectedTonPackage.ton === pkg.ton;
                    const IconComponent = pkg.icon;
                    return (
                      <button
                        key={pkg.ton}
                        type="button"
                        onClick={() => {
                          setCustomTon('');
                          setSelectedTonPackage(pkg);
                          triggerHaptic('selection');
                        }}
                        className={`relative rounded-xl p-2.5 flex flex-col items-center justify-center border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-yellow-400/15 border-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.25)]'
                            : 'bg-[#141820] border-[#374151] hover:border-gray-500'
                        }`}
                      >
                        {pkg.label && (
                          <span className="absolute -top-2 bg-gradient-to-r from-amber-500 to-yellow-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm flex items-center gap-0.5">
                            {IconComponent && <IconComponent className="w-2.5 h-2.5" />}
                            {pkg.label}
                          </span>
                        )}
                        <span className="text-sm font-black text-white dir-ltr mt-1">
                          {pkg.ton} TON
                        </span>
                        <span className="text-xs font-bold text-yellow-400 mt-0.5">
                          {pkg.coins.toLocaleString('fa-IR')} سکه
                        </span>
                        {pkg.bonusPercent > 0 && (
                          <span className="text-[10px] text-green-400 font-bold mt-0.5">
                            +{pkg.bonusPercent}٪ هدیه
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* مقدار دلخواه TON */}
              <div className="bg-[#141820] rounded-xl p-3 border border-[#374151]/80 space-y-2">
                <div className="text-xs text-gray-300 font-bold">یا وارد کردن مقدار دلخواه TON:</div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={customTon}
                    onChange={(e) => setCustomTon(e.target.value)}
                    placeholder="مثلاً 1.5"
                    className="flex-1 bg-[#181a20] border border-gray-700 focus:border-yellow-400 rounded-lg px-3 py-2 text-sm text-white font-mono dir-ltr outline-none"
                  />
                  <span className="text-xs font-bold text-yellow-400 font-mono">TON</span>
                </div>
                {parsedCustomTon > 0 && (
                  <div className="text-[11px] text-green-400 font-bold text-left dir-ltr">
                    = {customCoins.toLocaleString()} Coins
                  </div>
                )}
              </div>

              {/* دکمه پرداخت با TON */}
              <button
                type="button"
                onClick={handleTonPurchase}
                disabled={isProcessing}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-yellow-500 via-amber-400 to-yellow-500 hover:from-yellow-400 hover:to-amber-300 text-black font-black text-sm tracking-wide shadow-[0_0_20px_rgba(250,204,21,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Coins className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? 'در حال پردازش...'
                    : `پرداخت ${customTon ? parsedCustomTon : selectedTonPackage.ton} TON و دریافت سکه`}
                </span>
              </button>
            </>
          ) : activeTab === 'stars' ? (
            <>
              {/* بخش درگاه ستاره تلگرام */}
              <div className="bg-gradient-to-r from-amber-500/10 to-yellow-500/5 rounded-xl p-3 border border-amber-400/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-400 flex-shrink-0">
                  <Star className="w-6 h-6 fill-amber-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white">پرداخت مستقیم با ستاره تلگرام (Stars)</h4>
                  <p className="text-[11px] text-gray-300 mt-0.5 leading-relaxed">
                    پرداخت بدون واسطه و فوری از طریق موجودی ستاره حساب تلگرام شما.
                  </p>
                </div>
              </div>

              {/* پکیج‌های سکه با ستاره */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>پکیج‌های شارژ سکه با ستاره:</span>
                </div>

                <div className="space-y-2">
                  {STARS_COIN_PACKAGES.map((pkg) => (
                    <div
                      key={pkg.id}
                      className="bg-[#141820] hover:bg-[#1a1f2c] border border-gray-700 hover:border-amber-400/60 rounded-xl p-3 flex items-center justify-between transition-all"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-black text-white">
                            {pkg.coins.toLocaleString('fa-IR')} سکه طلایی
                          </span>
                          {pkg.bonus > 0 && (
                            <span className="text-[10px] bg-green-500/20 text-green-300 border border-green-500/30 px-1.5 py-0.5 rounded font-bold">
                              +{pkg.bonus}٪ هدیه
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                          {pkg.icon && <pkg.icon className="w-3 h-3 text-amber-400" />}
                          <span>{pkg.label}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleBuyWithStars(pkg.id)}
                        disabled={isProcessing}
                        className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                      >
                        <Star className="w-3.5 h-3.5 fill-black" />
                        <span>{pkg.stars} ستاره</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* اسکین‌های پریمیوم موشک */}
              <div className="space-y-2 pt-2 border-t border-[#374151]/80">
                <div className="text-xs font-bold text-yellow-300 flex items-center gap-1.5">
                  <Rocket className="w-3.5 h-3.5 text-yellow-400" />
                  <span>اسکین‌های پریمیوم موشک پرواز:</span>
                </div>

                <div className="space-y-2.5">
                  {STARS_SKIN_PACKAGES.map((skin) => {
                    const isUnlocked = unlockedSkins?.includes(skin.skinId);
                    const isCurrent = selectedSkin === skin.skinId;
                    const IconComponent = skin.icon;

                    return (
                      <div
                        key={skin.id}
                        className={`bg-[#141820] border rounded-xl p-3 flex items-center justify-between transition-all ${
                          isCurrent
                            ? `${skin.borderColor} shadow-[0_0_15px_rgba(250,204,21,0.2)] bg-yellow-400/5`
                            : 'border-gray-700'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${skin.color} flex items-center justify-center text-white shadow-md flex-shrink-0`}
                          >
                            <IconComponent className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="text-xs font-black text-white flex items-center gap-1.5">
                              <span>{skin.title}</span>
                              {isCurrent && (
                                <span className="text-[9px] bg-yellow-400 text-black font-black px-1.5 py-0.5 rounded-full">
                                  فعال
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-gray-400 mt-0.5">{skin.desc}</div>
                          </div>
                        </div>

                        <div>
                          {isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSkin(skin.skinId);
                                triggerHaptic('selection');
                              }}
                              className={`py-1.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                isCurrent
                                  ? 'bg-green-600/20 text-green-300 border border-green-500/40 cursor-default'
                                  : 'bg-gray-800 hover:bg-gray-700 text-white border border-gray-600'
                              }`}
                            >
                              {isCurrent ? (
                                <span className="flex items-center gap-1">
                                  <span>انتخاب شده</span>
                                  <Check className="w-3 h-3 stroke-[3]" />
                                </span>
                              ) : (
                                <span>انتخاب اسکین</span>
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleBuyWithStars(skin.id)}
                              disabled={isProcessing}
                              className="py-1.5 px-3 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all cursor-pointer"
                            >
                              <Star className="w-3.5 h-3.5 fill-black" />
                              <span>{skin.stars} ستاره</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* بخش ریفرال و دعوت از دوستان */}
              <div className="bg-[#141820] rounded-xl p-3 border border-yellow-400/30 text-center space-y-2">
                <div className="inline-flex p-2 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/30">
                  <Gift className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-black text-white">پاداش بی‌نهایت دعوت از دوستان!</h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  با دعوت هر دوست، ۲۵۰ سکه رایگان پس از تایید شماره دریافت کنید + ۱۰٪ از تمامی خریدهای TON او را به عنوان کمیسیون دریافت کنید.
                </p>
              </div>

              {/* کارت‌های آمار ریفرال */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#141820] rounded-xl p-3 border border-[#374151] text-center">
                  <div className="text-[11px] text-gray-400">دوستان دعوت‌شده</div>
                  <div className="text-lg font-black text-white mt-1 font-mono">
                    {referralStats.totalInvited}
                  </div>
                </div>
                <div className="bg-[#141820] rounded-xl p-3 border border-[#374151] text-center">
                  <div className="text-[11px] text-gray-400">مجموع سکه پاداش</div>
                  <div className="text-lg font-black text-yellow-400 mt-1 font-mono">
                    {referralStats.totalCoinsEarned.toLocaleString('fa-IR')}
                  </div>
                </div>
              </div>

              {/* لینک دعوت */}
              <div className="space-y-2">
                <div className="text-xs text-gray-400 font-bold">لینک اختصاصی دعوت شما:</div>
                <div className="flex items-center gap-2 bg-[#141820] rounded-xl p-2 border border-gray-700">
                  <input
                    type="text"
                    readOnly
                    value={referralLink}
                    className="flex-1 bg-transparent text-xs text-gray-200 font-mono dir-ltr outline-none truncate px-1"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-yellow-400 transition-all cursor-pointer flex items-center gap-1 text-xs font-bold"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'کپی شد' : 'کپی'}</span>
                  </button>
                </div>
              </div>

              {/* دکمه ارسال مستقیم در تلگرام */}
              <button
                type="button"
                onClick={handleShareTelegram}
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm tracking-wide shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>اشتراک‌گذاری در چت‌های تلگرام</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
