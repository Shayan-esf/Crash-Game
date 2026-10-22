'use client';

import { useStore } from '@/lib/store';
import { triggerHapticCountdown, triggerHapticCrash } from '@/lib/telegramHaptics';
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
  betTier?: 1 | 2 | 3;
  betAmount?: number;
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

function drawCheckeredFlags(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  flutter: number
) {
  ctx.save();
  ctx.translate(x, y);

  // پرچم چپ (-28 درجه)
  ctx.save();
  ctx.rotate(-0.48);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -22 * scale);
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, -22 * scale, 2.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  const fw = 13 * scale;
  const fh = 9 * scale;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#090a10' : '#ffffff';
      const wave = Math.sin(flutter + c * 0.9) * (1.5 * scale);
      ctx.fillRect(-fw + c * (fw / 3), -22 * scale + r * (fh / 3) + wave, fw / 3 + 0.5, fh / 3 + 0.5);
    }
  }
  ctx.restore();

  // پرچم راست (+28 درجه)
  ctx.save();
  ctx.rotate(0.48);
  ctx.strokeStyle = '#f59e0b';
  ctx.lineWidth = 2 * scale;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -22 * scale);
  ctx.stroke();
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.arc(0, -22 * scale, 2.5 * scale, 0, Math.PI * 2);
  ctx.fill();

  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      ctx.fillStyle = (r + c) % 2 === 0 ? '#090a10' : '#ffffff';
      const wave = Math.sin(flutter + Math.PI + c * 0.9) * (1.5 * scale);
      ctx.fillRect(c * (fw / 3), -22 * scale + r * (fh / 3) + wave, fw / 3 + 0.5, fh / 3 + 0.5);
    }
  }
  ctx.restore();

  ctx.restore();
}

