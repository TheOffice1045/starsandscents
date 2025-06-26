"use client";

import React from "react"; // Ensure React is imported
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { User, Settings, LogOut, UserCircle, BoxesIcon, ClipboardList, ShoppingCart, FileCheck2, PackageCheck } from "lucide-react";
import Link from "next/link";

import { Bell } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useNotificationStore } from "@/lib/store/notifications";
import { formatDistanceToNow } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettingsStore } from "@/lib/store/settings";
import Image from 'next/image';

export function AdminHeader({ className = "" }: { className?: string }) {
  const { notifications, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore();
  const { settings } = useSettingsStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <header className={`bg-white px-6 py-3 flex items-center justify-between border-b ${className}`}>
      <Link href="/admin" className="h-8 flex items-center gap-3">
        <div className="relative h-8 w-32">
          <Image
            src={settings.logo || '/placeholder.png'}
            alt={settings.name}
            fill
            className="object-contain rounded-sm"
          />
        </div>
        <span className="text-md font-medium">{settings.name}</span>
      </Link>

      <div className="flex items-center gap-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-96 p-0 shadow-xl border-0 rounded-xl overflow-hidden">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 px-4 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                    <Bell className="w-4 h-4 text-gray-800" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    
                  </div>
                </div>
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-3 text-xs bg-white/70 hover:bg-white border border-gray-300 text-gray-700 hover:text-gray-900 rounded-lg"
                    onClick={markAllAsRead}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </div>
            <ScrollArea className="h-[400px] bg-white">
              {notifications.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`px-4 py-4 hover:bg-gray-50/80 transition-all duration-200 cursor-pointer group ${
                        !notification.read ? 'bg-gradient-to-r from-gray-50/50 to-transparent border-l-4 border-l-gray-600' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-3 h-3 rounded-full mt-2 flex-shrink-0 transition-all duration-200 ${
                          !notification.read 
                            ? 'bg-gradient-to-r from-gray-600 to-gray-700 shadow-sm' 
                            : 'bg-gray-300 group-hover:bg-gray-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className={`text-xs font-semibold transition-colors ${
                            !notification.read ? 'text-gray-900' : 'text-gray-700'
                          }`}>
                            {notification.title}
                          </div>
                          <p className="text-xs text-gray-600 mt-1.5 leading-relaxed line-clamp-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-gray-600 rounded-full animate-pulse" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mb-4">
                    <Bell className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">No notifications</p>
                  <p className="text-xs text-gray-500 text-center max-w-48">
                    You&apos;re all caught up! New notifications will appear here.
                  </p>
                </div>
              )}
            </ScrollArea>
            {notifications.length > 0 && (
              <div className="border-t border-gray-200 bg-gray-50/50 px-4 py-1">
                <Link 
                  href="/admin/notifications" 
                  className="flex items-center justify-center w-full text-xs font-medium text-gray-700 hover:text-gray-900 transition-colors py-2 rounded-lg hover:bg-gray-0"
                >
                  View all notifications
                </Link>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <span className="text-sm font-medium text-primary-foreground">SC</span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{settings.name}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
            <Link href="/admin/orders">
              <DropdownMenuItem>
                <ShoppingCart className="mr-2 h-4 w-4" />
                <span>Orders</span>
              </DropdownMenuItem>
              </Link>
            <Link href="/admin/products">
              <DropdownMenuItem>
                <PackageCheck className="mr-2 h-4 w-4" />
                <span>Inventory</span>
              </DropdownMenuItem>
              </Link>
            
              <Link href="/admin/settings">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
              </Link>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span 
                onClick={async () => {
                  try {
                    // Clear all authentication data
                    localStorage.clear();
                    sessionStorage.clear();
                    document.cookie.split(";").forEach((c) => {
                      document.cookie = c
                        .replace(/^ +/, "")
                        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
                    });
                    
                    // Use Next.js router for better navigation
                    window.location.href = '/signin';
                  } catch (error) {
                    console.error('Error during sign out:', error);
                    // Fallback redirect
                    window.location.href = '/signin';
                  }
                }}
                className="cursor-pointer"
              >
                Sign Out
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}