# راه‌اندازی لابی با WebSocket و Redis

## معماری

سیستم لابی شامل بخش‌های زیر است:
- **سرور WebSocket** (`ws-server.js`) - ارتباط بلادرنگ (Real-time)
- **Redis** - سیستم Pub/Sub برای هماهنگی بین سرورها
- **Next.js API** - اندپوینت‌های REST برای مدیریت نشست‌ها
- **Frontend** - کامپوننت‌های React با اتصال WebSocket

## راه‌اندازی

### ۱. نصب وابستگی‌ها
```bash
npm install
# یا
pnpm install
```

### ۲. اجرا از طریق Docker Compose
```bash
docker-compose up -d
```

این دستور سرویس‌های زیر را اجرا می‌کند:
- PostgreSQL (پورت 5432)
- Redis (پورت 6379)
- سرور WebSocket (پورت 4000)
- برنامه Next.js (پورت 3000)

### ۳. راه‌اندازی دستی

#### Redis
```bash
# نصب Redis (در macOS)
brew install redis
redis-server

# یا از طریق Docker
docker run -d -p 6379:6379 redis:7
```

#### سرور WebSocket
```bash
node ws-server.js
```

#### برنامه Next.js
```bash
npm run dev
```

## متغیرهای محیطی (Environment Variables)

فایل `.env.local` را ایجاد کنید:
```env
# پایگاه داده
DATABASE_URL="postgres://postgres:postgres@localhost:5432/crashgame"

# Redis
REDIS_URL="redis://localhost:6379"

# WebSocket
NEXT_PUBLIC_WS_URL="ws://localhost:4001"

# تلگرام
TELEGRAM_BOT_TOKEN="your_bot_token"
TELEGRAM_ADMIN_BOT_TOKEN="your_admin_bot_token"
```

## اندپوینت‌های API

### لابی
- `GET /api/lobby/status` - وضعیت نشست فعلی
- `POST /api/lobby/start-session` - شروع نشست بازی
- `POST /api/lobby/end-session` - پایان نشست

### چت
- `GET /api/lobby/chat` - دریافت پیام‌ها
- `POST /api/lobby/chat` - ارسال پیام

## رویدادهای WebSocket

### کلاینت ← سرور
```json
// احراز هویت
{ "type": "auth", "initData": "..." }

// ثبت شرط
{ "type": "bet", "bet": 10 }

// پیام چت
{ "type": "chat-message", "message": "Hello!" }
```

### سرور ← کلاینت
```json
// شروع بازی
{ "type": "game-start", "crashPoint": 2.5, "duration": 8000 }

// کرش (انفجار)
{ "type": "game-crash", "crashPoint": 2.5 }

// پیام چت
{ "type": "chat-message", "userId": "123", "username": "Player", "message": "Hello!" }
```

## کامپوننت‌ها

### useLobbySocket
هوک اتصال به WebSocket لابی:
```typescript
const { connected, lobbyEvents, chatMessages, sendChat, sendBet } = useLobbySocket({ initData })
```

### PlayerList
کامپوننت نمایش لیست بازیکنان:
```typescript
<PlayerList players={players} currentMultiplier={multiplier} />
```

### GameTimer
کامپوننت تایمر تا شروع:
```typescript
<GameTimer timeUntilStart={30000} onTimeUp={handleStart} />
```

## مقیاس‌پذیری (Scaling)

برای محیط Production:
۱. استفاده از Redis Cluster
۲. اجرای چند سرور WebSocket
۳. تنظیم Load Balancer
۴. استفاده از Sticky Sessions برای WebSocket

## عیب‌یابی و لاگ‌ها

### لاگ‌های سرور WebSocket
```bash
node ws-server.js
```

### مانیتورینگ Redis
```bash
redis-cli monitor
```

### بررسی اتصالات
```bash
# اتصالات به Redis
redis-cli client list

# اتصالات به WebSocket
# لاگ‌های ws-server.js را بررسی کنید
```
