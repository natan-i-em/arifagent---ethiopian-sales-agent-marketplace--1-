import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://edyyvfqcduwfpfnmbuuh.supabase.co';
const supabaseServiceRoleKey = 
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkeXl2ZnFjZHV3ZnBmbm1idXVoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjUxODI5NSwiZXhwIjoyMTA4MDk0Mjk1fQ.uUBm6nHYHIcVmBW-v2jQrm6Lj9ZbXPhbG8TzxHeLme4';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('[SERVER] Info: Using embedded Supabase service role credentials fallback.');
}

// Elevated Supabase client for backend operations (bypasses RLS safely on server)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
