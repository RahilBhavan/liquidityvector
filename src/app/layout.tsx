import type { Metadata } from 'next';
import { WalletProvider } from '@/providers/WalletProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'LiquidityVector',
  description: 'DeFi route analysis and yield optimization engine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased min-h-screen w-full bg-paper-white text-sumi-black selection:bg-intl-orange/30">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
