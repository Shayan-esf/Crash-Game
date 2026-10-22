import { checkTonIncoming } from "./checkIncoming"

// بررسی تراکنش‌ها هر ۳۰ ثانیه
const CHECK_INTERVAL = 30 * 1000

let interval: NodeJS.Timeout | null = null

export function startTonChecking() {
  if (interval) return // در حال حاضر فعال است

  // بررسی فوری
  checkTonIncoming()

  // فعال‌سازی بازه زمانی دوره‌ای
  interval = setInterval(checkTonIncoming, CHECK_INTERVAL)
}

export function stopTonChecking() {
  if (interval) {
    clearInterval(interval)
    interval = null
  }
} 