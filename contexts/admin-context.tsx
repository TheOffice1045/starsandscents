import { createContext, useContext } from 'react';

interface AdminContextType {
  isAdmin: boolean;
}

export const AdminContext = createContext<AdminContextType>({ isAdmin: false });

export const useAdminContext = () => {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdminContext must be used within an AdminContext.Provider');
  }
  return context;
}; 