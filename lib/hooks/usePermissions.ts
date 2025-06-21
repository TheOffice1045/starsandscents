import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';

export interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export function usePermissions(storeId: string | null) {
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    if (!storeId) {
      setLoading(false);
      return;
    }

    const fetchUserRole = async () => {
      try {
        setLoading(true);
        setError(null);

        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!user) {
          setUserRole(null);
          return;
        }

        // Get user's role for this store
        const { data: storeUser, error: storeUserError } = await supabase
          .from('store_users')
          .select(`
            role_id,
            store_roles (
              id,
              name,
              description,
              permissions
            )
          `)
          .eq('store_id', storeId)
          .eq('user_id', user.id)
          .eq('status', 'active')
          .single();

        if (storeUserError) {
          if (storeUserError.code === 'PGRST116') {
            // User not found in store_users table
            setUserRole(null);
          } else {
            throw storeUserError;
          }
        } else if (storeUser?.store_roles) {
          const role = storeUser.store_roles as any;
          setUserRole({
            id: role.id,
            name: role.name,
            description: role.description,
            permissions: role.permissions || [],
          });
        }
      } catch (err: any) {
        console.error('Error fetching user role:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [storeId, supabase]);

  const hasPermission = (permissionName: string): boolean => {
    if (!userRole) return false;
    
    // Owner role has all permissions
    if (userRole.name === 'Owner') return true;
    
    // Check if user has the specific permission
    return userRole.permissions.includes(permissionName);
  };

  const hasAnyPermission = (permissionNames: string[]): boolean => {
    return permissionNames.some(permission => hasPermission(permission));
  };

  const hasAllPermissions = (permissionNames: string[]): boolean => {
    return permissionNames.every(permission => hasPermission(permission));
  };

  const isOwner = (): boolean => {
    return userRole?.name === 'Owner';
  };

  const isAdmin = (): boolean => {
    return userRole?.name === 'Owner' || userRole?.name === 'Admin';
  };

  return {
    userRole,
    loading,
    error,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isAdmin,
  };
} 