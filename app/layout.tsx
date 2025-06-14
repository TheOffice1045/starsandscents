import './globals.css';
import type { Metadata } from 'next';
import { Jost } from 'next/font/google';
import { Toaster } from "sonner";
import { Inter as GeistSans } from 'next/font/google';
import { LayoutWrapper } from '@/components/LayoutWrapper';
import { Providers } from '@/components/Providers';
import { AuthProvider } from '@/contexts/auth-context';
import SupabaseProvider from '@/components/providers/supabase-provider';
import { Header } from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { WishlistInitializer } from '@/components/wishlist/WishlistInitializer';



const jost = Jost({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Candles - Handcrafted with Love',
  description: 'Discover our collection of handcrafted candles made with love and care.'
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={jost.className}>
        <Providers>
          <SupabaseProvider>
            <AuthProvider>
              <LayoutWrapper>
                <WishlistInitializer />
                {children}
              </LayoutWrapper>
              <Toaster position="top-center" />
            </AuthProvider>
          </SupabaseProvider>
        </Providers>
      </body>
    </html>
  );
}
