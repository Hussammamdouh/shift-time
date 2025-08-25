import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../styles/globals.css';
import FirebaseErrorHandler from '@/components/FirebaseErrorHandler';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Shift Tracker - Professional Time Management',
  description: 'Advanced time tracking and shift management system with real-time analytics, overtime calculation, and comprehensive reporting.',
  keywords: 'time tracking, shift management, work hours, overtime, productivity, time management',
  authors: [{ name: 'Shift Tracker Team' }],
  creator: 'Shift Tracker',
  publisher: 'Shift Tracker',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://shift-tracker.app'),
  openGraph: {
    title: 'Shift Tracker - Professional Time Management',
    description: 'Advanced time tracking and shift management system with real-time analytics and comprehensive reporting.',
    url: 'https://shift-tracker.app',
    siteName: 'Shift Tracker',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Shift Tracker Dashboard',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shift Tracker - Professional Time Management',
    description: 'Advanced time tracking and shift management system with real-time analytics and comprehensive reporting.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0f0f23" />
        <meta name="color-scheme" content="dark" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${inter.className} antialiased`}>
        <FirebaseErrorHandler>
          <div id="root" className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 pb-[env(safe-area-inset-bottom)] aurora-bg">
            {/* Subtle Background Elements (performance-friendly) */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
              <div className="absolute -top-16 -left-16 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl"></div>
              <div className="absolute -bottom-24 right-0 w-[28rem] h-[28rem] bg-cyan-600/10 rounded-full blur-3xl"></div>
              <div className="absolute inset-0 bg-grid opacity-10"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950/70 via-slate-900/60 to-slate-950/70"></div>
            </div>

            {/* Main Content */}
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </FirebaseErrorHandler>
      </body>
    </html>
  );
}
