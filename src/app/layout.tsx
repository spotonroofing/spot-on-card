import type { Metadata, Viewport } from 'next';
import { Outfit, DM_Sans } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '600', '700', '800'],
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['400', '500', '700'],
  style: ['normal', 'italic'],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'SpotOn Card',
  description: 'Digital business cards for SpotOnRoof',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${dmSans.variable} font-sans`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
