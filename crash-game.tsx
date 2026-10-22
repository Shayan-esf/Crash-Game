"use client"

import BlockedUserScreen from "@/components/BlockedUserScreen"
import CrashGameArea from "@/components/crash/CrashGameArea"
import { Header } from "@/components/crash/Header"
import { useLobbySocket } from "@/hooks/useLobbySocket"
import { useStore } from "@/lib/store"
import { retrieveRawInitData } from "@telegram-apps/sdk"
import { useEffect, useState } from "react"

export default function GamePage() {
  const { user, balance, demoBalance, setBalance, setDemoBalance } = useStore()
  const [initData, setInitData] = useState<string>("")
  
  // دریافت initData جهت احراز هویت وب‌سوکت
  useEffect(() => {
    const initDataRaw = retrieveRawInitData()
    if (initDataRaw) {
      setInitData(initDataRaw)
    }
  }, [])

  // وب‌سوکت لابی
  const { connected, lobbyEvents, chatMessages, sessionHistory: wsSessionHistory, sendChat, sendBet, sendGameEvent } = useLobbySocket({ initData })

  // بررسی وضعیت مسدودیت کاربر
  if (user?.blocked) {
    return <BlockedUserScreen />
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Header 
        balance={balance} 
        demoBalance={demoBalance}
        connected={connected}
      />
      
      <main className="container mx-auto px-4 py-6">
        <CrashGameArea />
      </main>
    </div>
  )
}
