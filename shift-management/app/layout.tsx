import '../styles/globals.css';
import AppGate from '@/components/AppGate';

export const metadata = { title: 'Shift Tracker', description: 'Personal shift tracker' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AppGate>
          {children}
        </AppGate>
      </body>
    </html>
  );
}
