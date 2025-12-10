import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useWorkspaceContext } from '@/contexts/WorkspaceContext';
import { useSidebar } from '@/components/ui/sidebar';
import { ChevronDown, Plus, Settings, Users, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';

interface CreateWorkspaceData {
  name: string;
  slug: string;
  description: string;
}

export function WorkspaceSelector() {
  const {
    workspaces,
    currentWorkspace,
    currentMembership,
    loading,
    switchWorkspace,
    createWorkspace,
    fetchWorkspaces
  } = useWorkspaceContext();

  // Get sidebar state to hide workspace section when collapsed
  const { state: sidebarState } = useSidebar();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState<CreateWorkspaceData>({
    name: '',
    slug: '',
    description: ''
  });

  const handleCreateWorkspace = async () => {
    if (!newWorkspace.name.trim() || !newWorkspace.slug.trim()) {
      toast({
        title: "Validation Error",
        description: "Please provide both name and slug for the workspace.",
        variant: "destructive",
      });
      return;
    }

    setCreateLoading(true);
    try {
      console.log('Creating workspace from component:', newWorkspace);
      const result = await createWorkspace(newWorkspace);
      console.log('Workspace creation result:', result);

      if (result) {
        setShowCreateDialog(false);
        setNewWorkspace({ name: '', slug: '', description: '' });

        // Force refresh the workspaces
        setTimeout(() => {
          fetchWorkspaces();
        }, 500);

        toast({
          title: "Workspace Created",
          description: `"${newWorkspace.name}" workspace has been created successfully.`,
        });
      } else {
        throw new Error('Failed to create workspace');
      }
    } catch (error) {
      console.error('Error in handleCreateWorkspace:', error);
      toast({
        title: "Error",
        description: "Failed to create workspace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCreateLoading(false);
    }
  };

  // Debug effect to monitor workspace changes
  useEffect(() => {
    console.log('WorkspaceSelector - workspaces:', workspaces.length);
    console.log('WorkspaceSelector - currentWorkspace:', currentWorkspace?.name);
    console.log('WorkspaceSelector - loading:', loading);
  }, [workspaces, currentWorkspace, loading]);

  // Add a debug button to manually test workspace fetching
  // const testWorkspaceFetch = async () => {
  //   console.log('=== MANUAL WORKSPACE FETCH TEST ===');
  //   try {
  //     await fetchWorkspaces();
  //     console.log('Manual fetch completed');
  //   } catch (error) {
  //     console.error('Manual fetch failed:', error);
  //   }
  // };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    setNewWorkspace(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  if (loading && !currentWorkspace) {
    return (
      <div className="flex items-center gap-2 p-2 mx-4 my-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading workspaces...</span>
      </div>
    );
  }

  if (!currentWorkspace) {
    return (
      <div className="px-4 py-4 border-b bg-muted/30">
        <div className="text-center">
          <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
            No Workspace Selected
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Create or join a workspace to get started
          </p>

          {/* Debug Information */}
          {workspaces.length > 0 && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md text-left">
              <p className="text-xs font-semibold text-yellow-800 mb-1">
                ⚠️ Debug: {workspaces.length} workspace(s) found but not loaded
              </p>
              <p className="text-xs text-yellow-700">
                Try clicking "Refresh Workspaces" below
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-left">
              <p className="text-xs font-semibold text-red-800 mb-1">
                ❌ Error Loading Workspaces
              </p>
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <Button
            onClick={() => {
              console.log('Manual refresh triggered');
              console.log('Current workspaces:', workspaces);
              console.log('Loading:', loading);
              console.log('Error:', error);
              fetchWorkspaces();
            }}
            variant="outline"
            className="w-full mb-2"
          >
            Refresh Workspaces
          </Button>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Workspace
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Workspace</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Workspace Name</Label>
                  <Input
                    id="name"
                    value={newWorkspace.name}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="My Awesome Workspace"
                  />
                </div>

                <div>
                  <Label htmlFor="slug">Workspace Slug</Label>
                  <Input
                    id="slug"
                    value={newWorkspace.slug}
                    onChange={(e) => setNewWorkspace(prev => ({ ...prev, slug: e.target.value }))}
                    placeholder="my-awesome-workspace"
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newWorkspace.description}
                    onChange={(e) => setNewWorkspace(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your workspace..."
                    rows={3}
                  />
                </div>

                <Button onClick={handleCreateWorkspace} disabled={createLoading} className="w-full">
                  {createLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Create Workspace
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    );
  }

  // Hide workspace section when sidebar is collapsed
  if (sidebarState === 'collapsed') {
    return null;
  }

  return (
    <div className="px-4 py-4 border-b bg-muted/30">
      {/* Workspace Switcher with Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="w-full h-auto p-3 hover:bg-muted justify-start"
          >
            <div className="flex items-center gap-3 w-full">
              <Avatar className="h-10 w-10">
                <AvatarImage src={currentWorkspace.logo_url} />
                <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                  {currentWorkspace.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0 text-left">
                <h2 className="font-semibold text-base truncate">{currentWorkspace.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-xs">
                    {currentMembership?.role}
                  </Badge>
                  {workspaces.length > 1 && (
                    <span className="text-xs text-muted-foreground">
                      +{workspaces.length - 1} more
                    </span>
                  )}
                </div>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </div>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent className="w-80" align="start" sideOffset={8}>
          {/* Current Workspace Header */}
          <div className="p-3 bg-muted/50">
            <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-2">
              Current Workspace
            </div>
            <div className="flex items-center gap-3 p-2 bg-background rounded-md border-2 border-primary/20">
              <Avatar className="h-8 w-8">
                <AvatarImage src={currentWorkspace.logo_url} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {currentWorkspace.name.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{currentWorkspace.name}</p>
                <p className="text-xs text-muted-foreground truncate">/{currentWorkspace.slug}</p>
              </div>
            </div>
          </div>

          <DropdownMenuSeparator />

          {/* Available Workspaces */}
          {workspaces.length > 1 && (
            <>
              <div className="p-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium px-2 py-1">
                  Switch to Workspace
                </div>
                {workspaces.filter(w => w.id !== currentWorkspace.id).map(workspace => (
                  <DropdownMenuItem
                    key={workspace.id}
                    onClick={() => switchWorkspace(workspace.id)}
                    className="p-3 cursor-pointer hover:bg-muted rounded-md my-1"
                  >
                    <div className="flex items-center gap-3 w-full">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={workspace.logo_url} />
                        <AvatarFallback className="text-xs bg-muted">
                          {workspace.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{workspace.name}</p>
                        <p className="text-xs text-muted-foreground truncate">/{workspace.slug}</p>
                      </div>
                      <ChevronDown className="h-4 w-4 rotate-[-90deg] text-muted-foreground" />
                    </div>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator />
            </>
          )}

          {/* Actions */}
          <div className="p-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start mb-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create New Workspace
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Workspace</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Workspace Name</Label>
                    <Input
                      id="name"
                      value={newWorkspace.name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      placeholder="My Awesome Workspace"
                    />
                  </div>

                  <div>
                    <Label htmlFor="slug">Workspace Slug</Label>
                    <Input
                      id="slug"
                      value={newWorkspace.slug}
                      onChange={(e) => setNewWorkspace(prev => ({ ...prev, slug: e.target.value }))}
                      placeholder="my-awesome-workspace"
                    />
                  </div>

                  <div>
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      value={newWorkspace.description}
                      onChange={(e) => setNewWorkspace(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Describe your workspace..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleCreateWorkspace} disabled={createLoading} className="w-full">
                    {createLoading ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Create Workspace
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <DropdownMenuItem asChild>
              <Link to="/workspace/settings" className="cursor-pointer">
                <Settings className="h-4 w-4 mr-2" />
                Workspace Settings
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem className="cursor-pointer">
              <Users className="h-4 w-4 mr-2" />
              Manage Members
            </DropdownMenuItem>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Workspace Info Below */}
      {currentWorkspace.description && (
        <div className="mt-2 px-2">
          <p className="text-xs text-muted-foreground line-clamp-2">
            {currentWorkspace.description}
          </p>
        </div>
      )}
    </div>
  );
}

