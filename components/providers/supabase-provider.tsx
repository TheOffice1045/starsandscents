"use client";

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

type SupabaseContext = {
  supabase: SupabaseClient;
};

const Context = createContext<SupabaseContext | undefined>(undefined);

export default function SupabaseProvider({ 
  children,
}: { 
  children: React.ReactNode;
}) {
  const [supabase] = useState(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!));

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.access_token !== undefined) {
          try {
            await fetch('/api/auth', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ event, session }),
            });
          } catch (error) {
            console.error('Error syncing auth state:', error);
            // Don't throw the error, just log it
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <Context.Provider value={{ supabase }}>
      {children}
    </Context.Provider>
  );
}

export const useSupabase = () => {
  const context = useContext(Context);
  if (context === undefined) {
    throw new Error('useSupabase must be used inside SupabaseProvider');
  }
  return context;
};