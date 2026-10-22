const WebSocket = require('ws');

async function testHistoryAPI() {
  console.log('🧪 تست API تاریخچه بازی‌ها...');

  // ابتدا کاربر را از طریق وب‌سوکت دریافت می‌کنیم
  const ws = new WebSocket('ws://localhost:4001');

  return new Promise((resolve) => {
    ws.on('open', () => {
      console.log('✅ اتصال وب‌سوکت برقرار شد');

      // احراز هویت در حالت DEV
      ws.send(JSON.stringify({
        type: 'auth',
        initData: ''
      }));
    });

    ws.on('message', async (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === 'auth-success') {
        console.log('✅ احراز هویت موفق، شناسه تلگرام:', message.user.telegramId);

        // تست API تاریخچه بازی‌ها
        try {
          const response = await fetch(`http://localhost:3000/api/profile/games?telegram_id=${message.user.telegramId}`);
          console.log('📊 پاسخ API:', response.status, response.statusText);

          if (response.ok) {
            const history = await response.json();
            console.log('📈 تاریخچه بازی‌ها:', history.length, 'رکورد');
            console.log('📋 ۳ رکورد اول:', history.slice(0, 3));
          } else {
            const errorText = await response.text();
            console.error('❌ خطای API:', errorText);
          }
        } catch (error) {
          console.error('❌ خطای درخواست:', error.message);
        }

        ws.close();
        resolve();
      }
    });

    ws.on('error', (error) => {
      console.error('❌ خطای وب‌سوکت:', error.message);
      resolve();
    });

    ws.on('close', () => {
      console.log('🔌 اتصال وب‌سوکت بسته شد');
    });
  });
}

// اجرای تست
testHistoryAPI().then(() => {
  console.log('🏁 تست به پایان رسید');
  process.exit(0);
}).catch((error) => {
  console.error('💥 خطای تست:', error);
  process.exit(1);
}); 