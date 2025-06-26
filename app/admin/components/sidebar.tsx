import React from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Ticket,
  Settings,
  Bell,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    {
      href: "/admin/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/admin/orders",
      label: "Orders",
      icon: ShoppingCart,
    },
    {
      href: "/admin/products",
      label: "Products",
      icon: Package,
    },
    {
      href: "/admin/discounts",
      label: "Discounts",
      icon: Ticket,
    },
    {
      href: "/admin/notifications",
      label: "Notifications",
      icon: Bell,
    },
    {
      href: "/admin/customers",
      label: "Customers",
      icon: Users,
    },
    {
      href: "/admin/settings",
      label: "Settings",
      icon: Settings,
    },
  ];

  return (
    <aside className="w-60 bg-white border-r flex flex-col">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Admin</h2>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              pathname === item.href
                ? "bg-gray-100 text-gray-900"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            <item.icon className="mr-3 w-5 h-5" />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function SidebarLink({
  href,
  children,
  icon,
}: {
  href: string;
  children: React.ReactNode;
  icon: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href;

  return (
    <Link
      href={href}
      className={`flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? "bg-gray-100 text-gray-900"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      }`}
    >
      <div className="mr-3">{icon}</div>
      {children}
    </Link>
  );
}