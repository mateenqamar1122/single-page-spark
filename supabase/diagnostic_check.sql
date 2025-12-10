-- Quick Diagnostic Script for Workspace Issues
-- Run this in Supabase SQL Editor to check your database status

-- ====================================
-- 1. Check if workspaces table exists
-- ====================================
SELECT 'Workspaces table exists' as status, count(*) as workspace_count
FROM workspaces;

-- ====================================
-- 2. Check workspace_members table
-- ====================================
SELECT 'Workspace members table exists' as status, count(*) as member_count
FROM workspace_members;

-- ====================================
-- 3. Check for your workspaces
-- ====================================
SELECT
  w.id,
  w.name,
  w.slug,
  w.owner_id,
  w.is_active,
  w.created_at
FROM workspaces w
ORDER BY w.created_at DESC
LIMIT 10;

-- ====================================
-- 4. Check your workspace memberships
-- ====================================
SELECT
  wm.id,
  wm.workspace_id,
  wm.user_id,
  wm.role,
  wm.is_active,
  w.name as workspace_name
FROM workspace_members wm
LEFT JOIN workspaces w ON w.id = wm.workspace_id
ORDER BY wm.created_at DESC
LIMIT 10;

-- ====================================
-- 5. Check if RPC functions exist
-- ====================================
SELECT
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_workspaces', 'create_workspace_simple')
ORDER BY routine_name;

-- ====================================
-- 6. Check RLS policies on workspaces
-- ====================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'workspaces'
ORDER BY policyname;

-- ====================================
-- 7. Check RLS policies on workspace_members
-- ====================================
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'workspace_members'
ORDER BY policyname;

-- ====================================
-- INTERPRETATION GUIDE:
-- ====================================
--
-- Query 1 & 2: If these fail, tables don't exist - run main migrations first
-- Query 3: Shows all workspaces in database - should see your workspaces here
-- Query 4: Shows workspace memberships - you should have entries here
-- Query 5: Should return 2 rows if RPC functions exist
--          If 0 rows, you need to run migration 20251210000002
-- Query 6 & 7: Should show several policies
--          If policies look complex or reference themselves,
--          you need to run migration 20251210000001
