import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../components/AuthContext';

export const metadata: Metadata = {
  title: 'Service Accelerator Portal',
  description: 'Role-based inventory and order portal built with Next.js'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-100">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
