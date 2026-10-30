'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { supabase } from '../lib/supabase';
import { authApi } from '../lib/api';
import { queryClient } from '../lib/queryClient';
import { AuthUser, Role, AppView } from '../types';

interface AuthContextType {
  currentUser: AuthUser | null;
  isAuthLoading: boolean;
  activeRole: Role;
  setActiveRole: (role: Role) => void;
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  permissionError: string | null;
  dismissPermissionError: () => void;
  authRolePreference: 'salesperson' | 'supplier' | 'admin';
  setAuthRolePreference: (role: 'salesperson' | 'supplier' | 'admin') => void;
  selectedSupplierId: string;
  setSelectedSupplierId: (id: string) => void;
  selectedSalespersonId: string;
  setSelectedSalespersonId: (id: string) => void;
  selectedCustomerToken: string;
  setSelectedCustomerToken: (token: string) => void;

  login: (credentials: {
    emailOrPhone: string;
    password?: string;
    role?: 'salesperson' | 'supplier' | 'admin';
    entityId?: string;
  }) => Promise<{ success: boolean; user?: AuthUser; error?: string }>;
  signInWithGoogle: (rolePreference?: 'salesperson' | 'supplier') => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  registerSupplier: (supplierData: any) => Promise<{ success: boolean; business?: any; error?: string }>;
  registerSalesAgent: (agentData: any) => Promise<{ success: boolean; agent?: any; error?: string }>;
}

export const parsePathToView = (pathname: string): AppView => {
  const p = pathname.toLowerCase();
  if (p.startsWith('/signin') || p === '/login') return 'signin';
  if (p.startsWith('/signup') || p === '/register') return 'signup';
  if (p.startsWith('/portal') || p.startsWith('/dashboard')) return 'portal';
  if (p.startsWith('/track') || p.startsWith('/order')) return 'track_order';
  return 'marketplace';
};

