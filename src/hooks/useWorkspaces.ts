import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type WorkspaceRole = 'owner' | 'admin' | 'manager' | 'member' | 'guest';

export interface WorkspacePermissions {
  projects: { create: boolean; read: boolean; update: boolean; delete: boolean };
  tasks: { create: boolean; read: boolean; update: boolean; delete: boolean };
  calendar: { create: boolean; read: boolean; update: boolean; delete: boolean };
  timeline: { read: boolean; update?: boolean };
  users: { invite: boolean; manage: boolean };
  workspace: { manage: boolean };
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  slug: string;
  logo_url?: string;
  settings: {
    timezone: string;
    date_format: string;
    time_format: string;
    currency: string;
    features: {
      time_tracking: boolean;
      calendar: boolean;
      gantt: boolean;
      reports: boolean;
    };
  };
  owner_id: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  invited_by?: string;
  invited_at?: string;
  joined_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Joined data
  user_email?: string;
  user_name?: string;
  user_avatar?: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: WorkspaceRole;
  permissions: WorkspacePermissions;
  invited_by: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

export interface CreateWorkspaceData {
  name: string;
  slug: string;
  description?: string;
}

export interface InviteUserData {
  email: string;
  role: WorkspaceRole;
  permissions?: Partial<WorkspacePermissions>;
}

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [currentMembership, setCurrentMembership] = useState<WorkspaceMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  // Fetch user's workspaces
  const fetchWorkspaces = useCallback(async () => {
    if (!user) {
      console.log('No user found, skipping workspace fetch');
      return;
    }

    console.log('Fetching workspaces for user:', user.id);
    setLoading(true);
    setError(null);

    try {
      // Try a different approach: fetch workspaces directly where user is owner
      console.log('Step 1: Fetching owned workspaces...');
      const { data: ownedWorkspaces, error: ownedError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('owner_id', user.id)
        .eq('is_active', true);

      if (ownedError) {
        console.error('Owned workspaces query error:', ownedError);
      }

      console.log('Found owned workspaces:', ownedWorkspaces);

      // Try to fetch workspaces using RPC function to bypass RLS issues
      console.log('Step 2: Attempting to fetch workspaces via RPC...');
      try {
        const supabaseAny = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const { data: rpcWorkspaces, error: rpcError } = await supabaseAny
          .rpc('get_user_workspaces', { p_user_id: user.id });

        if (!rpcError && rpcWorkspaces) {
          console.log('Found workspaces via RPC:', rpcWorkspaces);
          setWorkspaces(rpcWorkspaces as Workspace[]);
          setLoading(false);
          return;
        } else if (rpcError) {
          console.log('RPC error:', rpcError);
        }
      } catch (rpcError) {
        console.log('RPC method not available, falling back...', rpcError);
      }

      // Fallback: just use owned workspaces for now
      console.log('Using owned workspaces as fallback');
      setWorkspaces((ownedWorkspaces || []) as Workspace[]);

    } catch (err) {
      console.error('Error fetching workspaces:', err);

      // If we get the infinite recursion error, provide a helpful message
      if (err instanceof Error && err.message.includes('infinite recursion')) {
        setError('Database configuration issue detected. Please run the latest migration to fix workspace policies.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to fetch workspaces');
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Switch to a different workspace
  const switchWorkspace = useCallback(async (workspaceId: string) => {
    console.log('Switching to workspace:', workspaceId);
    try {
      // Get workspace details
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

      if (workspaceError) throw workspaceError;
      console.log('Found workspace:', workspace);

      // Get user's membership details
      const { data: membership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .single();

      if (membershipError) throw membershipError;
      console.log('Found membership:', membership);

      setCurrentWorkspace(workspace as Workspace);
      setCurrentMembership(membership as unknown as WorkspaceMember);

      // Store in localStorage for persistence
      localStorage.setItem('currentWorkspaceId', workspaceId);
      console.log('Workspace switched successfully');
    } catch (err) {
      console.error('Error switching workspace:', err);
      setError(err instanceof Error ? err.message : 'Failed to switch workspace');
    }
  }, [user]);

  // Create new workspace
  const createWorkspace = useCallback(async (data: CreateWorkspaceData): Promise<string | null> => {
    if (!user) {
      console.error('No user found for workspace creation');
      return null;
    }

    try {
      console.log('Creating workspace with data:', data);
      console.log('User ID:', user.id);

      let result: string | null = null;

      // Try using RPC function first
      try {
        const supabaseAny = supabase as any; // eslint-disable-line @typescript-eslint/no-explicit-any
        const { data: rpcResult, error: rpcError } = await supabaseAny.rpc('create_workspace_simple', {
          p_name: data.name,
          p_slug: data.slug,
          p_description: data.description
        });

        if (!rpcError && rpcResult) {
          console.log('Workspace created via RPC with ID:', rpcResult);
          result = rpcResult;
        } else {
          console.log('RPC failed, trying direct insert...', rpcError);
          throw new Error('RPC not available');
        }
      } catch (rpcError) {
        console.log('RPC method failed, using direct insert fallback');

        // Fallback: Direct database insert
        const { data: newWorkspace, error: insertError } = await supabase
          .from('workspaces')
          .insert({
            name: data.name,
            slug: data.slug,
            description: data.description,
            owner_id: user.id,
            is_active: true,
          })
          .select()
          .single();

        if (insertError) {
          console.error('Direct insert error:', insertError);
          throw insertError;
        }

        console.log('Workspace created via direct insert:', newWorkspace);
        result = newWorkspace.id;

        // Manually create workspace membership
        const defaultPermissions = {
          projects: { create: true, read: true, update: true, delete: true },
          tasks: { create: true, read: true, update: true, delete: true },
          calendar: { create: true, read: true, update: true, delete: true },
          timeline: { read: true, update: true },
          users: { invite: true, manage: true },
          workspace: { manage: true }
        };

        const { error: memberError } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: result,
            user_id: user.id,
            role: 'owner',
            permissions: defaultPermissions,
            is_active: true,
          });

        if (memberError) {
          console.error('Failed to create membership:', memberError);
          // Don't throw here, workspace was created successfully
        } else {
          console.log('Workspace membership created successfully');
        }
      }

      if (!result) {
        throw new Error('Failed to create workspace');
      }

      console.log('Workspace created with ID:', result);

      // Verify the workspace was actually created
      console.log('Verifying workspace creation...');
      const { data: verifyWorkspace, error: verifyError } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', result)
        .single();

      if (verifyError) {
        console.error('Failed to verify workspace creation:', verifyError);
      } else {
        console.log('Verified workspace exists:', verifyWorkspace);
      }

      // Verify the membership was created
      const { data: verifyMembership, error: membershipError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', result)
        .eq('user_id', user.id);

      if (membershipError) {
        console.error('Failed to verify membership creation:', membershipError);
      } else {
        console.log('Verified membership exists:', verifyMembership);
      }

      // Refresh workspaces
      console.log('Refreshing workspaces...');
      await fetchWorkspaces();

      // Switch to the new workspace
      if (result) {
        console.log('Switching to new workspace:', result);
        await switchWorkspace(result);
      }

      return result;
    } catch (err) {
      console.error('Error creating workspace:', err);
      setError(err instanceof Error ? err.message : 'Failed to create workspace');
      return null;
    }
  }, [user, fetchWorkspaces, switchWorkspace]);

  // Check if user has specific permission
  const hasPermission = useCallback((resource: keyof WorkspacePermissions, action: string): boolean => {
    if (!currentMembership) return false;

    // Owner has all permissions
    if (currentMembership.role === 'owner') return true;

    const resourcePermissions = currentMembership.permissions[resource] as Record<string, boolean>;
    return resourcePermissions?.[action] || false;
  }, [currentMembership]);

  // Initialize workspace from localStorage
  useEffect(() => {
    if (user) {
      console.log('User found, fetching workspaces...');
      fetchWorkspaces();
    }
  }, [user, fetchWorkspaces]);

  // Separate effect for restoring workspace from localStorage
  useEffect(() => {
    if (user && workspaces.length > 0 && !currentWorkspace) {
      const savedWorkspaceId = localStorage.getItem('currentWorkspaceId');
      if (savedWorkspaceId && workspaces.some(w => w.id === savedWorkspaceId)) {
        console.log('Restoring workspace from localStorage:', savedWorkspaceId);
        switchWorkspace(savedWorkspaceId).catch(console.error);
      } else if (workspaces.length > 0) {
        console.log('No saved workspace, switching to first available:', workspaces[0].id);
        switchWorkspace(workspaces[0].id).catch(console.error);
      }
    }
  }, [user, workspaces, currentWorkspace, switchWorkspace]);

  return {
    workspaces,
    currentWorkspace,
    currentMembership,
    loading,
    error,
    fetchWorkspaces,
    switchWorkspace,
    createWorkspace,
    hasPermission,
  };
}

export function useWorkspaceMembers(workspaceId?: string) {
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const fetchMembers = useCallback(async () => {
    if (!workspaceId) return;

    setLoading(true);
    try {
      const { data, error: queryError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true);

      if (queryError) throw queryError;

      const formattedMembers = (data || []).map(member => ({
        ...member,
        role: member.role as WorkspaceRole,
        permissions: member.permissions as unknown as WorkspacePermissions,
        user_name: 'User',
        user_avatar: undefined,
      })) as WorkspaceMember[];

      setMembers(formattedMembers);
    } catch (err) {
      console.error('Error fetching workspace members:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch members');
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const fetchInvitations = useCallback(async () => {
    if (!workspaceId) return;

    try {
      const { data, error: queryError } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('accepted_at', null)
        .gt('expires_at', new Date().toISOString());

      if (queryError) throw queryError;

      const formattedInvitations = (data || []).map(invitation => ({
        ...invitation,
        role: invitation.role as WorkspaceRole,
        permissions: invitation.permissions as unknown as WorkspacePermissions,
      })) as WorkspaceInvitation[];

      setInvitations(formattedInvitations);
    } catch (err) {
      console.error('Error fetching invitations:', err);
    }
  }, [workspaceId]);

  const inviteUser = useCallback(async (data: InviteUserData): Promise<boolean> => {
    if (!workspaceId || !user) return false;

    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: workspaceId,
          email: data.email,
          role: data.role,
          permissions: data.permissions,
          invited_by: user.id,
        });

      if (error) throw error;

      await fetchInvitations();
      return true;
    } catch (err) {
      console.error('Error inviting user:', err);
      setError(err instanceof Error ? err.message : 'Failed to invite user');
      return false;
    }
  }, [workspaceId, user, fetchInvitations]);

  const updateMemberRole = useCallback(async (memberId: string, role: WorkspaceRole): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
      return true;
    } catch (err) {
      console.error('Error updating member role:', err);
      setError(err instanceof Error ? err.message : 'Failed to update member role');
      return false;
    }
  }, [fetchMembers]);

  const removeMember = useCallback(async (memberId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ is_active: false })
        .eq('id', memberId);

      if (error) throw error;

      await fetchMembers();
      return true;
    } catch (err) {
      console.error('Error removing member:', err);
      setError(err instanceof Error ? err.message : 'Failed to remove member');
      return false;
    }
  }, [fetchMembers]);

  useEffect(() => {
    if (workspaceId) {
      fetchMembers();
      fetchInvitations();
    }
  }, [workspaceId, fetchMembers, fetchInvitations]);

  return {
    members,
    invitations,
    loading,
    error,
    fetchMembers,
    fetchInvitations,
    inviteUser,
    updateMemberRole,
    removeMember,
  };
}
