import Link from "next/link";
import { useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settings";

export function Footer() {
  const { settings, fetchStoreSettings } = useSettingsStore();

  useEffect(() => {
    fetchStoreSettings();
  }, [fetchStoreSettings]);

  return (
    <footer className="bg-white border-t mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <h3 className="font-medium">About Us</h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Handcrafted candles made with love and care. Each piece is uniquely created to bring warmth and ambiance to your space.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/shop">Shop</Link></li>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Customer Service</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/shipping">Shipping Information</Link></li>
              <li><Link href="/returns">Returns & Exchanges</Link></li>
              <li><Link href="/faq">FAQ</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-medium">Newsletter</h3>
            <p className="text-sm text-gray-600">
              Subscribe to receive updates, access to exclusive deals, and more.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 rounded-md border-gray-300 text-sm"
              />
              <button className="bg-[#4A332F] text-white px-4 py-2 rounded-md text-sm">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="border-t py-6 text-center text-sm text-gray-600">
          &copy; {new Date().getFullYear()} {settings.name} | All rights reserved.
        </div>
      </div>
    </footer>
  );
}
