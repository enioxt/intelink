import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/intelink/Toast';
import { AuthProvider } from '@/providers/AuthProvider';
import { JourneyProvider } from '@/providers/JourneyContext';
import GlobalSearchProvider from '@/components/shared/GlobalSearchProvider';
import { IntelinkFocusProvider } from '@/contexts/IntelinkFocusContext';
import MobileNavBar from '@/components/mobile/MobileNavBar';
import PasskeyNudge from '@/components/PasskeyNudge';
import ServiceWorkerRegistration from '@/components/pwa/ServiceWorkerRegistration';
import JourneyFABGlobal from '@/components/shared/JourneyFABGlobal';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', weight: ['400', '500', '600', '700'] });

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0ea5e9',
};

export const metadata: Metadata = {
  title: 'EGOS Inteligência',
  description: 'Plataforma unificada de inteligência sobre dados públicos brasileiros',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EGOS Inteligência',
  },
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/icons/icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        <AuthProvider>
          <JourneyProvider>
            <IntelinkFocusProvider>
              <ToastProvider>
                <GlobalSearchProvider />
                <div className="pb-16 md:pb-0">
                  {children}
                </div>
                <JourneyFABGlobal />
                <MobileNavBar />
                <PasskeyNudge />
                <ServiceWorkerRegistration />
              </ToastProvider>
            </IntelinkFocusProvider>
          </JourneyProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
