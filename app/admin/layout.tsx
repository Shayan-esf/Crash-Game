import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'پنل مدیریت انفجار کیهانی',
  description: 'مدیریت کاربران، تراکنش‌ها، سشن‌های بازی و تنظیمات سیستم',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
