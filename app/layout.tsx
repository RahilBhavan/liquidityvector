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
      <body className="bg-bit-white text-bit-black scanlines antialiased overflow-hidden h-screen w-screen">
        <WalletProvider>
          {children}
        </WalletProvider>
      </body>
    </html>
  );
}
