import { prisma } from '@/lib/prisma';
import { extractUserData, validateInitData } from '@/lib/telegram-auth';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('tma ')) {
      return NextResponse.json({ error: 'Invalid authorization header' }, { status: 401 });
    }

    const initData = authHeader.substring(4);

    // حالت DEV برای تست در مرورگر خارج از تلگرام
    if (initData === 'dev') {
      let user = await prisma.user.upsert({
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

      if (user.balance === 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { balance: 1000 },
        });
      }

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          telegramId: user.telegramId,
          username: user.username || 'dev-test-user',
          avatarUrl: user.avatarUrl,
          balance: user.balance,
          blocked: user.blocked,
          phone: user.phone || '+989120000000',
          phoneVerified: user.phoneVerified ?? true,
          referralCoinsEarned: (user as any).referralCoinsEarned || 0,
        },
      });
    }

    const botToken = process.env.BOT_TOKEN;
    const adminBotToken = process.env.ADMIN_BOT_TOKEN;

    let isValid = false;
    let userData = null;

    if (botToken && validateInitData(initData, botToken)) {
      isValid = true;
      userData = extractUserData(initData);
    } else if (adminBotToken && validateInitData(initData, adminBotToken)) {
      isValid = true;
      userData = extractUserData(initData);
    }

    if (!isValid || !userData) {
      return NextResponse.json({ error: 'Invalid initData' }, { status: 401 });
    }

    // یافتن یا ایجاد کاربر در پایگاه داده
    let user = await prisma.user.upsert({
      where: { telegramId: String(userData.id) },
      update: {
        username: userData.username || undefined,
        avatarUrl: userData.photo_url || undefined,
      },
      create: {
        telegramId: String(userData.id),
        username: userData.username || undefined,
        avatarUrl: userData.photo_url || undefined,
        balance: 1000, // موجودی اولیه
      },
    });

    if (user.balance === 0) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { balance: 1000 },
      });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username || `User${user.telegramId}`,
        avatarUrl: user.avatarUrl,
        balance: user.balance,
        blocked: user.blocked,
        phone: user.phone,
        phoneVerified: user.phoneVerified,
        referralCoinsEarned: (user as any).referralCoinsEarned || 0,
      }
    });

  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 