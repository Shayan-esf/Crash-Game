import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'پرواز آزمایشی موشک',
  description: 'محیط شبیه‌ساز پرواز موشک و بررسی الگوریتم کرش',
};

export default function CrashLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
