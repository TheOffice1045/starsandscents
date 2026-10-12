'use client';

import { usePathname } from 'next/navigation';
import { Footer } from './Footer';

export function FooterWrapper() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/indoorme');

  if (isAdminPage) {
    return null;
  }

  return <Footer />;
}