import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const telegramId = searchParams.get('telegram_id');

  if (!telegramId) {
    return NextResponse.json({ error: 'telegram_id is required' }, { status: 400 });
  }

  try {
    const user: any = await (prisma.user as any).findUnique({
      where: { telegramId: String(telegramId) },
      include: {
        referredUsers: {
          select: {
            id: true,
            username: true,
            telegramId: true,
            phoneVerified: true,
            createdAt: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const totalInvited = user.referredUsers ? user.referredUsers.length : 0;
    const totalCoinsEarned = user.referralCoinsEarned || 0;

    return NextResponse.json({
      success: true,
      totalInvited,
      totalCoinsEarned,
      referredUsers: user.referredUsers || [],
    });
  } catch (error: any) {
    console.error('Referrals fetch error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
