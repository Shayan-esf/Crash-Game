import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { telegramId, betAmount } = await request.json();
    
    if (!telegramId || !betAmount) {
      return NextResponse.json({ error: 'telegramId and betAmount required' }, { status: 400 });
    }

    const numBet = Number(betAmount);
    if (![10, 50, 100].includes(numBet)) {
      return NextResponse.json({ error: 'Bet amount must be 10, 50, or 100' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { telegramId: String(telegramId) }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    if (user.balance < betAmount) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }
    
    // کسر مبلغ شرط از موجودی
    await prisma.user.update({
      where: { id: user.id },
      data: { balance: user.balance - betAmount }
    });

    // ایجاد سشن بازی
    const gameSession = await prisma.gameSession.create({
      data: {
        status: 'starting',
        startTime: new Date()
      }
    });

    // ایجاد رکورد بازی
    const game = await prisma.game.create({
      data: {
        userId: user.id,
        gameSessionId: gameSession.id,
        bet: betAmount,
        crashPoint: 0, // بعداً مقداردهی می‌شود
        profit: 0, // بعداً مقداردهی می‌شود
        status: 'playing'
      }
    });
    
    return NextResponse.json({ 
      success: true, 
      gameId: game.id,
      sessionId: gameSession.id,
      newBalance: user.balance - betAmount
    });
    
  } catch (error) {
    console.error('Game start error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 