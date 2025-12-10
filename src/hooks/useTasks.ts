import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceContext } from "@/contexts/WorkspaceContext";
import { useToast } from "@/hooks/use-toast";

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: "High" | "Medium" | "Low";
  status: TaskStatus;
  assignee_name?: string;
  assignee_avatar?: string;
  tags: string[];
  user_id: string;
  created_at: string;
  updated_at: string;
}

export const useTasks = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspaceContext();
  const { toast } = useToast();

  const fetchTasks = async () => {
    if (!user || !currentWorkspace) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const typedData = (data || []).map(task => ({
        ...task,
        priority: task.priority as "High" | "Medium" | "Low",
        status: task.status as TaskStatus,
        tags: task.tags as string[],
      }));

      setTasks(typedData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to fetch tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData: Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      if (!user || !currentWorkspace) {
        toast({
          title: "Error",
          description: "You must be logged in and have a workspace selected to create tasks",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert([{ ...taskData, user_id: user.id, workspace_id: currentWorkspace.id }])
        .select()
        .single();

      if (error) throw error;

      const typedData = {
        ...data,
        priority: data.priority as "High" | "Medium" | "Low",
        status: data.status as TaskStatus,
        tags: data.tags as string[],
      };

      setTasks([typedData, ...tasks]);
      toast({
        title: "Success",
        description: "Task created successfully",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create task",
        variant: "destructive",
      });
    }
  };

  const updateTask = async (id: string, updates: Partial<Omit<Task, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const typedData = {
        ...data,
        priority: data.priority as "High" | "Medium" | "Low",
        status: data.status as TaskStatus,
        tags: data.tags as string[],
      };

      setTasks(tasks.map(task => task.id === id ? typedData : task));
      toast({
        title: "Success",
        description: "Task updated successfully",
      });

      return data;
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setTasks(tasks.filter(task => task.id !== id));
      toast({
        title: "Success",
        description: "Task deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [currentWorkspace]);

  return {
    tasks,
    loading,
    createTask,
    updateTask,
    deleteTask,
    refetch: fetchTasks,
  };
};