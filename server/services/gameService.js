const config = require('../config');
const crypto = require('crypto');

class GameService {
  constructor(prisma, pub) {
    this.prisma = prisma;
    this.pub = pub;
    this.currentGame = null;
    this.currentSession = null;
    this.gameTimer = null;
    this.crashTimer = null;
    this.cachedChances = null;
    this.cachedAt = 0;
  }

  // دریافت شانس‌های کرش از ردیس
  async getCrashChances() {
    const now = Date.now();
    if (this.cachedChances && now - this.cachedAt < config.CHANCES_CACHE_DURATION) {
      return this.cachedChances;
    }

    try {
      const data = await this.pub.get('crashChances');
      if (data) {
        const parsed = JSON.parse(data).filter(c => Array.isArray(c.range) && c.range.length === 2);
        this.cachedChances = parsed;
        this.cachedAt = now;
        return parsed;
      }
    } catch (e) {
      console.error('Redis crashChances error:', e);
    }

    this.cachedChances = config.DEFAULT_CRASH_CHANCES;
    this.cachedAt = now;
    return config.DEFAULT_CRASH_CHANCES;
  }

  // تولید بهینه نقطه کرش با توزیع واقع‌گرایانه
  async generateCrashPoint(seed) {
    const rng = new (class {
      constructor(seed) { this.seed = seed; }
      random() {
        this.seed = (this.seed * 9301 + 49297) % 233280;
        return this.seed / 233280;
      }
    })(seed);

    const r = rng.random();
    const chances = await this.getCrashChances();
    let acc = 0;

    for (let i = 0; i < chances.length; i++) {
      acc += chances[i].chance;
      if (r < acc) {
        const [min, max] = chances[i].range;
        // استفاده از توزیع نمایی درون بازه برای شبیه‌سازی دقیق‌تر انفجارها
        const u = rng.random();
        const crashPoint = min * Math.pow(max / min, u);
        return Math.max(1.0, crashPoint); // حداقل ۱.۰
      }
    }

    // حالت بازگشتی (Fallback)
    return 1.1 + rng.random() * 0.4;
  }

  // محاسبه زمان کرش بر حسب میلی‌ثانیه بر اساس crashPoint
  calculateCrashTime(crashPoint) {
    // فرمول: زمان = ln(crashPoint) * 1000 میلی‌ثانیه
    // این رابطه باعث افزایش نمایی زمان با بالا رفتن ضریب می‌شود
    const timeInSeconds = Math.log(crashPoint) * 1000;
    return Math.max(1000, Math.min(20000, timeInSeconds)); // بین ۱ تا ۲۰ ثانیه
  }

  // محاسبه ضریب لحظه‌ای در زمان واقعی بر اساس زمان سپری‌شده
  calculateCurrentMultiplier(startTime, crashTime) {
    const elapsed = Math.max(0, Date.now() - startTime);

    // اگر زمان سپری‌شده از زمان کرش بگذرد - بازی خاتمه یافته است
    if (elapsed >= crashTime) {
      return null; // انفجار (کرش)
    }

    // رشد نمایی ضریب
    const timeProgress = elapsed / crashTime;
    const multiplier = Math.pow(Math.E, timeProgress * Math.log(crashTime / 1000));
    return multiplier;
  }

