import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // دریافت ۱۰ برد برتر (بیشترین سود در کش‌اوت)
    const records = await prisma.game.findMany({
      where: {
        status: 'cashed_out',
        profit: { gt: 0 } // فقط بردهای دارای سود
      },
      orderBy: {
        profit: 'desc'
      },
      take: 10,
      include: {
        user: {
          select: {
            username: true
          }
        },
        gameSession: {
          select: {
            crashPoint: true
          }
        }
      }
    });

    // قالب‌بندی داده‌ها برای فرانت‌اند
    const topRecords = records.map(record => ({
      id: record.id,
      username: record.user?.username || 'خلبان کیهانی',
      bet: record.bet,
      cashout: record.cashout,
      profit: record.profit,
      winnings: record.cashout ? record.bet * record.cashout : 0,
      crashPoint: record.gameSession?.crashPoint ?? null,
      createdAt: record.createdAt
    }));

    return NextResponse.json({ records: topRecords });
  } catch (error: any) {
    console.error('Error fetching top records:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message || String(error)
    }, { status: 500 });
  }
} 