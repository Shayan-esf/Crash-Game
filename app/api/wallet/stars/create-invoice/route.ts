import { NextRequest, NextResponse } from 'next/server';

const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

// تعاریف پکیج‌های ستاره تلگرام (XTR)
export const STAR_PACKAGES = {
  // ۱. پکیج‌های سکه
  coins_small: {
    id: 'coins_small',
    itemType: 'coins',
    title: '۵۰۰ سکه طلایی',
    description: 'بسته پایه شارژ سکه بازی انفجار',
    stars: 25,
    rewardCoins: 500,
  },
  coins_medium: {
    id: 'coins_medium',
    itemType: 'coins',
    title: '۱,۱۰۰ سکه طلایی (۱۰٪ بونوس)',
    description: 'بسته محبوب شارژ سکه با هدیه اضافی',
    stars: 50,
    rewardCoins: 1100,
  },
  coins_large: {
    id: 'coins_large',
    itemType: 'coins',
    title: '۲,۵۰۰ سکه طلایی (۲۵٪ بونوس)',
    description: 'بسته حرفه‌ای شارژ سکه با حداکثر بونوس',
    stars: 100,
    rewardCoins: 2500,
  },
  // ۲. چرخش مجدد گردونه شانس
  spin_extra: {
    id: 'spin_extra',
    itemType: 'spin',
    title: 'چرخش اضافه گردونه شانس 🎡',
    description: 'یک نوبت چرخش اضافه گردونه شانس با جوایز سکه طلایی',
    stars: 15,
    rewardCoins: 0,
  },
  // ۳. اسکین‌های پریمیوم موشک
  skin_phoenix: {
    id: 'skin_phoenix',
    itemType: 'skin',
    title: 'اسکین موشک ققنوس آتشین 🔥',
    description: 'طراحی اختصاصی با رد آتشین و افکت صعود سریع',
    stars: 75,
    rewardCoins: 0,
    skinId: 'phoenix',
  },
  skin_cyberpunk: {
    id: 'skin_cyberpunk',
    itemType: 'skin',
    title: 'اسکین موشک نئونی سایبرپانک ⚡',
    description: 'استایل آینده‌نگرانه با نورهای نئونی بنفش و فیروزه‌ای',
    stars: 100,
    rewardCoins: 0,
    skinId: 'cyberpunk',
  },
  skin_golden: {
    id: 'skin_golden',
    itemType: 'skin',
    title: 'اسکین موشک طلایی کیهانی 👑',
    description: 'نشان خلبانان VIP با درخشش طلایی خالص و ذرات استارداست',
    stars: 150,
    rewardCoins: 0,
    skinId: 'golden',
  },
};

export async function POST(request: NextRequest) {
  try {
    const { packageId, telegramId } = await request.json();

    const selectedPkg = (STAR_PACKAGES as any)[packageId];
    if (!selectedPkg) {
      return NextResponse.json({ error: 'پکیج نامعتبر است' }, { status: 400 });
    }

    if (!BOT_TOKEN || BOT_TOKEN === 'mock_token') {
      // حالت تستی / Mock در محیط لوکال
      return NextResponse.json({
        success: true,
        invoiceLink: 'https://t.me/$mock_invoice_for_dev_mode',
        isMock: true,
        package: selectedPkg,
      });
    }

    const payload = JSON.stringify({
      telegramId: String(telegramId),
      packageId: selectedPkg.id,
      itemType: selectedPkg.itemType,
      rewardCoins: selectedPkg.rewardCoins,
      skinId: selectedPkg.skinId || null,
    });

    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/createInvoiceLink`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: selectedPkg.title,
        description: selectedPkg.description,
        payload,
        currency: 'XTR', // واحد رسمی ستاره تلگرام (Telegram Stars)
        prices: [
          {
            label: selectedPkg.title,
            amount: selectedPkg.stars, // تعداد ستاره تلگرام
          },
        ],
      }),
    });

    const data = await response.json();

    if (!data.ok) {
      console.error('Telegram createInvoiceLink error:', data);
      return NextResponse.json(
        { error: data.description || 'خطا در ایجاد فاکتور ستاره تلگرام' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      invoiceLink: data.result,
      package: selectedPkg,
    });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    return NextResponse.json(
      { error: error?.message || 'خطای سرور در ایجاد لینک فاکتور' },
      { status: 500 }
    );
  }
}
