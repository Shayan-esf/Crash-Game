const crypto = require('crypto');
const config = require('../config');

// اعتبارسنجی initData تلگرام
function validateInitData(initData, botToken) {
  console.log('🔍 validateInitData called with:');
  console.log('  - initData:', initData ? 'present' : 'missing');
  console.log('  - botToken:', botToken ? 'present' : 'missing');
  
  if (!initData || !botToken) {
    console.log('❌ Missing initData or botToken');
    return false;
  }
  
  const urlParams = new URLSearchParams(initData);
  const hash = urlParams.get('hash');
  console.log('  - hash from initData:', hash ? 'present' : 'missing');
  
  if (!hash) {
    console.log('❌ No hash in initData');
    return false;
  }
  
  urlParams.delete('hash');
  const dataCheckString = Array.from(urlParams.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  console.log('  - dataCheckString:', dataCheckString);
  
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const calculatedHash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  
  console.log('  - calculatedHash:', calculatedHash);
  console.log('  - providedHash:', hash);
  console.log('  - hashes match:', calculatedHash === hash);
  
  return calculatedHash === hash;
}

// استخراج اطلاعات کاربر از initData
function extractUserData(initData) {
  const urlParams = new URLSearchParams(initData);
  const userStr = urlParams.get('user');
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch (e) {
    return null;
  }
}

// بررسی احراز هویت با پشتیبانی از حالت DEV
async function authenticateUser(initData, prisma) {
  console.log('Auth attempt with initData:', initData ? 'present' : 'missing');
  console.log('NODE_ENV:', process.env.NODE_ENV);

  // حالت DEV برای تست و توسعه
  if (!initData || initData === 'dev') {
    console.log('[DEV MODE] Skipping Telegram auth, creating test user');
    try {
      let user = await prisma.user.upsert({
        where: { telegramId: 'dev-test-user' },
        update: {},
        create: {
          telegramId: 'dev-test-user',
          username: 'dev-test-user',
          balance: 1000, // موجودی اولیه
        },
      });
      if (user.balance === 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { balance: 1000 }
        });
      }
      return {
        id: user.id,
        telegramId: user.telegramId,
        username: user.username || `User${user.telegramId}`,
        avatarUrl: user.avatarUrl,
        balance: user.balance
      };
    } catch (error) {
      console.error('Error during DEV authentication:', error);
      throw new Error('DEV Authentication failed');
    }
  }

  // بررسی با توکن‌های اصلی و ادمین
  const botToken = config.BOT_TOKEN;
  const adminBotToken = config.ADMIN_BOT_TOKEN;
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
    throw new Error('Authentication failed: invalid initData');
  }

  // یافتن یا ایجاد کاربر در دیتابیس
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
      data: { balance: 1000 }
    });
  }
  
  return {
    id: user.id,
    telegramId: user.telegramId,
    username: user.username || `User${user.telegramId}`,
    avatarUrl: user.avatarUrl,
    balance: user.balance
  };
}

module.exports = {
  validateInitData,
  extractUserData,
  authenticateUser
}; 