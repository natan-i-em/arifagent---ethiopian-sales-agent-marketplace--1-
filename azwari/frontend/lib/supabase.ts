import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_URL) ||
  'https://edyyvfqcduwfpfnmbuuh.supabase.co';

const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (typeof process !== 'undefined' && process.env?.VITE_SUPABASE_ANON_KEY) ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeXl2ZnFjZHV3ZnBmbm1idXVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI1MTgyOTUsImV4cCI6MjEwODA5NDI5NX0.R-SpCzGI8gnLbx83-r7LkHvFWt9EAOSjHpdSiUDPfqo';

// Safe session storage adapter for Supabase that persists in sessionStorage (tab/session scope only)
// and cleans up legacy localStorage tokens for security.
const sessionStorageAdapter = {
  getItem: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const sessionVal = window.sessionStorage.getItem(key);
      if (sessionVal) return sessionVal;
      // Auto-migrate from legacy localStorage once, then remove from localStorage
      const localVal = window.localStorage.getItem(key);
      if (localVal) {
        window.sessionStorage.setItem(key, localVal);
        window.localStorage.removeItem(key);
        return localVal;
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
    } catch {}
  },
  removeItem: (key: string): void => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(key);
      window.localStorage.removeItem(key);
    } catch {}
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: sessionStorageAdapter,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
