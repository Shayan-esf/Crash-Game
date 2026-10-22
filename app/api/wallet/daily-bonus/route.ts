import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

// بخش‌های گردونه شانس (۸ خانه)
export const WHEEL_SLICES = [
  { id: 0, amount: 50, color: '#0284c7', label: '50' },
  { id: 1, amount: 100, color: '#059669', label: '100' },
  { id: 2, amount: 150, color: '#7c3aed', label: '150' },
  { id: 3, amount: 200, color: '#d97706', label: '200' },
  { id: 4, amount: 250, color: '#2563eb', label: '250' },
  { id: 5, amount: 350, color: '#ea580c', label: '350' },
  { id: 6, amount: 500, color: '#db2777', label: '500' },
  { id: 7, amount: 1000, color: '#eab308', label: '1,000' },
];

// ضرایب تشویقی روزهای ۱ تا ۷ زنجیره ورود (Daily Streak Multipliers)
export const STREAK_MULTIPLIERS = [1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 2.5];
const BONUS_COOLDOWN_MS = 24 * 60 * 60 * 1000; // ۲۴ ساعت
const STREAK_EXPIRY_MS = 48 * 60 * 60 * 1000; // ۴۸ ساعت مهلت حفظ استریک

// وزن‌های توزیع احتمال خانه‌های گردونه
const SLICE_WEIGHTS = [25, 25, 20, 15, 8, 4, 2, 1];

// انتخاب تصادفی وزن‌دار خانه برنده گردونه
function pickWinningSlice(): number {
  const totalWeight = SLICE_WEIGHTS.reduce((a, b) => a + b, 0);
  let randomVal = Math.random() * totalWeight;

  for (let i = 0; i < SLICE_WEIGHTS.length; i++) {
    randomVal -= SLICE_WEIGHTS[i];
    if (randomVal <= 0) {
      return i;
    }
  }
  return 0;
}

