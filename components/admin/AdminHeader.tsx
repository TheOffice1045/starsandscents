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
import { siteConfig } from "@/config/site";
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
  const { notifications, markAsRead, markAllAsRead } = useNotificationStore();
  const { settings } = useSettingsStore();
  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <header className={`bg-white px-6 py-3 flex items-center justify-between ${className}`}>
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
          <PopoverContent align="end" className="w-80">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs"
                  onClick={markAllAsRead}
                >
                  Mark all as read
                </Button>
              )}
            </div>
            <ScrollArea className="h-[300px]">
              {notifications.length > 0 ? (
                <div className="space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg text-sm ${
                        !notification.read ? 'bg-gray-50' : ''
                      }`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="font-medium">{notification.title}</div>
                      <p className="text-gray-500">{notification.message}</p>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDistanceToNow(notification.createdAt, { addSuffix: true })}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No notifications
                </div>
              )}
            </ScrollArea>
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