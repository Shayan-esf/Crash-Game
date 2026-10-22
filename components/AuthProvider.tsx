"use client"

import BlockedUserScreen from "@/components/BlockedUserScreen"
import PhoneVerificationGuard from "@/components/PhoneVerificationGuard"
import { useStore } from "@/lib/store"
import { initTelegramViewport } from "@/lib/telegramHaptics"
import { init, retrieveRawInitData } from "@telegram-apps/sdk"
import { useEffect, useRef, useState } from "react"

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user } = useStore()
  const [isBlocked, setIsBlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const authAttemptedRef = useRef(false)

  useEffect(() => {
    console.log("[AuthProvider] useEffect triggered")
    if (typeof window === "undefined") return
    if (authAttemptedRef.current) return // جلوگیری از تلاش‌های چندگانه

    authAttemptedRef.current = true

    // هماهنگی ویوپورت تمام‌صفحه و رنگ هدر تلگرام
    initTelegramViewport()

    let initDataRaw: string | undefined = undefined
    try {
      init()
      initDataRaw = retrieveRawInitData()
    } catch (err) {
      console.warn("[AuthProvider] Launch outside Telegram, using dev mode:", err)
    }
    console.log("[AuthProvider] initDataRaw:", initDataRaw)

    // در صورت عدم وجود initData (مرورگر / لوکال‌هاست)، از حالت تستی استفاده می‌شود
    const authHeaderValue = initDataRaw ? `tma ${initDataRaw}` : "tma dev"

    const { setUser, setBalance } = useStore.getState()
    fetch("/api/auth/telegram", {
      method: "POST",
      headers: {
        Authorization: authHeaderValue,
        "Content-Type": "application/json"
      },
    })
      .then((res) => res.json())
      .then((data) => {
        console.log("Auth response:", data)
        if (data.success && data.user && data.user.telegramId) {
          setUser(data.user)
          setBalance(data.user.balance)

          // بررسی مسدودیت کاربر
          if (data.user.blocked) {
            setIsBlocked(true)
          }
        } else {
          alert("خطا در ورود به حساب تلگرام. لطفا اتصال اینترنت یا سرور را بررسی کنید.")
        }
        setIsLoading(false)
      })
      .catch((error) => {
        console.error("Auth error:", error)
        setIsLoading(false)
      })
  }, [])

  // در صورت مسدود بودن کاربر، صفحه مسدودیت نمایش داده می‌شود
  if (isBlocked) {
    return <BlockedUserScreen />
  }

  // در حالت بارگذاری، صفحه خالی رندر می‌شود
  if (isLoading) {
    return <div className="min-h-screen bg-gray-900" />
  }

  // در صورت عدم تایید شماره تماس، گیت تایید شماره نمایش داده می‌شود
  if (user && user.phoneVerified === false) {
    return <PhoneVerificationGuard />
  }

  return <>{children}</>
} 