// استخراج شماره روز استریک از تراکنش قبلی
function extractLastStreak(payload: string | null): number {
  if (!payload) return 1;
  try {
    const parsed = JSON.parse(payload);
    if (typeof parsed.streak === 'number') return parsed.streak;
  } catch (e) {
    const match = payload.match(/streak:?\s*(\d+)/i);
    if (match) return parseInt(match[1], 10);
  }
  return 1;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegram_id');

    if (!telegramId) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ telegramId: String(telegramId) }, { id: String(telegramId) }],
      },
      select: { id: true },
    });

    if (!user) {
      if (telegramId === 'dev-test-user' || telegramId === 'dev') {
        user = await prisma.user.upsert({
          where: { telegramId: 'dev-test-user' },
          update: {},
          create: {
            telegramId: 'dev-test-user',
            username: 'dev-test-user',
            phone: '+989120000000',
            phoneVerified: true,
            balance: 1000,
          },
          select: { id: true },
        });
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    // آخرین زمان دریافت بونوس رایگان
    const lastBonus = await prisma.transaction.findFirst({
      where: {
        userId: user.id,
        type: 'daily_bonus',
        status: 'success',
      },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true, payload: true },
    });

    const now = Date.now();
    const lastClaimTime = lastBonus ? new Date(lastBonus.createdAt).getTime() : 0;
    const elapsed = lastClaimTime > 0 ? now - lastClaimTime : Infinity;

    let currentStreak = 0;
    let nextStreakDay = 1;
    let isStreakBroken = false;

    if (!lastBonus) {
      currentStreak = 0;
      nextStreakDay = 1;
    } else {
      const lastStreak = extractLastStreak(lastBonus.payload);

      if (elapsed < BONUS_COOLDOWN_MS) {
        currentStreak = lastStreak;
        nextStreakDay = (lastStreak % 7) + 1;
      } else if (elapsed <= STREAK_EXPIRY_MS) {
        currentStreak = lastStreak;
        nextStreakDay = (lastStreak % 7) + 1;
      } else {
        currentStreak = 0;
        nextStreakDay = 1;
        isStreakBroken = true;
      }
    }

    const canClaim = elapsed >= BONUS_COOLDOWN_MS;
    const remainingMs = canClaim ? 0 : BONUS_COOLDOWN_MS - elapsed;
    const streakMultiplier = STREAK_MULTIPLIERS[Math.max(0, Math.min(6, nextStreakDay - 1))];

    return NextResponse.json({
      canClaim,
      currentStreak,
      nextStreakDay,
      streakMultiplier,
      streakMultipliers: STREAK_MULTIPLIERS,
      wheelSlices: WHEEL_SLICES,
      remainingMs,
      isStreakBroken,
      starsSpinCost: 15,
      lastClaimedAt: lastBonus?.createdAt || null,
    });
  } catch (error) {
    console.error('Error checking spin status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { telegramId, spinType = 'free' } = await request.json();

    if (!telegramId) {
      return NextResponse.json({ error: 'telegramId is required' }, { status: 400 });
    }

    let user = await prisma.user.findFirst({
      where: {
        OR: [{ telegramId: String(telegramId) }, { id: String(telegramId) }],
      },
    });

    if (!user) {
      if (telegramId === 'dev-test-user' || telegramId === 'dev') {
        user = await prisma.user.upsert({
          where: { telegramId: 'dev-test-user' },
          update: {},
          create: {
            telegramId: 'dev-test-user',
            username: 'dev-test-user',
            phone: '+989120000000',
            phoneVerified: true,
            balance: 1000,
          },
        });
      } else {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
    }

    const winningIndex = pickWinningSlice();
    const baseReward = WHEEL_SLICES[winningIndex].amount;

    // اجرای در تراکنش اتمیک
    const result = await prisma.$transaction(async (tx) => {
      const lastBonus = await tx.transaction.findFirst({
        where: {
          userId: user.id,
          type: 'daily_bonus',
          status: 'success',
        },
        orderBy: { createdAt: 'desc' },
      });

      const now = Date.now();
      let nextStreakDay = 1;

      if (lastBonus) {
        const elapsed = now - new Date(lastBonus.createdAt).getTime();

        if (spinType === 'free' && elapsed < BONUS_COOLDOWN_MS) {
          const remainingMinutes = Math.ceil((BONUS_COOLDOWN_MS - elapsed) / (60 * 1000));
          throw new Error(`چرخش رایگان امروز استفاده شده است. نوبت بعدی: ${remainingMinutes} دقیقه دیگر یا با تلگرام استارز.`);
        }

        const lastStreak = extractLastStreak(lastBonus.payload);

        if (elapsed <= STREAK_EXPIRY_MS) {
          nextStreakDay = (lastStreak % 7) + 1;
        } else {
          nextStreakDay = 1;
        }
      } else {
        nextStreakDay = 1;
      }

      const multiplier = STREAK_MULTIPLIERS[Math.max(0, Math.min(6, nextStreakDay - 1))];
      const totalReward = Math.round(baseReward * multiplier);

      // افزودن سکه به موجودی
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { increment: totalReward } },
      });

      // ثبت تراکنش
      if (spinType === 'free') {
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'daily_bonus',
            amount: totalReward,
            currency: 'coins',
            payload: JSON.stringify({
              streak: nextStreakDay,
              winningIndex,
              baseReward,
              multiplier,
              totalReward,
              spinType: 'free',
              claimedAt: new Date().toISOString(),
            }),
            status: 'success',
          },
        });
      } else {
        // چرخش ویژه استارز
        await tx.transaction.create({
          data: {
            userId: user.id,
            type: 'stars_spin',
            amount: totalReward,
            currency: 'coins',
            payload: JSON.stringify({
              streak: nextStreakDay,
              winningIndex,
              baseReward,
              multiplier,
              totalReward,
              spinType: 'stars',
              claimedAt: new Date().toISOString(),
            }),
            status: 'success',
          },
        });
      }

      return {
        newBalance: updatedUser.balance,
        winningIndex,
        baseReward,
        multiplier,
        totalReward,
        streakDay: nextStreakDay,
        spinType,
      };
    });

    return NextResponse.json({
      success: true,
      winningIndex: result.winningIndex,
      baseReward: result.baseReward,
      streakMultiplier: result.multiplier,
      totalReward: result.totalReward,
      streakDay: result.streakDay,
      newBalance: result.newBalance,
      spinType: result.spinType,
      message: `🎉 شما برنده ${result.totalReward} سکه شدید! (${result.baseReward} پایه × ضریب روز ${result.streakDay}: ${result.multiplier}x)`,
    });
  } catch (error: any) {
    console.error('Spin wheel claim error:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 400 });
  }
}
