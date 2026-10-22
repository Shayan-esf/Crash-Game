import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'پروفایل خلبان',
  description: 'اطلاعات هویتی، آمار پروازها، رکوردهای ضرایب و نشان‌های افتخار خلبان',
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
