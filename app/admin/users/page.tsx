"use client"

import { useStore } from "@/lib/store"
import { Ban, ChevronRight, Coins, Users } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface User {
  telegram_id: number
  username: string
  balance: number
  created_at: string
  blocked: boolean
}

export default function UsersPage() {
  const { user } = useStore()
  const [authorized, setAuthorized] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

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
          return fetch(`/api/admin/users?telegram_id=${user.telegramId}`)
        }
        setLoading(false)
      })
      .then((usersRes) => usersRes?.json())
      .then((usersData) => {
        setUsers(usersData.users || [])
        setLoading(false)
      })
      .catch((error) => {
        console.error("Users error:", error)
        setLoading(false)
      })
  }, [user])

  const filteredUsers = users.filter(u => 
    u.telegram_id.toString().includes(searchTerm) ||
    u.username?.toLowerCase().includes(searchTerm.toLowerCase())
  )

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
            <Users className="w-5 h-5 text-blue-400" />
            <span>مدیریت کاربران</span>
          </h1>
        </div>
        <p className="text-gray-400 text-sm mt-1">مجموع کاربران: <span className="dir-ltr font-mono">{users.length}</span></p>
      </div>

      {/* Search */}
      <div className="p-4">
        <input
          type="text"
          placeholder="جستجو با شناسه عددی یا نام کاربری..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Users List */}
      <div className="px-4 pb-4 space-y-3">
        {filteredUsers.map((user) => (
          <Link
            key={user.telegram_id}
            href={`/admin/users/${user.telegram_id}`}
            className="block bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm sm:text-base">شناسه: <span className="dir-ltr font-mono">{user.telegram_id}</span></div>
              <div className={`text-base sm:text-lg font-bold font-mono dir-ltr flex items-center gap-1.5 ${user.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                <span>{user.balance.toFixed(0)}</span>
                <Coins className="w-4 h-4 text-yellow-400" />
              </div>
            </div>
            <div className="text-gray-400 text-sm dir-ltr text-right">
              @{user.username || 'بدون نام کاربری'}
            </div>
            <div className="text-gray-500 text-xs mt-1">
              تاریخ عضویت: <span className="dir-ltr font-mono">{new Date(user.created_at).toLocaleDateString('fa-IR')}</span>
            </div>
            {user.blocked && (
              <div className="text-red-400 text-xs mt-1 font-semibold flex items-center gap-1">
                <Ban className="w-3.5 h-3.5 text-red-400" />
                <span>کاربر مسدود شده</span>
              </div>
            )}
          </Link>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="p-8 text-center text-gray-400">
          {searchTerm ? 'کاربری با این مشخصات یافت نشد' : 'هنوز کاربری ثبت نشده است'}
        </div>
      )}
    </div>
  )
} 