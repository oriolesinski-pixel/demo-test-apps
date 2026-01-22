import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import Script from 'next/script';
import AnalyticsProvider from '@/components/AnalyticsProvider';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TaskFlow - Modern Team Collaboration",
  description: "A modern B2B task and project management platform for small teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Script src="/tracker.js" strategy="beforeInteractive" />
        <AnalyticsProvider>
          {children}
          <Toaster />
        </AnalyticsProvider>
      </body>
    </html>
  );
}