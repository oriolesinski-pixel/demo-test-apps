-- MANUAL USER CREATION SCRIPT
-- Use this if automatic signup isn't working
-- Run this in Supabase SQL Editor AFTER creating a user via the Supabase dashboard

-- Step 1: First, create a user manually in Supabase Dashboard:
-- Go to Authentication → Users → "Add user"
-- Email: demo@taskflow.app
-- Password: password123
-- Check "Auto Confirm User" checkbox
-- Click "Create user"

-- Step 2: Get the user ID from the auth.users table:
SELECT id, email FROM auth.users WHERE email = 'demo@taskflow.app';

-- Step 3: Replace USER_ID_HERE with the actual UUID from step 2, then run:

-- Create profile
INSERT INTO public.profiles (id, email, full_name)
VALUES ('USER_ID_HERE', 'demo@taskflow.app', 'Demo User')
ON CONFLICT (id) DO NOTHING;

-- Create workspace
INSERT INTO public.workspaces (name, slug, owner_id)
VALUES ('Demo Workspace', 'workspace-demo', 'USER_ID_HERE')
ON CONFLICT DO NOTHING
RETURNING id;

-- Get the workspace ID from the result above, then:
-- Create workspace member (replace WORKSPACE_ID_HERE)
INSERT INTO public.workspace_members (workspace_id, user_id, role)
VALUES ('WORKSPACE_ID_HERE', 'USER_ID_HERE', 'owner')
ON CONFLICT DO NOTHING;

-- Verify everything worked:
SELECT 
    u.email,
    p.full_name,
    w.name as workspace_name,
    wm.role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
LEFT JOIN public.workspace_members wm ON wm.user_id = u.id
LEFT JOIN public.workspaces w ON w.id = wm.workspace_id
WHERE u.email = 'demo@taskflow.app';

