import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, packageId, itemType, starsAmount, rewardCoins, skinId } = body;

    if (!telegramId || !packageId) {
      return NextResponse.json(
        { error: 'اطلاعات پرداخت ناقص است' },
        { status: 400 }
      );
    }

    const user: any = await (prisma.user as any).findUnique({
      where: { telegramId: String(telegramId) },
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    let updatedBalance = user.balance;
    let updatedSkins = (user.unlockedSkins || 'default').split(',').map((s: string) => s.trim());

    const updateData: any = {};

    if (itemType === 'coins' && rewardCoins > 0) {
      updateData.balance = { increment: Number(rewardCoins) };
      updatedBalance += Number(rewardCoins);
    } else if (itemType === 'skin' && skinId) {
      if (!updatedSkins.includes(skinId)) {
        updatedSkins.push(skinId);
      }
      updateData.unlockedSkins = updatedSkins.join(',');
      updateData.selectedSkin = skinId;
    } else if (itemType === 'spin') {
      // ثبت اعتبار چرخش اضافه استارز
      await prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'stars_spin_credit',
          amount: 0,
          currency: 'XTR',
          payload: JSON.stringify({ starsAmount: Number(starsAmount) || 15, purchasedAt: new Date().toISOString() }),
          status: 'success',
        },
      });
    }

    // به‌روزرسانی اطلاعات کاربر
    const updatedUser = await (prisma.user as any).update({
      where: { id: user.id },
      data: updateData,
    });

    // ثبت گزارش خرید با Stars در صورت وجود مدل
    try {
      if ((prisma as any).starPurchase) {
        await (prisma as any).starPurchase.create({
          data: {
            userId: user.id,
            itemType: itemType || 'coins',
            itemId: packageId,
            starsAmount: Number(starsAmount) || 0,
            rewardValue: Number(rewardCoins) || 0,
            status: 'completed',
          },
        });
      }
    } catch (dbErr) {
      console.warn('StarPurchase log warning:', dbErr);
    }

    console.log(
      `⭐ [Telegram Stars] خرید موفقیت‌آمیز ${packageId} برای کاربر ${user.username || user.telegramId}`
    );

    return NextResponse.json({
      success: true,
      balance: updatedUser.balance ?? updatedBalance,
      unlockedSkins: updatedSkins,
      selectedSkin: skinId || updatedUser.selectedSkin || 'default',
    });
  } catch (error: any) {
    console.error('Stars confirm error:', error);
    return NextResponse.json(
      { error: error?.message || 'خطای سرور در تایید پرداخت ستاره' },
      { status: 500 }
    );
  }
}
