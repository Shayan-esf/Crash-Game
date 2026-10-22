export function Stats({
  userHistory = [],
  sessionHistory = [],
}: {
  userHistory?: Array<{ multiplier: number; won: boolean; timestamp: number }>
  sessionHistory?: Array<{ multiplier: number; timestamp: number }>
}) {
  // ۵ بازی اخیر کاربر
  const recentUserGames = userHistory.slice(-5)

  // ۱۵ ضریب اخیر دورها
  const recentSessionMultipliers = sessionHistory.slice(-15)

  return (
    <div className="space-y-3 pt-2 w-full">
      {/* تاریخچه بازی‌های کاربر */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2">بازی‌های اخیر من</div>
        <div className="flex gap-1 overflow-x-auto">
          {recentUserGames.length > 0 ? (
            recentUserGames.map((game, index) => (
              <div
                key={index}
                className={`flex-shrink-0 px-2 py-1 rounded text-xs font-bold font-mono dir-ltr ${
                  game.won
                    ? 'bg-green-600 text-white'
                    : 'bg-red-600 text-white'
                }`}
              >
                {game.multiplier.toFixed(2)}x
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500">هنوز بازی انجام نشده است</div>
          )}
      </div>
      </div>

      {/* تاریخچه ضرایب راندهای بازی */}
      <div className="bg-gray-800 rounded-lg p-3">
        <div className="text-xs text-gray-400 mb-2">تاریخچه ضرایب راندها</div>
        <div className="flex gap-1 overflow-x-auto">
          {recentSessionMultipliers.length > 0 ? (
            recentSessionMultipliers.map((game, index) => (
              <div
                key={index}
                className="flex-shrink-0 px-2 py-1 rounded text-xs font-bold bg-gray-700 text-white font-mono dir-ltr"
              >
                {game.multiplier.toFixed(2)}x
              </div>
            ))
          ) : (
            <div className="text-xs text-gray-500">داده‌ای ثبت نشده است</div>
          )}
        </div>
      </div>
    </div>
  )
} 