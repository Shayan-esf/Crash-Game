"use client"

import { useStore } from "@/lib/store"
import { Ban, BarChart3, Check, ChevronRight, Coins, RotateCw, Settings, Target, Trash2, User, Zap } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface SystemStats {
  totalUsers: number
  totalGames: number
  totalWithdrawals: number
  totalBalance: number
  activeUsers24h: number
  games24h: number
}

const DEFAULT_CHANCES: {range: number[], chance: number}[] = [
  { range: [1.01, 1.2], chance: 0.25 },
  { range: [1.2, 2], chance: 0.35 },
  { range: [2, 5], chance: 0.30 },
  { range: [5, 20], chance: 0.09 },
  { range: [20, 50], chance: 0.01 },
];

export default function SettingsPage() {
  const { user, balance } = useStore()
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState<SystemStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [chances, setChances] = useState<{range: number[], chance: number}[]>(DEFAULT_CHANCES)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!user || !user.telegramId) {
      setLoading(false)
      return
    }

    // بررسی دسترسی
    fetch(`/api/admin/check-access?telegramId=${user.telegramId}`)
      .then((res) => res.json())
      .then((accessData) => {
        if (accessData.authorized) {
          setAuthorized(true)
          return fetch(`/api/admin/system-stats?telegram_id=${user.telegramId}`)
        }
        setLoading(false)
      })
      .then((statsRes) => statsRes?.json())
      .then((statsData) => {
        setStats(statsData)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Settings error:", error)
        setLoading(false)
      })
  }, [user])

  useEffect(() => {
    fetch('/api/admin/crash-chances')
      .then(r => r.json())
      .then(data => {
        if (data.chances) {
          const parsed: {range: number[], chance: number}[] = data.chances
            .filter((c: any) => Array.isArray(c.range) && c.range.length === 2)
            .map((c: any) => ({ range: [Number(c.range[0]), Number(c.range[1])], chance: Number(c.chance) }));
          setChances(parsed);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleChanceChange = (i: number, value: number) => {
    const newChances = chances.map((c, idx) => idx === i ? { ...c, chance: value } : c);
    setChances(newChances);
    setSuccess(false);
  };

  const total = chances.reduce((sum, c) => sum + c.chance, 0);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await fetch('/api/admin/crash-chances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chances })
      });
      if (!res.ok) throw new Error('خطا در ذخیره‌سازی');
      setSuccess(true);
    } catch (e) {
      setError('خطا در ذخیره‌سازی تنظیمات');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl font-mono">در حال بارگذاری...</div>
      </div>
    )
  }

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl p-6 bg-gray-800 rounded-lg shadow-lg border border-red-500/30 flex items-center gap-2">
          <Ban className="w-6 h-6 text-red-500" />
          <span>دسترسی به پنل مدیریت غیرمجاز است</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
            <ChevronRight className="w-4 h-4" />
            <span>بازگشت</span>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-gray-400" />
            <span>تنظیمات سیستم</span>
          </h1>
        </div>
        <p className="text-gray-400 text-sm mt-1">اطلاعات سرور و شانس‌های انفجار</p>
      </div>

      {/* System Stats */}
      {stats && (
        <div className="p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <span>آمار و وضعیت سیستم</span>
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-blue-400 font-mono dir-ltr">{stats.totalUsers}</div>
              <div className="text-gray-400 text-sm">کل کاربران</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-green-400 font-mono dir-ltr">{stats.totalGames}</div>
              <div className="text-gray-400 text-sm">کل بازی‌ها</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-yellow-400 font-mono dir-ltr">{stats.totalWithdrawals}</div>
              <div className="text-gray-400 text-sm">تعداد برداشت‌ها</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-2xl font-bold text-purple-400 font-mono dir-ltr flex items-center gap-1">
                <span>{stats.totalBalance.toFixed(0)}</span>
                <Coins className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-gray-400 text-sm">مجموع موجودی</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-xl font-bold text-cyan-400 font-mono dir-ltr">{stats.activeUsers24h}</div>
              <div className="text-gray-400 text-sm">کاربران فعال ۲۴ ساعت</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <div className="text-xl font-bold text-orange-400 font-mono dir-ltr">{stats.games24h}</div>
              <div className="text-gray-400 text-sm">بازی‌های ۲۴ ساعت گذشته</div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Info */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          <span>مشخصات حساب مدیر</span>
        </h2>

        <div className="bg-gray-800 rounded-lg p-4 space-y-3 border border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">شناسه تلگرام:</span>
            <span className="font-mono dir-ltr">{user?.telegramId}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">نام کاربری:</span>
            <span className="dir-ltr">@{user?.username}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-400">موجودی مدیر:</span>
            <span className="text-yellow-400 font-mono dir-ltr font-bold flex items-center gap-1">
              <span>{balance.toFixed(0)}</span>
              <Coins className="w-4 h-4 text-yellow-400" />
            </span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span>عملیات سریع</span>
        </h2>

        <div className="space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <RotateCw className="w-4 h-4" />
            <span>بازخوانی صفحه</span>
          </button>

          <button
            onClick={() => {
              if (confirm('آیا از پاکسازی کش مرورگر اطمینان دارید؟')) {
                window.location.reload()
              }
            }}
            className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>پاکسازی کش</span>
          </button>
        </div>
      </div>

      {/* Version Info */}
      <div className="p-4">
        <div className="bg-gray-800 rounded-lg p-4 text-center border border-gray-700">
          <div className="text-gray-400 text-sm">نسخه نرم‌افزار سیستم</div>
          <div className="font-mono text-xs text-gray-400 mt-1 dir-ltr">v1.0.0</div>
        </div>
      </div>

      <div className="max-w-[500px] my-10 mx-auto bg-gray-800/90 border border-gray-700 p-6 rounded-2xl shadow-xl">
        <h2 className="font-bold text-xl mb-4 text-white flex items-center gap-2">
          <Target className="w-5 h-5 text-red-400" />
          <span>تنظیم احتمالات ضریب انفجار (Crash Chances)</span>
        </h2>
        <table className="w-full text-white mb-4 text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-right">
              <th className="py-2">بازه ضریب (x)</th>
              <th className="py-2 text-center">احتمال وقوع (۰ تا ۱)</th>
            </tr>
          </thead>
          <tbody>
            {chances.map((c, i) => (
              <tr key={i} className="border-b border-gray-800">
                <td className="py-2.5 font-mono dir-ltr">{c.range[0].toFixed(2)}x – {c.range[1].toFixed(2)}x</td>
                <td className="py-2.5 text-center">
                  <input
                    type="number"
                    min={0}
                    max={1}
                    step={0.01}
                    value={c.chance}
                    onChange={e => handleChanceChange(i, parseFloat(e.target.value))}
                    className="w-20 px-2 py-1 bg-gray-900 text-white border border-gray-600 rounded text-center font-mono dir-ltr"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={`mb-3 text-sm font-bold ${total === 1 ? 'text-green-400' : 'text-red-400'}`}>
          مجموع احتمال: {(total * 100).toFixed(1)}٪ (باید دقیقاً ۱۰۰٪ باشد)
        </div>
        <button
          onClick={save}
          disabled={saving || total !== 1}
          className="w-full py-2.5 px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-semibold mb-3 transition-colors"
        >
          {saving ? 'در حال ذخیره‌سازی...' : 'ذخیره تنظیمات'}
        </button>
        {success && (
          <div className="text-green-400 mb-3 text-sm font-medium flex items-center gap-1.5">
            <Check className="w-4 h-4 text-green-400" />
            <span>تنظیمات با موفقیت در Redis ذخیره شد!</span>
          </div>
        )}
        {error && <div className="text-red-400 mb-3 text-sm font-medium">{error}</div>}
        <div className="text-xs text-gray-400 leading-relaxed pt-2 border-t border-gray-700">
          <b>توجه:</b> این تنظیمات بلافاصله در پایگاه داده Redis ذخیره شده و در محاسبه ضرایب راندهای آینده بازی اعمال می‌شوند.
        </div>
      </div>
    </div>
  )
} 