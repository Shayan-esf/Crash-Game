import AuthProvider from "@/components/AuthProvider"
import TonConnectRootProvider from "@/components/TonConnectRootProvider"
import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import './globals.css'

export const viewport: Viewport = {
  themeColor: '#181a20',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: {
    default: 'انفجار کیهانی | The Cosmic Arcade',
    template: '%s | انفجار کیهانی',
  },
  description: 'مینی‌اپ تلگرامی بازی انفجار کیهانی (Crash Game) - پرواز موشک در فضا، تله‌متری زنده و ضرایب صعودی',
  applicationName: 'انفجار کیهانی',
  authors: [{ name: 'Shayan' }],
  creator: 'Shayan',
  publisher: 'Shayan',
  keywords: [
    'بازی انفجار',
    'کرش گیم',
    'Crash Game',
    'مینی اپ تلگرام',
    'Telegram Mini App',
    'موشک کیهانی',
    'تون کانکت',
    'TON Connect',
    'کریپتو گیم',
  ],
  manifest: '/telegram-app-manifest.json',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/favicon.svg',
    apple: [
      { url: '/icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'انفجار کیهانی',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: 'بازی انفجار کیهانی | The Cosmic Arcade',
    description: 'پرواز موشک تا بی‌نهایت، کش‌اوت بموقع و برد ضریب‌های طلایی در مینی‌اپ تلگرام',
    siteName: 'انفجار کیهانی',
    locale: 'fa_IR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'بازی انفجار کیهانی | The Cosmic Arcade',
    description: 'پرواز موشک تا بی‌نهایت، کش‌اوت بموقع و برد ضریب‌های طلایی در مینی‌اپ تلگرام',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl" className="dark">
      <head>
        <meta name="telegram-web-app-ready" content="true" />
        <meta name="telegram-web-app-status-bar-style" content="black" />
        <meta name="theme-color" content="#181a20" />
      </head>
      <body className="bg-[#181a20] text-white font-sans antialiased min-h-screen selection:bg-yellow-400/30 selection:text-yellow-200">
        <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
        <TonConnectRootProvider>
          <AuthProvider>{children}</AuthProvider>
        </TonConnectRootProvider>
        <Analytics />
      </body>
    </html>
  )
}
