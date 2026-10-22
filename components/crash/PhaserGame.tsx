'use client';

import { useStore } from '@/lib/store';
import {
  playLaunchSound,
  playThemeFlightSound,
  playUpgradeSound,
} from '@/lib/soundEffects';
import { triggerHaptic, triggerHapticCountdown, triggerHapticCrash } from '@/lib/telegramHaptics';
import { memo, useEffect, useRef } from 'react';

export type CrashTheme = 'rocket' | 'racing' | 'chart';

export interface PhaserGameProps {
  phase: 'betting' | 'flying' | 'crashed';
  startTime: number;
  crashPoint: number;
  crashTime: number;
  duration: number;
  betEndTime: number;
  width?: number;
  height?: number;
  userBet?: number | null;
  userCashout?: number | null;
  sessionId: string;
  targetMultiplier?: number | null;
  theme?: CrashTheme;
  betTier?: number;
  betAmount?: number;
  upgradePulse?: { tier: number; id: number };
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  color: string;
  twinkleOffset: number;
  twinkleSpeed: number;
  hasSpikes: boolean;
}

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

interface WarpLine {
  x: number;
  y: number;
  length: number;
  speed: number;
  alpha: number;
}

interface Debris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rot: number;
  vRot: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  shape: 'chunk' | 'shingle' | 'circle';
}

