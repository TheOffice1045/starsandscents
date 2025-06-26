"use client";

import { Inter as GeistSans } from 'next/font/google';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, Users, DollarSign, Settings, ChevronDown, ChevronRight, Home, FolderOpen, BoxesIcon, ClipboardCheck, ClipboardList, PackageCheck, Store, TicketPercent, Wallet, Bell } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { AdminContext } from "@/contexts/admin-context";
import '@/styles/admin.css';
import "../../styles/waldenburg.css";
import { Providers } from '@/components/Providers';
import { Toaster } from '@/components/ui/toaster';

const geist = GeistSans({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
});

interface SidebarSubItem {
  label: string;
  href: string;
  icon?: any;
}

interface SidebarItem {
  label: string;
  href?: string;
  icon: any;
  subItems?: SidebarSubItem[];
  target?: string;
  rel?: string;
}

const sidebarItems: SidebarItem[] = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingCart },
  {
    label: "Products",
    icon: Package,
    subItems: [
      { label: "Inventory", href: "/admin/products/inventory", icon: PackageCheck },
      { label: "Collections", href: "/admin/products/collections", icon: FolderOpen },
      
    ]
  },
  { label: "Customers", href: "/admin/customers", icon: Users },
  { label: "Finance", href: "/admin/finance", icon: Wallet },
  { label: "Discounts", href: "/admin/discounts", icon: TicketPercent },
  { label: "Notifications", href: "/admin/notifications", icon: Bell },
  { label: "My Store", href: "/", icon: Store, target: "_blank", rel: "noopener noreferrer" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  useEffect(() => {
    setMounted(true);
    
    // Check if user is logged in
    const checkAuth = async () => {
      try {
        // Get the current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Redirect to homepage if not logged in
          router.push('/');
          return;
        }
        
        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking auth:', error);
        // Redirect to homepage on error
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAuth();
  }, [router, supabase]);

  // Prevent hydration mismatch by rendering a simple loading state
  if (!mounted || isLoading) {
    return <div className={`${geist.className} h-screen flex flex-col`}>
      <div className="flex-1 flex">
        <aside className="w-64 bg-white border-r" />
        <main className="flex-1 bg-white flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </main>
      </div>
    </div>;
  }

  // If not authorized, don't render the admin layout
  // The useEffect will handle the redirect
  if (!isAuthorized) {
    return null;
  }

  const toggleExpand = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  // Prevent hydration mismatch by rendering a simple loading state
  if (!mounted) {
    return <div className={`${geist.className} h-screen flex flex-col`}>
      <div className="flex-1 flex">
        <aside className="w-64 bg-white border-r" />
        <main className="flex-1 bg-white" />
      </div>
    </div>;
  }

  return (
    <Providers>
      <AdminContext.Provider value={{ isAdmin: true }}>
        <div className={geist.className}>
          <div className="h-screen flex flex-col">
            <AdminHeader />
            <div className="flex flex-1 overflow-hidden">
              <aside className="w-64 bg-white border-r flex flex-col">
                <nav className="px-4 pt-6 flex-1 overflow-y-auto">
                  {sidebarItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    const isExpanded = expandedItems.includes(item.label);
                    const hasSubItems = Array.isArray(item.subItems) && item.subItems.length > 0;

                    return (
                      <div key={item.label} className="py-2 first:pt-0">
                        {!hasSubItems ? (
                          <Link
                            href={item.href || '#'}
                            target={item.target}
                            rel={item.rel}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg mb-1 text-sm ${
                              isActive ? "bg-[#19191c] text-white" : "hover:bg-gray-100"
                            }`}
                          >
                            <Icon size={18} />
                            <span>{item.label}</span>
                          </Link>
                        ) : (
                          <>
                            <div
                              className="flex items-center gap-3 px-3 py-2 rounded-lg mb-1 cursor-pointer hover:bg-gray-100 text-sm"
                              onClick={() => toggleExpand(item.label)}
                            >
                              <Icon size={18} />
                              <span className="flex-1">{item.label}</span>
                              {isExpanded ? (
                                <ChevronDown size={14} />
                              ) : (
                                <ChevronRight size={14} />
                              )}
                            </div>
                            {isExpanded && (
                              <div className="ml-8 mb-2 space-y-1">
                                {item.subItems?.map((subItem) => {
                                  const SubIcon = subItem.icon;
                                  return (
                                    <Link
                                      key={subItem.href}
                                      href={subItem.href}
                                      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                                        pathname === subItem.href
                                          ? "bg-gray-100 text-[#19191c]"
                                          : "hover:bg-gray-50"
                                      }`}
                                    >
                                      {SubIcon && <SubIcon size={14} />}
                                      {subItem.label}
                                    </Link>
                                  );
                                })}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </nav>
                <div className="px-4 py-4 border-t">
                  <Link
                    href="/admin/settings"
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      pathname === "/admin/settings"
                        ? "bg-[#19191c] text-white"
                        : "hover:bg-gray-100"
                    }`}
                  >
                    <Settings size={20} />
                    <span>Settings</span>
                  </Link>
                </div>
              </aside>
              <main className="flex-1 overflow-y-auto bg-white">
                {/* Removed static Dashboard title */}
                <div className="p-8">
                  {children}
                </div>
              </main>
            </div>
          </div>
          <Toaster />
        </div>
      </AdminContext.Provider>
    </Providers>
  );
}