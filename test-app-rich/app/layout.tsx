import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/app/contexts/CartContext';
import { WishlistProvider } from '@/app/contexts/WishlistContext';
import { AuthProvider } from '@/app/contexts/AuthContext';
import AnalyticsProvider from '@/app/components/AnalyticsProvider';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'TestShop - E-commerce Demo',
  description: 'Rich e-commerce test application for analytics tracking',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <script src="/tracker.js" defer></script>
      </head>
      <body className={inter.className}>
        <AnalyticsProvider>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-grow">
                    {children}
                  </main>
                  <Footer />
                </div>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </AnalyticsProvider>
      </body>
    </html>
  );
}