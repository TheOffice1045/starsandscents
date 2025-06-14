import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';

export function useAdminAccess() {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // Check if user has admin role in their metadata
        const isAdmin = user.user_metadata?.roles?.some((role: { name: string }) => role.name === 'admin');

        if (!isAdmin) {
          router.push('/');
          return;
        }

        setIsAuthorized(true);
      } catch (error) {
        console.error('Error checking admin access:', error);
        setIsAuthorized(false);
      } finally {
        setIsLoading(false);
      }
    };
    
    checkAdminAccess();
  }, [router, supabase]);
  
  return { isAuthorized, isLoading };
}