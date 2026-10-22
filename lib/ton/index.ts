import { startTonChecking } from "./server"
 
// اجرای بررسی فقط در سمت سرور
if (typeof window === "undefined") {
  startTonChecking()
} 