  // دریافت تاریخچه سشن از پایگاه داده
  async getSessionHistory() {
    try {
      const sessions = await this.prisma.gameSession.findMany({
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

  // شروع بازی جدید
  async startNewGame() {
    if (this.currentGame) {
      console.log('Game already in progress, skipping...');
      return;
    }

    try {
      // ایجاد سشن جدید بازی در پایگاه داده
      this.currentSession = await this.prisma.gameSession.create({
        data: {
          status: 'waiting'
        }
      });

      const seed = Math.floor(Math.random() * 1000000); // سید ۶ رقمی
      const salt = crypto.randomBytes(16).toString('hex');
      const rawCrashPoint = await this.generateCrashPoint(seed);
      const crashPoint = parseFloat(rawCrashPoint.toFixed(2));
      const roundHash = crypto.createHmac('sha256', salt).update(`${seed}:${crashPoint.toFixed(2)}`).digest('hex');

      this.currentGame = {
        sessionId: this.currentSession.id,
        seed,
        salt,
        roundHash,
        crashPoint,
        crashTime: this.calculateCrashTime(crashPoint),
        startTime: Date.now() + config.BET_DURATION,
        betEndTime: Date.now() + config.BET_DURATION,
        duration: config.FLIGHT_DURATION,
        bets: new Map(), // نگه‌داری شرط‌ها بر اساس userId
        phase: 'betting',
      };

      console.log(`Starting new game - Session: ${this.currentSession.id}, Seed: ${seed}, CrashPoint: ${crashPoint}`);

      // ۱. فاز شرط‌بندی
      this.pub.publish(config.LOBBY_CHANNEL, JSON.stringify({
        type: 'game-start',
        phase: 'betting',
        sessionId: this.currentSession.id,
        seed,
        roundHash,
        betDuration: config.BET_DURATION,
        startTime: this.currentGame.startTime,
        betEndTime: this.currentGame.betEndTime,
        duration: config.FLIGHT_DURATION
      }));

      // ۲. پس از betDuration — فاز پرواز موشک
      setTimeout(async () => {
        if (!this.currentGame) return;

        console.log('Game flying - crashPoint:', this.currentGame.crashPoint.toFixed(4), 'crashTime:', this.currentGame.crashTime.toFixed(0) + 'ms');

        await this.prisma.gameSession.update({
          where: { id: this.currentSession.id },
          data: {
            status: 'playing',
            startTime: new Date(),
            crashPoint: this.currentGame.crashPoint
          }
        });

        this.currentGame.phase = 'flying';
        this.currentGame.startTime = Date.now();

        this.pub.publish(config.LOBBY_CHANNEL, JSON.stringify({
          type: 'game-flying',
          phase: 'flying',
          sessionId: this.currentSession.id,
          seed,
          roundHash: this.currentGame.roundHash,
          crashPoint: this.currentGame.crashPoint,
          crashTime: this.currentGame.crashTime,
          startTime: this.currentGame.startTime,
          duration: this.currentGame.duration
        }));

        // ۳. پس از crashTime — وقوع انفجار (Crash)
        this.crashTimer = setTimeout(() => {
          this.endGame();
        }, this.currentGame.crashTime);
      }, config.BET_DURATION);
    } catch (error) {
      console.error('Error starting new game:', error);
    }
  }

  // پایان بازی و تسویه حساب‌ها
  async endGame() {
    if (!this.currentGame || !this.currentSession) return;

    try {
      this.currentGame.phase = 'crashed';

      console.log(`Game crashed - Session: ${this.currentSession.id}, Seed: ${this.currentGame.seed}, Crash Point: ${this.currentGame.crashPoint?.toFixed(4) || 'N/A'}`);

      // به‌روزرسانی وضعیت سشن در دیتابیس
      await this.prisma.gameSession.update({
        where: { id: this.currentSession.id },
        data: {
          status: 'crashed',
          crashTime: new Date(),
          duration: Date.now() - this.currentGame.startTime
        }
      });

      // پردازش تمامی شرط‌های ثبت‌شده در سشن
      const sessionGames = await this.prisma.game.findMany({
        where: { gameSessionId: this.currentSession.id },
        include: { user: true }
      });

      for (const game of sessionGames) {
        if (game.cashout && game.cashout > 0) {
          // بازیکن موفق به برداشت سود به موقع شده است
          const profit = (game.bet * game.cashout) - game.bet;

          await this.prisma.$transaction([
            this.prisma.game.update({
              where: { id: game.id },
              data: {
                profit,
                status: 'cashed_out'
              }
            }),
            this.prisma.user.update({
              where: { id: game.user.id },
              data: {
                balance: { increment: profit + game.bet }
              }
            }),
            this.prisma.transaction.create({
              data: {
                userId: game.user.id,
                type: 'game',
                amount: profit,
                currency: 'XTR',
                payload: `Cashout at ${game.cashout.toFixed(2)}x`,
                status: 'success'
              }
            })
          ]);
        } else {
          // بازیکن در این راند باخت
          const profit = -game.bet;

          await this.prisma.$transaction([
            this.prisma.game.update({
              where: { id: game.id },
              data: {
                profit,
                status: 'crashed'
              }
            }),
            this.prisma.transaction.create({
              data: {
                userId: game.user.id,
                type: 'game',
                amount: profit,
                currency: 'XTR',
                payload: `Lost at ${this.currentGame.crashPoint?.toFixed(2) || 'N/A'}x`,
                status: 'success'
              }
            })
          ]);
        }
      }

      // انتشار رویداد انفجار به لابی
      this.pub.publish(config.LOBBY_CHANNEL, JSON.stringify({
        type: 'game-crash',
        phase: 'crashed',
        sessionId: this.currentSession.id,
        seed: this.currentGame.seed,
        salt: this.currentGame.salt,
        roundHash: this.currentGame.roundHash,
        crashPoint: this.currentGame.crashPoint,
        endTime: Date.now(),
        startTime: this.currentGame.startTime,
        duration: this.currentGame.duration
      }));

      this.currentGame = null;
      this.currentSession = null;
      this.gameTimer = null;
      this.crashTimer = null;

      // راه‌اندازی راند بعدی پس از ۳ ثانیه
      setTimeout(() => {
        this.startNewGame();
      }, config.GAME_RESTART_DELAY);
    } catch (error) {
      console.error('Error ending game:', error);
    }
  }

  // افزودن شرط (تجمیع مبالغ به‌جای جایگزینی)
  addBet(userId, username, bet, clientBetId = null) {
    if (!this.currentGame || this.currentGame.phase !== 'betting') {
      return false;
    }

    if (!this.currentGame.bets.has(userId)) {
      this.currentGame.bets.set(userId, {
        userId,
        username,
        totalBet: 0,
        bets: [],
        timestamp: Date.now()
      });
    }

    const userBets = this.currentGame.bets.get(userId);
    userBets.totalBet += bet;
    userBets.bets.push({
      bet,
      clientBetId,
      timestamp: Date.now()
    });

    return true;
  }

  // دریافت وضعیت جاری بازی
  getCurrentGame() {
    return this.currentGame;
  }

  // دریافت سشن جاری
  getCurrentSession() {
    return this.currentSession;
  }
}

module.exports = GameService; 