export const viewToPath = (view: AppView, role?: string): string => {
  switch (view) {
    case 'signin': return '/signin';
    case 'signup': return '/signup';
    case 'portal':
      if (role === 'supplier') return '/portal/supplier';
      if (role === 'salesperson') return '/portal/salesperson';
      if (role === 'admin') return '/portal/admin';
      return '/portal';
    case 'track_order': return '/track';
    case 'marketplace':
    default:
      return '/';
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'azwari_auth_session';

// Safe sessionStorage helper with automatic legacy localStorage migration and cleanup for security
const sessionStore = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const val = window.sessionStorage.getItem(key);
      if (val) return val;
      // Auto-migrate from legacy localStorage once, then wipe from localStorage
      const legacyVal = window.localStorage.getItem(key);
      if (legacyVal) {
        window.sessionStorage.setItem(key, legacyVal);
        window.localStorage.removeItem(key);
        return legacyVal;
      }
      return null;
    } catch {
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(key, value);
      window.localStorage.removeItem(key);
    } catch (e) {
      console.warn('[SessionStorage] Unable to save session:', e);
    }
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch {}
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname();

  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const saved = sessionStore.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);

  const [currentView, setCurrentViewState] = useState<AppView>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname;
      if (path && path !== '/') {
        return parsePathToView(path);
      }
    }
    try {
      const saved = sessionStore.getItem(STORAGE_KEY);
      return saved ? 'portal' : 'marketplace';
    } catch {
      return 'marketplace';
    }
  });

  // Automatically synchronize currentView whenever Next.js pathname changes
  useEffect(() => {
    if (pathname) {
      const view = parsePathToView(pathname);
      setCurrentViewState(view);
    }
  }, [pathname]);

  const setCurrentView = (view: AppView) => {
    setCurrentViewState(view);
    if (typeof window !== 'undefined') {
      const targetPath = viewToPath(view, currentUser?.role);
      const search = window.location.search;
      const fullUrl = targetPath + (targetPath === '/track' ? search : '');
      router.push(fullUrl);
    }
  };

  const [activeRole, setActiveRole] = useState<Role>(() => {
    try {
      const saved = sessionStore.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved).role || 'public';
    } catch {}
    return 'public';
  });

  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [authRolePreference, setAuthRolePreference] = useState<'salesperson' | 'supplier' | 'admin'>('salesperson');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('');
  const [selectedCustomerToken, setSelectedCustomerToken] = useState<string>('');

  const dismissPermissionError = () => setPermissionError(null);

  // Sync Supabase Auth state with backend
  useEffect(() => {
    const fetchSessionUser = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (sessionData?.session?.access_token) {
          const res = await authApi.getMe();
          if (res?.success && res.user) {
            const formattedUser: AuthUser = {
              id: res.user.id,
              email: res.user.email,
              phone: res.user.phone || '',
              name: res.user.name || res.user.fullName || res.user.email.split('@')[0],
              role: res.user.role,
              supplierId: res.user.businessId || res.business?.id,
              salespersonId: res.user.salesPartnerId || res.salesPartner?.id,
              createdAt: res.user.createdAt || new Date().toISOString(),
            };
            setCurrentUser(formattedUser);
            setActiveRole(formattedUser.role);
            if (formattedUser.supplierId) setSelectedSupplierId(formattedUser.supplierId);
            if (formattedUser.salespersonId) setSelectedSalespersonId(formattedUser.salespersonId);
            sessionStore.setItem(STORAGE_KEY, JSON.stringify(formattedUser));
          }
        }
      } catch (e) {
        console.warn('[AuthContext] Session fetch notice:', e);
      } finally {
        setIsAuthLoading(false);
      }
    };

    fetchSessionUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        fetchSessionUser();
      } else if (event === 'SIGNED_OUT') {
        // Only wipe credentials on explicit user sign-out
        setCurrentUser(null);
        setActiveRole('public');
        sessionStore.removeItem(STORAGE_KEY);
        setIsAuthLoading(false);
      }
    });

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const login = async (credentials: {
    emailOrPhone: string;
    password?: string;
    role?: 'salesperson' | 'supplier' | 'admin';
    entityId?: string;
  }) => {
    try {
      // 1. If password provided, sign in via Supabase Auth client to acquire token
      if (credentials.password && credentials.emailOrPhone.includes('@')) {
        const { error: signInErr } = await supabase.auth.signInWithPassword({
          email: credentials.emailOrPhone,
          password: credentials.password,
        });
        if (signInErr) {
          return { success: false, error: signInErr.message };
        }
      }

      // 2. Fetch full verified profile from backend
      const res = await authApi.login(credentials);
      if (res.success && res.user) {
        const user: AuthUser = {
          id: res.user.id,
          email: res.user.email,
          phone: res.user.phone || '',
          name: res.user.name || res.user.fullName || res.user.email.split('@')[0],
          role: res.user.role,
          supplierId: res.user.supplierId || res.business?.id,
          salespersonId: res.user.salespersonId || res.salesPartner?.id,
          createdAt: new Date().toISOString(),
        };

        setCurrentUser(user);
        setActiveRole(user.role);
        if (user.supplierId) setSelectedSupplierId(user.supplierId);
        if (user.salespersonId) setSelectedSalespersonId(user.salespersonId);
        sessionStore.setItem(STORAGE_KEY, JSON.stringify(user));
        setCurrentView('portal');
        return { success: true, user };
      }
      return { success: false, error: res.error || 'Login failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Login failed' };
    }
  };

  const signInWithGoogle = async (rolePreference?: 'salesperson' | 'supplier') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: rolePreference ? { role: rolePreference } : undefined,
        },
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut().catch(() => {});
    } catch {}

    setCurrentUser(null);
    setActiveRole('public');
    setSelectedSupplierId('');
    setSelectedSalespersonId('');
    setSelectedCustomerToken('');
    sessionStore.removeItem(STORAGE_KEY);

    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.clear();
        window.localStorage.removeItem(STORAGE_KEY);
        window.localStorage.removeItem('supabase.auth.token');
        window.localStorage.removeItem('sb-' + (process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID || 'token') + '-auth-token');
      } catch {}
    }

    // Invalidate and clear all TanStack queries to prevent stale data leaking across sessions
    try {
      queryClient.clear();
    } catch {}

    setCurrentView('signin');
  };

  const registerSupplier = async (supplierData: any) => {
    try {
      const businessName = (supplierData.businessName || supplierData.name || supplierData.companyName || '').toString().trim();
      const email = (supplierData.email || supplierData.contactEmail || '').toString().trim();
      const payload = {
        ...supplierData,
        businessName,
        name: businessName,
        email,
        contactEmail: email,
      };

      const res = await authApi.registerSupplier(payload);
      if (res.success) {
        // Auto-login if password was provided
        if (payload.password && payload.email) {
          await supabase.auth.signInWithPassword({
            email: payload.email,
            password: payload.password,
          }).catch(() => {});
        }
        return { success: true, business: res.business };
      }
      return { success: false, error: res.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  const registerSalesAgent = async (agentData: any) => {
    try {
      const email = agentData.email || `${agentData.phone.replace(/[^0-9]/g, '')}@azwari.et`;
      const res = await authApi.registerSalesAgent({ ...agentData, email });
      if (res.success) {
        if (agentData.password) {
          await supabase.auth.signInWithPassword({
            email,
            password: agentData.password,
          }).catch(() => {});
        }
        return { success: true, agent: res.salesPartner };
      }
      return { success: false, error: res.error || 'Registration failed' };
    } catch (err: any) {
      return { success: false, error: err.message || 'Registration failed' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthLoading,
        activeRole,
        setActiveRole,
        currentView,
        setCurrentView,
        permissionError,
        dismissPermissionError,
        authRolePreference,
        setAuthRolePreference,
        selectedSupplierId,
        setSelectedSupplierId,
        selectedSalespersonId,
        setSelectedSalespersonId,
        selectedCustomerToken,
        setSelectedCustomerToken,
        login,
        signInWithGoogle,
        logout,
        registerSupplier,
        registerSalesAgent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
