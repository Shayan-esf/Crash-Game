"use client"

import { useStore } from "@/lib/store"
import { Ban, BarChart3, Check, ChevronRight, Coins, Gamepad2, Trash2, User, Wallet } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"

interface UserDetails {
  id: string
  telegramId: string
  username: string
  avatarUrl: string
  balance: number
  phone: string
  phoneVerified: boolean
  blocked: boolean
  createdAt: string
  updatedAt: string
}

interface UserGame {
  id: string
  bet: number
  crashPoint: number
  cashout: number | null
  profit: number
  status: string
  createdAt: string
}

export default function UserDetailsPage() {
  const { user } = useStore()
  const params = useParams()
  const userId = params.id as string

  const [authorized, setAuthorized] = useState(false)
  const [userDetails, setUserDetails] = useState<UserDetails | null>(null)
  const [games, setGames] = useState<UserGame[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'games'>('overview')
  
  // وضعیت مدیریت موجودی
  const [showBalanceModal, setShowBalanceModal] = useState(false)
  const [balanceAction, setBalanceAction] = useState<'set' | 'add' | 'subtract'>('add')
  const [balanceAmount, setBalanceAmount] = useState('')
  const [balanceProcessing, setBalanceProcessing] = useState(false)

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
          loadUserData()
        } else {
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error("User details error:", error)
        setLoading(false)
      })
  }, [user, userId])

  const loadUserData = () => {
    Promise.all([
      fetch(`/api/admin/users/${userId}?telegram_id=${user?.telegramId}`).then(res => res.json()),
      fetch(`/api/admin/users/${userId}/games?telegram_id=${user?.telegramId}`).then(res => res.json())
    ])
    .then(([userData, gamesData]) => {
      setUserDetails(userData.user)
      setGames(gamesData.games || [])
      setLoading(false)
    })
    .catch((error) => {
      console.error("Load user data error:", error)
      setLoading(false)
    })
  }

  const handleBlockUser = async () => {
    if (!userDetails) return
    
    setProcessing('block')
    try {
      const res = await fetch("/api/admin/users/block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: userDetails.id,
          blocked: !userDetails.blocked,
          admin_id: user?.telegramId 
        }),
      })

      const data = await res.json()
      if (data.success) {
        setUserDetails(prev => prev ? { ...prev, blocked: !prev.blocked } : null)
      } else {
        alert("خطا: " + data.error)
      }
    } catch (error) {
      console.error("Block user error:", error)
      alert("خطا در اجرای عملیات مسدودسازی")
    } finally {
      setProcessing(null)
    }
  }

  const handleDeleteUser = async () => {
    if (!userDetails) return

    if (!confirm(`آیا از حذف کاربر ${userDetails.username || userDetails.telegramId} اطمینان دارید؟ این عملیات غیرقابل بازگشت است!`)) {
      return
    }

    setProcessing('delete')
    try {
      const res = await fetch("/api/admin/users/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userDetails.id,
          admin_id: user?.telegramId
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert("کاربر با موفقیت حذف شد")
        window.location.href = "/admin/users"
      } else {
        alert("خطا: " + data.error)
      }
    } catch (error) {
      console.error("Delete user error:", error)
      alert("خطا در حذف کاربر")
    } finally {
      setProcessing(null)
    }
  }

  const handleBalanceAction = async () => {
    if (!userDetails || !user?.telegramId) return

    const amount = parseFloat(balanceAmount)
    if (isNaN(amount) || amount < 0 || amount > 999999999) {
      alert("مبلغ باید بین ۰ تا ۹۹۹,۹۹۹,۹۹۹ باشد")
      return
    }

    if (balanceAction === 'subtract' && amount > userDetails.balance) {
      alert("موجودی کاربر برای کسر کافی نیست")
      return
    }

    const actionText = balanceAction === 'set' ? 'تنظیم دقیق' : balanceAction === 'add' ? 'افزایش' : 'کسر'
    if (!confirm(`تأیید عملیات: ${actionText} ${amount} سکه برای کاربر ${userDetails.username || userDetails.telegramId}؟`)) {
      return
    }

    setBalanceProcessing(true)
    try {
      const res = await fetch("/api/admin/users/balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userDetails.id,
          action: balanceAction,
          amount: amount,
          admin_id: user.telegramId
        }),
      })

      const data = await res.json()
      if (data.success) {
        alert(`${data.message || 'عملیات با موفقیت انجام شد'}`)
        setUserDetails(prev => prev ? { ...prev, balance: data.newBalance } : null)
        setShowBalanceModal(false)
        setBalanceAmount('')
      } else {
        alert("خطا: " + data.error)
      }
    } catch (error) {
      console.error("Balance action error:", error)
      alert("خطا در انجام تراکنش موجودی")
    } finally {
      setBalanceProcessing(false)
    }
  }

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

  if (!userDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl p-6 bg-gray-800 rounded-lg shadow-lg">
          کاربر مورد نظر یافت نشد
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/users" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
            <ChevronRight className="w-4 h-4" />
            <span>بازگشت به لیست کاربران</span>
          </Link>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <User className="w-5 h-5 text-gray-400" />
            <span>جزئیات کاربر</span>
          </h1>
        </div>
        <p className="text-gray-400 text-sm mt-1 dir-ltr text-right">
          {userDetails.username ? `@${userDetails.username}` : `شناسه: ${userDetails.telegramId}`}
        </p>
      </div>

      {/* User Info */}
      <div className="p-4">
        <div className="bg-gray-800 rounded-lg p-4 mb-4 border border-gray-700">
          <div className="flex items-center gap-4 mb-4">
            {userDetails.avatarUrl && (
              <img
                src={userDetails.avatarUrl}
                alt="Avatar"
                className="w-16 h-16 rounded-full"
              />
            )}
            <div>
              <h2 className="text-xl font-bold dir-ltr text-right">
                {userDetails.username ? `@${userDetails.username}` : `ID: ${userDetails.telegramId}`}
              </h2>
              <div className="text-gray-400 text-sm">
                شناسه تلگرام: <span className="dir-ltr font-mono">{userDetails.telegramId}</span>
              </div>
              {userDetails.blocked && (
                <div className="text-red-400 text-sm font-semibold flex items-center gap-1 mt-0.5">
                  <Ban className="w-3.5 h-3.5 text-red-400" />
                  <span>کاربر مسدود شده</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-400">موجودی سکه</div>
              <div className="text-xl font-bold text-yellow-400 flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-yellow-400" />
                <span className="dir-ltr font-mono">{userDetails.balance.toFixed(0)}</span>
                <span className="text-xs font-normal text-yellow-200">سکه</span>
              </div>
            </div>
            <div>
              <div className="text-gray-400">شماره موبایل</div>
              <div className="font-mono text-xs dir-ltr">
                {userDetails.phoneVerified ? userDetails.phone : 'ثبت نشده'}
              </div>
            </div>
            <div>
              <div className="text-gray-400">تاریخ عضویت</div>
              <div className="text-sm font-mono dir-ltr">
                {new Date(userDetails.createdAt).toLocaleDateString('fa-IR')}
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <button
            onClick={() => setShowBalanceModal(true)}
            className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            <span>مدیریت موجودی</span>
          </button>

          <button
            onClick={handleBlockUser}
            disabled={processing === 'block'}
            className={`flex-1 py-3 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2 ${
              userDetails.blocked
                ? 'bg-green-600 hover:bg-green-700 disabled:opacity-50'
                : 'bg-amber-600 hover:bg-amber-700 disabled:opacity-50'
            }`}
          >
            {processing === 'block' ? (
              <span>در حال پردازش...</span>
            ) : userDetails.blocked ? (
              <>
                <Check className="w-4 h-4" />
                <span>رفع مسدودیت</span>
              </>
            ) : (
              <>
                <Ban className="w-4 h-4" />
                <span>مسدودسازی کاربر</span>
              </>
            )}
          </button>

          <button
            onClick={handleDeleteUser}
            disabled={processing === 'delete'}
            className="flex-1 py-3 bg-red-800 hover:bg-red-900 disabled:opacity-50 rounded-lg transition-colors font-semibold flex items-center justify-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>{processing === 'delete' ? 'در حال حذف...' : 'حذف کاربر'}</span>
          </button>
        </div>

        {/* Balance Modal */}
        {showBalanceModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-yellow-400" />
                <span>مدیریت موجودی کاربر</span>
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">نوع عملیات</label>
                  <select
                    value={balanceAction}
                    onChange={(e) => setBalanceAction(e.target.value as any)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="add">افزایش موجودی (+)</option>
                    <option value="subtract">کسر از موجودی (-)</option>
                    <option value="set">تنظیم مقدار دقیق (=)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">مبلغ سکه (۰ تا ۹۹۹,۹۹۹,۹۹۹)</label>
                  <input
                    type="number"
                    value={balanceAmount}
                    onChange={(e) => setBalanceAmount(e.target.value)}
                    min="0"
                    max="999999999"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white font-mono dir-ltr"
                    placeholder="مبلغ را وارد کنید"
                  />
                </div>

                <div className="text-sm text-gray-400 flex items-center gap-1.5">
                  <span>موجودی فعلی:</span>
                  <span className="dir-ltr font-mono text-yellow-400 flex items-center gap-1">
                    <span>{userDetails.balance.toFixed(0)}</span>
                    <Coins className="w-3.5 h-3.5 text-yellow-400" />
                  </span>
                  <span>سکه</span>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleBalanceAction}
                  disabled={balanceProcessing || !balanceAmount}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg font-semibold transition-colors"
                >
                  {balanceProcessing ? 'در حال انجام...' : 'تأیید و اعمال'}
                </button>
                <button
                  onClick={() => {
                    setShowBalanceModal(false)
                    setBalanceAmount('')
                  }}
                  className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1 border border-gray-700">
          {[
            { id: 'overview', label: 'آمار کلی', icon: BarChart3, count: null },
            { id: 'games', label: 'تاریخچه بازی‌ها', icon: Gamepad2, count: games.length }
          ].map((tab) => {
            const TabIcon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== null && <span className="dir-ltr font-mono">({tab.count})</span>}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-3">
          {activeTab === 'overview' && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-400" />
                <span>خلاصه آمار</span>
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-400 font-mono dir-ltr">{games.length}</div>
                  <div className="text-gray-400 text-sm mt-1">تعداد بازی‌ها</div>
                </div>
                <div className="text-center p-3 bg-gray-700/50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-400 font-mono dir-ltr flex items-center justify-center gap-1.5">
                    <span>{games.reduce((sum, g) => sum + g.profit, 0).toFixed(0)}</span>
                    <Coins className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div className="text-gray-400 text-sm mt-1">مجموع سود/زیان (سکه)</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'games' && (
            <div className="space-y-3">
              {games.map((game) => (
                <div key={game.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-semibold text-sm">دور بازی <span className="font-mono dir-ltr">#{game.id}</span></div>
                    <div className={`text-xs px-2.5 py-1 rounded-full font-bold ${
                      game.status === 'cashed_out' ? 'bg-green-600/80 text-green-100' : 'bg-red-600/80 text-red-100'
                    }`}>
                      {game.status === 'cashed_out' ? 'برد' : 'باخت'}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm pt-2 border-t border-gray-700/60">
                    <div>
                      <div className="text-gray-400 text-xs">مبلغ شرط</div>
                      <div className="font-semibold font-mono dir-ltr flex items-center gap-1">
                        <span>{game.bet.toFixed(0)}</span>
                        <Coins className="w-3.5 h-3.5 text-yellow-400" />
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">ضریب انفجار</div>
                      <div className="font-semibold font-mono dir-ltr text-yellow-400">{game.crashPoint.toFixed(2)}x</div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">برداشت سود</div>
                      <div className="font-semibold font-mono dir-ltr">
                        {game.cashout ? `${game.cashout.toFixed(2)}x` : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 text-xs">سود/زیان</div>
                      <div className={`font-semibold font-mono dir-ltr flex items-center gap-1 ${game.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <span>{game.profit >= 0 ? '+' : ''}{game.profit.toFixed(0)}</span>
                        <Coins className="w-3.5 h-3.5 text-yellow-400" />
                      </div>
                    </div>
                  </div>

                  <div className="text-gray-500 text-xs mt-3 font-mono dir-ltr">
                    {new Date(game.createdAt).toLocaleString('fa-IR')}
                  </div>
                </div>
              ))}

              {games.length === 0 && (
                <div className="text-center text-gray-400 py-8">
                  هنوز بازی ثبت نشده است
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 