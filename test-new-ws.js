const WebSocket = require('ws');

const ws = new WebSocket('ws://localhost:4001');

ws.on('open', () => {
  console.log('✅ اتصال وب‌سوکت برقرار شد');

  // تست احراز هویت
  ws.send(JSON.stringify({
    type: 'auth',
    initData: '' // حالت DEV
  }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('📨 پیام دریافت شد:', message.type);

  if (message.type === 'auth-success') {
    console.log('✅ احراز هویت موفق، موجودی:', message.user.balance);

    // تست ثبت شرط
    setTimeout(() => {
      console.log('💰 ثبت شرط به مبلغ ۱۰...');
      ws.send(JSON.stringify({
        type: 'bet',
        bet: 10
      }));
    }, 1000);
  }

  if (message.type === 'balance-update') {
    console.log('💰 موجودی به‌روزرسانی شد:', message.balance);
  }

  if (message.type === 'game-start') {
    console.log('🎮 بازی آغاز شد، فاز ثبت شرط');
  }

  if (message.type === 'game-flying') {
    console.log('🚀 فاز پرواز، امکان برداشت سود وجود دارد');

    // تست برداشت سود پس از ۵ ثانیه
    setTimeout(() => {
      console.log('💸 ارسال درخواست کش‌اوت...');
      ws.send(JSON.stringify({
        type: 'cashout'
      }));
    }, 5000);
  }

  if (message.type === 'game-crash') {
    console.log('💥 بازی پایان یافت (انفجار)');
    ws.close();
  }
});

ws.on('error', (error) => {
  console.error('❌ خطای وب‌سوکت:', error.message);
});

ws.on('close', () => {
  console.log('🔌 اتصال وب‌سوکت بسته شد');
  process.exit(0);
});

// مهلت زمانی برای بستن تست در صورت بروز خطا
setTimeout(() => {
  console.log('⏰ اتمام مهلت زمانی، بستن اتصال');
  ws.close();
  process.exit(1);
}, 30000); 