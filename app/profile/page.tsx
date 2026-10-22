"use client";

import BlockedUserScreen from "@/components/BlockedUserScreen";
import UserBadges from "@/components/profile/UserBadges";
import UserUGC from "@/components/profile/UserUGC";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/lib/store";
import { requestPhoneAccess } from "@telegram-apps/sdk";
import { Check, Coins, History, Rocket } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface Game {
  id: number;
  bet: number;
  crashPoint?: number;
  cashout?: number | null;
  profit: number;
  status: string;
  createdAt: string;
}

interface UserProfile {
  id: string;
  telegramId: string;
  username?: string;
  avatarUrl?: string;
  balance: number;
  phone?: string;
  phoneVerified: boolean;
  blocked?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function ProfilePage() {
  const { user } = useStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [games, setGames] = useState<Game[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const touchStartX = useRef<number | null>(null);

  const activeTelegramId = user?.telegramId || "dev-test-user";

  // سوایپ به راست = بازگشت سریع
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      touchStartX.current = e.touches[0].clientX;
    };
    const handleTouchEnd = (e: TouchEvent) => {
      if (touchStartX.current !== null) {
        const deltaX = e.changedTouches[0].clientX - touchStartX.current;
        if (deltaX > 60) {
          window.history.back();
        }
      }
    };
    document.addEventListener("touchstart", handleTouchStart, { passive: true });
    document.addEventListener("touchend", handleTouchEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", handleTouchStart);
      document.removeEventListener("touchend", handleTouchEnd);
    };
  }, []);

  // بارگذاری بهینه داده‌های پروفایل و تاریخچه پروازها
  useEffect(() => {
    let isCancelled = false;

    const fetchProfileData = async () => {
      try {
        const [profileRes, gamesRes] = await Promise.allSettled([
          fetch(`/api/profile?telegram_id=${encodeURIComponent(activeTelegramId)}`),
          fetch(`/api/profile/games?telegram_id=${encodeURIComponent(activeTelegramId)}`),
        ]);

        if (isCancelled) return;

        if (profileRes.status === "fulfilled" && profileRes.value.ok) {
          const profileData: UserProfile = await profileRes.value.json();
          setProfile(profileData);
          setNickname(profileData.username || "");
        } else {
          // در صورت عدم وجود در دیتابیس، پروفایل پیش‌فرض شیک ایجاد می‌شود
          setProfile({
            id: "local-dev",
            telegramId: activeTelegramId,
            username: user?.username || activeTelegramId,
            balance: user ? 1000 : 904,
            phoneVerified: false,
            createdAt: new Date().toISOString(),
          });
          setNickname(user?.username || activeTelegramId);
        }

        if (gamesRes.status === "fulfilled" && gamesRes.value.ok) {
          const gamesData = await gamesRes.value.json();
          setGames(gamesData.games || []);
        }
      } catch (error) {
        console.error("خطا در بارگذاری اطلاعات پروفایل:", error);
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchProfileData();

    return () => {
      isCancelled = true;
    };
  }, [activeTelegramId, user]);

  const handleSaveProfile = useCallback(async () => {
    if (!activeTelegramId) return;

    try {
      const response = await fetch("/api/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          telegramId: activeTelegramId,
          username: nickname,
        }),
      });

      const result = await response.json();
      if (response.ok) {
        setProfile(result);
        setIsEditing(false);
      } else {
        alert("خطا در به‌روزرسانی نام: " + (result.error || response.status));
      }
    } catch (error) {
      console.error("خطا در به‌روزرسانی پروفایل:", error);
    }
  }, [activeTelegramId, nickname]);

  const handleRequestPhone = useCallback(async () => {
    if (requestPhoneAccess.isAvailable()) {
      const status = await requestPhoneAccess();
      if (status === "sent") {
        alert("درخواست اشتراک شماره ارسال شد. لطفاً در چت ربات تأیید کنید.");
      } else if (status === "cancelled") {
        alert("درخواست لغو شد.");
      } else {
        alert("وضعیت: " + status);
      }
    } else {
      alert("تلگرام در این دستگاه از اشتراک شماره موبایل پشتیبانی نمی‌کند.");
    }
  }, []);

  // مدیریت امن تاریخ برای جلوگیری از خطای Invalid Date
  const formatMemberDate = useCallback((dateVal?: string | number | Date | null) => {
    if (!dateVal) return "به‌تازگی";
    const num = Number(dateVal);
    const d = new Date(!isNaN(num) && num > 1000000 ? num : dateVal);
    return isNaN(d.getTime()) ? "به‌تازگی" : d.toLocaleDateString("fa-IR");
  }, []);

  const formatGameDate = useCallback((dateVal?: string | number | Date | null) => {
    if (!dateVal) return "—";
    const num = Number(dateVal);
    const d = new Date(!isNaN(num) && num > 1000000 ? num : dateVal);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
  }, []);

  // محاسبه مموایز شده آمار کلیدی پرواز خلبان
  const { gamesCount, winRate, bestCashout } = useMemo(() => {
    const count = games.length;
    const wins = games.filter((g) => g.profit > 0).length;
    const rate = count > 0 ? Math.round((wins / count) * 100) : 0;
    const best = games.reduce((max, g) => (g.cashout && g.cashout > max ? g.cashout : max), 0);
    return {
      gamesCount: count,
      winRate: rate,
      bestCashout: best,
    };
  }, [games]);

  if (isLoading) {
    return (
      <div className="w-full max-w-[483px] mx-auto min-h-screen bg-[#181a20] flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-full border-2 border-yellow-400 border-t-transparent animate-spin mb-3" />
        <div className="text-yellow-400 font-bold text-xs tracking-wider font-mono">
          LOADING PILOT DOSSIER...
        </div>
      </div>
    );
  }

  // بررسی مسدودیت کاربر
  if (user?.blocked || profile?.blocked) {
    return <BlockedUserScreen />;
  }

  if (!profile) {
    return (
      <div className="w-full max-w-[483px] mx-auto min-h-screen bg-[#181a20] flex items-center justify-center p-4">
        <div className="text-gray-400 text-sm">پروفایل کاربری یافت نشد</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[483px] mx-auto min-h-screen bg-[#181a20] text-white p-3 sm:p-4 relative border-x border-[#374151]/30 shadow-2xl pb-12 select-none">
      {/* ۱. نوار سربرگ با دکمه بازگشت */}
      <header className="flex items-center justify-between mb-4 pt-1 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-yellow-400/10 border border-yellow-400/30 flex items-center justify-center text-lg shadow-[0_0_12px_rgba(250,204,21,0.2)]">
            <Rocket className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
              پروفایل و آمار خلبان
            </h1>
            <p className="text-[10px] text-gray-400 font-mono dir-ltr">
              PILOT DOSSIER // CALLSIGN
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => window.history.back()}
          className="h-8 px-3 rounded-xl bg-[#1f2937] hover:bg-[#374151] border border-[#3b4758] flex items-center justify-center gap-1.5 text-yellow-400 text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-sm"
          aria-label="بازگشت"
        >
          <span>بازگشت</span>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </header>

      {/* ۲. کارت شناسنامه رسمی خلبان (The Cosmic Dossier) بدون کدهای متفرقه Shadcn Card */}
      <article className="bg-gradient-to-b from-[#222b3a] via-[#1a212d] to-[#141820] border border-[#3b4758] mb-4 shadow-[0_16px_36px_rgba(0,0,0,0.85)] rounded-2xl w-full p-4 relative overflow-hidden">
        {/* نوار وضعیت بالای کارت هویت */}
        <div className="flex items-center justify-between pb-3 border-b border-[#3b4758]/80 mb-3.5">
          <span className="text-[10px] font-mono font-bold text-gray-400">
            فدراسیون هوانوردی کیهانی
          </span>
          <div className="flex items-center gap-1.5 bg-green-950/60 border border-green-500/40 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-[10px] font-bold text-green-300">آماده پرواز</span>
          </div>
        </div>

        <div className="space-y-4 text-white">
          {/* آواتار و مشخصات خلبان */}
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <Avatar className="w-16 h-16 rounded-2xl border-2 border-yellow-400/80 shadow-[0_0_16px_rgba(250,204,21,0.3)] flex-shrink-0">
                <AvatarImage src={profile.avatarUrl} />
                <AvatarFallback className="bg-[#11141c] text-yellow-400 font-black text-2xl">
                  {profile.username?.charAt(0).toUpperCase() || "P"}
                </AvatarFallback>
              </Avatar>
              <span className="absolute -bottom-1 -right-1 text-[9px] bg-yellow-400 text-[#141820] font-black px-1.5 py-0.2 rounded-md border border-black shadow">
                LVL 1
              </span>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="font-black text-white bg-[#0d1017] px-2.5 py-1 rounded-xl focus:outline-none border border-yellow-400 text-sm max-w-[140px]"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveProfile}
                      className="p-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white flex items-center justify-center cursor-pointer shadow"
                      title="ذخیره"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setNickname(profile.username || "");
                      }}
                      className="p-1.5 rounded-lg bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center cursor-pointer"
                      title="انصراف"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base sm:text-lg font-black text-white truncate">
                      {profile.username || "خلبان کیهانی"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="p-1 rounded-md bg-[#222b3a] hover:bg-gray-700 text-yellow-400 flex items-center justify-center cursor-pointer border border-[#3b4758]"
                      title="ویرایش نام"
                    >
                      <svg
                        width="13"
                        height="13"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19.5 3 21l1.5-4L16.5 3.5z" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 mt-1 text-[11px] text-gray-400">
                <span>شناسه:</span>
                <span className="font-mono text-gray-200 dir-ltr bg-black/40 px-2 py-0.5 rounded-md border border-white/5">
                  @{profile.telegramId}
                </span>
                <span>•</span>
                <span>عضویت:</span>
                <span className="text-gray-300 font-mono">
                  {formatMemberDate(profile.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* نوار ۳گانه آمار کلیدی و تله‌متری (Arcade Telemetry Strip) */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            {/* موجودی سکه */}
            <div className="p-2.5 bg-[#141820]/90 border border-[#3b4758] rounded-xl text-center">
              <div className="text-[10px] text-gray-400 mb-0.5 font-bold">موجودی سکه</div>
              <div className="text-sm sm:text-base font-black text-yellow-400 font-mono dir-ltr drop-shadow-[0_0_8px_rgba(250,204,21,0.3)] flex items-center justify-center gap-1">
                <span>{profile.balance.toFixed(0)}</span>
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
              </div>
            </div>

            {/* کل پروازها */}
            <div className="p-2.5 bg-[#141820]/90 border border-[#3b4758] rounded-xl text-center">
              <div className="text-[10px] text-gray-400 mb-0.5 font-bold">کل پروازها</div>
              <div className="text-sm sm:text-base font-black text-white font-mono dir-ltr">
                {gamesCount} <span className="text-[10px] text-green-400">({winRate}%)</span>
              </div>
            </div>

            {/* بهترین کش‌اوت */}
            <div className="p-2.5 bg-[#141820]/90 border border-[#3b4758] rounded-xl text-center">
              <div className="text-[10px] text-gray-400 mb-0.5 font-bold">بهترین شکار</div>
              <div className="text-sm sm:text-base font-black text-cyan-300 font-mono dir-ltr drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">
                {bestCashout > 0 ? `${bestCashout.toFixed(2)}x` : "—"}
              </div>
            </div>
          </div>

          <Separator className="bg-[#3b4758]/70" />

          {/* وضعیت احراز هویت تلگرام */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-300 font-medium">احراز هویت تلگرام:</span>
            <div className="flex items-center gap-2">
              {profile.phoneVerified ? (
                <>
                  <span className="text-green-400 font-mono dir-ltr text-[11px]">{profile.phone}</span>
                  <Badge variant="secondary" className="bg-green-600/80 text-white text-[10px] px-2 py-0.5 inline-flex items-center gap-1">
                    <span>تایید شده</span>
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </Badge>
                </>
              ) : (
                <>
                  <span className="text-gray-400 text-[11px]">متصل نیست</span>
                  <Button
                    size="sm"
                    onClick={handleRequestPhone}
                    className="bg-blue-600 hover:bg-blue-700 text-xs h-7 px-2.5 rounded-lg shadow cursor-pointer"
                  >
                    اتصال شماره
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* ۳. کامپوننت نشان‌ها و مدال‌های افتخار خلبان (Badges) */}
      <UserBadges
        games={games}
        balance={profile.balance}
        phoneVerified={profile.phoneVerified}
      />

      {/* ۴. کامپوننت استراتژی و کارت پرواز خلبان (UGC) */}
      <UserUGC username={profile.username || "کاربر"} games={games} />

      {/* ۵. تاریخچه ۱۰ پرواز اخیر */}
      <section className="bg-gradient-to-b from-[#222b3a] via-[#1a212d] to-[#141820] border border-[#3b4758] shadow-[0_16px_36px_rgba(0,0,0,0.85)] rounded-2xl w-full p-4">
        <div className="pb-3 flex items-center justify-between flex-row">
          <h2 className="text-white flex items-center gap-2 text-sm sm:text-base font-black">
            <History className="w-4 h-4 text-yellow-400" />
            <span>۱۰ پرواز اخیر</span>
          </h2>
          <span className="text-[10px] text-gray-400 font-mono dir-ltr bg-[#141820] px-2.5 py-0.5 rounded-full border border-[#3b4758]">
            FLIGHT LOGS
          </span>
        </div>
        <div>
          {games.length > 0 ? (
            <div className="space-y-2">
              {games.slice(0, 10).map((game) => (
                <div
                  key={game.id}
                  className="p-2.5 bg-[#141820]/90 border border-[#3b4758] rounded-xl flex items-center justify-between text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>شرط:</span>
                      <span className="text-yellow-400 font-mono dir-ltr flex items-center gap-1">
                        <span>{game.bet.toFixed(0)}</span>
                        <Coins className="w-3 h-3 text-yellow-400" />
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono dir-ltr">
                      ساعت: {formatGameDate(game.createdAt)}
                    </div>
                  </div>

                  <div className="text-left flex flex-col items-end gap-0.5">
                    <div
                      className={`font-mono font-black text-xs sm:text-sm dir-ltr flex items-center gap-1 ${
                        game.profit >= 0 ? "text-green-400" : "text-red-400"
                      }`}
                    >
                      <span>
                        {game.profit >= 0 ? "+" : ""}
                        {game.profit.toFixed(1)}
                      </span>
                      <Coins className="w-3 h-3 text-yellow-400" />
                    </div>
                    <div className="text-[10px] text-gray-300 font-mono dir-ltr flex items-center gap-1">
                      <span>
                        ضریب: {game.crashPoint ? `${game.crashPoint.toFixed(2)}x` : "-"}
                      </span>
                      <span>|</span>
                      <span>
                        خروج: {game.cashout ? `${game.cashout.toFixed(2)}x` : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-6 text-xs font-mono">
              هنوز پروازی ثبت نشده است
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
