require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const WEBAPP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://crash-game.vercel.app';
const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(s => s.trim()).filter(Boolean);

if (!BOT_TOKEN || BOT_TOKEN === 'mock_token') {
  console.warn('⚠️ [Telegram Bot] BOT_TOKEN تنظیم نشده است یا مقدار پیش‌فرض mock_token دارد.');
  console.warn('لطفا توکن واقعی ربات تلگرام را در فایل .env قرار دهید.');
}

// کلاینت تلگرام با fetch توکار
class TelegramApi {
  constructor(token) {
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async call(method, body = {}) {
    try {
      const res = await fetch(`${this.baseUrl}/${method}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!data.ok) {
        console.error(`[Telegram API Error] ${method}:`, data.description);
      }
      return data;
    } catch (err) {
      console.error(`[Telegram Fetch Error] ${method}:`, err.message);
      return null;
    }
  }

  async sendMessage(chatId, text, extra = {}) {
    return this.call('sendMessage', {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      ...extra
    });
  }

  async getUpdates(offset = 0, timeout = 30) {
    return this.call('getUpdates', {
      offset,
      timeout,
      allowed_updates: ['message', 'callback_query', 'pre_checkout_query']
    });
  }

  async answerPreCheckoutQuery(preCheckoutQueryId, ok = true, errorMessage = '') {
    return this.call('answerPreCheckoutQuery', {
      pre_checkout_query_id: preCheckoutQueryId,
      ok,
      error_message: errorMessage
    });
  }
}

const bot = new TelegramApi(BOT_TOKEN);

function formatCoins(amount) {
  return Number(amount || 0).toLocaleString('en-US');
}

function formatDate(date) {
  return new Date(date).toLocaleString('fa-IR', {
    timeZone: 'Asia/Tehran',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// کیبورد دائمی منوی اصلی (Reply Keyboard)
const mainReplyKeyboard = {
  keyboard: [
    [{ text: '🚀 اجرای بازی' }, { text: '💰 موجودی من' }],
    [{ text: '📜 تاریخچه بازی‌ها' }, { text: '🎁 جایزه روزانه' }],
    [{ text: '🏆 برترین‌ها' }, { text: '👥 دعوت دوستان' }]
  ],
  resize_keyboard: true,
  persistent: true
};

// پردازش پیام‌ها و دستورات متنی
async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const from = msg.from;
  const text = (msg.text || '').trim();
  const telegramId = String(from.id);

  // ثبت یا به‌روزرسانی کاربر + هندل رفرال
  let user;
  try {
    user = await prisma.user.findUnique({ where: { telegramId } });
    if (!user) {
      let referrerId = null;
      if (text.startsWith('/start ref_')) {
        const refParam = text.split(' ')[1]?.replace('ref_', '');
        const refUser = await prisma.user.findFirst({
          where: { OR: [{ id: refParam }, { telegramId: refParam }] }
        });
        if (refUser) {
          referrerId = refUser.id;
          // هدیه به معرف
          await prisma.user.update({
            where: { id: refUser.id },
            data: {
              balance: { increment: 250 },
              referralCoinsEarned: { increment: 250 }
            }
          });
          bot.sendMessage(refUser.telegramId, `🎉 <b>تبریک!</b> یک کاربر با لینک دعوت شما عضو شد و <b>۲۵۰ سکه</b> هدیه گرفتید!`).catch(() => {});
        }
      }

      user = await prisma.user.create({
        data: {
          telegramId,
          username: from.username || undefined,
          balance: 1000,
          referrerId
        }
      });
    } else if (from.username && user.username !== from.username) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { username: from.username }
      });
    }
  } catch (err) {
    console.error('[Bot] DB User Upsert Error:', err);
  }

  // ۰. پرداخت موفقیت‌آمیز ستاره تلگرام (Telegram Stars IAP)
  if (msg.successful_payment) {
    const payment = msg.successful_payment;
    const totalStars = payment.total_amount;
    let payloadData = {};
    try {
      payloadData = JSON.parse(payment.invoice_payload);
    } catch {}

    const itemType = payloadData.itemType || 'coins';
    const rewardCoins = Number(payloadData.rewardCoins) || 0;
    const skinId = payloadData.skinId;

    try {
      const updateData = {};
      if (itemType === 'coins' && rewardCoins > 0) {
        updateData.balance = { increment: rewardCoins };
      } else if (itemType === 'skin' && skinId) {
        const u = await prisma.user.findUnique({ where: { telegramId } });
        const currentSkins = (u?.unlockedSkins || 'default').split(',').map((s) => s.trim());
        if (!currentSkins.includes(skinId)) {
          currentSkins.push(skinId);
        }
        updateData.unlockedSkins = currentSkins.join(',');
        updateData.selectedSkin = skinId;
      }

      await prisma.user.update({
        where: { telegramId },
        data: updateData,
      });

      if ((prisma).starPurchase) {
        await prisma.starPurchase.create({
          data: {
            userId: user.id,
            itemType,
            itemId: payloadData.packageId || 'custom',
            starsAmount: totalStars,
            rewardValue: rewardCoins,
            telegramPaymentChargeId: payment.telegram_payment_charge_id,
            status: 'completed',
          },
        });
      }
    } catch (payErr) {
      console.error('[Bot Stars Payment Error]:', payErr);
    }

    const successMsg = `⭐ <b>پرداخت ستاره تلگرام با موفقیت تایید شد!</b>\n\n` +
      `مبلغ پرداختی: <b>${totalStars} ستاره تلگرام (Stars)</b>\n` +
      (itemType === 'coins'
        ? `💰 <b>+${formatCoins(rewardCoins)} سکه</b> به موجودی پرواز شما اضافه شد!`
        : `🚀 <b>اسکین جدید موشک</b> بازگشایی شد و اکنون در بازی فعال است!`);

    return bot.sendMessage(chatId, successMsg, {
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 بازگشت به بازی و پرواز', web_app: { url: WEBAPP_URL } }]],
      },
    });
  }

  // ۰.۱. دریافت و تایید شماره تماس (Contact)
  if (msg.contact) {
    const phoneNumber = msg.contact.phone_number;
    try {
      await prisma.user.update({
        where: { telegramId },
        data: {
          phone: phoneNumber,
          phoneVerified: true,
        },
      });
      return bot.sendMessage(chatId, `✅ <b>شماره تماس شما (${phoneNumber}) با موفقیت تایید شد!</b>\n\nاکنون می‌توانید وارد مینی‌اپ بازی شوید:`, {
        reply_markup: {
          inline_keyboard: [[{ text: '🚀 ورود به بازی', web_app: { url: WEBAPP_URL } }]],
        },
      });
    } catch (contactErr) {
      console.error('[Bot Contact Error]:', contactErr);
    }
  }

  // ۱. دستور /start
  if (text.startsWith('/start')) {
    const welcomeText = `
⚠️ <b>توجه: سرور بازی در حال حاضر متصل نیست.</b>

سلام <b>${from.first_name || from.username || 'کاربر'}</b> عزیز 🎮
در حال حاضر ارتباط با سرور قطع می‌باشد یا در حالت تعمیرات است.

📞 <b>جهت فعال‌سازی، دسترسی یا هرگونه سوال لطفا به پشتیبانی پیام دهید:</b>
👉 @ShayanEsfahanizadeh

موجودی ثبت‌شده شما: <b>${formatCoins(user?.balance)} COINS</b>
    `.trim();

    return bot.sendMessage(chatId, welcomeText, {
      reply_markup: {
        ...mainReplyKeyboard,
        inline_keyboard: [
          [{ text: '💬 ارتباط با پشتیبانی', url: 'https://t.me/ShayanEsfahanizadeh' }],
          [{ text: '🚀 ورود به بازی (در صورت اتصال)', web_app: { url: WEBAPP_URL } }]
        ]
      }
    });
  }

  // ۲. استعلام موجودی
  if (text === '💰 موجودی من' || text === '/balance' || text === '/profile') {
    return sendBalance(chatId, user);
  }

  // ۳. باز کردن بازی
  if (text === '🚀 اجرای بازی' || text === '/play') {
    return bot.sendMessage(chatId, '👇 برای ورود به بازی روی دکمه زیر کلیک کنید:', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🎮 ورود به محیط بازی', web_app: { url: WEBAPP_URL } }]
        ]
      }
    });
  }

  // ۴. تاریخچه بازی‌ها
  if (text === '📜 تاریخچه بازی‌ها' || text === '/history') {
    return sendHistory(chatId, user);
  }

  // ۵. جایزه روزانه (ریتارگتینگ فعال)
  if (text === '🎁 جایزه روزانه' || text === '/bonus') {
    return claimDailyBonus(chatId, user);
  }

  // ۶. برترین بازیکنان
  if (text === '🏆 برترین‌ها' || text === '/top' || text === '/stats') {
    return sendStats(chatId, telegramId);
  }

  // ۷. دعوت دوستان
  if (text === '👥 دعوت دوستان' || text === '/invite') {
    return sendInvite(chatId, user, telegramId);
  }

  // ۸. دستورات ادمین و ریمارکتینگ (Broadcast)
  if (text.startsWith('/broadcast ') && ADMIN_IDS.includes(telegramId)) {
    const broadcastMsg = text.replace('/broadcast ', '').trim();
    return executeBroadcast(chatId, broadcastMsg);
  }

  // ۹. دستور ریتارگتینگ خودکار ادمین
  if (text === '/retarget' && ADMIN_IDS.includes(telegramId)) {
    return executeRetargetCampaign(chatId);
  }

  // ۱۰. دستور /help
  if (text === '/help') {
    const helpText = `
📌 <b>راهنمای دستورات ربات:</b>

🚀 /play - باز کردن بازی
💰 /balance - موجودی فعلی
🎁 /bonus - دریافت جایزه رایگان روزانه
📜 /history - ۱۰ بازی اخیر
👥 /invite - دریافت لینک زیرمجموعه‌گیری
🏆 /top - جدول برترین بازیکنان

${ADMIN_IDS.includes(telegramId) ? '👑 <b>دستورات ویژه مدیریت:</b>\n/retarget - ارسال پیام ترغیب به کاربران غیرفعال\n/broadcast [متن] - ارسال همگانی' : ''}
    `.trim();
    return bot.sendMessage(chatId, helpText, { reply_markup: mainReplyKeyboard });
  }
}

// هندل کردن Callback Query
async function handleCallback(cq) {
  const chatId = cq.message.chat.id;
  const telegramId = String(cq.from.id);
  const data = cq.data;

  await bot.call('answerCallbackQuery', { callback_query_id: cq.id });
  const user = await prisma.user.findUnique({ where: { telegramId } });

  if (data === 'balance') return sendBalance(chatId, user);
  if (data === 'history') return sendHistory(chatId, user);
  if (data === 'daily_reward') return claimDailyBonus(chatId, user);
  if (data === 'stats') return sendStats(chatId, telegramId);
  if (data === 'invite') return sendInvite(chatId, user, telegramId);
}

// ارسال وضعیت حساب
async function sendBalance(chatId, user) {
  if (!user) return bot.sendMessage(chatId, '❌ کاربر یافت نشد. /start را ارسال کنید.');
  const text = `
💳 <b>وضعیت حساب کاربری:</b>

👤 نام کاربری: @${user.username || 'ثبت نشده'}
🆔 شناسه: <code>${user.telegramId}</code>
💰 موجودی: <b>${formatCoins(user.balance)} COINS</b>
👥 درآمد از زیرمجموعه: <b>${formatCoins(user.referralCoinsEarned)} COINS</b>
📅 تاریخ عضویت: ${formatDate(user.createdAt)}
  `.trim();

  return bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 شروع بازی', web_app: { url: WEBAPP_URL } }],
        [{ text: '🎁 دریافت سکه رایگان', callback_data: 'daily_reward' }]
      ]
    }
  });
}

// سیستم ریمارکتینگ / جایزه روزانه (Retention Engine)
async function claimDailyBonus(chatId, user) {
  if (!user) return bot.sendMessage(chatId, 'ابتدا /start را بزنید.');

  // بررسی آخرین تراکنش بونوس روزانه در ۲۴ ساعت گذشته
  const lastBonus = await prisma.transaction.findFirst({
    where: {
      userId: user.id,
      type: 'daily_bonus',
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    },
    orderBy: { createdAt: 'desc' }
  });

  if (lastBonus) {
    const nextClaimTime = new Date(lastBonus.createdAt.getTime() + 24 * 60 * 60 * 1000);
    return bot.sendMessage(chatId, `⏳ شما جایزه امروز را دریافت کرده‌اید!\n\nنوبت بعدی دریافت: <b>${formatDate(nextClaimTime)}</b>`, {
      reply_markup: {
        inline_keyboard: [[{ text: '🎮 با موجودی فعلی بازی کن', web_app: { url: WEBAPP_URL } }]]
      }
    });
  }

  // اعطای بونوس
  const bonusAmount = 200;
  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { balance: { increment: bonusAmount } }
    }),
    prisma.transaction.create({
      data: {
        userId: user.id,
        type: 'daily_bonus',
        amount: bonusAmount,
        currency: 'coins',
        status: 'success',
        payload: 'Daily retention reward'
      }
    })
  ]);

  const text = `
🎁 <b>بونوس روزانه واریز شد!</b>

مبلغ <b>+${bonusAmount} سکه هدیه</b> به حساب شما اضافه شد.
موجودی جدید: <b>${formatCoins(user.balance + bonusAmount)} COINS</b>

همین حالا ضریب بعدی رو پیش‌بینی کن و سکه‌هات رو چند برابر کن! 👇
  `.trim();

  return bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🚀 دو برابر کردن جایزه در بازی', web_app: { url: WEBAPP_URL } }]
      ]
    }
  });
}

// ارسال تاریخچه
async function sendHistory(chatId, user) {
  if (!user) return bot.sendMessage(chatId, 'ابتدا /start را بزنید.');
  const games = await prisma.game.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    take: 10
  });

  if (games.length === 0) {
    return bot.sendMessage(chatId, '📜 شما هنوز بازی ثبت‌شده‌ای ندارید.', {
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 اولین پروازت رو شروع کن!', web_app: { url: WEBAPP_URL } }]]
      }
    });
  }

  let text = `📜 <b>گزارش ۱۰ پرواز اخیر شما:</b>\n\n`;
  games.forEach((g, i) => {
    const isWin = g.profit > 0;
    text += `${i + 1}. ${isWin ? '✅' : '💥'} شرط: <b>${formatCoins(g.bet)}</b> | ضریب: <b>${g.cashout ? g.cashout.toFixed(2) + 'x' : 'سوخت'}</b>\n`;
    text += `   سود/زیان: <b>${isWin ? '+' : ''}${formatCoins(g.profit)}</b> | ${formatDate(g.createdAt)}\n\n`;
  });

  return bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [[{ text: '🎮 بازی مجدد', web_app: { url: WEBAPP_URL } }]]
    }
  });
}

// ارسال لینک دعوت
async function sendInvite(chatId, user, telegramId) {
  const botInfo = await bot.call('getMe');
  const botUsername = botInfo?.result?.username || 'CrashGameBot';
  const refLink = `https://t.me/${botUsername}?start=ref_${user?.id || telegramId}`;

  const text = `
👥 <b>باشگاه مشتریان و سیستم درآمدزایی:</b>

با دعوت هر دوست، <b>۲۵۰ سکه رایگان</b> بلافاصله دریافت می‌کنید!

🔗 لینک اختصاصی شما:
<code>${refLink}</code>

(برای کپی شدن کافیست روی لینک ضربه بزنید)
  `.trim();

  return bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '📤 فوروارد برای دوستان', url: `https://t.me/share/url?url=${encodeURIComponent(refLink)}&text=${encodeURIComponent('بیا بازی انفجار تلگرام، با این لینک عضو شو سکه رایگان بگیر 🚀')}` }]
      ]
    }
  });
}

