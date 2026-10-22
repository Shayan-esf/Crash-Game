"use client"

import { useStore } from "@/lib/store"
import { Ban, ChevronRight, Coins, Gamepad2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"

interface Game {
  id: string
  telegram_id: number
  bet: number
  crash_point: number
  cashout: number | null
  profit: number
  status: "crashed" | "cashed_out"
  time: number
}

export default function GamesPage() {
  const { user } = useStore()
  const [authorized, setAuthorized] = useState(false)
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)

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
          loadGames()
        } else {
          setLoading(false)
        }
      })
      .catch((error) => {
        console.error("Games error:", error)
        setLoading(false)
      })
  }, [user])

  const loadGames = (pageNum = 1) => {
    fetch(`/api/admin/games?telegram_id=${user?.telegramId}&page=${pageNum}&limit=20`)
      .then((res) => res.json())
      .then((data) => {
        if (pageNum === 1) {
          setGames(data.logs || [])
        } else {
          setGames(prev => [...prev, ...(data.logs || [])])
        }
        setHasMore((data.logs || []).length === 20)
        setLoading(false)
      })
      .catch((error) => {
        console.error("Load games error:", error)
        setLoading(false)
      })
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadGames(nextPage)
  }

  const filteredGames = games.filter(g => 
    g.telegram_id.toString().includes(searchTerm)
  )

  if (loading && games.length === 0) {
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
            <Gamepad2 className="w-5 h-5 text-purple-400" />
            <span>تاریخچه و لاگ بازی‌ها</span>
          </h1>
        </div>
        <p className="text-gray-400 text-sm mt-1">تعداد موارد بارگذاری شده: <span className="dir-ltr font-mono">{games.length}</span></p>
      </div>

      {/* Search */}
      <div className="p-4">
        <input
          type="text"
          placeholder="جستجو بر اساس شناسه عددی تلگرام..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
        />
      </div>

      {/* Games List */}
      <div className="px-4 pb-4 space-y-3">
        {filteredGames.map((game) => (
          <div key={game.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold text-sm">شناسه کاربر: <span className="dir-ltr font-mono">{game.telegram_id}</span></div>
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
                <div className="font-semibold font-mono dir-ltr text-yellow-400">{game.crash_point.toFixed(2)}x</div>
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
              {new Date(game.time).toLocaleString('fa-IR')}
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="p-4">
          <button
            onClick={loadMore}
            disabled={loading}
            className="w-full py-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg transition-colors font-semibold border border-gray-700"
          >
            {loading ? 'در حال بارگذاری...' : 'بارگذاری بازی‌های بیشتر'}
          </button>
        </div>
      )}

      {filteredGames.length === 0 && (
        <div className="p-8 text-center text-gray-400">
          {searchTerm ? 'بازی با این شناسه یافت نشد' : 'هنوز بازی ثبت نشده است'}
        </div>
      )}
    </div>
  )
} 