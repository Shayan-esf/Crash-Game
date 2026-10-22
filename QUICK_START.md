# 🚀 راهنمای راه‌اندازی سریع

## ۱. نصب وابستگی‌ها
```bash
npm install --legacy-peer-deps
```

## ۲. آماده‌سازی دیتابیس لوکال (SQLite)
```bash
npx prisma generate
npx prisma db push
```

## ۳. تنظیم فایل .env
فایل `.env` از قبل آماده است (نیازی به داکر، پستگرس یا ردیس نیست):
```env
DATABASE_URL="file:./dev.db"
REDIS_URL="memory"
NEXT_PUBLIC_WS_URL="ws://localhost:4001"
BOT_TOKEN="mock_token"
```

## ۴. اجرای سیستم

### ترمینال ۱: سرور WebSocket
```bash
npm run ws
```

### ترمینال ۲: برنامه Next.js
```bash
npm run dev
```

### ترمینال ۳ (اختیاری): ربات تلگرام
```bash
npm run bot
```

## ۵. بررسی عملکرد
- باز کردن http://localhost:3000
- سرور WebSocket روی ws://localhost:4001 فعال است
- ربات تلگرام به دستورات /start ، /balance ، /history و /stats پاسخ می‌دهد.

## 🔧 تغییرات اعمال‌شده

### سرور WebSocket (ws-server.js):
- ✅ اتصال به Prisma/PostgreSQL
- ✅ دریافت موجودی واقعی از دیتابیس
- ✅ ثبت تاریخچه بازی‌ها در دیتابیس
- ✅ تراکنش‌ها جهت یکپارچگی داده‌ها (Atomicity)
- ✅ احراز هویت از طریق تلگرام

### کلاینت:
- ✅ همگام‌سازی موجودی
- ✅ تاریخچه بازی‌ها
- ✅ بهبود تجربه کاربری (UX)
- ✅ مدیریت خطاها

### دیتابیس:
- ✅ مدل‌های User، Game، GameSession، Transaction
- ✅ روابط بین جداول
- ✅ آماده بودن مایگریشن‌ها

## 🎯 آماده استفاده!

سیستم کاملاً با دیتابیس یکپارچه شده و آماده به کار است.
