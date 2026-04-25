import './globals.css';
import { Inter } from 'next/font/google';
import React from 'react';
import { Providers } from '@/components/providers';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata = {
  title: 'Phòng Kiểm tra Nội bộ: Công cụ Kiểm tra',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={inter.variable} suppressHydrationWarning>
      <body className="antialiased selection:bg-primary/20" suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