// آمار سیستم
async function sendStats(chatId, telegramId) {
  const totalUsers = await prisma.user.count();
  const totalGames = await prisma.game.count();
  const topUsers = await prisma.user.findMany({
    orderBy: { balance: 'desc' },
    take: 5,
    select: { username: true, balance: true, telegramId: true }
  });

  let text = `
📊 <b>آمار زنده تالار بازی Crash:</b>

👥 خلبانان حاضر: <b>${totalUsers.toLocaleString()}</b>
🎮 کل راندهای اجرا شده: <b>${totalGames.toLocaleString()}</b>

🏆 <b>قهرمانان برتر (بیشترین موجودی):</b>\n
  `.trim();

  topUsers.forEach((u, i) => {
    const name = u.username ? `@${u.username}` : `خلبان ${u.telegramId.slice(-4)}`;
    text += `\n${i + 1}. ${name} — <b>${formatCoins(u.balance)} سکه</b>`;
  });

  if (ADMIN_IDS.includes(telegramId)) {
    text += `\n\n👑 <i>دسترسی مدیریتی فعال است.</i>`;
  }

  return bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [[{ text: '🚀 رقابت در بازی', web_app: { url: WEBAPP_URL } }]]
    }
  });
}

// موتور ریتارگتینگ خودکار (کمپین بازگشت کاربران غیرفعال)
async function executeRetargetCampaign(adminChatId) {
  // شناسایی کاربرانی که بیش از ۲۴ ساعت بازی نکرده‌اند
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const inactiveUsers = await prisma.user.findMany({
    where: {
      updatedAt: { lt: oneDayAgo },
      blocked: false
    },
    take: 100
  });

  let sent = 0;
  for (const u of inactiveUsers) {
    const message = `
👋 سلام خلبان عزیز!
موشک Crash منتظر پرواز شماست 🚀
همین الان ضرایب داغ بالای <b>10.00x</b> ثبت شده!
وارد بازی شو و جایزه رایگانت رو دریافت کن 👇
    `.trim();

    const res = await bot.sendMessage(u.telegramId, message, {
      reply_markup: {
        inline_keyboard: [
          [{ text: '🚀 ورود فوری به پرواز', web_app: { url: WEBAPP_URL } }],
          [{ text: '🎁 دریافت هدیه بازگشت', callback_data: 'daily_reward' }]
        ]
      }
    });
    if (res && res.ok) sent++;
  }

  return bot.sendMessage(adminChatId, `🎯 کمپین ریتارگتینگ اجرا شد. پیام به <b>${sent}</b> کاربر غیرفعال ارسال شد.`);
}

