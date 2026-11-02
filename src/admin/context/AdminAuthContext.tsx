import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { adminApi } from '../services/adminApi';
import { AdminUser } from '../types';

interface AdminAuthContextType {
  admin: AdminUser | null;
  loading: boolean;
  login: (username: string, passwordPlain: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const checkAuth = async (): Promise<boolean> => {
    const token = adminApi.getToken();
    if (!token) {
      setAdmin(null);
      setLoading(false);
      return false;
    }

    try {
      const res = await adminApi.verifyAuth();
      if (res.valid && res.admin) {
        setAdmin({
          username: res.admin.username,
          role: 'SUPER_ADMIN',
        });
        return true;
      } else {
        setAdmin(null);
        adminApi.removeToken();
        return false;
      }
    } catch {
      setAdmin(null);
      adminApi.removeToken();
      return false;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const login = async (username: string, passwordPlain: string) => {
    setLoading(true);
    try {
      const res = await adminApi.login(username, passwordPlain);
      setAdmin({
        username: res.admin.username,
        role: 'SUPER_ADMIN',
      });
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await adminApi.logout();
    } finally {
      setAdmin(null);
    }
  };

  return (
    <AdminAuthContext.Provider value={{ admin, loading, login, logout, checkAuth }}>
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};
