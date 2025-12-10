-- Create RPC function to get user workspaces bypassing RLS
-- ========================================================

-- Create function to get user workspaces (bypasses RLS issues)
CREATE OR REPLACE FUNCTION public.get_user_workspaces(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  slug TEXT,
  logo_url TEXT,
  settings JSONB,
  owner_id UUID,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return workspaces where user is owner or member
  RETURN QUERY
  SELECT
    w.id,
    w.name,
    w.description,
    w.slug,
    w.logo_url,
    w.settings,
    w.owner_id,
    w.is_active,
    w.created_at,
    w.updated_at
  FROM workspaces w
  WHERE w.is_active = true
  AND (
    w.owner_id = p_user_id
    OR EXISTS (
      SELECT 1
      FROM workspace_members wm
      WHERE wm.workspace_id = w.id
      AND wm.user_id = p_user_id
      AND wm.is_active = true
    )
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_workspaces(UUID) TO authenticated;

-- Create simpler workspace creation function that ensures membership
CREATE OR REPLACE FUNCTION public.create_workspace_simple(
  p_name TEXT,
  p_slug TEXT,
  p_description TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_workspace_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current user ID
  current_user_id := auth.uid();

  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Create workspace
  INSERT INTO public.workspaces (name, slug, description, owner_id)
  VALUES (p_name, p_slug, p_description, current_user_id)
  RETURNING id INTO new_workspace_id;

  -- Add owner as workspace member (using direct insert to bypass RLS)
  INSERT INTO public.workspace_members (workspace_id, user_id, role, permissions, is_active)
  VALUES (
    new_workspace_id,
    current_user_id,
    'owner'::workspace_role,
    '{
      "projects": {"create": true, "read": true, "update": true, "delete": true},
      "tasks": {"create": true, "read": true, "update": true, "delete": true},
      "calendar": {"create": true, "read": true, "update": true, "delete": true},
      "timeline": {"read": true, "update": true},
      "users": {"invite": true, "manage": true},
      "workspace": {"manage": true}
    }'::jsonb,
    true
  );

  RETURN new_workspace_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_workspace_simple(TEXT, TEXT, TEXT) TO authenticated;
