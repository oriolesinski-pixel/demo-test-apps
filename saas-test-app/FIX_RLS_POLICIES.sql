-- CRITICAL FIX: Remove infinite recursion in workspace_members RLS policies
-- Run this entire script in Supabase SQL Editor

-- Step 1: Drop ALL existing workspace_members policies
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON workspace_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON workspace_members;
DROP POLICY IF EXISTS "Users can view members in same workspace" ON workspace_members;
DROP POLICY IF EXISTS "Owners can manage members" ON workspace_members;
DROP POLICY IF EXISTS "System can insert members" ON workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Owners can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can remove members" ON workspace_members;

-- Step 2: Temporarily DISABLE RLS to allow queries to work
ALTER TABLE workspace_members DISABLE ROW LEVEL SECURITY;

-- Step 3: Create simple, non-recursive policies
-- (We'll re-enable RLS after, but with permissive policies for now)

-- Re-enable RLS
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view workspace_members (simplest policy)
CREATE POLICY "Authenticated users can view all workspace members" ON workspace_members
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Allow authenticated users to insert (for triggers and invitations)
CREATE POLICY "Authenticated users can insert workspace members" ON workspace_members
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow workspace owners to delete members
CREATE POLICY "Workspace owners can delete members" ON workspace_members
  FOR DELETE USING (
    workspace_id IN (
      SELECT id FROM workspaces WHERE owner_id = auth.uid()
    )
  );

-- Verify policies are working
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'workspace_members';

