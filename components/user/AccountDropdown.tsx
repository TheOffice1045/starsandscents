"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { User, LogOut, Package } from "lucide-react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from '@supabase/ssr';

interface AccountDropdownProps {
  userName?: string;
}

export function AccountDropdown({ userName = "Account" }: AccountDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.refresh();
    setIsOpen(false);
  };
  
  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        className="flex items-center gap-1 text-sm"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>Hi, {userName}</span>
        <svg 
          width="12" 
          height="12" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <div className="p-4 border-b border-gray-100">
            <div className="font-medium text-md">Account & Orders</div>
          </div>
          
          <nav className="flex flex-col">
            <Link 
              href="/account" 
              className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-sm"
              onClick={() => setIsOpen(false)}
            >
              <User size={16} />
              <span>My Account</span>
            </Link>
            
            <Link 
              href="/account?tab=orders" 
              className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-sm"
              onClick={() => setIsOpen(false)}
            >
              <Package size={16} />
              <span>My Orders</span>
            </Link>
            
            <button 
              onClick={handleSignOut}
              className="flex items-center gap-2 px-4 py-3 hover:bg-gray-50 transition-colors text-left w-full border-t border-gray-100 text-sm"
            >
              <LogOut size={16} />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      )}
    </div>
  );
}