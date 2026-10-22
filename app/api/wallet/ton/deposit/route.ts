import { prisma } from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { telegramId, amountTon, coinsReceived, txHash, boc } = body;

    if (!telegramId || !amountTon || !coinsReceived || !txHash) {
      return NextResponse.json(
        { error: 'پارامترهای درخواست ناقص است (telegramId, amountTon, coinsReceived, txHash)' },
        { status: 400 }
      );
    }

    const user: any = await (prisma.user as any).findUnique({
      where: { telegramId: String(telegramId) },
      include: { referrer: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 });
    }

    // بررسی جلوگیری از ثبت تراکنش تکراری (Duplicate Tx)
    const existingTx = await (prisma as any).tonDeposit?.findUnique({
      where: { txHash: String(txHash) },
    }).catch(() => null);

    if (existingTx) {
      return NextResponse.json(
        { error: 'این تراکنش قبلاً پردازش و ثبت شده است' },
        { status: 409 }
      );
    }

    const coinsToAdd = Number(coinsReceived);
    const tonPaid = Number(amountTon);

    // محاسبه ۱۰٪ کمیسیون پاداش برای معرف در صورت وجود
    const referrer = (user as any).referrer;
    const referrerCommission = referrer ? Math.floor(coinsToAdd * 0.1) : 0;

    const operations: any[] = [
      // ۱. شارژ موجودی کاربر خریدار
      prisma.user.update({
        where: { id: user.id },
        data: {
          balance: { increment: coinsToAdd },
        },
      }),
    ];

    // ۲. ثبت گزارش واریز در جدول TonDeposit در صورت وجود جدول
    if ((prisma as any).tonDeposit) {
      operations.push(
        (prisma as any).tonDeposit.create({
          data: {
            userId: user.id,
            amountTon: tonPaid,
            coinsReceived: coinsToAdd,
            txHash: String(txHash),
            boc: boc || null,
            status: 'completed',
          },
        })
      );
    }

    // ۳. واریز ۱۰٪ پاداش به معرف
    if (referrer && referrerCommission > 0) {
      operations.push(
        (prisma.user as any).update({
          where: { id: referrer.id },
          data: {
            balance: { increment: referrerCommission },
            referralCoinsEarned: { increment: referrerCommission },
          },
        })
      );
    }

    const [updatedUser] = await prisma.$transaction(operations);

    console.log(
      `✅ [TON Deposit] شارژ ${coinsToAdd} سکه (${tonPaid} TON) برای کاربر ${user.username || user.telegramId}. پاداش معرف: ${referrerCommission}`
    );

    return NextResponse.json({
      success: true,
      balance: updatedUser.balance,
      coinsAdded: coinsToAdd,
      referrerRewarded: referrerCommission > 0,
    });
  } catch (error: any) {
    console.error('TON deposit error:', error);
    return NextResponse.json(
      { error: error?.message || 'خطای داخلی سرور در پردازش واریز TON' },
      { status: 500 }
    );
  }
}
