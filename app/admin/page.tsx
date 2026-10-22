"use client"

import { useStore } from "@/lib/store"
import { Ban, ChevronLeft, Coins, Crown, Gamepad2, Settings, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Stats {
  totalUsers: number
  totalGames: number
  totalBalance: number
}

export default function AdminPage() {
  const { user } = useStore()
  const [authorized, setAuthorized] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

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
          // بارگذاری آمار
          return fetch(`/api/admin/stats?telegram_id=${user.telegramId}`)
        }
        setLoading(false)
      })
      .then((statsRes) => statsRes?.json())
      .then((statsData) => {
        setStats(statsData)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Admin error:", error)
        setLoading(false)
      })
  }, [user])

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
        <h1 className="text-xl font-bold flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-400" />
          <span>پنل مدیریت بازی</span>
        </h1>
        <p className="text-gray-400 text-sm">خوش آمدید، {user?.username || 'مدیر'}</p>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-blue-400 font-mono dir-ltr">{stats.totalUsers}</div>
            <div className="text-gray-400 text-sm">کل کاربران</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-green-400 font-mono dir-ltr">{stats.totalGames}</div>
            <div className="text-gray-400 text-sm">بازی‌های انجام شده</div>
          </div>
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="text-2xl font-bold text-yellow-400 font-mono dir-ltr flex items-center gap-1.5">
              <span>{stats.totalBalance.toFixed(0)}</span>
              <Coins className="w-5 h-5 text-yellow-400" />
            </div>
            <div className="text-gray-400 text-sm">مجموع موجودی کاربران</div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="p-4 space-y-3">
        <Link
          href="/admin/users"
          className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>مدیریت کاربران</span>
              </div>
              <div className="text-gray-400 text-sm">مدیریت حساب‌ها، موجودی و وضعیت مسدودیت</div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/admin/games"
          className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Gamepad2 className="w-4 h-4 text-purple-400" />
                <span>تاریخچه و لاگ بازی‌ها</span>
              </div>
              <div className="text-gray-400 text-sm">مشاهده آمار دورها، ضرایب کرش و سود/زیان</div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </div>
        </Link>

        <Link
          href="/admin/settings"
          className="block bg-gray-800 hover:bg-gray-700 rounded-lg p-4 transition-colors border border-gray-700"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-gray-400" />
                <span>تنظیمات سیستم</span>
              </div>
              <div className="text-gray-400 text-sm">پیکربندی شانس‌های انفجار و ضرایب بازی</div>
            </div>
            <ChevronLeft className="w-5 h-5 text-gray-400" />
          </div>
        </Link>
      </div>
    </div>
  )
} 