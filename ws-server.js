require('dotenv').config();
const WebSocket = require('ws');

const { createRedisClient } = require('./server/utils/memoryRedis');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
// اتصال مجزا برای دستورات عادی (غیر pub/sub)
const redis = createRedisClient(process.env.REDIS_URL || 'memory');
// اتصال مجزا برای انتشار (publisher)
const pub = createRedisClient(process.env.REDIS_URL || 'memory');
// اتصال مجزا برای اشتراک (subscriber)
const sub = createRedisClient(process.env.REDIS_URL || 'memory');

const wss = new WebSocket.Server({ port: 4001 });

// کانال‌های pub/sub
const LOBBY_CHANNEL = 'lobby-events';
const CHAT_CHANNEL = 'chat-events';

// وضعیت بازی جاری
let currentGame = null;
let gameTimer = null;
let currentSession = null;
const cashoutInProgress = new Set();

const DEFAULT_CRASH_CHANCES = [
  { range: [1.01, 1.2], chance: 0.25 },
  { range: [1.2, 2], chance: 0.35 },
  { range: [2, 5], chance: 0.30 },
  { range: [5, 20], chance: 0.09 },
  { range: [20, 50], chance: 0.01 },
];

let cachedChances = null;
let cachedAt = 0;
async function getCrashChances() {
  const now = Date.now();
  if (cachedChances && now - cachedAt < 20000) return cachedChances;
  try {
    const data = await redis.get('crashChances');
    if (data) {
      const parsed = JSON.parse(data).filter(c => Array.isArray(c.range) && c.range.length === 2);
      cachedChances = parsed;
      cachedAt = now;
      return parsed;
    }
  } catch (e) {
    console.error('Redis crashChances error:', e);
  }
  cachedChances = DEFAULT_CRASH_CHANCES;
  cachedAt = now;
  return DEFAULT_CRASH_CHANCES;
}

// توجه: تابع generateCrashPoint اکنون ناهمگام (async) است!
async function generateCrashPoint(seed) {
  const rng = new (class {
    constructor(seed) { this.seed = seed; }
    random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  })(seed);
  const r = rng.random();
  const chances = await getCrashChances();
  let acc = 0;
  for (let i = 0; i < chances.length; i++) {
    acc += chances[i].chance;
    if (r < acc) {
      const [min, max] = chances[i].range;
      return min + rng.random() * (max - min);
    }
  }
  return 1.1 + rng.random() * 0.4;
}

// محاسبه ضریب لحظه‌ای در زمان واقعی
function calculateCurrentMultiplier(seed, elapsedTime) {
  const rng = new (class {
    constructor(seed) { this.seed = seed; }
    random() { this.seed = (this.seed * 9301 + 49297) % 233280; return this.seed / 233280; }
  })(seed);

  // رشد نمایی همراه با تعیین تصادفی لحظه انفجار
  const maxTime = 20000; // حداکثر ۲۰ ثانیه
  const timeProgress = elapsedTime / maxTime;

  // تولید تصادفی لحظه کرش (۱ الی ۲۰ ثانیه)
  const crashTime = 1 + rng.random() * 19; // بین ۱ تا ۲۰ ثانیه
  const crashProgress = crashTime / 20;

  // اگر زمان سپری‌شده بیشتر از لحظه کرش باشد - بازی تمام است
  if (timeProgress >= crashProgress) {
    return null; // انفجار
  }

  // رشد نمایی ضریب
  const multiplier = Math.pow(Math.E, timeProgress * 2.5);
  return multiplier;
}

