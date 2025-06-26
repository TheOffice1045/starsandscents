"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Search, ShoppingBag, User } from "lucide-react";
import { useSettingsStore } from "@/lib/store/settings";
import { useEffect } from "react";
import Image from "next/image";
import { CartSheet } from "@/components/cart/CartSheet";

const navLinks = [
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export default function Header() {
  const pathname = usePathname();
  const { settings, fetchStoreSettings } = useSettingsStore();

  useEffect(() => {
    fetchStoreSettings();
  }, [fetchStoreSettings]);

  const isLinkActive = (href: string) => {
    if (href === "/shop") {
      return pathname.startsWith("/shop") || pathname.startsWith("/product");
    }
    return pathname === href;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="bg-gray-50 py-2 text-sm text-gray-600">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex gap-4">
            {settings.phone && <span>{settings.phone}</span>}
            {settings.email && <span>{settings.email}</span>}
          </div>
        </div>
      </div>
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Toggle navigation menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="left">
                <div className="flex flex-col space-y-4 p-4">
                  {navLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      className={`text-lg font-medium ${
                        isLinkActive(link.href)
                          ? "text-primary"
                          : "text-muted-foreground hover:text-primary"
                      }`}
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
            <Link href="/" className="ml-4 md:ml-0 flex items-center gap-2">
              {settings.logo && (
                <Image
                  src={settings.logo}
                  alt={`${settings.name} logo`}
                  width={32}
                  height={32}
                  className="h-8 w-auto"
                />
              )}
              <span className="text-xl font-semibold">{settings.name}</span>
            </Link>
          </div>
          <nav className="hidden md:flex md:items-center md:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isLinkActive(link.href)
                    ? "text-primary"
                    : "text-muted-foreground hover:text-primary"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Search className="h-6 w-6" />
              <span className="sr-only">Search</span>
            </Button>
            <CartSheet />
            <Link href="/signin">
              <Button variant="ghost" size="icon">
                <User className="h-6 w-6" />
                <span className="sr-only">Account</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}