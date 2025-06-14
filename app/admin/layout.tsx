"use client";

import { Inter as GeistSans } from 'next/font/google';
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, Users, DollarSign, Settings, ChevronDown, ChevronRight, Home, FolderOpen, BoxesIcon, ClipboardCheck, ClipboardList, PackageCheck, Store } from "lucide-react";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import '@/styles/admin.css';

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
  { label: "Finance", href: "/admin/finance", icon: DollarSign },
  { label: "Discounts", href: "/admin/discounts", icon: DollarSign },
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
    
    // Check if user has admin privileges
    const checkAdminAccess = async () => {
      try {
        // Get the current user session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Redirect to homepage if not logged in
          router.push('/');
          return;
        }
        
        // Get the user's role
        const { data: storeUser, error } = await supabase
          .from('store_users')
          .select('role_id, store_roles(name)')
          .eq('user_id', session.user.id)
          .single();
        
        if (error || !storeUser) {
          // Redirect to homepage if user has no role
          router.push('/');
          return;
        }
        
        // Check if the user has admin or owner role
        const roleName = storeUser.store_roles?.[0]?.name?.toLowerCase();
        const hasAccess = roleName === 'admin' || roleName === 'owner';
        
        if (!hasAccess) {
          // Redirect to homepage if not admin or owner
          router.push('/');
          return;
        }
        
        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking admin access:', error);
        // Redirect to homepage on error
        router.push('/');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminAccess();
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
    <div className={`${geist.className} h-screen flex flex-col`}>
      <AdminHeader className="border-b" />
      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 bg-white border-r flex flex-col">
          <nav className="px-4 pt-6 flex-1 overflow-y-auto divide-y divide-gray-100">
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
  );
}