import { Input } from "@/components/ui/input"
import { AlertTriangle, Coins, CreditCard, Gem, Star, X } from "lucide-react"
import { useState } from "react"
import { GameButton } from "../game-button"

export function BalanceModal({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  withdrawAmount,
  setWithdrawAmount,
  withdrawAddress,
  setWithdrawAddress,
  onWithdraw,
  onWithdrawImba,
  balance,
  copyToClipboard,
  onBuyImbaCoin,
}: {
  isOpen: boolean
  onClose: () => void
  activeTab: "deposit" | "withdraw"
  setActiveTab: (tab: "deposit" | "withdraw") => void
  withdrawAmount: string
  setWithdrawAmount: (v: string) => void
  withdrawAddress: string
  setWithdrawAddress: (v: string) => void
  onWithdraw: () => void
  onWithdrawImba?: () => void
  balance: number
  copyToClipboard: (text: string) => void
  onBuyImbaCoin: (amount: number) => void
}) {
  const [starsAmount, setStarsAmount] = useState(50)
  const [withdrawMethod, setWithdrawMethod] = useState<'ton' | 'stars'>('stars')
  const [withdrawUsername, setWithdrawUsername] = useState('')
  
  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl w-full max-w-md border border-gray-700 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-yellow-400" />
            <span>مدیریت موجودی</span>
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {/* Tabs */}
        <div className="flex border-b border-gray-700">
          <button
            onClick={() => setActiveTab("deposit")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${activeTab === "deposit" ? "bg-green-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700/50"}`}
          >
            افزایش موجودی (واریز)
          </button>
          <button
            onClick={() => setActiveTab("withdraw")}
            className={`flex-1 py-3 px-4 text-center font-medium transition-colors ${activeTab === "withdraw" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-700/50"}`}
          >
            برداشت وجه
          </button>
        </div>
        {/* Tab Content */}
        <div className="p-4">
          {activeTab === "deposit" ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-2">افزایش موجودی از طریق تلگرام استارز (Stars)</label>
                <Input
                  type="number"
                  min={50}
                  value={starsAmount}
                  onChange={e => setStarsAmount(Number(e.target.value))}
                  className="bg-gray-700 border-gray-600 text-white mb-2 font-mono dir-ltr"
                  placeholder="تعداد Stars (حداقل ۵۰)"
                />
                <GameButton
                  className="w-full mt-2"
                  onClick={() => onBuyImbaCoin(starsAmount)}
                  disabled={starsAmount < 50}
                >
                  خرید {starsAmount} سکه با {starsAmount} استارز
                </GameButton>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-gray-700/60 rounded-lg p-3 mb-4 border border-gray-600">
                <div className="text-xs text-gray-400">موجودی قابل برداشت</div>
                <div className="text-lg font-bold text-yellow-400 flex items-center gap-1 mt-0.5">
                  <Coins className="w-4 h-4 text-yellow-400" />
                  <span className="font-mono dir-ltr">{balance.toFixed(0)}</span>
                  <span className="text-xs font-normal text-yellow-200">سکه</span>
                </div>
              </div>

              {/* Withdraw Method Selection */}
              <div>
                <label className="block text-sm text-gray-300 mb-2">روش برداشت</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setWithdrawMethod('stars')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      withdrawMethod === 'stars'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                    <span>Telegram Stars</span>
                  </button>
                  <button
                    onClick={() => setWithdrawMethod('ton')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                      withdrawMethod === 'ton'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    <Gem className="w-3.5 h-3.5 text-cyan-400" />
                    <span>TON Wallet</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">
                  مبلغ برداشت (سکه) {withdrawMethod === 'stars' && '(۵۰ تا ۱۰,۰۰۰)'}
                </label>
                <Input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="مبلغ را وارد کنید"
                  className="bg-gray-700 border-gray-600 text-white font-mono dir-ltr"
                  min={withdrawMethod === 'stars' ? 50 : 1}
                  max={withdrawMethod === 'stars' ? 10000 : balance}
                />
              </div>

              {withdrawMethod === 'stars' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">نام کاربری تلگرام شما</label>
                  <Input
                    type="text"
                    value={withdrawUsername}
                    onChange={(e) => setWithdrawUsername(e.target.value)}
                    placeholder="@your_username"
                    className="bg-gray-700 border-gray-600 text-white dir-ltr text-right"
                  />
                  <div className="text-xs text-gray-400 mt-1">
                    نام کاربری تلگرام خود را جهت واریز استارز وارد کنید
                  </div>
                </div>
              )}

              {withdrawMethod === 'ton' && (
                <div>
                  <label className="block text-sm text-gray-300 mb-2">آدرس کیف‌پول TON</label>
                  <Input
                    type="text"
                    value={withdrawAddress}
                    onChange={(e) => setWithdrawAddress(e.target.value)}
                    placeholder="آدرس کیف‌پول TON را وارد کنید"
                    className="bg-gray-700 border-gray-600 text-white font-mono dir-ltr"
                  />
                </div>
              )}

              {withdrawMethod === 'stars' && (
                <div className="bg-blue-950/60 border border-blue-500/40 rounded-lg p-3">
                  <div className="text-xs text-blue-200 leading-relaxed">
                    <span className="flex items-center gap-1.5 font-bold mb-1 text-yellow-300">
                      <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                      <span>شرایط برداشت از طریق Telegram Stars:</span>
                    </span>
                    • حداقل برداشت: ۵۰ سکه<br/>
                    • حداکثر برداشت: ۱۰,۰۰۰ سکه<br/>
                    • کارمزد: ۱۰٪<br/>
                    • نیازمند تأیید شماره موبایل<br/>
                    • پردازش دستی توسط تیم مدیریت
                  </div>
                </div>
              )}

              {withdrawMethod === 'ton' && (
                <div className="bg-yellow-950/60 border border-yellow-500/40 rounded-lg p-3">
                  <div className="text-xs text-yellow-200 leading-relaxed flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                    <span>پردازش برداشت TON ممکن است تا ۲۴ ساعت زمان ببرد.</span>
                  </div>
                </div>
              )}

              <GameButton
                className="w-full mt-2"
                onClick={withdrawMethod === 'stars' ? onWithdrawImba : onWithdraw}
                disabled={!withdrawAmount || (withdrawMethod === 'ton' && !withdrawAddress) || (withdrawMethod === 'stars' && !withdrawUsername)}
              >
                {withdrawMethod === 'stars' ? 'ثبت درخواست برداشت Stars' : 'ثبت درخواست برداشت TON'}
              </GameButton>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 