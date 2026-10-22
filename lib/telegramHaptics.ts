'use client';

import {
  playCashoutSound,
  playCountdownTick,
  playCrashSound,
  playReactionSound,
} from '@/lib/soundEffects';

/**
 * مدیریت هپتیک فیدبک (Haptic Feedback) و تله‌متری نیتیو تلگرام با فال‌بک
 */
export function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection'
) {
  if (typeof window === 'undefined') return;
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.HapticFeedback) {
      if (type === 'light' || type === 'medium' || type === 'heavy') {
        tg.HapticFeedback.impactOccurred(type);
      } else if (type === 'selection') {
        tg.HapticFeedback.selectionChanged();
      } else {
        tg.HapticFeedback.notificationOccurred(type);
      }
      return;
    }

    // مرورگر استاندارد بدون تلگرام: استفاده از Navigator Vibrate API
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      if (type === 'light' || type === 'selection') {
        navigator.vibrate(15);
      } else if (type === 'medium') {
        navigator.vibrate(35);
      } else if (type === 'heavy' || type === 'error') {
        navigator.vibrate([60, 30, 80]);
      } else if (type === 'success') {
        navigator.vibrate([30, 40, 50]);
      }
    }
  } catch {
    // در محیط توسعه بدون خطا رد می‌شود
  }
}

/**
 * هپتیک و صدای شمارش معکوس:
 * لرزش خفیف impactOccurred('light') در هر ثانیه شمارش معکوس
 */
export function triggerHapticCountdown(secondsLeft: number) {
  triggerHaptic(secondsLeft <= 3 ? 'medium' : 'light');
  playCountdownTick(secondsLeft);
}

/**
 * هپتیک و صدای انفجار:
 * لرزش شدید notificationOccurred('error') لحظه انفجار موشک
 */
export function triggerHapticCrash() {
  triggerHaptic('error');
  playCrashSound();
}

/**
 * هپتیک و صدای کش‌اوت:
 * لرزش موفقیت notificationOccurred('success') هنگام کش‌اوت
 */
export function triggerHapticCashout() {
  triggerHaptic('success');
  playCashoutSound();
}

/**
 * هپتیک و صدای ری‌اکشن سریع خلبان
 */
export function triggerHapticReaction() {
  triggerHaptic('light');
  playReactionSound();
}

/**
 * مقداردهی و تثبیت تمام صفحه بودن Mini App در تلگرام
 */
export function initTelegramViewport() {
  if (typeof window === 'undefined') return;
  try {
    const tg = (window as any).Telegram?.WebApp;
    if (!tg) return;

    tg.ready();
    tg.expand();
    if (typeof tg.setHeaderColor === 'function') {
      tg.setHeaderColor('#181a20');
    }
    if (typeof tg.setBackgroundColor === 'function') {
      tg.setBackgroundColor('#121316');
    }
    if (typeof tg.enableClosingConfirmation === 'function') {
      tg.enableClosingConfirmation();
    }
  } catch (err) {
    console.warn('[Telegram] Viewport init warning:', err);
  }
}

/**
 * اشتراک‌گذاری رکورد در تلگرام (Telegram Viral Sharing)
 */
export function shareScoreToTelegram(multiplier: number, profit: number) {
  if (typeof window === 'undefined') return;
  const text = encodeURIComponent(
    `🚀 من در بازی انفجار کیهانی تلگرام به ضریب ${multiplier.toFixed(2)}x رسیدم و +${profit.toFixed(0)} سکه برنده شدم! بیا با هم بازی کنیم:`
  );
  const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${text}`;

  const tg = (window as any).Telegram?.WebApp;
  if (tg?.openTelegramLink) {
    tg.openTelegramLink(shareUrl);
  } else {
    window.open(shareUrl, '_blank');
  }
}
