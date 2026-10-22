"use client"

import Link from "next/link"

export default function WithdrawRequestsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg text-center max-w-md">
        <h1 className="text-xl font-bold mb-4">بخش برداشت غیرفعال است</h1>
        <p className="text-gray-400 mb-6">سیستم به اعتبار مجازی تبدیل شده و بخش درخواست‌های برداشت حذف گردیده است.</p>
        <Link href="/admin" className="px-4 py-2 bg-blue-600 rounded-lg text-white hover:bg-blue-700">
          بازگشت به پنل ادمین
        </Link>
      </div>
    </div>
  )
}
