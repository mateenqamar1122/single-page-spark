import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useState } from "react";
import { useNotifications } from "@/contexts/NotificationContext";
import { useTasks, TaskStatus } from "@/hooks/useTasks";

export default function Tasks() {
  const { addNotification } = useNotifications();
  const { tasks, loading, createTask, updateTask, deleteTask } = useTasks();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "Medium" as "High" | "Medium" | "Low",
    status: "todo" as TaskStatus,
    assigneeName: "",
    tags: "",
  });
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const columns: { id: TaskStatus; title: string }[] = [
    { id: "todo", title: "To Do" },
    { id: "in-progress", title: "In Progress" },
    { id: "done", title: "Done" },
  ];

  const getTasksByStatus = (status: TaskStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleOpenDialog = (taskId?: string, status?: TaskStatus) => {
    const task = taskId ? tasks.find(t => t.id === taskId) : null;
    if (task) {
      setEditingTask(task.id);
      setFormData({
        title: task.title,
        description: task.description || "",
        priority: task.priority,
        status: task.status,
        assigneeName: task.assignee_name || "",
        tags: task.tags.join(", "),
      });
    } else {
      setEditingTask(null);
      setFormData({
        title: "",
        description: "",
        priority: "Medium",
        status: status || "todo",
        assigneeName: "",
        tags: "",
      });
    }
    setIsDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!formData.title.trim()) {
      return;
    }

    const taskData = {
      title: formData.title,
      description: formData.description || undefined,
      priority: formData.priority,
      status: formData.status,
      assignee_name: formData.assigneeName || undefined,
      assignee_avatar: formData.assigneeName 
        ? `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.assigneeName.toLowerCase()}`
        : undefined,
      tags: formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    };

    if (editingTask) {
      await updateTask(editingTask, taskData);
      addNotification({
        type: "task",
        title: "Task Updated",
        message: `"${formData.title}" has been updated successfully`,
      });
    } else {
      await createTask(taskData);
      addNotification({
        type: "task",
        title: "New Task Created",
        message: `"${formData.title}" has been assigned to ${formData.assigneeName || "Unassigned"}`,
      });
    }

    setIsDialogOpen(false);
  };

  const handleDeleteTask = async (id: string) => {
    const task = tasks.find((t) => t.id === id);
    await deleteTask(id);
    if (task) {
      addNotification({
        type: "task",
        title: "Task Deleted",
        message: `"${task.title}" has been deleted`,
      });
    }
  };

  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (status: TaskStatus) => {
    if (draggedTask) {
      const task = tasks.find((t) => t.id === draggedTask);
      await updateTask(draggedTask, { status });
      const statusText = status === "in-progress" ? "In Progress" : status === "done" ? "Done" : "To Do";
      if (task) {
        addNotification({
          type: "task",
          title: "Task Status Changed",
          message: `"${task.title}" moved to ${statusText}`,
        });
      }
      setDraggedTask(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-accent/10 text-accent border-accent/20";
      case "Medium":
        return "bg-highlight/10 text-highlight border-highlight/20";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">Tasks</h1>
          <p className="text-muted-foreground">Manage your tasks with a kanban board</p>
        </div>
        <Button className="rounded-2xl" onClick={() => handleOpenDialog()}>
          <Plus className="mr-2 h-4 w-4" />
          New Task
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No tasks yet. Create your first task to get started!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {columns.map((column) => {
          const columnTasks = getTasksByStatus(column.id);
          return (
            <div
              key={column.id}
              className="space-y-4"
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(column.id)}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  {column.title}
                  <Badge variant="secondary" className="rounded-full">
                    {columnTasks.length}
                  </Badge>
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-xl"
                  onClick={() => handleOpenDialog(undefined, column.id)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {columnTasks.map((task) => (
                  <Card
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    className="rounded-2xl border-border/40 hover-lift cursor-move group"
                  >
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-medium group-hover:text-primary transition-colors flex-1">
                            {task.title}
                          </h3>
                          <div className="flex items-center gap-2">
                            <Badge
                              className={`${getPriorityColor(task.priority)} rounded-full text-xs border`}
                            >
                              {task.priority}
                            </Badge>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleOpenDialog(task.id)}>
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-destructive"
                                >
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {task.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {task.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-2">
                          {task.tags.map((tag, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="rounded-full text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>

                         {task.assignee_name && (
                          <div className="flex items-center justify-between pt-2 border-t border-border/40">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={task.assignee_avatar} />
                                <AvatarFallback>{task.assignee_name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                {task.assignee_name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
        </div>
      )}

      {/* Add/Edit Task Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
            <DialogDescription>
              {editingTask ? "Update the task details below." : "Add a new task to your board."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4 overflow-y-auto flex-1 min-h-0 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
            <div className="space-y-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter task title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Enter task description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value: "High" | "Medium" | "Low") =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: TaskStatus) =>
                    setFormData({ ...formData, status: value })
                  }
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todo">To Do</SelectItem>
                    <SelectItem value="in-progress">In Progress</SelectItem>
                    <SelectItem value="done">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignee">Assignee</Label>
              <Input
                id="assignee"
                placeholder="Enter assignee name"
                value={formData.assigneeName}
                onChange={(e) => setFormData({ ...formData, assigneeName: e.target.value })}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tags">Tags</Label>
              <Input
                id="tags"
                placeholder="Enter tags (comma separated)"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleSaveTask} className="rounded-xl">
              {editingTask ? "Update" : "Create"} Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
