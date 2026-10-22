#!/usr/bin/env node

// اسکریپت بررسی اتصالات بیزینس (Business Connections)
// نحوه اجرا: node check-business-connections.js

// بارگذاری متغیرهای محیطی از فایل .env
const fs = require('fs')
const path = require('path')

function loadEnv() {
  const envPath = path.join(__dirname, '.env')
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=')
      if (key && value) {
        process.env[key.trim()] = value.trim()
      }
    })
  }
}

loadEnv()

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!BOT_TOKEN) {
  console.error('❌ TELEGRAM_BOT_TOKEN در فایل .env یافت نشد')
  process.exit(1)
}

async function checkBusinessConnections() {
  console.log('🔍 در حال بررسی Business Connections...')
  console.log(`🤖 توکن ربات: ${BOT_TOKEN.substring(0, 10)}...`)

  try {
    // بررسی اطلاعات ربات
    console.log('\n📋 اطلاعات ربات:')
    const botInfo = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`)
    const botData = await botInfo.json()

    if (botData.ok) {
      console.log(`✅ ربات: @${botData.result.username}`)
      console.log(`✅ شناسه: ${botData.result.id}`)
      console.log(`✅ نام: ${botData.result.first_name}`)
    } else {
      console.log(`❌ خطا در دریافت اطلاعات ربات: ${botData.description}`)
      return
    }

    // بررسی اتصالات بیزینس
    console.log('\n🔗 در حال بررسی Business Connections:')
    const connectionsResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getBusinessConnections`)
    const connectionsData = await connectionsResponse.json()

    if (connectionsData.ok) {
      if (connectionsData.result && connectionsData.result.length > 0) {
        console.log('✅ اتصالات بیزینس یافت شدند:')
        connectionsData.result.forEach((connection, index) => {
          console.log(`\n${index + 1}. اتصال بیزینس:`)
          console.log(`   شناسه: ${connection.id}`)
          console.log(`   کاربر: ${connection.user.first_name} (@${connection.user.username})`)
          console.log(`   تاریخ اتصال: ${new Date(connection.date * 1000).toLocaleString('fa-IR')}`)
          console.log(`   امکان پاسخ: ${connection.can_reply}`)
          console.log(`   فعال: ${connection.is_enabled}`)
        })

        console.log('\n📝 به فایل .env اضافه کنید:')
        console.log(`TELEGRAM_BUSINESS_CONNECTION_ID=${connectionsData.result[0].id}`)
      } else {
        console.log('❌ اتصالی یافت نشد (Business Connections)')
        console.log('\n📋 مراحل تنظیم اتصال بیزینس:')
        console.log('۱. در تلگرام یک اکانت بیزینس بسازید')
        console.log('۲. به مسیر Settings → Business → Bots بروید')
        console.log('۳. روی "Add Bot" کلیک کرده و ربات خود را بیابید')
        console.log('۴. اتصال را تأیید کنید')
        console.log('۵. این اسکریپت را دوباره اجرا کنید')
      }
    } else {
      console.log(`❌ خطا در دریافت اتصالات بیزینس: ${connectionsData.description}`)

      if (connectionsData.error_code === 404) {
        console.log('\n💡 این مورد نشان می‌دهد:')
        console.log('- ربات به هیچ اکانت بیزینسی متصل نشده است')
        console.log('- یا اکانت بیزینس ساخته نشده است')
        console.log('- یا ربات مجوز دسترسی به Business Connections را ندارد')
      }
    }

    // بررسی دسترسی‌های ربات
    console.log('\n🔐 در حال بررسی دستورات ربات:')
    const botCommands = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMyCommands`)
    const commandsData = await botCommands.json()

    if (commandsData.ok) {
      console.log('✅ دستورات ربات با موفقیت دریافت شدند')
    } else {
      console.log(`❌ خطا در دریافت دستورات: ${commandsData.description}`)
    }

  } catch (error) {
    console.error('❌ خطا:', error.message)
  }
}

checkBusinessConnections() 