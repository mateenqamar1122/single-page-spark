-- Fix Workspace RLS Policies to Prevent Infinite Recursion
-- ========================================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view workspaces they are members of" ON public.workspaces;
DROP POLICY IF EXISTS "Users can view workspace members for their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage members" ON public.workspace_members;

-- Create non-recursive policies for workspace_members
CREATE POLICY "Users can view their own workspace memberships"
  ON public.workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own workspace membership"
  ON public.workspace_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow workspace owners/admins to manage members (but avoid recursion)
CREATE POLICY "Workspace owners can manage all members"
  ON public.workspace_members FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces
      WHERE owner_id = auth.uid()
    )
  );

-- Create simplified workspace policies
CREATE POLICY "Users can view workspaces where they are members"
  ON public.workspaces FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.workspace_members
      WHERE workspace_id = workspaces.id
      AND user_id = auth.uid()
      AND is_active = true
    )
  );

CREATE POLICY "Users can create workspaces"
  ON public.workspaces FOR INSERT
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspace owners can update their workspaces"
  ON public.workspaces FOR UPDATE
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Workspace owners can delete their workspaces"
  ON public.workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- Update workspace invitations policies to avoid recursion
DROP POLICY IF EXISTS "Workspace members can view invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Authorized users can manage invitations" ON public.workspace_invitations;

CREATE POLICY "Users can view invitations for their workspaces"
  ON public.workspace_invitations FOR SELECT
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    ) OR
    email = auth.jwt() ->> 'email'
  );

CREATE POLICY "Workspace owners can manage invitations"
  ON public.workspace_invitations FOR ALL
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );

-- Create a function to safely check workspace membership (avoiding recursion)
CREATE OR REPLACE FUNCTION public.is_workspace_member(
  p_user_id UUID,
  p_workspace_id UUID
)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Direct check without policy interference
  RETURN EXISTS (
    SELECT 1
    FROM workspace_members
    WHERE user_id = p_user_id
    AND workspace_id = p_workspace_id
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.is_workspace_member(UUID, UUID) TO authenticated;
