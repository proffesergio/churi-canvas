import type { Metadata, Viewport } from 'next';
import { Analytics } from '@vercel/analytics/next';
import { Providers } from '@/components/providers';
import './globals.css';
export const metadata: Metadata = {
  title: 'ChuriCanvas — A little tradition. A lot of you.',
  description:
    'Handmade bangles, thoughtfully designed in Bangladesh. Find your everyday colour, festive sparkle, and something uniquely yours.',
};
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#792b38',
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