function drawTrophyCup(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save();
  ctx.translate(x, y);

  // پایه کاپ
  ctx.fillStyle = '#92400e';
  ctx.fillRect(-9 * scale, 10 * scale, 18 * scale, 4 * scale);
  ctx.fillStyle = '#b45309';
  ctx.fillRect(-6 * scale, 6 * scale, 12 * scale, 4 * scale);

  // ساقه
  ctx.fillStyle = '#fbbf24';
  ctx.fillRect(-2.5 * scale, 1 * scale, 5 * scale, 5 * scale);

  // کاسه کاپ
  const cupGrad = ctx.createLinearGradient(-10 * scale, -14 * scale, 10 * scale, 1 * scale);
  cupGrad.addColorStop(0, '#fef08a');
  cupGrad.addColorStop(0.5, '#f59e0b');
  cupGrad.addColorStop(1, '#b45309');
  ctx.fillStyle = cupGrad;
  ctx.beginPath();
  ctx.moveTo(-10 * scale, -13 * scale);
  ctx.lineTo(10 * scale, -13 * scale);
  ctx.bezierCurveTo(9 * scale, -2 * scale, 6 * scale, 1 * scale, 0, 1 * scale);
  ctx.bezierCurveTo(-6 * scale, 1 * scale, -9 * scale, -2 * scale, -10 * scale, -13 * scale);
  ctx.closePath();
  ctx.fill();

  // دسته‌های کاپ
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 1.8 * scale;
  ctx.beginPath();
  ctx.arc(-10 * scale, -7 * scale, 4.5 * scale, Math.PI * 0.5, Math.PI * 1.5);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(10 * scale, -7 * scale, 4.5 * scale, -Math.PI * 0.5, Math.PI * 0.5);
  ctx.stroke();

  // ستاره درخشان روی کاپ
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(0, -6 * scale, 2 * scale, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
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
  now: number
) {
  const panelW = Math.min(w * 0.76, 240);
  const panelH = 50;
  const scale = panelW / 240;
  const isWon = Boolean(userCashout);
  const isCrashed = phase === 'crashed' && !isWon;

  ctx.save();
  ctx.translate(cx, cy);

  // شیشه پنل نمایشگر دیجیتال
  const bgGrad = ctx.createLinearGradient(0, -panelH / 2, 0, panelH / 2);
  bgGrad.addColorStop(0, 'rgba(10, 14, 26, 0.94)');
  bgGrad.addColorStop(1, 'rgba(4, 7, 15, 0.96)');
  ctx.fillStyle = bgGrad;

  const borderColor = isWon
    ? '#fbbf24'
    : isCrashed
    ? '#ef4444'
    : theme === 'racing'
    ? '#f59e0b'
    : theme === 'chart'
    ? '#10b981'
    : '#06b6d4';

  ctx.strokeStyle = borderColor;
  ctx.lineWidth = isWon ? 1.8 : 1.2;
  ctx.shadowColor = borderColor;
  ctx.shadowBlur = isWon ? 14 : isCrashed ? 10 : 6;

  ctx.beginPath();
  ctx.roundRect(-panelW / 2, -panelH / 2, panelW, panelH, 8);
  ctx.fill();
  ctx.stroke();
  ctx.shadowBlur = 0;

  // گوشه‌های سایبرنتیک نمایشگر
  const cw = 6 * scale;
  ctx.strokeStyle = isWon ? '#fef08a' : '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-panelW / 2 + cw + 3, -panelH / 2 + 3);
  ctx.lineTo(-panelW / 2 + 3, -panelH / 2 + 3);
  ctx.lineTo(-panelW / 2 + 3, -panelH / 2 + cw + 3);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(panelW / 2 - cw - 3, panelH / 2 - 3);
  ctx.lineTo(panelW / 2 - 3, panelH / 2 - 3);
  ctx.lineTo(panelW / 2 - 3, panelH / 2 - cw - 3);
  ctx.stroke();

  if (isWon) {
    // --- نماد پیروزی روی نمایشگر ---
    if (theme === 'racing') {
      // پرچم‌های شطرنجی پیروزی در سمت چپ
      drawCheckeredFlags(ctx, -panelW / 2 + 28 * scale, 5 * scale, scale * 1.1, now * 0.008);
      // کاپ طلایی قهرمانی در وسط
      drawTrophyCup(ctx, -panelW / 2 + 65 * scale, 2 * scale, scale * 0.95);
    } else if (theme === 'chart') {
      drawTrophyCup(ctx, -panelW / 2 + 34 * scale, 2 * scale, scale * 1.05);
      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2 * scale;
      ctx.beginPath();
      ctx.arc(-panelW / 2 + 66 * scale, 0, 7 * scale, 0, Math.PI);
      ctx.stroke();
      ctx.restore();
    } else {
      drawTrophyCup(ctx, -panelW / 2 + 34 * scale, 2 * scale, scale * 1.05);
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(-panelW / 2 + 66 * scale, 0, 4 * scale, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    ctx.font = `800 ${Math.round(11 * scale)}px Vazirmatn, sans-serif`;
    ctx.fillStyle = '#fef08a';
    const wonTitle =
      theme === 'racing'
        ? 'پیروزی مسابقه • برد قطعی'
        : theme === 'chart'
        ? 'تارگت سود • موفقیت معاملاتی'
        : 'ماموریت موفق • پرواز در مدار';
    ctx.fillText(wonTitle, panelW / 2 - 12 * scale, -panelH / 2 + 18 * scale);

    const wonCoins = ((userBet || 10) * (userCashout || 1.0)).toFixed(1);
    ctx.font = `800 ${Math.round(12 * scale)}px ui-monospace, Vazirmatn, sans-serif`;
    ctx.fillStyle = '#34d399';
    ctx.fillText(`+${wonCoins} سکه (${userCashout?.toFixed(2)}x)`, panelW / 2 - 12 * scale, panelH / 2 - 12 * scale);
  } else if (isCrashed) {
    // --- هشدار برخورد / ریزش روی نمایشگر ---
    const strobe = Math.sin(now * 0.018) > 0;
    ctx.save();
    ctx.fillStyle = strobe ? '#ef4444' : '#b91c1c';
    ctx.strokeStyle = '#fef08a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-panelW / 2 + 30 * scale, -13 * scale);
    ctx.lineTo(-panelW / 2 + 44 * scale, 13 * scale);
    ctx.lineTo(-panelW / 2 + 16 * scale, 13 * scale);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${Math.round(12 * scale)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('!', -panelW / 2 + 30 * scale, 3 * scale);
    ctx.restore();

    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    ctx.font = `800 ${Math.round(11 * scale)}px Vazirmatn, sans-serif`;
    ctx.fillStyle = '#f87171';
    const crashTitle =
      theme === 'racing'
        ? 'تصادف شدید • برخورد با مانع'
        : theme === 'chart'
        ? 'شکست حمایت • ریزش بازار'
        : 'برخورد سیارک • انفجار مدار';
    ctx.fillText(crashTitle, panelW / 2 - 12 * scale, -panelH / 2 + 18 * scale);

    ctx.font = `700 ${Math.round(11 * scale)}px Vazirmatn, ui-monospace, sans-serif`;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillText(`ضریب پایان: ${crashPoint.toFixed(2)}x`, panelW / 2 - 12 * scale, panelH / 2 - 12 * scale);
  } else if (phase === 'flying') {
    // --- وضعیت تله‌متری زنده در حالت پرواز / حرکت ---
    ctx.direction = 'rtl';
    ctx.textAlign = 'right';

    ctx.font = `800 ${Math.round(10.5 * scale)}px Vazirmatn, sans-serif`;
    ctx.fillStyle = theme === 'racing' ? '#fbbf24' : theme === 'chart' ? '#34d399' : '#38bdf8';
    const flightTitle =
      theme === 'racing'
        ? 'تله‌متری داشبورد • نیترو فعال'
        : theme === 'chart'
        ? 'دفترچه سفارشات • جریان صعودی'
        : 'رایانه پرواز • شتاب مداری';
    ctx.fillText(flightTitle, panelW / 2 - 12 * scale, -panelH / 2 + 17 * scale);

    const barW = panelW * 0.45;
    const barH = 5 * scale;
    const barX = -panelW / 2 + 16 * scale;
    const barY = -2 * scale;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.fillRect(barX, barY, barW, barH);
    const fillPercent = Math.min(1, (currentMultiplier - 1.0) / 4);
    ctx.fillStyle = theme === 'racing' ? '#f59e0b' : theme === 'chart' ? '#10b981' : '#06b6d4';
    ctx.fillRect(barX, barY, barW * fillPercent, barH);

    ctx.direction = 'ltr';
    ctx.textAlign = 'right';
    ctx.font = `700 ${Math.round(10 * scale)}px ui-monospace, monospace`;
    ctx.fillStyle = '#94a3b8';
    const subText =
      theme === 'racing'
        ? `${(180 + currentMultiplier * 55).toFixed(0)} KM/H`
        : theme === 'chart'
        ? `+${(currentMultiplier * 7.5).toFixed(1)}% VOL`
        : `MACH ${(5 + currentMultiplier * 2.2).toFixed(1)}`;
    ctx.fillText(subText, panelW / 2 - 12 * scale, panelH / 2 - 12 * scale);
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
  const betTierRef = useRef<1 | 2 | 3>(betTier);
  const betAmountRef = useRef<number>(betAmount);

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

  useEffect(() => {
    betTierRef.current = betTier;
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
    if (phase === 'crashed' && lastPhaseRef.current !== 'crashed') {
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

        // Nitro exhaust thrust flame in flight
        if (phase === 'flying') {
          const flameFlicker = Math.sin(now * 0.08) * 4;
          const flameLen = 22 + flameFlicker + Math.min(currentMultiplier * 4, 35);

          // Left Exhaust Flame
          const leftFlame = ctx.createLinearGradient(0, 16, 0, 16 + flameLen);
          leftFlame.addColorStop(0, '#38bdf8');
          leftFlame.addColorStop(0.4, '#f59e0b');
          leftFlame.addColorStop(1, 'rgba(239, 68, 68, 0)');
          ctx.fillStyle = leftFlame;
          ctx.beginPath();
          ctx.ellipse(-14, 16 + flameLen * 0.45, 4.5, flameLen * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Right Exhaust Flame
          ctx.beginPath();
          ctx.ellipse(14, 16 + flameLen * 0.45, 4.5, flameLen * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();

          // Spawn tire asphalt smoke & sparks
          if (Math.random() > 0.3) {
            exhaustParticlesRef.current.push({
              x: carX - 16 + (Math.random() - 0.5) * 8,
              y: carY + 14,
              vx: (Math.random() - 0.5) * 1.5,
              vy: 2 + Math.random() * 4,
              size: 2.5 + Math.random() * 3.5,
              alpha: 0.6,
              color: Math.random() > 0.5 ? '#f59e0b' : '#64748b',
              life: 0,
              maxLife: 15 + Math.random() * 12,
            });
            exhaustParticlesRef.current.push({
              x: carX + 16 + (Math.random() - 0.5) * 8,
              y: carY + 14,
              vx: (Math.random() - 0.5) * 1.5,
              vy: 2 + Math.random() * 4,
              size: 2.5 + Math.random() * 3.5,
              alpha: 0.6,
              color: Math.random() > 0.5 ? '#f59e0b' : '#64748b',
              life: 0,
              maxLife: 15 + Math.random() * 12,
            });
          }
        }

        // Supercar Shadow on Asphalt
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.beginPath();
        ctx.ellipse(0, 16, 28, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Supercar Rear Chassis (Metallic Sleek Vector)
        const carGrad = ctx.createLinearGradient(-26, 0, 26, 0);
        carGrad.addColorStop(0, '#0f172a');
        carGrad.addColorStop(0.5, '#334155');
        carGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = carGrad;
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.roundRect(-26, -14, 52, 28, [10, 10, 4, 4]);
        ctx.fill();
        ctx.stroke();

        // Cockpit Canopy (Dark Glass)
        const roofGrad = ctx.createLinearGradient(0, -22, 0, -10);
        roofGrad.addColorStop(0, '#020617');
        roofGrad.addColorStop(1, '#1e293b');
        ctx.fillStyle = roofGrad;
        ctx.beginPath();
        ctx.roundRect(-16, -22, 32, 14, [6, 6, 2, 2]);
        ctx.fill();

        // Rear Racing Wing / Spoiler
        ctx.fillStyle = '#090d16';
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(-30, -24, 60, 4, 2);
        ctx.fill();
        ctx.stroke();

        // Neon Red LED Lightbar Taillight
        ctx.save();
        ctx.strokeStyle = '#ef4444';
        ctx.shadowColor = '#ef4444';
        ctx.shadowBlur = 10;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(-22, -2);
        ctx.lineTo(22, -2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.restore();

        // Dual Chrome Exhaust Pipes
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.arc(-14, 12, 3, 0, Math.PI * 2);
        ctx.arc(14, 12, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();

        // Telemetry HUD (Speedometer / Tachometer on left)
        if (phase === 'flying') {
          ctx.save();
          ctx.font = '800 10px ui-monospace, SFMono-Regular, monospace';
          ctx.fillStyle = '#f59e0b';
          ctx.textAlign = 'left';
          ctx.fillText(`SPEED: ${(160 + currentMultiplier * 55).toFixed(0)} KM/H`, 16, h - 28);
          ctx.fillStyle = 'rgba(156, 163, 175, 0.7)';
          ctx.fillText(`RPM: ${(4500 + Math.min(currentMultiplier * 750, 4500)).toFixed(0)} • NITRO ON`, 16, h - 14);
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

        // Draw EMA (Exponential Moving Average) Trend Curve
        if (points.length > 1) {
          ctx.strokeStyle = '#22d3ee';
          ctx.lineWidth = 2;
          ctx.shadowColor = '#22d3ee';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let p = 1; p < points.length; p++) {
            ctx.lineTo(points[p].x, points[p].y);
          }
          ctx.stroke();
          ctx.shadowBlur = 0;
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

        ctx.restore();
      } else {
        // --- COSMIC ROCKET LAUNCH & FLIGHT ---
        const bottomMargin = 28;
        const rocketHeight = 60;
        const groundY = h - rocketHeight / 2 - bottomMargin;
        const flightCenterY = h * 0.52;

        let currentRocketY = groundY;
        let rocketRotation = 0;

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
          ctx.restore();
        } else if (phase === 'flying') {
          const elapsed = Math.max(0, now - startTime);
          const takeoffProgress = Math.min(elapsed / 1400, 1);
          const easeOut = 1 - Math.pow(1 - takeoffProgress, 3);
          const hoverSway = Math.sin(now * 0.0035) * 4;

          currentRocketY = groundY + (flightCenterY - groundY) * easeOut + hoverSway;
          rocketRotation = Math.sin(now * 0.003) * 0.035;
          rocketYRef.current = currentRocketY;

          // Active Skin Configuration
          const skin = SKIN_CONFIGS[selectedSkinRef.current] || SKIN_CONFIGS.default;

          // Exhaust flame
          ctx.save();
          ctx.translate(w / 2, currentRocketY);
          const flameLength = (selectedSkinRef.current === 'phoenix' ? 44 : 35) + Math.sin(now * 0.06) * 6;
          const flameGrad = ctx.createLinearGradient(0, 18, 0, 18 + flameLength);
          flameGrad.addColorStop(0, skin.flameColors[0]);
          flameGrad.addColorStop(0.35, skin.flameColors[1]);
          flameGrad.addColorStop(1, skin.flameColors[2]);
          ctx.fillStyle = flameGrad;
          ctx.beginPath();
          ctx.ellipse(0, 18 + flameLength * 0.45, 9, flameLength * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

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
        }

        // Draw Rocket Hull Sprite or Procedural Vector
        if (phase !== 'crashed' || (now - crashAnimationRef.current.startTime < 100)) {
          const skin = SKIN_CONFIGS[selectedSkinRef.current] || SKIN_CONFIGS.default;
          ctx.save();
          ctx.translate(w / 2, currentRocketY);
          ctx.rotate(rocketRotation);

          // Skin aura glow
          ctx.shadowColor = skin.auraColor;
          ctx.shadowBlur = skin.auraBlur;

          if (rocketImgRef.current && rocketImgRef.current.complete) {
            ctx.drawImage(rocketImgRef.current, -22, -30, 44, 60);

            // Premium skin aura ring
            if (selectedSkinRef.current !== 'default') {
              ctx.strokeStyle = skin.accentColor;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.ellipse(0, 0, 18, 26, 0, 0, Math.PI * 2);
              ctx.stroke();
            }
          } else {
            // Fallback Vector Rocket
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
            ctx.moveTo(0, -28); ctx.lineTo(10, -8); ctx.lineTo(-10, -8); ctx.closePath();
            ctx.fill();
          }
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

      if (phase === 'flying') {
        if (userBet && userCashout) {
          statusMsg = `خروج موفق! برد ${(userBet * userCashout).toFixed(1)} سکه با ضریب ${userCashout.toFixed(2)}x`;
          statusColor = '#facc15';
          statusBg = 'rgba(113, 63, 18, 0.85)';
          statusBorder = 'rgba(250, 204, 21, 0.6)';
        } else if (userBet) {
          statusMsg =
            currentActiveTheme === 'racing'
              ? 'سوپراسپرت در حال شتاب • آماده خروج باشید!'
              : currentActiveTheme === 'chart'
              ? 'بازار در حال صعود • آماده سیو سود باشید!'
              : 'موشک در مدار • آماده خروج باشید!';
          statusColor = '#67e8f9';
          statusBg = 'rgba(12, 74, 96, 0.8)';
          statusBorder = 'rgba(56, 189, 248, 0.5)';
        }
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