// دریافت تاریخچه سشن از پایگاه داده
async function getSessionHistory() {
  try {
    const sessions = await prisma.gameSession.findMany({
      where: {
        status: 'crashed'
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 20,
      select: {
        crashPoint: true,
        createdAt: true
      }
    });
    
    return sessions.map(session => ({
      multiplier: session.crashPoint || 1,
      timestamp: session.createdAt.getTime()
    }));
  } catch (error) {
    console.error('Error fetching session history:', error);
    return [];
  }
}

// راه‌اندازی بازی جدید
async function startNewGame() {
  if (currentGame) {
    console.log('Game already in progress, skipping...');
    return;
  }

  try {
    // ایجاد سشن بازی جدید در دیتابیس
    currentSession = await prisma.gameSession.create({
      data: {
        status: 'waiting'
      }
    });

    const seed = Math.floor(Math.random() * 1000000); // سید ۶ رقمی
    const salt = crypto.randomBytes(16).toString('hex');
    const betDuration = 15000; // ۱۵ ثانیه زمان شرط‌بندی
    const flightDuration = 20000; // زمان ثابت پرواز ۲۰ ثانیه
    const rawCrashPoint = await generateCrashPoint(seed);
    const crashPoint = parseFloat(rawCrashPoint.toFixed(2));
    const roundHash = crypto.createHmac('sha256', salt).update(`${seed}:${crashPoint.toFixed(2)}`).digest('hex');

    currentGame = {
      sessionId: currentSession.id,
      seed,
      salt,
      roundHash,
      crashPoint,
      startTime: Date.now() + betDuration, // شروع پرواز
      betEndTime: Date.now() + betDuration,
      duration: flightDuration,
      bets: [],
      phase: 'betting',
    };

    console.log(`Starting new game - Session: ${currentSession.id}, Seed: ${seed}, CrashPoint: ${crashPoint}, Hash: ${roundHash}`);

    // ۱. فاز ثبت شرط
    pub.publish(LOBBY_CHANNEL, JSON.stringify({
      type: 'game-start',
      phase: 'betting',
      sessionId: currentSession.id,
      seed,
      roundHash,
      betDuration,
      startTime: currentGame.startTime,
      betEndTime: currentGame.betEndTime,
      duration: flightDuration
    }));

    // ۲. پس از betDuration — فاز پرواز موشک
    setTimeout(async () => {
      if (!currentGame) return;
      await new Promise(res => setTimeout(res, 500)); // افزایش تاخیر به ۵۰۰ میلی‌ثانیه برای محاسبات
      await prisma.gameSession.update({
        where: { id: currentSession.id },
        data: {
          status: 'playing',
          startTime: new Date(),
          crashPoint: currentGame.crashPoint
        }
      });

      currentGame.phase = 'flying';
      currentGame.startTime = Date.now();

      pub.publish(LOBBY_CHANNEL, JSON.stringify({
        type: 'game-flying',
        phase: 'flying',
        sessionId: currentSession.id,
        seed,
        crashPoint: currentGame.crashPoint,
        startTime: currentGame.startTime,
        duration: currentGame.duration
      }));

      // ۳. پس از duration — انفجار موشک
      gameTimer = setTimeout(() => {
        endGame();
      }, currentGame.duration);
    }, betDuration);
  } catch (error) {
    console.error('Error starting new game:', error);
  }
}

// پایان بازی و تسویه حساب‌ها
async function endGame() {
  if (!currentGame || !currentSession) return;

  try {
    currentGame.phase = 'crashed';

    console.log(`Game crashed - Session: ${currentSession.id}, Seed: ${currentGame.seed}, Crash Point: ${currentGame.crashPoint?.toFixed(4) || 'N/A'}`);

    // به‌روزرسانی سشن در پایگاه داده
    await prisma.gameSession.update({
      where: { id: currentSession.id },
      data: {
        status: 'crashed',
        crashTime: new Date(),
        duration: Date.now() - currentGame.startTime
      }
    });

    // پردازش تمامی شرط‌های این سشن
    const sessionGames = await prisma.game.findMany({
      where: { gameSessionId: currentSession.id },
      include: { user: true }
    });

    for (const game of sessionGames) {
      if (game.status === 'cashed_out') {
        // بازیکن قبلاً سود را برداشت کرده است — رد شدن
        continue;
      }

      // بازیکن پیش از انفجار کش‌اوت نکرده است -> باخت مبلغ شرط
      const profit = -game.bet;

      await prisma.$transaction([
        prisma.game.update({
          where: { id: game.id },
          data: {
            profit,
            status: 'crashed'
          }
        }),
        prisma.transaction.create({
          data: {
            userId: game.user.id,
            type: 'game',
            amount: profit,
            currency: 'coins',
            payload: `Lost at ${currentGame.crashPoint?.toFixed(2) || 'N/A'}x`,
            status: 'success'
          }
        })
      ]);
    }

    // ارسال رویداد کرش
    pub.publish(LOBBY_CHANNEL, JSON.stringify({
      type: 'game-crash',
      phase: 'crashed',
      sessionId: currentSession.id,
      seed: currentGame.seed,
      salt: currentGame.salt,
      roundHash: currentGame.roundHash,
      crashPoint: currentGame.crashPoint,
      endTime: Date.now(),
      startTime: currentGame.startTime,
      duration: currentGame.duration
    }));

    currentGame = null;
    currentSession = null;
    gameTimer = null;

    // راه‌اندازی بازی جدید پس از ۳ ثانیه
    setTimeout(() => {
      startNewGame();
    }, 3000);
  } catch (error) {
    console.error('Error ending game:', error);
  }
}

// راه‌اندازی خودکار بازی‌ها
setInterval(() => {
  if (!currentGame && !gameTimer) {
    startNewGame();
  }
}, 5000);

// راه‌اندازی اولین بازی
setTimeout(() => {
  startNewGame();
}, 2000);

// اعتبارسنجی Telegram initData
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

// همگام‌سازی وضعیت کاربر و بازیابی پس از اتصال مجدد
async function syncUserStateAndSession(ws) {
  if (!ws.user) return;

  try {
    // ۱. پردازش شرط‌های معلق سشن‌هایی که در زمان قطعی اتصال منفجر شده‌اند
    const orphanedGames = await prisma.game.findMany({
      where: {
        userId: ws.user.id,
        status: 'waiting',
        gameSession: {
          status: 'crashed'
        }
      },
      include: { gameSession: true }
    });

    for (const og of orphanedGames) {
      await prisma.$transaction([
        prisma.game.update({
          where: { id: og.id },
          data: {
            status: 'crashed',
            profit: -og.bet
          }
        }),
        prisma.transaction.create({
          data: {
            userId: ws.user.id,
            type: 'game',
            amount: -og.bet,
            currency: 'coins',
            payload: `Crash loss recovery at ${og.gameSession?.crashPoint?.toFixed(2) || 'crashed'}x`,
            status: 'success'
          }
        })
      ]);
    }

    // ۲. دریافت جدیدترین موجودی کاربر از دیتابیس
    const freshUser = await prisma.user.findUnique({
      where: { id: ws.user.id },
      select: { balance: true }
    });
    if (freshUser) {
      ws.user.balance = freshUser.balance;
      ws.send(JSON.stringify({
        type: 'balance-update',
        balance: freshUser.balance
      }));
    }

    // ۳. در صورتی که در حال حاضر سشن فعالی وجود نداشته باشد
    if (!currentGame || !currentSession) {
      ws.send(JSON.stringify({
        type: 'sync',
        phase: 'betting',
        sessionId: null,
        seed: 0,
        crashPoint: 1.0,
        startTime: 0,
        duration: 20000,
        betEndTime: 0,
        currentMultiplier: 1.0,
        userBet: null,
        userBetAmount: 0,
        userCashout: null,
        profit: null
      }));
      return;
    }

    // ۴. بررسی شرط کاربر در سشن جاری
    const currentBet = await prisma.game.findFirst({
      where: {
        userId: ws.user.id,
        gameSessionId: currentSession.id
      },
      orderBy: { createdAt: 'desc' }
    });

    const elapsed = currentGame.phase === 'flying' ? Math.max(0, Date.now() - currentGame.startTime) : 0;
    const currentMultiplier = currentGame.phase === 'flying'
      ? (calculateCurrentMultiplier(currentGame.seed, elapsed) || currentGame.crashPoint || 1.0)
      : (currentGame.phase === 'crashed' ? (currentGame.crashPoint || 1.0) : 1.0);

    let userBet = null;
    let userBetAmount = 0;
    let userCashout = null;
    let profit = null;

    if (currentBet) {
      userBet = currentBet.bet;
      userBetAmount = currentBet.bet;
      if (currentBet.status === 'cashed_out') {
        userCashout = currentBet.cashout;
        profit = currentBet.profit;
      } else if (currentBet.status === 'crashed') {
        profit = currentBet.profit;
      }
    }

    // اگر بازی جاری منفجر شده و شرط کاربر همچنان در وضعیت waiting مانده باشد:
    if (currentGame.phase === 'crashed' && currentBet && currentBet.status === 'waiting') {
      await prisma.$transaction([
        prisma.game.update({
          where: { id: currentBet.id },
          data: {
            status: 'crashed',
            profit: -currentBet.bet
          }
        }),
        prisma.transaction.create({
          data: {
            userId: ws.user.id,
            type: 'game',
            amount: -currentBet.bet,
            currency: 'coins',
            payload: `Lost at ${currentGame.crashPoint?.toFixed(2) || 'N/A'}x`,
            status: 'success'
          }
        })
      ]);
      profit = -currentBet.bet;
    }

    // ارسال وضعیت لحظه‌ای به کلاینت
    ws.send(JSON.stringify({
      type: 'sync',
      phase: currentGame.phase,
      sessionId: currentSession.id,
      seed: currentGame.seed,
      roundHash: currentGame.roundHash,
      salt: currentGame.phase === 'crashed' ? currentGame.salt : undefined,
      crashPoint: currentGame.crashPoint,
      crashTime: currentGame.duration || 20000,
      startTime: currentGame.phase === 'betting' ? currentGame.betEndTime : currentGame.startTime,
      duration: currentGame.duration,
      betEndTime: currentGame.betEndTime,
      now: Date.now(),
      currentMultiplier,
      userBet,
      userBetAmount,
      userCashout,
      profit
    }));
  } catch (err) {
    console.error('Error in syncUserStateAndSession:', err);
  }
}

// اشتراک در pub/sub ردیس
sub.subscribe(LOBBY_CHANNEL, CHAT_CHANNEL);
sub.on('message', (channel, message) => {
  console.log(`Redis message on ${channel}:`, message);
  const data = JSON.parse(message);
  
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ channel, ...data }));
    }
  });
});

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  ws.isAlive = true;

  // SYNC: ارسال وضعیت به‌روز به کلاینت جدید
  if (currentGame) {
    ws.send(JSON.stringify({
      type: 'sync',
      phase: currentGame.phase,
      sessionId: currentSession?.id,
      seed: currentGame.seed,
      crashPoint: currentGame.crashPoint,
      startTime: currentGame.phase === 'betting' ? currentGame.betEndTime : currentGame.startTime,
      duration: currentGame.duration,
      betEndTime: currentGame.betEndTime,
      now: Date.now(),
    }));
  }

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', async (msg) => {
    let data;
    try {
      data = JSON.parse(msg);
      console.log('Received message:', data);
    } catch (e) {
      ws.send(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }

    // احراز هویت با initData تلگرام
    if (data.type === 'auth') {
      console.log('Auth attempt with initData:', data.initData ? 'present' : 'missing');
      console.log('NODE_ENV:', process.env.NODE_ENV);

      // حالت DEV برای تست و توسعه
      if (!data.initData) {
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
          ws.user = {
            id: user.id,
            telegramId: user.telegramId,
            username: user.username || `User${user.telegramId}`,
            avatarUrl: user.avatarUrl,
            balance: user.balance
          };
          console.log('[WS AUTH DEV] userId:', ws.user.id, 'telegramId:', ws.user.telegramId, 'username:', ws.user.username);
          ws.send(JSON.stringify({
            type: 'auth-success',
            user: ws.user
          }));
          // ارسال تاریخچه سشن
          const sessionHistory = await getSessionHistory();
          ws.send(JSON.stringify({
            type: 'session-history',
            history: sessionHistory
          }));
          await syncUserStateAndSession(ws);
          console.log('User authenticated (DEV):', ws.user.username, 'Balance:', ws.user.balance);
          return;
        } catch (error) {
          console.error('Error during DEV authentication:', error);
          ws.send(JSON.stringify({ error: 'DEV Authentication failed' }));
          return;
        }
      }

      const botToken = process.env.BOT_TOKEN;
      const adminBotToken = process.env.ADMIN_BOT_TOKEN;
      let isValid = false;
      let userData = null;
      if (botToken && validateInitData(data.initData, botToken)) {
        isValid = true;
        userData = extractUserData(data.initData);
      } else if (adminBotToken && validateInitData(data.initData, adminBotToken)) {
        isValid = true;
        userData = extractUserData(data.initData);
      }
      if (isValid && userData) {
        try {
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
          ws.user = {
            id: user.id,
            telegramId: user.telegramId,
            username: user.username || `User${user.telegramId}`,
            avatarUrl: user.avatarUrl,
            balance: user.balance
          };
          console.log('[WS AUTH] userId:', ws.user.id, 'telegramId:', ws.user.telegramId, 'username:', ws.user.username);
          ws.send(JSON.stringify({
            type: 'auth-success',
            user: ws.user
          }));
          // ارسال تاریخچه سشن
          const sessionHistory = await getSessionHistory();
          ws.send(JSON.stringify({
            type: 'session-history',
            history: sessionHistory
          }));
          await syncUserStateAndSession(ws);
          console.log('User authenticated:', ws.user.username, 'Balance:', ws.user.balance);
        } catch (error) {
          console.error('Error during authentication:', error);
          ws.send(JSON.stringify({ error: 'Authentication failed' }));
        }
      } else {
        ws.send(JSON.stringify({ error: 'Authentication failed: invalid initData' }));
        console.error('Auth failed: invalid initData');
      }
      return;
    }

    // چت
    if (data.type === 'chat-message') {
      if (!ws.user) {
        ws.send(JSON.stringify({ error: 'Not authenticated' }));
        return;
      }

      try {
        // ذخیره پیام در دیتابیس
        await prisma.chatMessage.create({
          data: {
            userId: ws.user.id,
            message: data.message,
            type: 'text',
            gameSessionId: currentSession?.id
          }
        });

      const chatMsg = {
          userId: ws.user.id,
          username: ws.user.username,
          avatarUrl: ws.user.avatarUrl,
        message: data.message,
        createdAt: Date.now(),
      };
      console.log('Chat message:', chatMsg);
      pub.publish(CHAT_CHANNEL, JSON.stringify({ type: 'chat-message', ...chatMsg }));
      } catch (error) {
        console.error('Error saving chat message:', error);
      }
      return;
    }

    // ثبت شرط
    if (data.type === 'bet') {
      if (!ws.user) {
        ws.send(JSON.stringify({ error: 'احراز هویت انجام نشده است' }));
        return;
      }

      if (!currentGame || currentGame.phase !== 'betting') {
        ws.send(JSON.stringify({ error: 'زمان ثبت شرط به پایان رسیده است' }));
        return;
      }

      const bet = Number(data.bet);
      if (![10, 50, 100].includes(bet)) {
        ws.send(JSON.stringify({ error: 'مبلغ شرط نامعتبر است. مبالغ مجاز: ۱۰، ۵۰، ۱۰۰ سکه' }));
        return;
      }

      try {
        // بررسی موجودی و ثبت شرط در تراکنش
        const result = await prisma.$transaction(async (tx) => {
          const user = await tx.user.findUnique({
            where: { id: ws.user.id },
            select: { balance: true, blocked: true }
          });
          if (!user) {
            console.error('[WS BET] User not found! userId:', ws.user.id, 'telegramId:', ws.user.telegramId);
            throw new Error('کاربر یافت نشد');
          }
          if (user.blocked) {
            throw new Error('حساب کاربری مسدود شده است');
          }
          if (user.balance < bet) {
            throw new Error('موجودی سکه کافی نیست');
          }
          // کسر مبلغ از موجودی
          const updatedUser = await tx.user.update({
            where: { id: ws.user.id },
            data: { balance: { decrement: bet } },
            select: { balance: true }
          });
          // ایجاد رکورد شرط
          const gameData = {
            userId: ws.user.id,
            gameSessionId: currentSession.id,
            bet,
            crashPoint: currentGame.crashPoint,
            profit: 0,
            status: 'waiting'
          };
          if (data.theme) {
            gameData.theme = data.theme;
          }
          const game = await tx.game.create({
            data: gameData
          });
          return { updatedUser, game };
        });
        // به‌روزرسانی موجودی در شیء کاربر سوکت
        ws.user.balance = result.updatedUser.balance;
        ws.send(JSON.stringify({
          type: 'balance-update',
          balance: result.updatedUser.balance
        }));
        console.log('Bet received:', bet, 'from user:', ws.user.username, 'userId:', ws.user.id, 'New balance:', result.updatedUser.balance);
        // افزودن به بازی جاری
        if (currentGame) {
          currentGame.bets.push({
            userId: ws.user.id,
            username: ws.user.username,
            bet,
            timestamp: Date.now()
          });
        }
      pub.publish(LOBBY_CHANNEL, JSON.stringify({
        type: 'bet',
          userId: ws.user.id,
          username: ws.user.username,
          bet,
          createdAt: Date.now()
        }));
      } catch (error) {
        console.error('Error placing bet:', error);
        ws.send(JSON.stringify({
          error: error.message || 'خطا در ثبت شرط',
          balance: ws.user.balance
        }));
      }
      return;
    }

    // کش‌اوت (برداشت سود)
    if (data.type === 'cashout') {
      if (!ws.user) {
        ws.send(JSON.stringify({ error: 'احراز هویت انجام نشده است' }));
        return;
      }

      if (!currentGame || currentGame.phase !== 'flying' || !currentSession) {
        ws.send(JSON.stringify({ error: 'بازی در حال حاضر در فاز پرواز نیست' }));
        return;
      }

      // جلوگیری از ارسال همزمان چند درخواست برداشت سود برای یک شرط
      const lockKey = `${ws.user.id}_${currentSession.id}`;
      if (cashoutInProgress.has(lockKey)) {
        ws.send(JSON.stringify({ error: 'درخواست برداشت سود در حال پردازش است' }));
        return;
      }
      cashoutInProgress.add(lockKey);

      // محاسبه لحظه‌ای ضریب روی سرور
      const elapsed = Math.max(0, Date.now() - currentGame.startTime);
      const multiplier = calculateCurrentMultiplier(currentGame.seed, elapsed);

      console.log('[CASHOUT] Server calculated multiplier:', multiplier?.toFixed(4) || 'CRASH', 'elapsed:', elapsed);

      if (!multiplier) {
        cashoutInProgress.delete(lockKey);
        ws.send(JSON.stringify({ error: 'موشک منفجر شده است' }));
        return;
      }

      try {
        // به‌روزرسانی بازی در دیتابیس با بررسی اتمیک وضعیت
        const result = await prisma.$transaction(async (tx) => {
          // بررسی اینکه آیا قبلاً در این سشن برداشت انجام شده است
          const alreadyCashedOut = await tx.game.findFirst({
            where: {
              userId: ws.user.id,
              gameSessionId: currentSession.id,
              status: 'cashed_out'
            }
          });

          if (alreadyCashedOut) {
            throw new Error('قبلاً برداشت شده است');
          }

          // یافتن تمامی شرط‌های فعال کاربر در سشن جاری
          const games = await tx.game.findMany({
            where: {
              userId: ws.user.id,
              gameSessionId: currentSession.id,
              status: 'waiting'
            }
          });

          if (games.length === 0) {
            throw new Error('هیچ شرط فعالی برای برداشت یافت نشد');
          }

          let totalBet = 0;
          let totalWinnings = 0;

          // به‌روزرسانی اتمیک تمامی شرط‌های کاربر
          for (const game of games) {
            const winnings = Math.floor(game.bet * multiplier);
            totalBet += game.bet;
            totalWinnings += winnings;

            const updateRes = await tx.game.updateMany({
              where: {
                id: game.id,
                status: 'waiting' // محافظت اتمیک در برابر برداشت مکرر
              },
              data: {
                cashout: multiplier,
                profit: winnings - game.bet,
                status: 'cashed_out'
              }
            });

            if (updateRes.count === 0) {
              throw new Error('برداشت این دور قبلاً انجام شده است');
            }
          }

          // واریز مجموع جایزه به حساب کاربر
          const updatedUser = await tx.user.update({
            where: { id: ws.user.id },
            data: { balance: { increment: totalWinnings } },
            select: { balance: true }
          });

          // ایجاد لاگ تراکنش
          await tx.transaction.create({
            data: {
              userId: ws.user.id,
              type: 'game',
              amount: totalWinnings - totalBet,
              currency: 'coins',
              payload: `Cashout at ${multiplier.toFixed(2)}x`,
              status: 'success'
            }
          });

          return { updatedUser, totalBet, totalWinnings };
        });

        // به‌روزرسانی موجودی در شیء کاربر سوکت
        ws.user.balance = result.updatedUser.balance;

        ws.send(JSON.stringify({
          type: 'balance-update',
          balance: result.updatedUser.balance
        }));

        pub.publish(LOBBY_CHANNEL, JSON.stringify({
          type: 'cashout',
          userId: ws.user.id,
          username: ws.user.username,
          bet: result.totalBet,
          multiplier,
          winnings: result.totalWinnings,
          createdAt: Date.now()
        }));

        console.log('Cashout:', result.totalWinnings, 'for user:', ws.user.username, 'New balance:', result.updatedUser.balance);
      } catch (error) {
        console.error('Error processing cashout:', error);
        ws.send(JSON.stringify({
          error: error.message || 'خطا در برداشت سود',
          balance: ws.user.balance
        }));
      } finally {
        cashoutInProgress.delete(lockKey);
      }
      return;
    }

    // سایر رویدادها
    if (data.type === 'game-event') {
      // نادیده گرفتن هرگونه تلاش برای تغییر فاز از سمت کلاینت
      ws.send(JSON.stringify({ error: 'Phase control is server-only' }));
      return;
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed for user:', ws.user?.username);
  });
});

// ارسال پینگ برای حفظ و سنجش اتصال
setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

console.log('WebSocket server started on ws://0.0.0.0:4001');
console.log('Redis connected:', redis.status); 
console.log('Prisma connected');
console.log('BOT_TOKEN loaded:', process.env.BOT_TOKEN ? 'YES' : 'NO');
console.log('ADMIN_BOT_TOKEN loaded:', process.env.ADMIN_BOT_TOKEN ? 'YES' : 'NO'); 