import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const telegramId = searchParams.get('telegram_id');
  
  if (!telegramId) {
    return NextResponse.json({ error: 'telegram_id required' }, { status: 400 });
  }
  
  try {
    // بررسی دسترسی ادمین
    const adminIds = process.env.ADMIN_IDS?.split(",").map(id => id.trim()) || [];
    const adminUsernames = process.env.ADMIN_USERNAMES?.split(",").map(username => username.trim()) || [];

    if (!adminIds.includes(telegramId) && !adminUsernames.includes(telegramId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // دریافت آمار
    const totalUsers = await prisma.user.count();
    const totalGames = await prisma.game.count();
    const totalWithdrawals = 0;
    const pendingWithdrawals = 0;

    // مجموع کل موجودی‌ها
    const users = await prisma.user.findMany({
      select: { balance: true }
    });
    const totalBalance = users.reduce((sum, user) => sum + user.balance, 0);

    // آمار ۲۴ ساعت گذشته
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const newUsers24h = await prisma.user.count({
      where: { createdAt: { gte: yesterday } }
    });
    
    const games24h = await prisma.game.count({
      where: { createdAt: { gte: yesterday } }
    });
    
    return NextResponse.json({
      totalUsers,
      totalGames,
      totalWithdrawals,
      pendingWithdrawals,
      totalBalance,
      newUsers24h,
      games24h
    });
    
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 