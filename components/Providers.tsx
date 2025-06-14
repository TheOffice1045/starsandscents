"use client";

import { Toaster } from "sonner";
import { usePathname } from "next/navigation";
import { Inter as GeistSans } from 'next/font/google';

const geist = GeistSans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

export function Providers({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  return (
    <div className={isAdminPage ? geist.className : ''}>
      {children}
      <Toaster />
    </div>
  );
}