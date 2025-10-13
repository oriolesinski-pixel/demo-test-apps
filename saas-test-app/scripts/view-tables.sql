-- Quick verification query to run in Supabase SQL Editor after setup
-- This will show you all tables that were created

SELECT 
    tablename,
    rowsecurity as "RLS Enabled"
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Expected tables:
-- 1. activity_log
-- 2. comments
-- 3. invitations
-- 4. profiles
-- 5. projects
-- 6. tasks
-- 7. workspace_members
-- 8. workspaces

-- All should have RLS Enabled = true

