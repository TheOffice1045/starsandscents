import React from 'react';
import { usePermissions } from '@/lib/hooks/usePermissions';

interface ProtectedComponentProps {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredRole?: 'Owner' | 'Admin' | 'Manager' | 'Employee';
  fallback?: React.ReactNode;
  storeId: string | null;
}

export function ProtectedComponent({
  children,
  requiredPermissions = [],
  requiredRole,
  fallback = null,
  storeId,
}: ProtectedComponentProps) {
  const { hasPermission, hasAllPermissions, isOwner, isAdmin, loading } = usePermissions(storeId);

  if (loading) {
    return <div className="flex items-center justify-center p-4">Loading...</div>;
  }

  // Check role-based access
  if (requiredRole) {
    if (requiredRole === 'Owner' && !isOwner()) {
      return <>{fallback}</>;
    }
    if (requiredRole === 'Admin' && !isAdmin()) {
      return <>{fallback}</>;
    }
  }

  // Check permission-based access
  if (requiredPermissions.length > 0) {
    if (!hasAllPermissions(requiredPermissions)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

// Convenience components for common permission checks
export function OwnerOnly({ children, storeId, fallback }: Omit<ProtectedComponentProps, 'requiredRole'>) {
  return (
    <ProtectedComponent requiredRole="Owner" storeId={storeId} fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
}

export function AdminOnly({ children, storeId, fallback }: Omit<ProtectedComponentProps, 'requiredRole'>) {
  return (
    <ProtectedComponent requiredRole="Admin" storeId={storeId} fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
}

export function WithPermission({ 
  children, 
  permission, 
  storeId, 
  fallback 
}: {
  children: React.ReactNode;
  permission: string;
  storeId: string | null;
  fallback?: React.ReactNode;
}) {
  return (
    <ProtectedComponent requiredPermissions={[permission]} storeId={storeId} fallback={fallback}>
      {children}
    </ProtectedComponent>
  );
} 