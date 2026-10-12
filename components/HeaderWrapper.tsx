"use client";

import { usePathname } from 'next/navigation';
import { Header } from './Header';

export function HeaderWrapper() {
  const pathname = usePathname();
  const isAdminPage = pathname?.startsWith('/indoorme');

  if (isAdminPage) return null;
  return <Header />;
}