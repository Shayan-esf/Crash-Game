"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Ban, Phone } from "lucide-react"

export default function BlockedUserScreen() {
  const handleSupportClick = () => {
    // باز کردن ربات با دستور پشتیبانی
    const botUsername = process.env.NEXT_PUBLIC_BOT_USERNAME || "your_bot_username"
    window.open(`https://t.me/${botUsername}?start=support`, "_blank")
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gray-800 border-gray-700">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-600 rounded-full flex items-center justify-center mb-4">
            <Ban className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-white text-xl">حساب کاربری مسدود شده است</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            حساب کاربری شما به دلیل نقض قوانین مسدود شده است. در صورت نیاز به راهنمایی یا رفع مسدودیت، با پشتیبانی تماس بگیرید.
          </p>
          <Button
            onClick={handleSupportClick}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
          >
            <Phone className="w-4 h-4" />
            <span>ارتباط با پشتیبانی</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
} 