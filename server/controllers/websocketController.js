const config = require('../config');
const { authenticateUser } = require('../utils/telegram');
const { notifyUserWin } = require('../bot');

class WebSocketController {
  constructor(prisma, pub, gameService) {
    this.prisma = prisma;
    this.pub = pub;
    this.gameService = gameService;
  }

  // پردازش احراز هویت
  async handleAuth(ws, data) {
    try {
      const user = await authenticateUser(data.initData, this.prisma);
      ws.user = user;

      console.log('[WS AUTH] userId:', ws.user.id, 'telegramId:', ws.user.telegramId, 'username:', ws.user.username);

      ws.send(JSON.stringify({
        type: 'auth-success',
        user: ws.user
      }));

      // ارسال تاریخچه سشن
      const sessionHistory = await this.gameService.getSessionHistory();
      ws.send(JSON.stringify({
        type: 'session-history',
        history: sessionHistory
      }));

      console.log('User authenticated:', ws.user.username, 'Balance:', ws.user.balance);
    } catch (error) {
      console.error('Error during authentication:', error);
      ws.send(JSON.stringify({ error: error.message || 'Authentication failed' }));
    }
  }

  // پردازش پیام‌های چت
  async handleChatMessage(ws, data) {
    if (!ws.user) {
      ws.send(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }

    try {
      // ذخیره پیام در پایگاه داده
      await this.prisma.chatMessage.create({
        data: {
          userId: ws.user.id,
          message: data.message,
          type: 'text',
          gameSessionId: this.gameService.getCurrentSession()?.id
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
      this.pub.publish(config.CHAT_CHANNEL, JSON.stringify({ type: 'chat-message', ...chatMsg }));
    } catch (error) {
      console.error('Error saving chat message:', error);
    }
  }

  // پردازش شرط (پشتیبانی از جمع بستن مبالغ)
  async handleBet(ws, data) {
    if (!ws.user) {
      ws.send(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }

    const currentGame = this.gameService.getCurrentGame();
    if (!currentGame || currentGame.phase !== 'betting') {
      ws.send(JSON.stringify({ error: 'Betting phase is over' }));
      return;
    }

    const bet = data.bet;
    const clientBetId = data.clientBetId;

    try {
      // بررسی موجودی و ثبت شرط در تراکنش
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({
          where: { id: ws.user.id },
          select: { balance: true, blocked: true }
        });

        if (!user) {
          console.error('[WS BET] User not found! userId:', ws.user.id, 'telegramId:', ws.user.telegramId);
          throw new Error('User not found');
        }

        if (user.blocked) {
          throw new Error('Account blocked');
        }

        if (user.balance < bet) {
          throw new Error('Insufficient balance');
        }

        // کسر از موجودی
        const updatedUser = await tx.user.update({
          where: { id: ws.user.id },
          data: { balance: { decrement: bet } },
          select: { balance: true }
        });

        // ایجاد رکورد شرط
        const game = await tx.game.create({
          data: {
            userId: ws.user.id,
            gameSessionId: this.gameService.getCurrentSession().id,
            bet,
            profit: 0,
            status: 'waiting'
          }
        });

        return { updatedUser, game };
      });

      // به‌روزرسانی موجودی در شیء کاربر سوکت
      ws.user.balance = result.updatedUser.balance;
      ws.send(JSON.stringify({
        type: 'balance-update',
        balance: result.updatedUser.balance
      }));

      // افزودن شرط به سرویس بازی (تجمیع مبالغ)
      const added = this.gameService.addBet(ws.user.id, ws.user.username, bet, clientBetId);

      if (added) {
        const userBets = currentGame.bets.get(ws.user.id);
        console.log('Bet added:', bet, 'from user:', ws.user.username, 'Total bet:', userBets.totalBet, 'New balance:', result.updatedUser.balance);

      this.pub.publish(config.LOBBY_CHANNEL, JSON.stringify({
        type: 'bet',
        userId: ws.user.id,
        username: ws.user.username,
        bet,
          totalBet: userBets.totalBet,
        createdAt: Date.now()
      }));
      }
    } catch (error) {
      console.error('Error placing bet:', error);
      ws.send(JSON.stringify({
        error: error.message || 'Bet failed',
        balance: ws.user.balance
      }));
    }
  }

  // پردازش کش‌اوت (برداشت سود)
  async handleCashout(ws, data) {
    console.log('[CASHOUT] شروع پردازش کش‌اوت برای کاربر:', ws.user?.username);

    if (!ws.user) {
      ws.send(JSON.stringify({ error: 'Not authenticated' }));
      return;
    }

    const currentGame = this.gameService.getCurrentGame();
    console.log('[CASHOUT] بازی فعلی:', currentGame ? 'موجود است' : 'یافت نشد', 'فاز:', currentGame?.phase);

    if (!currentGame || currentGame.phase !== 'flying') {
      ws.send(JSON.stringify({ error: 'Not in flying phase' }));
      return;
    }

    // محاسبه ضریب لحظه‌ای روی سرور در زمان واقعی
    const multiplier = this.gameService.calculateCurrentMultiplier(currentGame.startTime, currentGame.crashTime);

    console.log('[CASHOUT] Server calculated multiplier:', multiplier?.toFixed(4) || 'CRASH');

    if (!multiplier) {
      ws.send(JSON.stringify({ error: 'Game already crashed' }));
      return;
    }

    try {
      // به‌روزرسانی وضعیت بازی در پایگاه داده
      const result = await this.prisma.$transaction(async (tx) => {
        // یافتن همه شرط‌های فعال کاربر در سشن جاری
        const games = await tx.game.findMany({
          where: {
            userId: ws.user.id,
            gameSessionId: this.gameService.getCurrentSession().id,
            status: 'waiting'
          }
        });

        if (games.length === 0) {
          throw new Error('No active bets found');
        }

        let totalBet = 0;
        let totalWinnings = 0;

        // به‌روزرسانی تمام شرط‌های کاربر
        for (const game of games) {
          const winnings = Math.floor(game.bet * multiplier);
          totalBet += game.bet;
          totalWinnings += winnings;

          await tx.game.update({
            where: { id: game.id },
            data: {
              cashout: multiplier,
              profit: winnings - game.bet,
              status: 'cashed_out'
            }
          });
        }

        // واریز مجموع جایزه به حساب کاربر
        const updatedUser = await tx.user.update({
          where: { id: ws.user.id },
          data: { balance: { increment: totalWinnings } },
          select: { balance: true }
        });

        // ایجاد تراکنش
        await tx.transaction.create({
          data: {
            userId: ws.user.id,
            type: 'game',
            amount: totalWinnings - totalBet,
            currency: 'XTR',
            payload: `Cashout at ${multiplier.toFixed(2)}x`,
            status: 'success'
          }
        });

        return { updatedUser, totalBet, totalWinnings };
      });

      // به‌روزرسانی موجودی کاربر در شیء سوکت
      ws.user.balance = result.updatedUser.balance;

      ws.send(JSON.stringify({
        type: 'balance-update',
        balance: result.updatedUser.balance
      }));

      this.pub.publish(config.LOBBY_CHANNEL, JSON.stringify({
        type: 'cashout',
        userId: ws.user.id,
        username: ws.user.username,
        bet: result.totalBet,
        multiplier,
        winnings: result.totalWinnings,
        createdAt: Date.now()
      }));

      console.log('Cashout:', result.totalWinnings, 'for user:', ws.user.username, 'New balance:', result.updatedUser.balance);

      // ارسال اعلان تلگرامی به کاربر در صورت برد
      if (ws.user.telegramId && ws.user.telegramId !== 'dev-test-user' && result.totalWinnings > 0) {
        notifyUserWin(ws.user.telegramId, result.totalBet, multiplier, result.totalWinnings).catch(() => {});
      }
    } catch (error) {
      console.error('Error processing cashout:', error);
      ws.send(JSON.stringify({
        error: error.message || 'Cashout failed',
        balance: ws.user.balance
      }));
    }
  }

  // پردازش ری‌اکشن آیکونی زنده روی موشک
  async handleReaction(ws, data) {
    const reaction = data.reaction;
    if (!['rocket', 'flame', 'zap', 'trophy'].includes(reaction)) return;

    const payload = {
      type: 'reaction',
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      reaction,
      userId: ws.user?.id || 'guest',
      username: ws.user?.username || ws.user?.firstName || 'خلبان',
      createdAt: Date.now()
    };

    this.pub.publish(config.LOBBY_CHANNEL, JSON.stringify(payload));
  }

  // ارسال وضعیت همگام‌سازی به کلاینت جدید
  sendSync(ws) {
    const currentGame = this.gameService.getCurrentGame();
    if (currentGame) {
      ws.send(JSON.stringify({
        type: 'sync',
        phase: currentGame.phase,
        sessionId: this.gameService.getCurrentSession()?.id,
        seed: currentGame.seed,
        crashPoint: currentGame.crashPoint,
        crashTime: currentGame.crashTime,
        startTime: currentGame.phase === 'betting' ? currentGame.betEndTime : currentGame.startTime,
        duration: currentGame.duration,
        betEndTime: currentGame.betEndTime,
        now: Date.now(),
      }));
    }
  }
}

module.exports = WebSocketController; 