require('dotenv').config();

module.exports = {
  // WebSocket
  WS_PORT: 4001,
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Telegram
  BOT_TOKEN: process.env.BOT_TOKEN,
  ADMIN_BOT_TOKEN: process.env.ADMIN_BOT_TOKEN,
  
  // تنظیمات بازی
  BET_DURATION: 15000, // ۱۵ ثانیه زمان شرط‌بندی
  FLIGHT_DURATION: 20000, // ۲۰ ثانیه حداکثر مدت پرواز
  GAME_RESTART_DELAY: 3000, // ۳ ثانیه تاخیر بین بازی‌ها
  GAME_CHECK_INTERVAL: 5000, // ۵ ثانیه بررسی بازی‌های جدید

  // کانال‌ها
  LOBBY_CHANNEL: 'lobby-events',
  CHAT_CHANNEL: 'chat-events',

  // سیستم تصادفی بهینه‌شده ضرایب کرش
  // توزیع واقع‌گرایانه با غلبه ضرایب پایین
  DEFAULT_CRASH_CHANCES: [
    { range: [1.00, 1.10], chance: 0.15 }, // ۱۵٪ - خیلی پایین
    { range: [1.10, 1.25], chance: 0.25 }, // ۲۵٪ - پایین
    { range: [1.25, 1.50], chance: 0.20 }, // ۲۰٪ - متوسط متمایل به پایین
    { range: [1.50, 2.00], chance: 0.15 }, // ۱۵٪ - متوسط
    { range: [2.00, 3.00], chance: 0.10 }, // ۱۰٪ - متوسط متمایل به بالا
    { range: [3.00, 5.00], chance: 0.08 }, // ۸٪ - بالا
    { range: [5.00, 10.00], chance: 0.05 }, // ۵٪ - خیلی بالا
    { range: [10.00, 50.00], chance: 0.015 }, // ۱.۵٪ - فوق‌العاده بالا
    { range: [50.00, 100.00], chance: 0.005 }, // ۰.۵٪ - مگا کرش
  ],

  // تنظیمات کش
  CHANCES_CACHE_DURATION: 20000, // ۲۰ ثانیه زمان نگهداری کش شانس‌ها
}; 