// ارسال همگانی (Broadcast)
async function executeBroadcast(adminChatId, messageText) {
  const users = await prisma.user.findMany({ select: { telegramId: true } });
  let count = 0;
  for (const u of users) {
    const res = await bot.sendMessage(u.telegramId, messageText, {
      reply_markup: {
        inline_keyboard: [[{ text: '🚀 ورود به بازی', web_app: { url: WEBAPP_URL } }]]
      }
    });
    if (res && res.ok) count++;
  }
  return bot.sendMessage(adminChatId, `📢 پیام به ${count} کاربر با موفقیت ارسال شد.`);
}

// اعلان برد کاربر (Notification)
async function notifyUserWin(telegramId, bet, multiplier, profit) {
  const text = `
🎉 <b>برداشت موفقیت‌آمیز در بازی!</b>

💰 مبلغ شرط: ${formatCoins(bet)}
⚡️ ضریب خروج: <b>${multiplier.toFixed(2)}x</b>
📈 سود خالص: <b>+${formatCoins(profit)} COINS</b>
  `.trim();

  await bot.sendMessage(telegramId, text, {
    reply_markup: {
      inline_keyboard: [[{ text: '🚀 پرواز بعدی', web_app: { url: WEBAPP_URL } }]]
    }
  });
}

// حلقه دریافت آپدیت‌ها
async function startPolling() {
  if (!BOT_TOKEN || BOT_TOKEN === 'mock_token') {
    console.log('[Bot Polling] ربات به دلیل عدم تنظیم BOT_TOKEN اجرا نشد.');
    return;
  }

  console.log('🤖 ربات تلگرام هوشمند با سیستم ریمارکتینگ فعال شد...');
  let offset = 0;

  while (true) {
    try {
      const res = await bot.getUpdates(offset);
      if (res && res.ok && Array.isArray(res.result)) {
        for (const update of res.result) {
          offset = update.update_id + 1;
          if (update.pre_checkout_query) {
            await bot.answerPreCheckoutQuery(update.pre_checkout_query.id, true);
          } else if (update.message) {
            await handleMessage(update.message);
          } else if (update.callback_query) {
            await handleCallback(update.callback_query);
          }
        }
      }
    } catch (err) {
      console.error('[Polling Loop Error]:', err.message);
      await new Promise(r => setTimeout(r, 4000));
    }
  }
}

module.exports = {
  bot,
  notifyUserWin,
  startPolling
};

if (require.main === module) {
  startPolling();
}
