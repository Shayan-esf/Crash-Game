const WebSocket = require('ws');

// کلاینت تستی وب‌سوکت
function testWebSocket() {
  console.log('🔌 در حال اتصال به سرور وب‌سوکت...');

  const ws = new WebSocket('ws://localhost:4001');

  ws.on('open', () => {
    console.log('✅ اتصال برقرار شد');

    // احراز هویت تستی
    ws.send(JSON.stringify({
      type: 'auth',
      initData: 'test-data'
    }));
  });

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 پیام دریافت شد:', message.type);

      if (message.type === 'auth-success') {
        console.log('✅ احراز هویت با موفقیت انجام شد');

        // شرط تستی پس از ۲ ثانیه
        setTimeout(() => {
          console.log('💰 ارسال شرط تستی...');
          ws.send(JSON.stringify({
            type: 'bet',
            bet: 100
          }));
        }, 2000);
      }

      if (message.type === 'balance-update') {
        console.log('💰 موجودی به‌روزرسانی شد:', message.balance);
      }

      if (message.type === 'game-start') {
        console.log('🎮 بازی آغاز شد، seed:', message.seed);
      }

      if (message.type === 'game-flying') {
        console.log('🚀 فاز پرواز، crashPoint:', message.crashPoint);
      }

      if (message.type === 'game-crash') {
        console.log('💥 بازی پایان یافت، نتیجه:', message.crashPoint);

        // بستن اتصال پس از پایان تست
        setTimeout(() => {
          console.log('🔌 در حال بستن اتصال');
          ws.close();
        }, 1000);
      }

    } catch (error) {
      console.error('❌ خطا در پردازش پیام:', error);
    }
  });

  ws.on('close', () => {
    console.log('🔌 اتصال بسته شد');
    process.exit(0);
  });

  ws.on('error', (error) => {
    console.error('❌ خطای وب‌سوکت:', error);
    process.exit(1);
  });

  // مهلت زمانی برای بستن در صورت عدم پاسخگویی سرور
  setTimeout(() => {
    console.log('⏰ اتمام مهلت اتصال');
    process.exit(1);
  }, 10000);
}

// اجرای تست
if (require.main === module) {
  testWebSocket();
}

module.exports = { testWebSocket }; 