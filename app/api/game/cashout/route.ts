import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { telegramId, gameId, crashPoint } = await request.json();
    
    if (!telegramId || !gameId || !crashPoint) {
      return NextResponse.json({ error: 'telegramId, gameId and crashPoint required' }, { status: 400 });
    }
    
    const user = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    const numCrashPoint = Number(crashPoint);
    if (isNaN(numCrashPoint) || numCrashPoint <= 1) {
      return NextResponse.json({ error: 'Invalid crashPoint' }, { status: 400 });
    }

    // اجرای کش‌اوت در تراکنش اتمیک همراه با محافظت در برابر فراخوانی مکرر
    const result = await prisma.$transaction(async (tx) => {
      const game = await tx.game.findFirst({
        where: {
          id: gameId,
          userId: user.id,
          status: 'playing'
        }
      });

      if (!game) {
        throw new Error('Game not found or already finished');
      }

      const cashout = game.bet * numCrashPoint;
      const profit = cashout - game.bet;

      // به‌روزرسانی اتمیک وضعیت: تنها در صورتی که وضعیت بازی هنوز 'playing' باشد
      const updateResult = await tx.game.updateMany({
        where: {
          id: game.id,
          status: 'playing'
        },
        data: {
          crashPoint: numCrashPoint,
          cashout: numCrashPoint,
          profit,
          status: 'cashed_out'
        }
      });

      if (updateResult.count === 0) {
        throw new Error('Cashout already processed');
      }

      // به‌روزرسانی موجودی کاربر
      const updatedUser = await tx.user.update({
        where: { id: user.id },
        data: { balance: { increment: cashout } }
      });

      // ثبت لاگ تراکنش
      await tx.transaction.create({
        data: {
          userId: user.id,
          type: 'game',
          amount: profit,
          currency: 'coins',
          payload: `Cashout at ${numCrashPoint.toFixed(2)}x`,
          status: 'success'
        }
      });

      return { cashout, profit, newBalance: updatedUser.balance };
    });

    return NextResponse.json({
      success: true,
      cashout: result.cashout,
      profit: result.profit,
      newBalance: result.newBalance
    });

  } catch (error: any) {
    console.error('Cashout error:', error);
    if (error.message === 'Game not found or already finished' || error.message === 'Cashout already processed') {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 