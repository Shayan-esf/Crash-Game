import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get('telegram_id');

    if (!telegramId) {
      return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 });
    }

    // یافتن کاربر با telegramId یا id
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { telegramId: String(telegramId) },
          { id: String(telegramId) }
        ]
      },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // دریافت ۱۰ بازی پایان‌یافته اخیر کاربر
    const games = await prisma.game.findMany({
      where: {
        userId: user.id,
        status: { in: ['crashed', 'cashed_out'] } // فقط بازی‌های خاتمه‌یافته
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10, // فقط ۱۰ بازی اخیر
      include: {
        gameSession: {
          select: {
            crashPoint: true
          }
        }
      }
    });

    // قالب‌بندی داده‌ها برای فرانت‌اند
    const formattedGames = games.map(game => ({
      id: game.id,
      bet: game.bet,
      cashout: game.cashout,
      profit: game.profit,
      status: game.status,
      crashPoint: game.crashPoint ?? game.gameSession?.crashPoint ?? null,
      theme: (game as any).theme || 'rocket',
      createdAt: game.createdAt
    }));

    return NextResponse.json({ games: formattedGames });
  } catch (error) {
    console.error('Error fetching user games:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 