interface Confetti {
  x: number;
  y: number;
  vx: number;
  vy: number;
  sizeW: number;
  sizeH: number;
  rot: number;
  vRot: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

interface SmokePuff {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  life: number;
  maxLife: number;
  color: string;
}

interface SkidMark {
  leftX: number;
  rightX: number;
  startY: number;
  endY: number;
  alpha: number;
}

interface Shockwave {
  x: number;
  y: number;
  tier: number;
  startTime: number;
  duration: number;
  maxRadius: number;
  sparks: {
    angle: number;
    speed: number;
    length: number;
    dist: number;
  }[];
}

function drawRoadBarrier(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  isBroken: boolean,
  animTime: number
) {
  ctx.save();
  ctx.translate(x, y);

  // سایه مانع روی آسفالت
  ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
  ctx.beginPath();
  ctx.ellipse(0, h * 0.45, w * 0.55, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  // بدنه مانع بتنی جاده‌ای (Jersey Barrier)
  const bGrad = ctx.createLinearGradient(0, -h * 0.5, 0, h * 0.5);
  bGrad.addColorStop(0, '#64748b');
  bGrad.addColorStop(0.5, '#475569');
  bGrad.addColorStop(1, '#1e293b');
  ctx.fillStyle = bGrad;
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo(-w * 0.42, -h * 0.5);
  ctx.lineTo(w * 0.42, -h * 0.5);
  ctx.lineTo(w * 0.5, h * 0.45);
  ctx.lineTo(-w * 0.5, h * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // نوارهای شبرنگ مورب خطر (Chevron Hazard Stripes)
  ctx.save();
  ctx.clip();
  const stripeW = 8;
  for (let sx = -w; sx < w; sx += stripeW * 2) {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(sx, -h);
    ctx.lineTo(sx + stripeW, -h);
    ctx.lineTo(sx - stripeW * 0.5, h);
    ctx.lineTo(sx - stripeW * 1.5, h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // چراغ‌های هشدار چشمک‌زن بالای مانع
  const strobe = Math.sin(animTime * 0.015) > 0;
  const beaconColor = isBroken ? (strobe ? '#ef4444' : '#7f1d1d') : (strobe ? '#f59e0b' : '#78350f');

  ctx.save();
  ctx.fillStyle = beaconColor;
  ctx.shadowColor = strobe ? (isBroken ? '#ef4444' : '#f59e0b') : 'transparent';
  ctx.shadowBlur = strobe ? 10 : 0;
  ctx.beginPath();
  ctx.arc(-w * 0.35, -h * 0.5 - 3, 3, 0, Math.PI * 2);
  ctx.arc(w * 0.35, -h * 0.5 - 3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // ترک‌های شدید ناشی از برخورد خودرو
  if (isBroken) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(0, h * 0.45);
    ctx.lineTo(-4, 0);
    ctx.lineTo(4, -h * 0.3);
    ctx.lineTo(-2, -h * 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

function drawSpaceAsteroid(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  isBroken: boolean,
  animTime: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(animTime * 0.001);

  const rGrad = ctx.createRadialGradient(-radius * 0.3, -radius * 0.3, radius * 0.1, 0, 0, radius);
  rGrad.addColorStop(0, '#78716c');
  rGrad.addColorStop(0.6, '#44403c');
  rGrad.addColorStop(1, '#1c1917');
  ctx.fillStyle = rGrad;
  ctx.strokeStyle = isBroken ? '#ef4444' : '#a8a29e';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  const vertices = 8;
  for (let v = 0; v < vertices; v++) {
    const angle = (v / vertices) * Math.PI * 2;
    const rOffset = ((v * 13) % 7) - 3;
    const r = radius + rOffset;
    const vx = Math.cos(angle) * r;
    const vy = Math.sin(angle) * r;
    if (v === 0) ctx.moveTo(vx, vy);
    else ctx.lineTo(vx, vy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  if (isBroken) {
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.5, 0);
    ctx.lineTo(0, 0);
    ctx.lineTo(radius * 0.4, -radius * 0.3);
    ctx.moveTo(0, 0);
    ctx.lineTo(radius * 0.2, radius * 0.5);
    ctx.stroke();
  }

  ctx.restore();
}

const SKIN_CONFIGS: Record<
  string,
  {
    name: string;
    flameColors: [string, string, string];
    auraColor: string;
    auraBlur: number;
    hullColor: string;
    accentColor: string;
    particleColors: string[];
  }
> = {
  default: {
    name: 'موشک استاندارد',
    flameColors: ['#ffffff', '#facc15', 'rgba(239, 68, 68, 0)'],
    auraColor: 'rgba(250, 204, 21, 0.25)',
    auraBlur: 10,
    hullColor: '#f1f5f9',
    accentColor: '#ef4444',
    particleColors: ['#facc15', '#f97316', '#fb923c'],
  },
  phoenix: {
    name: 'ققنوس آتشین',
    flameColors: ['#fff7ed', '#ff4500', 'rgba(220, 38, 38, 0)'],
    auraColor: 'rgba(239, 68, 68, 0.65)',
    auraBlur: 24,
    hullColor: '#450a0a',
    accentColor: '#f97316',
    particleColors: ['#ef4444', '#f97316', '#fbbf24', '#ffedd5'],
  },
  cyberpunk: {
    name: 'سایبرپانک نئونی',
    flameColors: ['#fdf4ff', '#06b6d4', 'rgba(217, 70, 239, 0)'],
    auraColor: 'rgba(6, 182, 212, 0.7)',
    auraBlur: 26,
    hullColor: '#0f172a',
    accentColor: '#06b6d4',
    particleColors: ['#06b6d4', '#d946ef', '#38bdf8', '#a855f7'],
  },
  golden: {
    name: 'طلایی کیهانی',
    flameColors: ['#ffffff', '#fbbf24', 'rgba(217, 119, 6, 0)'],
    auraColor: 'rgba(245, 158, 11, 0.65)',
    auraBlur: 28,
    hullColor: '#78350f',
    accentColor: '#fbbf24',
    particleColors: ['#fef08a', '#fbbf24', '#f59e0b', '#ffffff'],
  },
};

function drawCheckeredFlags(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);

  // Left Flag (angled left)
  ctx.save();
  ctx.rotate(-0.35);
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.7);
  ctx.lineTo(0, -size * 0.6);
  ctx.stroke();

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(0, -size * 0.6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  const fw = size * 0.65;
  const fh = size * 0.45;
  const cellW = fw / 4;
  const cellH = fh / 3;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#ffffff' : '#09090b';
      ctx.fillRect(-fw + c * cellW, -size * 0.55 + r * cellH, cellW, cellH);
    }
  }
  ctx.restore();

  // Right Flag (angled right)
  ctx.save();
  ctx.rotate(0.35);
  ctx.strokeStyle = '#d4d4d8';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.7);
  ctx.lineTo(0, -size * 0.6);
  ctx.stroke();

  ctx.fillStyle = '#facc15';
  ctx.beginPath();
  ctx.arc(0, -size * 0.6, 2.5, 0, Math.PI * 2);
  ctx.fill();

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#09090b' : '#ffffff';
      ctx.fillRect(c * cellW, -size * 0.55 + r * cellH, cellW, cellH);
    }
  }
  ctx.restore();

  ctx.restore();
}

function drawTrophyCup(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.save();
  ctx.translate(x, y);

  const goldGrad = ctx.createLinearGradient(-size * 0.4, 0, size * 0.4, 0);
  goldGrad.addColorStop(0, '#fef08a');
  goldGrad.addColorStop(0.3, '#f59e0b');
  goldGrad.addColorStop(0.7, '#d97706');
  goldGrad.addColorStop(1, '#92400e');

  // Base
  ctx.fillStyle = '#1c1917';
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(-size * 0.35, size * 0.3, size * 0.7, size * 0.2, 2);
  ctx.fill();
  ctx.stroke();

  // Stem
  ctx.fillStyle = goldGrad;
  ctx.fillRect(-size * 0.08, size * 0.1, size * 0.16, size * 0.22);

  // Cup Chalice
  ctx.fillStyle = goldGrad;
  ctx.beginPath();
  ctx.moveTo(-size * 0.32, -size * 0.4);
  ctx.lineTo(size * 0.32, -size * 0.4);
  ctx.quadraticCurveTo(size * 0.3, size * 0.12, 0, size * 0.14);
  ctx.quadraticCurveTo(-size * 0.3, size * 0.12, -size * 0.32, -size * 0.4);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#fef08a';
  ctx.lineWidth = 1.2;
  ctx.stroke();

  // Handles
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(-size * 0.34, -size * 0.16, size * 0.14, Math.PI * 0.5, Math.PI * 1.5, false);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(size * 0.34, -size * 0.16, size * 0.14, Math.PI * 1.5, Math.PI * 0.5, false);
  ctx.stroke();

  // Center star
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -size * 0.16, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawThemeDisplayScreen(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  w: number,
  theme: CrashTheme,
  phase: 'betting' | 'flying' | 'crashed',
  userBet: number | null | undefined,
  userCashout: number | null | undefined,
  currentMultiplier: number,
  crashPoint: number,
  betTier: number,
  betAmount: number,
  now: number
) {
  const panelW = Math.min(w * 0.76, 230);
  const panelH = 44;
  const isWon = Boolean(userCashout);
  const isCrashed = phase === 'crashed' && !isWon;

  ctx.save();
  ctx.translate(cx, cy);

  ctx.fillStyle = isWon
    ? 'rgba(19, 24, 12, 0.88)'
    : isCrashed
    ? 'rgba(38, 12, 12, 0.9)'
    : 'rgba(8, 12, 22, 0.85)';
  ctx.strokeStyle = isWon
    ? '#facc15'
    : isCrashed
    ? '#ef4444'
    : betTier === 3
    ? 'rgba(250, 204, 21, 0.65)'
    : betTier === 2
    ? 'rgba(6, 182, 212, 0.65)'
    : 'rgba(245, 158, 11, 0.45)';
  ctx.lineWidth = isWon || isCrashed ? 2 : 1.2;

  if (isWon) {
    ctx.shadowColor = '#facc15';
    ctx.shadowBlur = 14;
  } else if (isCrashed) {
    ctx.shadowColor = '#ef4444';
    ctx.shadowBlur = 12;
  }

  ctx.beginPath();
  ctx.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 10);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Scanline overlay
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let sl = -panelH / 2 + 4; sl < panelH / 2; sl += 4) {
    ctx.beginPath();
    ctx.moveTo(-panelW / 2 + 6, sl);
    ctx.lineTo(panelW / 2 - 6, sl);
    ctx.stroke();
  }

  if (isWon) {
    if (theme === 'racing') {
      drawCheckeredFlags(ctx, -panelW * 0.35, 0, 24);
      drawTrophyCup(ctx, panelW * 0.35, 0, 24);
    } else {
      drawTrophyCup(ctx, -panelW * 0.35, 0, 24);
      drawTrophyCup(ctx, panelW * 0.35, 0, 24);
    }

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fef08a';
    ctx.font = '700 12px Vazirmatn, sans-serif';
    ctx.fillText('پیروزی و ثبت سود! 🏆', 0, -8);

    ctx.font = '800 11px ui-monospace, monospace';
    ctx.fillStyle = '#4ade80';
    const profit = userBet && userCashout ? ((userCashout - 1) * userBet).toFixed(0) : null;
    ctx.fillText(profit ? `سود: +${profit} (${userCashout?.toFixed(2)}x)` : `برداشت: ${userCashout?.toFixed(2)}x`, 0, 10);
  } else if (isCrashed) {
    const flash = Math.sin(now * 0.02) > 0;
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = flash ? '#ef4444' : '#fca5a5';
    ctx.font = '800 12px Vazirmatn, sans-serif';
    const crashTitle =
      theme === 'racing'
        ? '⚠️ برخورد با مانع!'
        : theme === 'chart'
        ? '⚠️ شکست خط حمایت!'
        : '⚠️ انفجار و کرش!';
    ctx.fillText(crashTitle, 0, -8);

    ctx.font = '700 11px ui-monospace, monospace';
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`کرش در ضریب: ${crashPoint?.toFixed(2)}x`, 0, 10);
  } else {
    const tierName =
      theme === 'racing'
        ? betTier === 3
          ? `👑 هایپرکار ${betAmount}`
          : betTier === 2
          ? `⚡ توربو V12 ${betAmount}`
          : `🏎️ اسپرت کوپه ${betAmount}`
        : theme === 'chart'
        ? betTier === 3
          ? `👑 وال VIP ${betAmount}`
          : betTier === 2
          ? `⚡ تریدر پرو ${betAmount}`
          : `📊 اسکالپ ${betAmount}`
        : betTier === 3
        ? `👑 ناو کیهانی ${betAmount}`
        : betTier === 2
        ? `⚡ شاتل توربو ${betAmount}`
        : `🚀 فالکون ${betAmount}`;

    const tierColor = betTier === 3 ? '#facc15' : betTier === 2 ? '#38bdf8' : '#f59e0b';

    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = tierColor;
    ctx.font = '700 12px Vazirmatn, sans-serif';
    ctx.fillText(tierName, 0, -8);

    ctx.direction = 'ltr';
    ctx.font = '600 10px ui-monospace, monospace';
    ctx.fillStyle = '#94a3b8';
    if (theme === 'racing') {
      const speed = phase === 'flying' ? (180 + Math.min(currentMultiplier * 60, 420)).toFixed(0) : '0';
      ctx.fillText(`SPEED: ${speed} KM/H  •  BOOST: TIER ${betTier}`, 0, 10);
    } else if (theme === 'chart') {
      ctx.fillText(`RSI: 68.4  •  VOL: ${(betTier * 4.2).toFixed(1)}M  •  TIER ${betTier}`, 0, 10);
    } else {
      const alt = phase === 'flying' ? (1200 + Math.min(currentMultiplier * 850, 9500)).toFixed(0) : '0';
      ctx.fillText(`ALT: ${alt} KM  •  WARP TIER ${betTier}`, 0, 10);
    }
  }

  ctx.restore();
}

function drawRocketCraft(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  betTier: number,
  skin: (typeof SKIN_CONFIGS)['default'],
  isFlying: boolean,
  currentMultiplier: number,
  now: number,
  rocketImg: HTMLImageElement | null
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  // 1. TIER 3 & 2 AURA SHIELD
  if (betTier === 3) {
    ctx.save();
    const auraRot = (now * 0.0018) % (Math.PI * 2);
    ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 16;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.ellipse(0, -2, 34, 46, auraRot, 0, Math.PI * 2);
    ctx.stroke();

    for (let i = 0; i < 4; i++) {
      const pAngle = auraRot + (i * Math.PI) / 2;
      const px = Math.cos(pAngle) * 34;
      const py = -2 + Math.sin(pAngle) * 46;
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(px, py, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else if (betTier === 2) {
    ctx.save();
    const pulse = 0.5 + Math.sin(now * 0.006) * 0.3;
    ctx.strokeStyle = `rgba(6, 182, 212, ${pulse})`;
    ctx.shadowColor = '#06b6d4';
    ctx.shadowBlur = 10;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 28, 38, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // 2. EXHAUST FLAMES (When Flying)
  if (isFlying) {
    const boostMult = Math.min(currentMultiplier * 2, 25);
    const flameLength = (skin.name.includes('ققنوس') ? 44 : 36) + (betTier === 3 ? 14 : betTier === 2 ? 8 : 0) + boostMult + Math.sin(now * 0.06) * 6;

    if (betTier === 3) {
      for (const offX of [-16, -6, 6, 16]) {
        const dFlame = flameLength * (Math.abs(offX) > 10 ? 0.9 : 1.15);
        const dGrad = ctx.createLinearGradient(0, 22, 0, 22 + dFlame);
        dGrad.addColorStop(0, '#ffffff');
        dGrad.addColorStop(0.2, '#fef08a');
        dGrad.addColorStop(0.5, '#f59e0b');
        dGrad.addColorStop(0.8, '#a855f7');
        dGrad.addColorStop(1, 'rgba(168, 85, 247, 0)');
        ctx.fillStyle = dGrad;
        ctx.beginPath();
        ctx.ellipse(offX, 22 + dFlame * 0.45, 4.2, dFlame * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (betTier === 2) {
      const mainGrad = ctx.createLinearGradient(0, 22, 0, 22 + flameLength);
      mainGrad.addColorStop(0, skin.flameColors[0]);
      mainGrad.addColorStop(0.35, skin.flameColors[1]);
      mainGrad.addColorStop(1, skin.flameColors[2]);
      ctx.fillStyle = mainGrad;
      ctx.beginPath();
      ctx.ellipse(0, 22 + flameLength * 0.45, 7.5, flameLength * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();

      for (const offX of [-18, 18]) {
        const auxFlame = flameLength * 0.85;
        const auxGrad = ctx.createLinearGradient(0, 18, 0, 18 + auxFlame);
        auxGrad.addColorStop(0, '#ffffff');
        auxGrad.addColorStop(0.3, '#67e8f9');
        auxGrad.addColorStop(0.7, '#06b6d4');
        auxGrad.addColorStop(1, 'rgba(6, 182, 212, 0)');
        ctx.fillStyle = auxGrad;
        ctx.beginPath();
        ctx.ellipse(offX, 18 + auxFlame * 0.45, 3.8, auxFlame * 0.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      const flameGrad = ctx.createLinearGradient(0, 22, 0, 22 + flameLength);
      flameGrad.addColorStop(0, skin.flameColors[0]);
      flameGrad.addColorStop(0.35, skin.flameColors[1]);
      flameGrad.addColorStop(1, skin.flameColors[2]);
      ctx.fillStyle = flameGrad;
      ctx.beginPath();
      ctx.ellipse(0, 22 + flameLength * 0.45, 8.5, flameLength * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // 3. PHYSICAL CRAFT MORPHOLOGY BY TIER
  if (betTier === 3) {
    // TIER 3: IMPERIAL QUANTUM DREADNOUGHT (👑)
    ctx.save();
    const wingGrad = ctx.createLinearGradient(-36, 0, 36, 0);
    wingGrad.addColorStop(0, '#1c1917');
    wingGrad.addColorStop(0.5, '#78350f');
    wingGrad.addColorStop(1, '#1c1917');
    ctx.fillStyle = wingGrad;
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 1.8;
    ctx.shadowColor = '#f59e0b';
    ctx.shadowBlur = 10;

    // Left Wing & Warp Nacelle
    ctx.beginPath();
    ctx.moveTo(-12, -4);
    ctx.lineTo(-34, 10);
    ctx.lineTo(-32, 22);
    ctx.lineTo(-14, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right Wing & Warp Nacelle
    ctx.beginPath();
    ctx.moveTo(12, -4);
    ctx.lineTo(34, 10);
    ctx.lineTo(32, 22);
    ctx.lineTo(14, 18);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Glowing Tachyon Coils
    ctx.fillStyle = '#22d3ee';
    ctx.shadowColor = '#22d3ee';
    ctx.shadowBlur = 8;
    ctx.fillRect(-33, 12, 3, 8);
    ctx.fillRect(30, 12, 3, 8);
    ctx.restore();

    if (rocketImg && rocketImg.complete) {
      ctx.drawImage(rocketImg, -20, -28, 40, 56);
    } else {
      ctx.fillStyle = '#1c1917';
      ctx.strokeStyle = '#facc15';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -30);
      ctx.lineTo(13, -8);
      ctx.lineTo(13, 20);
      ctx.lineTo(-13, 20);
      ctx.lineTo(-13, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    // Imperial Gold Armor Bands
    ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
    ctx.fillRect(-10, -8, 20, 3);
    ctx.fillRect(-12, 4, 24, 3);

    // Crown Crest 👑
    ctx.save();
    ctx.translate(0, -14);
    ctx.fillStyle = '#facc15';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, 4);
    ctx.lineTo(-7, -2);
    ctx.lineTo(-3, 1);
    ctx.lineTo(0, -4);
    ctx.lineTo(3, 1);
    ctx.lineTo(7, -2);
    ctx.lineTo(6, 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Quad Titanium Nozzles
    ctx.fillStyle = '#facc15';
    for (const offX of [-16, -6, 6, 16]) {
      ctx.fillRect(offX - 2.5, 20, 5, 4);
    }
  } else if (betTier === 2) {
    // TIER 2: ORBITAL TWIN-BOOSTER HEAVY SHUTTLE (⚡)
    ctx.save();
    for (const offX of [-18, 18]) {
      const bGrad = ctx.createLinearGradient(offX - 5, 0, offX + 5, 0);
      bGrad.addColorStop(0, '#0f172a');
      bGrad.addColorStop(0.5, '#1e293b');
      bGrad.addColorStop(1, '#0f172a');
      ctx.fillStyle = bGrad;
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.2;

      ctx.beginPath();
      ctx.moveTo(offX, -16);
      ctx.lineTo(offX + 5, -6);
      ctx.lineTo(offX + 5, 18);
      ctx.lineTo(offX - 5, 18);
      ctx.lineTo(offX - 5, -6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#22d3ee';
      ctx.beginPath();
      ctx.moveTo(offX, -16);
      ctx.lineTo(offX + 5, -6);
      ctx.lineTo(offX - 5, -6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#475569';
      ctx.fillRect(offX < 0 ? offX + 4 : offX - 7, -2, 4, 3);
      ctx.fillRect(offX < 0 ? offX + 4 : offX - 7, 10, 4, 3);

      ctx.fillStyle = '#06b6d4';
      ctx.fillRect(offX - 3, 18, 6, 3);
    }
    ctx.restore();

    if (rocketImg && rocketImg.complete) {
      ctx.drawImage(rocketImg, -20, -28, 40, 56);
    } else {
      ctx.fillStyle = skin.hullColor;
      ctx.strokeStyle = skin.accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(10, -8);
      ctx.lineTo(10, 18);
      ctx.lineTo(-10, 18);
      ctx.lineTo(-10, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = '#22d3ee';
    ctx.fillRect(-8, -4, 16, 2.5);

    ctx.fillStyle = '#06b6d4';
    ctx.fillRect(-12, 14, 24, 2);
  } else {
    // TIER 1: FALCON SCOUT ROCKET
    if (rocketImg && rocketImg.complete) {
      ctx.drawImage(rocketImg, -20, -28, 40, 56);
    } else {
      ctx.fillStyle = skin.hullColor;
      ctx.strokeStyle = skin.accentColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(10, -8);
      ctx.lineTo(10, 18);
      ctx.lineTo(-10, 18);
      ctx.lineTo(-10, -8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = skin.accentColor;
      ctx.beginPath();
      ctx.moveTo(0, -28);
      ctx.lineTo(10, -8);
      ctx.lineTo(-10, -8);
      ctx.closePath();
      ctx.fill();
    }

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.lineTo(-18, 20);
    ctx.lineTo(-10, 18);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(10, 10);
    ctx.lineTo(18, 20);
    ctx.lineTo(10, 18);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(-5, 18, 10, 4);
  }

  ctx.restore();
}

function PhaserGame({
  phase,
  startTime,
  crashPoint,
  crashTime,
  duration: _duration,
  betEndTime,
  width = 800,
  height = 450,
  userBet,
  userCashout,
  sessionId,
  targetMultiplier = null,
  theme = 'racing',
  betTier = 1,
  betAmount = 10,
  upgradePulse,
}: PhaserGameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  // Dynamic canvas viewport dimensions
  const sizeRef = useRef<{ w: number; h: number; dpr: number }>({
    w: width || 460,
    h: height || 288,
    dpr: typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1,
  });

  // Asset refs
  const rocketImgRef = useRef<HTMLImageElement | null>(null);
  const explosionImgRef = useRef<HTMLImageElement | null>(null);
  const planet1ImgRef = useRef<HTMLImageElement | null>(null);
  const planet2ImgRef = useRef<HTMLImageElement | null>(null);

  // Dynamic state refs (kept in refs for smooth 60fps loop without React re-trigger)
  const starsRef = useRef<Star[]>([]);
  const warpLinesRef = useRef<WarpLine[]>([]);
  const exhaustParticlesRef = useRef<Spark[]>([]);
  const explosionParticlesRef = useRef<Spark[]>([]);
  const debrisParticlesRef = useRef<Debris[]>([]);
  const confettiParticlesRef = useRef<Confetti[]>([]);
  const smokePuffsRef = useRef<SmokePuff[]>([]);
  const skidMarksRef = useRef<SkidMark[]>([]);
  const cashoutCelebrationTriggeredRef = useRef<boolean>(false);
  const lastPhaseRef = useRef<string>(phase);
  const lastCountdownSecondRef = useRef<number | null>(null);

  // Animation trackers
  const rocketYRef = useRef<number>(0);
  const targetMultiplierRef = useRef<number | null>(targetMultiplier);
  const themeRef = useRef<CrashTheme>(theme);
  const betTierRef = useRef<number>(betTier);
  const betAmountRef = useRef<number>(betAmount);

  // Synchronous sync on every render pass so 60fps loop responds instantly to props
  betTierRef.current = betTier;
  betAmountRef.current = betAmount;
  themeRef.current = theme;
  targetMultiplierRef.current = targetMultiplier;

  const selectedSkin = useStore((state) => state.selectedSkin);
  const selectedSkinRef = useRef<string>(selectedSkin || 'default');

  useEffect(() => {
    selectedSkinRef.current = selectedSkin || 'default';
  }, [selectedSkin]);

  useEffect(() => {
    targetMultiplierRef.current = targetMultiplier;
  }, [targetMultiplier]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const shockwavesRef = useRef<Shockwave[]>([]);
  const lastUpgradeIdRef = useRef<number>(0);
  const prevBetTierRef = useRef<number>(betTier);
  const lastFlightSoundTimeRef = useRef<number>(0);

  const triggerShockwave = (tier: number) => {
    const { w, h } = sizeRef.current;
    const currentActiveTheme = themeRef.current;
    let targetX = w / 2;
    let targetY = h * 0.72;
    if (currentActiveTheme === 'rocket') {
      targetY = rocketYRef.current || (h * 0.52);
    } else if (currentActiveTheme === 'chart') {
      targetX = w - 85;
      targetY = h * 0.5;
    }

    const sparkCount = tier === 3 ? 14 : 9;
    const sparks = [];
    for (let i = 0; i < sparkCount; i++) {
      sparks.push({
        angle: (i / sparkCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.35,
        speed: 1.5 + Math.random() * 3.5,
        length: 12 + Math.random() * (tier === 3 ? 24 : 16),
        dist: 15 + Math.random() * 35,
      });
    }

    shockwavesRef.current.push({
      x: targetX,
      y: targetY,
      tier,
      startTime: Date.now(),
      duration: tier === 3 ? 850 : 650,
      maxRadius: tier === 3 ? Math.min(w * 0.35, 140) : Math.min(w * 0.28, 110),
      sparks,
    });

    if (shockwavesRef.current.length > 5) {
      shockwavesRef.current.shift();
    }

    playUpgradeSound(tier);
    triggerHaptic('heavy');
  };

  useEffect(() => {
    if (upgradePulse && upgradePulse.tier >= 2 && upgradePulse.id !== lastUpgradeIdRef.current) {
      lastUpgradeIdRef.current = upgradePulse.id;
      triggerShockwave(upgradePulse.tier);
    }
  }, [upgradePulse]);

  useEffect(() => {
    betTierRef.current = betTier;
    if (betTier >= 2 && betTier !== prevBetTierRef.current) {
      triggerShockwave(betTier);
    }
    prevBetTierRef.current = betTier;
  }, [betTier]);

  useEffect(() => {
    betAmountRef.current = betAmount;
  }, [betAmount]);

  useEffect(() => {
    if (userCashout && !cashoutCelebrationTriggeredRef.current) {
      cashoutCelebrationTriggeredRef.current = true;
      const { w, h } = sizeRef.current;
      const confetti: Confetti[] = [];
      const confColors = ['#fbbf24', '#f59e0b', '#22d3ee', '#34d399', '#f43f5e', '#ffffff'];
      for (let i = 0; i < 60; i++) {
        confetti.push({
          x: w * 0.15 + Math.random() * w * 0.7,
          y: h * 0.75 + Math.random() * 20,
          vx: (Math.random() - 0.5) * 6,
          vy: -4 - Math.random() * 7,
          sizeW: 4 + Math.random() * 4,
          sizeH: 7 + Math.random() * 6,
          rot: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.25,
          color: confColors[Math.floor(Math.random() * confColors.length)],
          alpha: 1,
          life: 0,
          maxLife: 60 + Math.random() * 40,
        });
      }
      confettiParticlesRef.current = confetti;
    }
  }, [userCashout]);

  const crashAnimationRef = useRef<{
    active: boolean;
    startTime: number;
    crashY: number;
    played: boolean;
  }>({
    active: false,
    startTime: 0,
    crashY: 0,
    played: false,
  });

  // Load assets once
  useEffect(() => {
    const rocket = new Image();
    rocket.src = '/assets/rocket.png';
    rocketImgRef.current = rocket;

    const explosion = new Image();
    explosion.src = '/assets/explosion.png';
    explosionImgRef.current = explosion;

    const planet1 = new Image();
    planet1.src = '/assets/planet1.png';
    planet1ImgRef.current = planet1;

    const planet2 = new Image();
    planet2.src = '/assets/planet2.png';
    planet2ImgRef.current = planet2;
  }, []);

  // Initialize stars and warp lines for given dimensions
  const initStarsAndWarp = (w: number, h: number) => {
    const starColors = ['#ffffff', '#a5f3fc', '#fef08a', '#c4b5fd', '#bae6fd'];
    const stars: Star[] = [];
    for (let i = 0; i < 80; i++) {
      const isForeground = i < 15;
      const isMid = i >= 15 && i < 45;
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: isForeground ? 2.5 + Math.random() * 1.2 : isMid ? 1.6 + Math.random() * 0.8 : 0.8 + Math.random() * 0.7,
        speed: isForeground ? 0.35 : isMid ? 0.2 : 0.08,
        alpha: isForeground ? 0.85 : isMid ? 0.65 : 0.4,
        color: starColors[Math.floor(Math.random() * starColors.length)],
        twinkleOffset: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.0015 + Math.random() * 0.003,
        hasSpikes: isForeground && Math.random() > 0.4,
      });
    }
    starsRef.current = stars;

    const warpLines: WarpLine[] = [];
    for (let i = 0; i < 20; i++) {
      warpLines.push({
        x: Math.random() * w,
        y: Math.random() * h,
        length: 20 + Math.random() * 60,
        speed: 5 + Math.random() * 8,
        alpha: 0.15 + Math.random() * 0.35,
      });
    }
    warpLinesRef.current = warpLines;
  };

  // Observe container size and resize canvas buffer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleResize = () => {
      const canvas = canvasRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const measuredW = rect.width > 0 ? rect.width : width || 460;
      const measuredH = rect.height > 0 ? rect.height : height || 288;
      const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2.5) : 1;

      const w = Math.round(measuredW);
      const h = Math.round(measuredH);
      if (w <= 0 || h <= 0) return;

      sizeRef.current = { w, h, dpr };

      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';

      if (starsRef.current.length === 0 || Math.abs(w - (starsRef.current[0]?.x ? w : 0)) > 40) {
        initStarsAndWarp(w, h);
      }
    };

    handleResize();

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [width, height]);

  // Handle phase changes & crash triggers
  useEffect(() => {
    if (phase === 'flying' && lastPhaseRef.current !== 'flying') {
      playLaunchSound();
      lastFlightSoundTimeRef.current = Date.now();
    } else if (phase === 'crashed' && lastPhaseRef.current !== 'crashed') {
      const { w, h } = sizeRef.current;
      const currentActiveTheme = themeRef.current;
      const targetY =
        currentActiveTheme === 'racing'
          ? h * 0.72 - 20
          : currentActiveTheme === 'chart'
          ? h * 0.5
          : rocketYRef.current || h * 0.52;

      triggerHapticCrash();

      crashAnimationRef.current = {
        active: true,
        startTime: Date.now(),
        crashY: targetY,
        played: true,
      };

      if (currentActiveTheme === 'racing') {
        const carX = w / 2;
        const carY = h * 0.72;
        // خط ترمز لاستیک روی آسفالت تا محل برخورد به مانع
        skidMarksRef.current = [
          {
            leftX: carX - 16,
            rightX: carX + 16,
            startY: Math.min(h, carY + 80),
            endY: carY + 12,
            alpha: 0.85,
          },
        ];

        // قطعات متلاشی‌شده مانع بتنی و گاردریل
        const debris: Debris[] = [];
        const debrisColors = ['#64748b', '#475569', '#f59e0b', '#334155', '#94a3b8'];
        for (let i = 0; i < 35; i++) {
          const angle = -Math.PI * 0.5 + (Math.random() - 0.5) * Math.PI * 0.8;
          const speed = 2 + Math.random() * 7;
          debris.push({
            x: carX + (Math.random() - 0.5) * 28,
            y: carY - 24,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            size: 3 + Math.random() * 6,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.3,
            color: debrisColors[Math.floor(Math.random() * debrisColors.length)],
            alpha: 1,
            life: 0,
            maxLife: 35 + Math.random() * 30,
            shape: Math.random() > 0.4 ? 'chunk' : 'shingle',
          });
        }
        debrisParticlesRef.current = debris;

        // جرقه‌های شدید برخورد فلز و بتن
        const sparks: Spark[] = [];
        const sparkColors = ['#ffffff', '#facc15', '#f97316', '#ef4444'];
        for (let i = 0; i < 45; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2.5 + Math.random() * 9;
          sparks.push({
            x: carX,
            y: carY - 24,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1.5,
            size: 2 + Math.random() * 3.5,
            alpha: 1,
            color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
            life: 0,
            maxLife: 20 + Math.random() * 25,
          });
        }
        explosionParticlesRef.current = sparks;
      } else if (currentActiveTheme === 'rocket') {
        const sparks: Spark[] = [];
        const sparkColors = ['#facc15', '#f97316', '#ef4444', '#ffffff', '#dc2626'];
        for (let i = 0; i < 50; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 10;
          sparks.push({
            x: w / 2,
            y: targetY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            size: 2 + Math.random() * 4,
            alpha: 1,
            color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
            life: 0,
            maxLife: 25 + Math.random() * 30,
          });
        }
        explosionParticlesRef.current = sparks;

        const debris: Debris[] = [];
        const astColors = ['#78716c', '#44403c', '#ea580c', '#1c1917'];
        for (let i = 0; i < 35; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 2 + Math.random() * 8;
          debris.push({
            x: w / 2,
            y: targetY - 20,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 6,
            rot: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.25,
            color: astColors[Math.floor(Math.random() * astColors.length)],
            alpha: 1,
            life: 0,
            maxLife: 35 + Math.random() * 25,
            shape: 'chunk',
          });
        }
        debrisParticlesRef.current = debris;
      } else {
        // تم چارت و شکست خط حمایت
        const sparks: Spark[] = [];
        const sparkColors = ['#ef4444', '#dc2626', '#f87171', '#ffffff'];
        for (let i = 0; i < 35; i++) {
          const angle = (Math.random() - 0.5) * Math.PI;
          const speed = 2 + Math.random() * 6;
          sparks.push({
            x: w - 85,
            y: targetY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed + 2,
            size: 2 + Math.random() * 3,
            alpha: 1,
            color: sparkColors[Math.floor(Math.random() * sparkColors.length)],
            life: 0,
            maxLife: 25 + Math.random() * 20,
          });
        }
        explosionParticlesRef.current = sparks;
      }
    } else if (phase === 'betting') {
      crashAnimationRef.current = {
        active: false,
        startTime: 0,
        crashY: 0,
        played: false,
      };
      explosionParticlesRef.current = [];
      debrisParticlesRef.current = [];
      smokePuffsRef.current = [];
      confettiParticlesRef.current = [];
      skidMarksRef.current = [];
      cashoutCelebrationTriggeredRef.current = false;
      lastCountdownSecondRef.current = null;
    }

    lastPhaseRef.current = phase;
  }, [phase, height, width]);

  // Main 60fps Canvas Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const nowRef = { lastTime: Date.now() };

    function render() {
      if (!ctx) return;
      const { w, h, dpr } = sizeRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const now = Date.now();
      nowRef.lastTime = now;
      const currentActiveTheme = themeRef.current;
      const betTier = betTierRef.current || 1;
      const betAmount = betAmountRef.current || 10;

      // 1. Calculate live multiplier and flight dynamics
      let currentMultiplier = 1.0;
      let flightProgress = 0;
      const totalCrashTime = crashTime > 0 ? crashTime : 20000;

      if (phase === 'flying') {
        const elapsed = Math.max(0, now - startTime);
        flightProgress = Math.min(elapsed / totalCrashTime, 1);
        if (flightProgress >= 1) {
          currentMultiplier = crashPoint || 1.0;
        } else {
          currentMultiplier = Math.pow(Math.E, flightProgress * Math.log(Math.max(1, totalCrashTime / 1000)));
        }
      } else if (phase === 'crashed') {
        currentMultiplier = crashPoint || 1.0;
      }

      // Theme-specific dynamic Web Audio SFX (acceleration & nitro rev)
      if (phase === 'flying') {
        const soundInterval = Math.max(420, 750 - Math.min(currentMultiplier * 35, 330));
        if (now - lastFlightSoundTimeRef.current >= soundInterval) {
          lastFlightSoundTimeRef.current = now;
          playThemeFlightSound(currentActiveTheme, betTier, currentMultiplier);
        }
      }

      // Screen shake offset during initial crash explosion (350ms)
      let shakeX = 0;
      let shakeY = 0;
      if (phase === 'crashed' && crashAnimationRef.current.active) {
        const crashElapsed = now - crashAnimationRef.current.startTime;
        if (crashElapsed < 350) {
          const intensity = (1 - crashElapsed / 350) * 8;
          shakeX = (Math.random() - 0.5) * intensity;
          shakeY = (Math.random() - 0.5) * intensity;
        }
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      const target = targetMultiplierRef.current;
      const activeTier = !target || target < 2 ? 1 : target < 5 ? 2 : target < 10 ? 3 : 4;

      // =========================================================================
      // BACKGROUND RENDERING (THEME-SPECIFIC)
      // =========================================================================
      if (currentActiveTheme === 'racing') {
        // --- THEME 2: CYBER HIGHWAY RACING ---
        // Sky Gradient (Dark Night Indigo to Horizon Glow)
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.4);
        skyGrad.addColorStop(0, '#06070d');
        skyGrad.addColorStop(0.6, '#0d101d');
        skyGrad.addColorStop(1, '#181428');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Distant Cyber City Skyline Silhouettes
        ctx.save();
        ctx.fillStyle = '#080a14';
        const buildingCount = 14;
        const bWidth = w / buildingCount;
        for (let b = 0; b < buildingCount; b++) {
          const bH = 25 + Math.sin(b * 1.7) * 18 + ((b * 7) % 22);
          ctx.fillRect(b * bWidth, h * 0.38 - bH, bWidth - 1, bH);
          // Neon window specks
          if (b % 2 === 0) {
            ctx.fillStyle = b % 4 === 0 ? 'rgba(6, 182, 212, 0.4)' : 'rgba(245, 158, 11, 0.4)';
            ctx.fillRect(b * bWidth + 3, h * 0.38 - bH + 6, 2, 2);
            ctx.fillRect(b * bWidth + 8, h * 0.38 - bH + 12, 2, 2);
            ctx.fillStyle = '#080a14';
          }
        }
        ctx.restore();

        // Asphalt Track Horizon and Surface
        const horizonY = h * 0.36;
        const topRoadWidth = w * 0.16;
        const bottomRoadWidth = w * 0.94;
        const cx = w / 2;

        const roadGrad = ctx.createLinearGradient(0, horizonY, 0, h);
        roadGrad.addColorStop(0, '#10131d');
        roadGrad.addColorStop(0.5, '#0e1017');
        roadGrad.addColorStop(1, '#080a0e');
        ctx.fillStyle = roadGrad;

        ctx.beginPath();
        ctx.moveTo(cx - topRoadWidth / 2, horizonY);
        ctx.lineTo(cx + topRoadWidth / 2, horizonY);
        ctx.lineTo(cx + bottomRoadWidth / 2, h);
        ctx.lineTo(cx - bottomRoadWidth / 2, h);
        ctx.closePath();
        ctx.fill();

        // Neon Guardrails
        ctx.save();
        ctx.strokeStyle = 'rgba(245, 158, 11, 0.6)';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(cx - topRoadWidth / 2, horizonY);
        ctx.lineTo(cx - bottomRoadWidth / 2, h);
        ctx.moveTo(cx + topRoadWidth / 2, horizonY);
        ctx.lineTo(cx + bottomRoadWidth / 2, h);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Perspective Asphalt Lane Dashes (Moving with speed)
        const speedFactor = phase === 'flying' ? 1.5 + currentMultiplier * 0.8 : phase === 'betting' ? 0.3 : 0;
        const cycleProgress = ((now * 0.003 * speedFactor) % 1);
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 2.5;

        for (let i = 0; i < 8; i++) {
          const t = Math.pow((i + cycleProgress) / 8, 2.2);
          const segY = horizonY + (h - horizonY) * t;
          const segLen = 6 + t * 38;
          const segWidth = 1.5 + t * 4;
          ctx.lineWidth = segWidth;
          ctx.beginPath();
          ctx.moveTo(cx, segY);
          ctx.lineTo(cx, Math.min(h, segY + segLen));
          ctx.stroke();
        }
        ctx.restore();

        // Skid marks on asphalt from heavy braking / crash
        if (skidMarksRef.current.length > 0) {
          ctx.save();
          for (let sm = skidMarksRef.current.length - 1; sm >= 0; sm--) {
            const mark = skidMarksRef.current[sm];
            ctx.strokeStyle = `rgba(15, 23, 42, ${mark.alpha})`;
            ctx.lineWidth = 4.5;
            ctx.beginPath();
            ctx.moveTo(mark.leftX, mark.startY);
            ctx.lineTo(mark.leftX, mark.endY);
            ctx.moveTo(mark.rightX, mark.startY);
            ctx.lineTo(mark.rightX, mark.endY);
            ctx.stroke();
          }
          ctx.restore();
        }

        // Speed warp horizontal streaks in flight
        if (phase === 'flying') {
          ctx.save();
          for (let s = 0; s < 12; s++) {
            const sy = horizonY + Math.random() * (h - horizonY - 10);
            const sx = (s % 2 === 0 ? 15 : w - 85) + Math.random() * 70;
            const slen = 30 + Math.random() * 50;
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.35)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + slen, sy);
            ctx.stroke();
          }
          ctx.restore();
        }
      } else if (currentActiveTheme === 'chart') {
        // --- THEME 3: CANDLESTICK & STOCK TRADING ---
        // Dark Bloomberg/TradingView Terminal Background
        ctx.fillStyle = '#080a0f';
        ctx.fillRect(0, 0, w, h);

        // Grid lines (Price levels and time bars)
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;

        const hGridSteps = 5;
        for (let i = 1; i < hGridSteps; i++) {
          const gy = (h / hGridSteps) * i;
          ctx.beginPath();
          ctx.moveTo(15, gy);
          ctx.lineTo(w - 15, gy);
          ctx.stroke();
        }

        const vGridSteps = 8;
        for (let i = 1; i < vGridSteps; i++) {
          const gx = (w / vGridSteps) * i;
          ctx.beginPath();
          ctx.moveTo(gx, 25);
          ctx.lineTo(gx, h - 25);
          ctx.stroke();
        }

        // Price Axis Labels on Right
        ctx.font = '600 9px ui-monospace, SFMono-Regular, monospace';
        ctx.fillStyle = 'rgba(156, 163, 175, 0.4)';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        const priceLabels = ['10.0x', '5.00x', '2.50x', '1.50x', '1.00x'];
        for (let i = 0; i < priceLabels.length; i++) {
          const py = 35 + ((h - 70) / (priceLabels.length - 1)) * i;
          ctx.fillText(priceLabels[i], w - 10, py);
        }

        // Ticker Header
        ctx.font = '700 11px ui-monospace, SFMono-Regular, monospace';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#10b981';
        ctx.fillText('CRASH/USDT • LIVE ORDERBOOK', 18, 22);

        // Volume oscillator bars at bottom
        ctx.fillStyle = 'rgba(16, 185, 129, 0.15)';
        for (let i = 0; i < 20; i++) {
          const bx = 18 + i * ((w - 36) / 20);
          const bw = (w - 36) / 25;
          const bh = 5 + Math.sin(i * 1.8 + now * 0.002) * 8 + ((i * 3) % 12);
          ctx.fillRect(bx, h - 12 - bh, bw, bh);
        }
        ctx.restore();
      } else {
        // --- THEME 1: COSMIC ROCKET (DEFAULT) ---
        ctx.fillStyle = '#070810';
        ctx.fillRect(0, 0, w, h);

        const nebula1 = ctx.createRadialGradient(w * 0.2, h * 0.35, 10, w * 0.2, h * 0.35, Math.max(w, h) * 0.65);
        const nebula2 = ctx.createRadialGradient(w * 0.85, h * 0.65, 20, w * 0.85, h * 0.65, Math.max(w, h) * 0.6);

        if (activeTier === 4) {
          nebula1.addColorStop(0, 'rgba(120, 53, 15, 0.65)');
          nebula1.addColorStop(0.5, 'rgba(180, 83, 9, 0.4)');
          nebula1.addColorStop(1, 'rgba(7, 8, 16, 0)');
          nebula2.addColorStop(0, 'rgba(220, 38, 38, 0.35)');
          nebula2.addColorStop(0.5, 'rgba(245, 158, 11, 0.25)');
          nebula2.addColorStop(1, 'rgba(7, 8, 16, 0)');
        } else if (activeTier === 3) {
          nebula1.addColorStop(0, 'rgba(59, 7, 100, 0.65)');
          nebula1.addColorStop(0.5, 'rgba(88, 28, 135, 0.4)');
          nebula1.addColorStop(1, 'rgba(7, 8, 16, 0)');
          nebula2.addColorStop(0, 'rgba(168, 85, 247, 0.35)');
          nebula2.addColorStop(0.5, 'rgba(192, 132, 252, 0.2)');
          nebula2.addColorStop(1, 'rgba(7, 8, 16, 0)');
        } else if (activeTier === 2) {
          nebula1.addColorStop(0, 'rgba(8, 51, 68, 0.6)');
          nebula1.addColorStop(0.5, 'rgba(14, 116, 144, 0.4)');
          nebula1.addColorStop(1, 'rgba(7, 8, 16, 0)');
          nebula2.addColorStop(0, 'rgba(6, 182, 212, 0.35)');
          nebula2.addColorStop(0.5, 'rgba(56, 189, 248, 0.2)');
          nebula2.addColorStop(1, 'rgba(7, 8, 16, 0)');
        } else {
          nebula1.addColorStop(0, 'rgba(30, 27, 75, 0.45)');
          nebula1.addColorStop(0.5, 'rgba(15, 23, 42, 0.35)');
          nebula1.addColorStop(1, 'rgba(7, 8, 16, 0)');
          nebula2.addColorStop(0, 'rgba(14, 116, 144, 0.25)');
          nebula2.addColorStop(0.5, 'rgba(15, 23, 42, 0.2)');
          nebula2.addColorStop(1, 'rgba(7, 8, 16, 0)');
        }

        ctx.fillStyle = nebula1;
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = nebula2;
        ctx.fillRect(0, 0, w, h);

        // Twinkling Stars
        for (const star of starsRef.current) {
          const twinkle = 0.5 + 0.5 * Math.sin(now * star.twinkleSpeed + star.twinkleOffset);
          ctx.fillStyle = star.color;
          ctx.globalAlpha = Math.min(1, Math.max(0, star.alpha * twinkle));
          ctx.beginPath();
          ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }

      // =========================================================================
      // DYNAMIC OBJECT / VEHICLE RENDERING
      // =========================================================================
      if (currentActiveTheme === 'racing') {
        // --- CYBER SUPERCAR RENDERING ---
        const carY = h * 0.72;
        const carX = w / 2;
        const isCrashed = phase === 'crashed';

        ctx.save();
        ctx.translate(carX, carY);

        if (isCrashed) {
          // Crashed spin-out rotation
          ctx.rotate(0.25);
        } else if (phase === 'flying') {
          // High-speed sway
          ctx.rotate(Math.sin(now * 0.007) * 0.03);
        }

        // --- 3-TIER RACING VEHICLE RENDERING ---
        // Tier 1 (10): Sport Coupe (52px, Graphite, Single Wing, Dual Exhaust)
        // Tier 2 (50): Turbo V12 GT (62px, Midnight Blue, Cyan Underglow & Stripes, Quad Tips)
        // Tier 3 (100): Cyber Hypercar (72px Widebody, Imperial Gold & Carbon, Triple-Deck Wing, Ram-Air Scoop, Plasma Torches)
        const carWidth = betTier === 3 ? 72 : betTier === 2 ? 62 : 52;
        const carHalfW = carWidth / 2;
        const carHeight = betTier === 3 ? 32 : betTier === 2 ? 30 : 28;
        const carHalfH = carHeight / 2;

        // Ground Neon Underglow on Asphalt
        if (betTier === 3) {
          ctx.save();
          ctx.fillStyle = 'rgba(234, 179, 8, 0.45)';
          ctx.shadowColor = '#eab308';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.ellipse(0, 16, 44, 11, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        } else if (betTier === 2) {
          ctx.save();
          ctx.fillStyle = 'rgba(6, 182, 212, 0.38)';
          ctx.shadowColor = '#06b6d4';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.ellipse(0, 16, 36, 9, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Nitro exhaust thrust flame in flight
        if (phase === 'flying') {
          const flameFlicker = Math.sin(now * 0.08) * 4;
          const flameLen = (betTier === 3 ? 34 : betTier === 2 ? 28 : 22) + flameFlicker + Math.min(currentMultiplier * 4, 38);

          if (betTier === 3) {
            // Quad Center-Mount Titanium Afterburners with Concentric Plasma Flames
            const exhaustOffsets = [-18, -6, 6, 18];
            for (const offX of exhaustOffsets) {
              const flameGrad = ctx.createLinearGradient(0, 16, 0, 16 + flameLen);
              flameGrad.addColorStop(0, '#38bdf8');
              flameGrad.addColorStop(0.35, '#c084fc');
              flameGrad.addColorStop(0.7, '#f59e0b');
              flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
              ctx.fillStyle = flameGrad;
              ctx.beginPath();
              ctx.ellipse(offX, 16 + flameLen * 0.45, 3.8, flameLen * 0.5, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          } else if (betTier === 2) {
            // Quad Titanium Exhaust Tips (Dual Pairs)
            const exhaustOffsets = [-17, -9, 9, 17];
            for (const offX of exhaustOffsets) {
              const flameGrad = ctx.createLinearGradient(0, 16, 0, 16 + flameLen);
              flameGrad.addColorStop(0, '#22d3ee');
              flameGrad.addColorStop(0.4, '#f59e0b');
              flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
              ctx.fillStyle = flameGrad;
              ctx.beginPath();
              ctx.ellipse(offX, 16 + flameLen * 0.45, 3.2, flameLen * 0.5, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          } else {
            // Dual Standard Exhaust Flame (Tier 1)
            const exhaustOffsets = [-14, 14];
            for (const offX of exhaustOffsets) {
              const flameGrad = ctx.createLinearGradient(0, 16, 0, 16 + flameLen);
              flameGrad.addColorStop(0, '#38bdf8');
              flameGrad.addColorStop(0.4, '#f59e0b');
              flameGrad.addColorStop(1, 'rgba(239, 68, 68, 0)');
              ctx.fillStyle = flameGrad;
              ctx.beginPath();
              ctx.ellipse(offX, 16 + flameLen * 0.45, 4.5, flameLen * 0.5, 0, 0, Math.PI * 2);
              ctx.fill();
            }
          }

          // Spawn tire asphalt smoke & sparks
          if (Math.random() > 0.3) {
            const sparkColor =
              betTier === 3
                ? Math.random() > 0.4 ? '#facc15' : '#c084fc'
                : betTier === 2
                ? Math.random() > 0.4 ? '#06b6d4' : '#f59e0b'
                : Math.random() > 0.5 ? '#f59e0b' : '#64748b';

            exhaustParticlesRef.current.push({
              x: carX - carHalfW * 0.6 + (Math.random() - 0.5) * 8,
              y: carY + 14,
              vx: (Math.random() - 0.5) * 1.5,
              vy: 2 + Math.random() * 4,
              size: 2.5 + Math.random() * 3.5,
              alpha: 0.65,
              color: sparkColor,
              life: 0,
              maxLife: 15 + Math.random() * 12,
            });
            exhaustParticlesRef.current.push({
              x: carX + carHalfW * 0.6 + (Math.random() - 0.5) * 8,
              y: carY + 14,
              vx: (Math.random() - 0.5) * 1.5,
              vy: 2 + Math.random() * 4,
              size: 2.5 + Math.random() * 3.5,
              alpha: 0.65,
              color: sparkColor,
              life: 0,
              maxLife: 15 + Math.random() * 12,
            });
          }
        }

        // Supercar Shadow on Asphalt
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.beginPath();
        ctx.ellipse(0, 16, carHalfW + 4, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Aerodynamic Side Splitters (Tier 2 and 3)
        if (betTier >= 2) {
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = betTier === 3 ? '#eab308' : '#06b6d4';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(-carHalfW - 5, -4, 5, 18, [2, 0, 0, 2]);
          ctx.roundRect(carHalfW, -4, 5, 18, [0, 2, 2, 0]);
          ctx.fill();
          ctx.stroke();
        }

        // Supercar Chassis (Procedural Multi-Tier Metallic Vector)
        const carGrad = ctx.createLinearGradient(-carHalfW, 0, carHalfW, 0);
        if (betTier === 3) {
          // Forged Obsidian Carbon & Imperial Solar Gold
          carGrad.addColorStop(0, '#09090b');
          carGrad.addColorStop(0.25, '#78350f');
          carGrad.addColorStop(0.5, '#18181b');
          carGrad.addColorStop(0.75, '#78350f');
          carGrad.addColorStop(1, '#09090b');
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.8;
          ctx.shadowColor = 'rgba(250, 204, 21, 0.4)';
          ctx.shadowBlur = 8;
        } else if (betTier === 2) {
          // Midnight Blue & Carbon
          carGrad.addColorStop(0, '#030712');
          carGrad.addColorStop(0.3, '#1e1b4b');
          carGrad.addColorStop(0.5, '#0f172a');
          carGrad.addColorStop(0.7, '#1e1b4b');
          carGrad.addColorStop(1, '#030712');
          ctx.strokeStyle = '#06b6d4';
          ctx.lineWidth = 1.5;
          ctx.shadowColor = 'rgba(6, 182, 212, 0.35)';
          ctx.shadowBlur = 6;
        } else {
          // Standard Graphite
          carGrad.addColorStop(0, '#0f172a');
          carGrad.addColorStop(0.5, '#334155');
          carGrad.addColorStop(1, '#0f172a');
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1.2;
        }

        ctx.fillStyle = carGrad;
        ctx.beginPath();
        ctx.roundRect(-carHalfW, -carHalfH, carWidth, carHeight, [12, 12, 4, 4]);
        ctx.fill();
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Dual Racing Stripes (Tier 2 & 3)
        if (betTier === 3) {
          // Gold Cybernetic Racing Stripes
          ctx.fillStyle = 'rgba(250, 204, 21, 0.85)';
          ctx.fillRect(-6, -carHalfH, 3, carHeight);
          ctx.fillRect(3, -carHalfH, 3, carHeight);
        } else if (betTier === 2) {
          // Electric Cyan Stripes
          ctx.fillStyle = 'rgba(34, 211, 238, 0.8)';
          ctx.fillRect(-5, -carHalfH, 2.5, carHeight);
          ctx.fillRect(2.5, -carHalfH, 2.5, carHeight);
        }

        // Cockpit Canopy (Dark Glass)
        const canopyW = carWidth * 0.58;
        const roofGrad = ctx.createLinearGradient(0, -carHalfH - 8, 0, -carHalfH + 4);
        roofGrad.addColorStop(0, '#020617');
        roofGrad.addColorStop(1, betTier === 3 ? '#292524' : betTier === 2 ? '#082f49' : '#1e293b');
        ctx.fillStyle = roofGrad;
        ctx.beginPath();
        ctx.roundRect(-canopyW / 2, -carHalfH - 8, canopyW, 14, [6, 6, 2, 2]);
        ctx.fill();

        // Roof Ram-Air Intake Scoop with Plasma Core (Tier 3 Exclusive)
        if (betTier === 3) {
          ctx.fillStyle = '#0f172a';
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.roundRect(-7, -carHalfH - 14, 14, 7, [3, 3, 1, 1]);
          ctx.fill();
          ctx.stroke();

          // Pulsing Plasma Core inside scoop
          const scoopPulse = 0.5 + Math.sin(now * 0.01) * 0.5;
          ctx.fillStyle = `rgba(34, 211, 238, ${0.5 + scoopPulse * 0.5})`;
          ctx.beginPath();
          ctx.arc(0, -carHalfH - 10, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Rear Racing Wing / Spoiler
        const wingW = carWidth + (betTier === 3 ? 16 : betTier === 2 ? 10 : 8);
        ctx.fillStyle = '#090d16';
        ctx.strokeStyle = betTier === 3 ? '#facc15' : betTier === 2 ? '#06b6d4' : '#f59e0b';
        ctx.lineWidth = betTier === 3 ? 2 : 1.5;

        if (betTier === 3) {
          // Triple-deck Active-Aero Hyper Wing
          ctx.beginPath();
          ctx.roundRect(-wingW / 2, -carHalfH - 12, wingW, 4.5, 2);
          ctx.fill();
          ctx.stroke();

          // Endplate strakes
          ctx.fillStyle = '#facc15';
          ctx.fillRect(-wingW / 2 - 2, -carHalfH - 15, 3, 10);
          ctx.fillRect(wingW / 2 - 1, -carHalfH - 15, 3, 10);
        } else if (betTier === 2) {
          // Dual-Deck Carbon GT Wing
          ctx.beginPath();
          ctx.roundRect(-wingW / 2, -carHalfH - 10, wingW, 4, 2);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#06b6d4';
          ctx.fillRect(-wingW / 2 - 1, -carHalfH - 12, 2.5, 8);
          ctx.fillRect(wingW / 2 - 1.5, -carHalfH - 12, 2.5, 8);
        } else {
          // Single Rear Wing
          ctx.beginPath();
          ctx.roundRect(-wingW / 2, -carHalfH - 10, wingW, 4, 2);
          ctx.fill();
          ctx.stroke();
        }

        // Taillight Configuration
        ctx.save();
        if (betTier === 3) {
          // Cyber-Optic Full-Width Solar Gold & Crimson Taillight
          ctx.strokeStyle = '#ef4444';
          ctx.shadowColor = '#facc15';
          ctx.shadowBlur = 14;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-carHalfW + 6, -2);
          ctx.lineTo(carHalfW - 6, -2);
          ctx.stroke();

          // Center Gold LED Segment
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(-10, -2);
          ctx.lineTo(10, -2);
          ctx.stroke();
        } else if (betTier === 2) {
          // Dual-Tier Cyan & Crimson Taillight
          ctx.strokeStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-carHalfW + 6, -2);
          ctx.lineTo(carHalfW - 6, -2);
          ctx.stroke();

          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(-12, 2);
          ctx.lineTo(12, 2);
          ctx.stroke();
        } else {
          // Standard Single Red Lightbar
          ctx.strokeStyle = '#ef4444';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 10;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(-22, -2);
          ctx.lineTo(22, -2);
          ctx.stroke();
        }
        ctx.shadowBlur = 0;
        ctx.restore();

        // Exhaust Pipe Outlets
        ctx.fillStyle = betTier === 3 ? '#facc15' : betTier === 2 ? '#38bdf8' : '#94a3b8';
        if (betTier === 3) {
          for (const offX of [-18, -6, 6, 18]) {
            ctx.beginPath();
            ctx.arc(offX, carHalfH - 2, 3.2, 0, Math.PI * 2);
            ctx.fill();
          }
        } else if (betTier === 2) {
          for (const offX of [-17, -9, 9, 17]) {
            ctx.beginPath();
            ctx.arc(offX, carHalfH - 2, 2.8, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.beginPath();
          ctx.arc(-14, carHalfH - 2, 3, 0, Math.PI * 2);
          ctx.arc(14, carHalfH - 2, 3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();

        // Road Barrier Obstacle on Crash Collision
        if (isCrashed) {
          drawRoadBarrier(ctx, carX + 8, carY - 26, 92, 32, true, now);

          // Continuous crash engine smoke
          if (Math.random() > 0.45) {
            smokePuffsRef.current.push({
              x: carX + (Math.random() - 0.5) * 22,
              y: carY - 22,
              vx: (Math.random() - 0.5) * 1.2,
              vy: -1.4 - Math.random() * 2,
              size: 5 + Math.random() * 7,
              alpha: 0.7,
              color: Math.random() > 0.5 ? 'rgba(55, 65, 81, 0.75)' : 'rgba(30, 41, 59, 0.75)',
              life: 0,
              maxLife: 35 + Math.random() * 25,
            });
          }
        }

        // Victory Gold Underglow on Cashout
        if (userCashout) {
          ctx.save();
          ctx.fillStyle = 'rgba(250, 204, 21, 0.35)';
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 24;
          ctx.beginPath();
          ctx.ellipse(carX, carY + 12, 36, 12, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Telemetry HUD (Speedometer / Tachometer on left)
        if (phase === 'flying') {
          ctx.save();
          ctx.font = '800 10px ui-monospace, SFMono-Regular, monospace';
          ctx.fillStyle = betTier === 3 ? '#facc15' : betTier === 2 ? '#22d3ee' : '#f59e0b';
          ctx.textAlign = 'left';
          const tierTag = betTier === 3 ? 'HYPERCAR V16' : betTier === 2 ? 'TURBO GT V12' : 'SPORT COUPE';
          ctx.fillText(`SPEED: ${(160 + currentMultiplier * 55).toFixed(0)} KM/H • ${tierTag}`, 16, h - 28);
          ctx.fillStyle = 'rgba(156, 163, 175, 0.7)';
          ctx.fillText(`RPM: ${(4500 + Math.min(currentMultiplier * 750, 4500)).toFixed(0)} • NITRO TIER ${betTier}`, 16, h - 14);
          ctx.restore();
        }
      } else if (currentActiveTheme === 'chart') {
        // --- CANDLESTICK LIVE CHART RENDERING ---
        const candleCount = 14;
        const startX = 25;
        const availableWidth = w - 85;
        const candleWidth = (availableWidth / candleCount) * 0.65;
        const candleSpacing = availableWidth / candleCount;

        const chartBaseY = h * 0.82;
        const chartTopY = h * 0.22;
        const chartHeight = chartBaseY - chartTopY;

        ctx.save();

        // Dynamic Fibonacci Retracement Levels (Tier 3 VIP Whale)
        if (betTier === 3) {
          const fibLevels = [
            { ratio: 0.236, label: 'Fib 23.6%' },
            { ratio: 0.382, label: 'Fib 38.2%' },
            { ratio: 0.618, label: 'Fib 61.8% (Golden)' },
          ];
          ctx.save();
          ctx.lineWidth = 1;
          ctx.setLineDash([2, 4]);
          ctx.font = '700 8px ui-monospace, monospace';
          for (const fib of fibLevels) {
            const fibY = chartBaseY - chartHeight * fib.ratio;
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.3)';
            ctx.beginPath();
            ctx.moveTo(startX, fibY);
            ctx.lineTo(w - 75, fibY);
            ctx.stroke();
            ctx.fillStyle = 'rgba(250, 204, 21, 0.6)';
            ctx.textAlign = 'left';
            ctx.fillText(fib.label, startX + 4, fibY - 3);
          }
          ctx.setLineDash([]);
          ctx.restore();
        }

        // Draw Sequence of Bullish Japanese Candlesticks
        const points: Array<{ x: number; y: number }> = [];

        for (let i = 0; i < candleCount; i++) {
          const cx = startX + i * candleSpacing + candleSpacing / 2;
          const progressStep = (i + 1) / candleCount;

          // Multiplier elevation for this candle
          const candleMult = 1.0 + (currentMultiplier - 1.0) * Math.pow(progressStep, 1.4);
          const normHeight = Math.min(1, (candleMult - 1.0) / Math.max(0.5, currentMultiplier - 0.9));
          const closeY = chartBaseY - normHeight * (chartHeight * 0.85);
          const openY = i === 0 ? chartBaseY - 5 : points[i - 1]?.y || closeY + 12;

          const highY = Math.min(closeY, openY) - (3 + (i % 3) * 2.5);
          const lowY = Math.max(closeY, openY) + (2 + (i % 2) * 2);

          const isBullish = closeY <= openY;
          const candleColor = isBullish ? '#10b981' : '#ef4444';

          // Upper and Lower Wicks
          ctx.strokeStyle = candleColor;
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx, highY);
          ctx.lineTo(cx, lowY);
          ctx.stroke();

          // Candle Body
          ctx.fillStyle = candleColor;
          const bodyY = Math.min(openY, closeY);
          const bodyH = Math.max(3, Math.abs(closeY - openY));
          ctx.fillRect(cx - candleWidth / 2, bodyY, candleWidth, bodyH);

          points.push({ x: cx, y: closeY });
        }

        // Volume Surge Bars at Chart Base (Tier 2 & 3)
        if (betTier >= 2) {
          for (let i = 0; i < candleCount; i++) {
            const cx = startX + i * candleSpacing + candleSpacing / 2;
            const volH = 5 + ((i * 11) % 15) + (i === candleCount - 1 ? 12 : 0);
            const isGreen = points[i] && i > 0 && points[i].y <= points[i - 1].y;
            ctx.fillStyle = isGreen ? 'rgba(16, 185, 129, 0.4)' : 'rgba(239, 68, 68, 0.4)';
            ctx.fillRect(cx - candleWidth * 0.35, chartBaseY + 4, candleWidth * 0.7, volH);
          }
        }

        // Draw Moving Average Ribbon / Trend Curve
        if (points.length > 1) {
          if (betTier === 3) {
            // Radiant Golden VIP Exponential Trendline
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 2.5;
            ctx.shadowColor = '#f59e0b';
            ctx.shadowBlur = 10;
          } else {
            // Fast EMA 9 in Cyan
            ctx.strokeStyle = '#22d3ee';
            ctx.lineWidth = 2;
            ctx.shadowColor = '#22d3ee';
            ctx.shadowBlur = 6;
          }

          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let p = 1; p < points.length; p++) {
            ctx.lineTo(points[p].x, points[p].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Slow EMA 21 Ribbon Line (Tier 2 Pro)
          if (betTier === 2) {
            ctx.strokeStyle = 'rgba(16, 185, 129, 0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(points[0].x, points[0].y + 6);
            for (let p = 1; p < points.length; p++) {
              ctx.lineTo(points[p].x, points[p].y + 6);
            }
            ctx.stroke();
          }
        }

        // Live Horizontal Price Marker Dotted Line
        const lastPt = points[points.length - 1];
        if (lastPt) {
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          ctx.beginPath();
          ctx.moveTo(lastPt.x, lastPt.y);
          ctx.lineTo(w - 18, lastPt.y);
          ctx.stroke();
          ctx.setLineDash([]);

          // Right Price Tag
          ctx.fillStyle = '#10b981';
          ctx.beginPath();
          ctx.roundRect(w - 60, lastPt.y - 9, 44, 18, 4);
          ctx.fill();
          ctx.fillStyle = '#041d14';
          ctx.font = '700 9px ui-monospace, monospace';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${currentMultiplier.toFixed(2)}x`, w - 38, lastPt.y);
        }

        // Support Breakdown Cracks upon Crash
        if (phase === 'crashed') {
          ctx.save();
          ctx.strokeStyle = '#ef4444';
          ctx.lineWidth = 2.5;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.moveTo(w - 120, chartBaseY);
          ctx.lineTo(w - 85, chartBaseY + 8);
          ctx.lineTo(w - 60, chartBaseY - 4);
          ctx.lineTo(w - 20, chartBaseY + 12);
          ctx.stroke();
          ctx.restore();
        }

        // Golden Take-Profit Target Line on Cashout
        if (userCashout && lastPt) {
          ctx.save();
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(25, lastPt.y);
          ctx.lineTo(w - 25, lastPt.y);
          ctx.stroke();
          ctx.setLineDash([]);

          ctx.fillStyle = '#fbbf24';
          ctx.beginPath();
          ctx.roundRect(w - 85, lastPt.y - 10, 68, 20, 4);
          ctx.fill();
          ctx.fillStyle = '#451a03';
          ctx.font = '800 10px Vazirmatn, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('تارگت سود', w - 51, lastPt.y);
          ctx.restore();
        }

        ctx.restore();
      } else {
        // --- COSMIC ROCKET LAUNCH & FLIGHT ---
        const bottomMargin = 28;
        const rocketHeight = 60;
        const groundY = h - rocketHeight / 2 - bottomMargin;
        const flightCenterY = h * 0.52;

        let currentRocketY = groundY;
        let rocketRotation = 0;
        const skin = SKIN_CONFIGS[selectedSkinRef.current] || SKIN_CONFIGS.default;

        if (phase === 'betting') {
          currentRocketY = groundY;
          rocketYRef.current = currentRocketY;

          // Launchpad Platform
          ctx.save();
          const padX = w / 2;
          const padY = h - bottomMargin + 6;
          const padWidth = 140;

          const padGrad = ctx.createLinearGradient(padX - padWidth / 2, padY, padX + padWidth / 2, padY);
          padGrad.addColorStop(0, 'rgba(31, 41, 55, 0.1)');
          padGrad.addColorStop(0.5, 'rgba(75, 85, 99, 1)');
          padGrad.addColorStop(1, 'rgba(31, 41, 55, 0.1)');
          ctx.fillStyle = padGrad;
          ctx.beginPath();
          ctx.roundRect(padX - padWidth / 2, padY - 6, padWidth, 12, [4, 4, 0, 0]);
          ctx.fill();

          // Launch Gantry Clamps
          ctx.fillStyle = '#374151';
          ctx.fillRect(padX - 32, padY - 26, 6, 20);
          ctx.fillRect(padX + 26, padY - 26, 6, 20);
          ctx.restore();

          // Render Rocket standing on launchpad (Directly transforming with Bet Tier!)
          drawRocketCraft(
            ctx,
            w / 2,
            groundY - 6,
            0,
            betTier,
            skin,
            false,
            currentMultiplier,
            now,
            rocketImgRef.current
          );
        } else if (phase === 'flying') {
          const elapsed = Math.max(0, now - startTime);
          const takeoffProgress = Math.min(elapsed / 1400, 1);
          const easeOut = 1 - Math.pow(1 - takeoffProgress, 3);
          const hoverSway = Math.sin(now * 0.0035) * 4;

          currentRocketY = groundY + (flightCenterY - groundY) * easeOut + hoverSway;
          rocketRotation = Math.sin(now * 0.003) * 0.035;
          rocketYRef.current = currentRocketY;

          // Render Rocket soaring in space with Multi-Tier Thrusters and Afterburners!
          drawRocketCraft(
            ctx,
            w / 2,
            currentRocketY,
            rocketRotation,
            betTier,
            skin,
            true,
            currentMultiplier,
            now,
            rocketImgRef.current
          );

          // Spawn rocket exhaust particles during flight
          if (Math.random() > 0.3) {
            const pColors = skin.particleColors;
            const pickedColor = pColors[Math.floor(Math.random() * pColors.length)];
            exhaustParticlesRef.current.push({
              x: w / 2 + (Math.random() - 0.5) * 8,
              y: currentRocketY + 22,
              vx: (Math.random() - 0.5) * 1.5,
              vy: 2.2 + Math.random() * 3.5,
              size: 2.2 + Math.random() * 3,
              alpha: 0.8,
              color: pickedColor,
              life: 0,
              maxLife: 16 + Math.random() * 12,
            });
          }
        } else if (phase === 'crashed') {
          currentRocketY = crashAnimationRef.current.crashY || flightCenterY;
          if (now - crashAnimationRef.current.startTime < 160) {
            drawRocketCraft(
              ctx,
              w / 2,
              currentRocketY,
              0.35,
              betTier,
              skin,
              false,
              currentMultiplier,
              now,
              rocketImgRef.current
            );
          }
        }

        // Draw Space Asteroid Obstacle on Crash
        if (phase === 'crashed') {
          drawSpaceAsteroid(ctx, w / 2, currentRocketY - 26, 24, true, now);

          // Expanding Plasma Shockwave
          const crashElapsed = now - crashAnimationRef.current.startTime;
          if (crashElapsed < 600) {
            const shockRadius = (crashElapsed / 600) * (w * 0.35);
            const shockAlpha = 1 - crashElapsed / 600;
            ctx.save();
            ctx.strokeStyle = `rgba(249, 115, 22, ${shockAlpha})`;
            ctx.lineWidth = 3.5 * shockAlpha;
            ctx.shadowColor = '#ef4444';
            ctx.shadowBlur = 16;
            ctx.beginPath();
            ctx.arc(w / 2, currentRocketY - 14, shockRadius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
          }
        }

        // Golden Warp Energy Shield on Cashout
        if (userCashout) {
          ctx.save();
          ctx.strokeStyle = 'rgba(250, 204, 21, 0.75)';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 18;
          ctx.beginPath();
          ctx.ellipse(w / 2, currentRocketY, 32, 42, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = 'rgba(250, 204, 21, 0.12)';
          ctx.fill();
          ctx.restore();
        }
      }

      // Update & Draw Exhaust Particles
      for (let i = exhaustParticlesRef.current.length - 1; i >= 0; i--) {
        const p = exhaustParticlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life++;
        p.size *= 0.96;
        const pAlpha = p.alpha * (1 - p.life / p.maxLife);

        if (p.life >= p.maxLife || pAlpha <= 0) {
          exhaustParticlesRef.current.splice(i, 1);
          continue;
        }

        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, pAlpha);
        ctx.beginPath();
        ctx.arc(p.x, p.y, Math.max(0.5, p.size), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Update & Draw Explosion Debris Sparks (upon crash)
      if (explosionParticlesRef.current.length > 0) {
        ctx.save();
        for (let i = explosionParticlesRef.current.length - 1; i >= 0; i--) {
          const spark = explosionParticlesRef.current[i];
          spark.x += spark.vx;
          spark.y += spark.vy;
          spark.vy += 0.08;
          spark.life++;
          const sparkAlpha = spark.alpha * (1 - spark.life / spark.maxLife);

          if (spark.life >= spark.maxLife || sparkAlpha <= 0) {
            explosionParticlesRef.current.splice(i, 1);
            continue;
          }

          ctx.fillStyle = spark.color;
          ctx.globalAlpha = Math.max(0, sparkAlpha);
          ctx.beginPath();
          ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Update & Draw Collision Debris Chunks (Barrier & Asteroid pieces)
      if (debrisParticlesRef.current.length > 0) {
        ctx.save();
        for (let i = debrisParticlesRef.current.length - 1; i >= 0; i--) {
          const deb = debrisParticlesRef.current[i];
          deb.x += deb.vx;
          deb.y += deb.vy;
          deb.vy += 0.12; // gravity
          deb.rot += deb.vRot;
          deb.life++;
          const debAlpha = deb.alpha * (1 - deb.life / deb.maxLife);

          if (deb.life >= deb.maxLife || debAlpha <= 0) {
            debrisParticlesRef.current.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.translate(deb.x, deb.y);
          ctx.rotate(deb.rot);
          ctx.fillStyle = deb.color;
          ctx.globalAlpha = Math.max(0, debAlpha);
          if (deb.shape === 'shingle') {
            ctx.fillRect(-deb.size, -deb.size * 0.4, deb.size * 2, deb.size * 0.8);
          } else {
            ctx.fillRect(-deb.size / 2, -deb.size / 2, deb.size, deb.size);
          }
          ctx.restore();
        }
        ctx.restore();
      }

      // Update & Draw Rising Smoke Puffs
      if (smokePuffsRef.current.length > 0) {
        ctx.save();
        for (let i = smokePuffsRef.current.length - 1; i >= 0; i--) {
          const puff = smokePuffsRef.current[i];
          puff.x += puff.vx;
          puff.y += puff.vy;
          puff.size += 0.22;
          puff.life++;
          const puffAlpha = puff.alpha * (1 - puff.life / puff.maxLife);

          if (puff.life >= puff.maxLife || puffAlpha <= 0) {
            smokePuffsRef.current.splice(i, 1);
            continue;
          }

          ctx.fillStyle = puff.color;
          ctx.globalAlpha = Math.max(0, puffAlpha);
          ctx.beginPath();
          ctx.arc(puff.x, puff.y, puff.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // Update & Draw Victory Confetti Ribbons
      if (confettiParticlesRef.current.length > 0) {
        ctx.save();
        for (let i = confettiParticlesRef.current.length - 1; i >= 0; i--) {
          const c = confettiParticlesRef.current[i];
          c.x += c.vx;
          c.y += c.vy;
          c.vy += 0.06;
          c.rot += c.vRot;
          c.life++;
          const cAlpha = c.alpha * (1 - c.life / c.maxLife);

          if (c.life >= c.maxLife || cAlpha <= 0) {
            confettiParticlesRef.current.splice(i, 1);
            continue;
          }

          ctx.save();
          ctx.translate(c.x, c.y);
          ctx.rotate(c.rot);
          ctx.fillStyle = c.color;
          ctx.globalAlpha = Math.max(0, cAlpha);
          ctx.fillRect(-c.sizeW / 2, -c.sizeH / 2, c.sizeW, c.sizeH);
          ctx.restore();
        }
        ctx.restore();
      }

      // =========================================================================
      // CANVAS VEHICLE TIER HUD BADGE (TOP-LEFT)
      // =========================================================================
      ctx.save();
      const badgeX = 14;
      const badgeY = 14;
      const badgeH = 24;

      let badgeLabel = '';
      let badgeBorder = '';
      let badgeGlow = '';
      let badgeBg = '';
      let badgeTextColor = '';

      if (currentActiveTheme === 'racing') {
        if (betTier === 3) {
          badgeLabel = `👑 هایپرکار ${betAmount} سکه`;
          badgeBorder = 'rgba(250, 204, 21, 0.85)';
          badgeGlow = '#f59e0b';
          badgeBg = 'rgba(69, 26, 3, 0.85)';
          badgeTextColor = '#fde047';
        } else if (betTier === 2) {
          badgeLabel = `⚡ توربو V12 ${betAmount} سکه`;
          badgeBorder = 'rgba(6, 182, 212, 0.85)';
          badgeGlow = '#06b6d4';
          badgeBg = 'rgba(8, 47, 73, 0.85)';
          badgeTextColor = '#67e8f9';
        } else {
          badgeLabel = `🏎️ کوپه ${betAmount} سکه`;
          badgeBorder = 'rgba(245, 158, 11, 0.55)';
          badgeGlow = '#f59e0b';
          badgeBg = 'rgba(30, 41, 59, 0.8)';
          badgeTextColor = '#fcd34d';
        }
      } else if (currentActiveTheme === 'chart') {
        if (betTier === 3) {
          badgeLabel = `👑 وال VIP ${betAmount} سکه`;
          badgeBorder = 'rgba(250, 204, 21, 0.85)';
          badgeGlow = '#f59e0b';
          badgeBg = 'rgba(69, 26, 3, 0.85)';
          badgeTextColor = '#fde047';
        } else if (betTier === 2) {
          badgeLabel = `⚡ پرو تریدر ${betAmount} سکه`;
          badgeBorder = 'rgba(16, 185, 129, 0.85)';
          badgeGlow = '#10b981';
          badgeBg = 'rgba(6, 78, 59, 0.85)';
          badgeTextColor = '#6ee7b7';
        } else {
          badgeLabel = `📊 استاندارد ${betAmount} سکه`;
          badgeBorder = 'rgba(16, 185, 129, 0.55)';
          badgeGlow = '#10b981';
          badgeBg = 'rgba(30, 41, 59, 0.8)';
          badgeTextColor = '#a7f3d0';
        }
      } else {
        if (betTier === 3) {
          badgeLabel = `👑 دردنات کیهانی ${betAmount} سکه`;
          badgeBorder = 'rgba(250, 204, 21, 0.85)';
          badgeGlow = '#f59e0b';
          badgeBg = 'rgba(69, 26, 3, 0.85)';
          badgeTextColor = '#fde047';
        } else if (betTier === 2) {
          badgeLabel = `⚡ فانتوم ${betAmount} سکه`;
          badgeBorder = 'rgba(6, 182, 212, 0.85)';
          badgeGlow = '#06b6d4';
          badgeBg = 'rgba(8, 47, 73, 0.85)';
          badgeTextColor = '#67e8f9';
        } else {
          badgeLabel = `🚀 فالکون ${betAmount} سکه`;
          badgeBorder = 'rgba(234, 179, 8, 0.55)';
          badgeGlow = '#eab308';
          badgeBg = 'rgba(30, 41, 59, 0.8)';
          badgeTextColor = '#fef08a';
        }
      }

      ctx.direction = 'rtl';
      ctx.font = '700 11px Vazirmatn, sans-serif';
      const textW = ctx.measureText(badgeLabel).width;
      const badgeW = textW + 16;

      ctx.fillStyle = badgeBg;
      ctx.strokeStyle = badgeBorder;
      ctx.lineWidth = 1.2;
      if (betTier >= 2) {
        ctx.shadowColor = badgeGlow;
        ctx.shadowBlur = 10;
      }
      ctx.beginPath();
      ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 12);
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = badgeTextColor;
      ctx.fillText(badgeLabel, badgeX + badgeW / 2, badgeY + badgeH / 2 + 1);
      ctx.restore();

      // =========================================================================
      // COCKPIT REACTIVE HUD DISPLAY SCREEN (REACTIONS TO CRASH & WIN)
      // =========================================================================
      drawThemeDisplayScreen(
        ctx,
        w / 2,
        34,
        w,
        currentActiveTheme,
        phase,
        userBet,
        userCashout,
        currentMultiplier,
        crashPoint || 1.0,
        betTier,
        betAmount,
        now
      );

      // =========================================================================
      // UPGRADE SHOCKWAVE PULSE EFFECTS (AROUND VEHICLE)
      // =========================================================================
      if (shockwavesRef.current.length > 0) {
        const activeShockwaves: Shockwave[] = [];

        for (let i = 0; i < shockwavesRef.current.length; i++) {
          const sw = shockwavesRef.current[i];
          const elapsed = now - sw.startTime;
          if (elapsed < sw.duration) {
            activeShockwaves.push(sw);
            const progress = elapsed / sw.duration;
            const ease = 1 - Math.pow(1 - progress, 3);
            const currentRadius = 16 + (sw.maxRadius - 16) * ease;
            const alpha = Math.max(0, (1 - progress) * (sw.tier === 3 ? 0.95 : 0.85));

            ctx.save();

            // 1. Primary Glowing Electric Ring
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, currentRadius, 0, Math.PI * 2);
            ctx.strokeStyle = sw.tier === 3 ? `rgba(251, 191, 36, ${alpha})` : `rgba(34, 211, 238, ${alpha})`;
            ctx.lineWidth = (sw.tier === 3 ? 3.5 : 2.5) * (1 - progress * 0.7);
            ctx.shadowColor = sw.tier === 3 ? '#f59e0b' : '#06b6d4';
            ctx.shadowBlur = sw.tier === 3 ? 24 : 16;
            ctx.stroke();

            // 2. High-Frequency Pulsing Inner Electric Wave
            const innerRadius = Math.max(8, currentRadius * 0.72);
            ctx.beginPath();
            ctx.arc(sw.x, sw.y, innerRadius, 0, Math.PI * 2);
            ctx.strokeStyle = sw.tier === 3 ? `rgba(254, 240, 138, ${alpha * 0.85})` : `rgba(165, 243, 252, ${alpha * 0.85})`;
            ctx.lineWidth = 1.6;
            ctx.setLineDash([8, 6]);
            ctx.lineDashOffset = -now * 0.04;
            ctx.stroke();
            ctx.setLineDash([]);

            // 3. High-Voltage Electric Discharge Lightning Arcs
            sw.sparks.forEach((sp) => {
              const sparkBaseDist = currentRadius * 0.85 + sp.dist * progress * 0.6;
              const sx = sw.x + Math.cos(sp.angle) * sparkBaseDist;
              const sy = sw.y + Math.sin(sp.angle) * sparkBaseDist;
              const ex = sx + Math.cos(sp.angle) * (sp.length * (1 - progress * 0.4));
              const ey = sy + Math.sin(sp.angle) * (sp.length * (1 - progress * 0.4));

              ctx.beginPath();
              ctx.moveTo(sx, sy);
              const midX = (sx + ex) / 2 + Math.sin(now * 0.08 + sp.angle) * 5;
              const midY = (sy + ey) / 2 + Math.cos(now * 0.08 + sp.angle) * 5;
              ctx.lineTo(midX, midY);
              ctx.lineTo(ex, ey);
              ctx.strokeStyle = sw.tier === 3 ? `rgba(255, 255, 255, ${alpha * 0.95})` : `rgba(224, 242, 254, ${alpha * 0.95})`;
              ctx.lineWidth = 1.8;
              ctx.stroke();
            });

            // 4. Floating Upgrade Toast Badge above Vehicle
            const toastY = sw.y - (currentActiveTheme === 'racing' ? 52 : 58) - progress * 26;
            const toastText =
              sw.tier === 3
                ? currentActiveTheme === 'racing'
                  ? '👑 هایپرکار ۱۰۰ • شتاب مکس'
                  : currentActiveTheme === 'chart'
                  ? '👑 وال VIP ۱۰۰ • نوسان طلایی'
                  : '👑 ناوبر کیهانی ۱۰۰ • لول مکس'
                : currentActiveTheme === 'racing'
                ? '⚡ توربو V12 ۵۰ • بوست نیترو'
                : currentActiveTheme === 'chart'
                ? '⚡ تریدر ۵۰ • تحلیل پیشرفته'
                : '⚡ فانتوم ۵۰ • پیشران دوگانه';

            ctx.direction = 'rtl';
            ctx.font = 'bold 11px Vazirmatn, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textWidth = ctx.measureText(toastText).width;
            const boxW = textWidth + 22;
            const boxH = 22;

            ctx.fillStyle = sw.tier === 3 ? `rgba(24, 20, 10, ${alpha * 0.88})` : `rgba(8, 20, 32, ${alpha * 0.88})`;
            ctx.strokeStyle = sw.tier === 3 ? `rgba(245, 158, 11, ${alpha * 0.95})` : `rgba(6, 182, 212, ${alpha * 0.95})`;
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.roundRect(sw.x - boxW / 2, toastY - boxH / 2, boxW, boxH, 8);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = sw.tier === 3 ? `rgba(253, 224, 71, ${alpha})` : `rgba(103, 232, 249, ${alpha})`;
            ctx.fillText(toastText, sw.x, toastY);

            ctx.restore();
          }
        }
        shockwavesRef.current = activeShockwaves;
      }

      // =========================================================================
      // COUNTDOWN & MULTIPLIER DISPLAY (WITH LOOP UX FIX)
      // =========================================================================
      if (phase === 'betting') {
        const timeLeft = Math.max(0, betEndTime - now);
        const secondsLeft = Math.ceil(timeLeft / 1000);

        if (secondsLeft !== lastCountdownSecondRef.current && secondsLeft > 0 && secondsLeft <= 15) {
          lastCountdownSecondRef.current = secondsLeft;
          triggerHapticCountdown(secondsLeft);
        }

        const totalBetTime = 15000;
        const progress = Math.max(0, Math.min(1, timeLeft / totalBetTime));
        const cx = w / 2;
        const cy = h * 0.38;
        const radius = Math.min(w, h) * 0.14;

        ctx.save();

        if (timeLeft <= 0) {
          // --- UX FIX: AVOID FROZEN '0' IN LOOP ---
          const readyLabel =
            currentActiveTheme === 'racing'
              ? 'استارت مسابقه...'
              : currentActiveTheme === 'chart'
              ? 'آغاز معاملات...'
              : 'آماده پرتاب...';

          ctx.direction = 'rtl';
          ctx.font = '700 13px Vazirmatn, sans-serif';
          ctx.fillStyle = '#4ade80';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(readyLabel, cx, cy);
        } else {
          // Subtle dial background circle
          ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
          ctx.strokeStyle = 'rgba(55, 65, 81, 0.3)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Sleek progress arc ring
          ctx.lineWidth = 3.5;
          ctx.lineCap = 'round';
          const ringColor =
            currentActiveTheme === 'racing'
              ? progress < 0.25 ? '#ef4444' : '#f59e0b'
              : currentActiveTheme === 'chart'
              ? progress < 0.25 ? '#ef4444' : '#10b981'
              : progress < 0.25 ? '#ef4444' : progress < 0.5 ? '#facc15' : '#22c55e';

          ctx.strokeStyle = ringColor;
          ctx.shadowColor = ctx.strokeStyle;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * progress);
          ctx.stroke();
          ctx.shadowBlur = 0;

          // Tabular Monospace Countdown Digits
          const digitSize = Math.round(radius * 0.95);
          ctx.direction = 'ltr';
          ctx.font = `800 ${digitSize}px ui-monospace, SFMono-Regular, "Roboto Mono", monospace`;
          ctx.fillStyle = progress < 0.25 ? '#ef4444' : '#ffffff';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(secondsLeft.toString(), cx, cy + 1);

          // Subtitle pill
          ctx.direction = 'rtl';
          ctx.font = '600 11px Vazirmatn, sans-serif';
          ctx.fillStyle = 'rgba(156, 163, 175, 0.8)';
          const subtitle =
            currentActiveTheme === 'racing'
              ? 'زمان تا استارت مسابقه'
              : currentActiveTheme === 'chart'
              ? 'پیش‌گشایش بازار'
              : 'زمان ثبت شرط';
          ctx.fillText(subtitle, cx, cy + radius + 14);
        }
        ctx.restore();
      }

      // Central Multiplier Display in Flying and Crashed
      if (phase === 'flying' || phase === 'crashed') {
        const cx = w / 2;
        const cy = h * 0.34;
        const isCrashed = phase === 'crashed';

        ctx.save();
        ctx.direction = 'rtl';
        ctx.font = '700 12px Vazirmatn, Raleway, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const badgeText = isCrashed
          ? currentActiveTheme === 'racing'
            ? 'تصادف در پیست • پایان راند'
            : currentActiveTheme === 'chart'
            ? 'ریزش بازار • پایان راند'
            : 'انفجار موشک • پایان راند'
          : currentActiveTheme === 'racing'
          ? 'شتاب مسابقه • ضریب زنده'
          : currentActiveTheme === 'chart'
          ? 'شاخص مارکت • سود لحظه‌ای'
          : 'ضریب پرواز لحظه‌ای';

        const badgeColor = isCrashed ? '#f87171' : currentActiveTheme === 'racing' ? '#fbbf24' : currentActiveTheme === 'chart' ? '#34d399' : '#fde047';
        ctx.fillStyle = badgeColor;
        ctx.fillText(badgeText, cx, cy - Math.max(34, h * 0.11));

        // Display Font Multiplier Digits
        const fontSize = Math.round(Math.min(w * 0.11, h * 0.22));
        ctx.direction = 'ltr';
        ctx.font = `800 ${fontSize}px ui-monospace, SFMono-Regular, "Roboto Mono", monospace, Vazirmatn`;

        const multText = `${currentMultiplier.toFixed(2)}x`;

        ctx.strokeStyle = '#090a10';
        ctx.lineWidth = Math.max(6, Math.round(fontSize * 0.12));
        ctx.strokeText(multText, cx, cy);

        if (isCrashed) {
          ctx.fillStyle = '#dc2626';
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur = 24;
        } else {
          ctx.fillStyle = currentActiveTheme === 'racing' ? '#f59e0b' : currentActiveTheme === 'chart' ? '#10b981' : '#facc15';
          ctx.shadowColor = ctx.fillStyle;
          ctx.shadowBlur = 20;
        }

        ctx.fillText(multText, cx, cy);
        ctx.shadowBlur = 0;
        ctx.restore();
      }

      // Minimalist Action Feedback Toast
      let statusMsg = '';
      let statusColor = '#ffffff';
      let statusBg = 'rgba(31, 41, 55, 0.75)';
      let statusBorder = 'rgba(75, 85, 99, 0.5)';

      if (userBet && userCashout) {
        statusMsg = `خروج موفق! برد ${(userBet * userCashout).toFixed(1)} سکه با ضریب ${userCashout.toFixed(2)}x`;
        statusColor = '#facc15';
        statusBg = 'rgba(113, 63, 18, 0.85)';
        statusBorder = 'rgba(250, 204, 21, 0.6)';
      } else if (phase === 'flying' && userBet) {
        statusMsg =
          currentActiveTheme === 'racing'
            ? 'سوپراسپرت در حال شتاب • آماده خروج باشید!'
            : currentActiveTheme === 'chart'
            ? 'بازار در حال صعود • آماده سیو سود باشید!'
            : 'موشک در مدار • آماده خروج باشید!';
        statusColor = '#67e8f9';
        statusBg = 'rgba(12, 74, 96, 0.8)';
        statusBorder = 'rgba(56, 189, 248, 0.5)';
      } else if (phase === 'crashed' && userBet && !userCashout) {
        statusMsg =
          currentActiveTheme === 'racing'
            ? `تصادف در ضریب ${crashPoint.toFixed(2)}x`
            : currentActiveTheme === 'chart'
            ? `ریزش قیمت در ضریب ${crashPoint.toFixed(2)}x`
            : `انفجار در ضریب ${crashPoint.toFixed(2)}x`;
        statusColor = '#f87171';
        statusBg = 'rgba(127, 29, 29, 0.85)';
        statusBorder = 'rgba(239, 68, 68, 0.6)';
      }

      if (statusMsg) {
        ctx.save();
        const bannerY = h * 0.86;
        ctx.font = '700 13px Vazirmatn, Raleway, sans-serif';
        const textWidth = ctx.measureText(statusMsg).width;
        const bannerWidth = Math.min(w - 32, textWidth + 36);
        const bannerHeight = 30;

        ctx.fillStyle = statusBg;
        ctx.strokeStyle = statusBorder;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(w / 2 - bannerWidth / 2, bannerY - bannerHeight / 2, bannerWidth, bannerHeight, 8);
        ctx.fill();
        ctx.stroke();

        ctx.direction = 'rtl';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = statusColor;
        ctx.fillText(statusMsg, w / 2, bannerY);
        ctx.restore();
      }

      ctx.restore(); // Restore camera shake

      requestRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [phase, startTime, crashPoint, crashTime, betEndTime, width, height, userBet, userCashout, sessionId]);

  return (
    <div
      ref={containerRef}
      dir="ltr"
      className="w-full h-full relative flex items-center justify-center select-none overflow-hidden rounded-2xl"
    >
      <canvas
        ref={canvasRef}
        className="block w-full h-full rounded-2xl overflow-hidden pointer-events-none"
      />
    </div>
  );
}

export default memo(PhaserGame);
