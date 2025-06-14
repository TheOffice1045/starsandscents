"use client";

import { usePathname } from 'next/navigation';
import { HeaderWrapper } from './HeaderWrapper';
import { FooterWrapper } from './FooterWrapper';

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/admin');

  // For admin pages, return only the children without the updated header/footer
  if (isAdminPage) {
    return children;
  }

  // For non-admin pages, wrap with the updated header and footer
  return (
    <>
      <HeaderWrapper />
      <main>{children}</main>
      <FooterWrapper />
    </>
  );
}