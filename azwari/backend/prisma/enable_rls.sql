-- ==============================================================================
-- Azwari Platform - Production Database Hardening & Row Level Security (RLS)
-- Locks down all database tables in the public schema against anonymous/public access.
-- Bypasses only for backend database owner (postgres) and service_role.
-- ==============================================================================

DO $$
DECLARE
    tbl RECORD;
    policy_name TEXT;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        -- 1. Enable Row Level Security on each public table
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', tbl.tablename);

        -- 2. Create explicit service_role bypass policy
        policy_name := format('service_role_all_%s', tbl.tablename);
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I;', policy_name, tbl.tablename);
        EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);', policy_name, tbl.tablename);

        RAISE NOTICE 'Secured table % with RLS and service_role access policy', tbl.tablename;
    END LOOP;
END $$;
