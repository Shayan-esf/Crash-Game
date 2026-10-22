import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // دریافت ۱۰ سشن پایان‌یافته اخیر دارای نقطه کرش
    const sessions = await prisma.gameSession.findMany({
      where: {
        crashPoint: { not: null } // فقط سشن‌های خاتمه‌یافته
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
      select: {
        id: true,
        crashPoint: true,
        createdAt: true
      }
    });

    // قالب‌بندی داده‌ها برای فرانت‌اند
    const history = sessions.map(session => ({
      id: session.id,
      crashPoint: session.crashPoint,
      createdAt: session.createdAt
    }));

    return NextResponse.json({ history });
  } catch (error: any) {
    console.error('Error fetching session history:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error?.message || String(error)
    }, { status: 500 });
  }
} 