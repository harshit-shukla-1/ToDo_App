"use client";

import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar as CalendarIcon,
  Edit,
  Loader2,
  Tag,
  X,
  Share2,
  Users,
  Archive,
  FolderKanban
} from "lucide-react";
import { format } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import ConfirmDialog from "@/components/ConfirmDialog";
import ShareTodoDialog from "@/components/ShareTodoDialog";
import TodoDetailsDialog from "@/components/TodoDetailsDialog";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: string;
  due_date: string | null;
  created_at: string;
  user_id: string;
  team_id?: string;
  priority?: string;
  archived?: boolean;
  project_id?: string | null;
}

const Todos = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const isMobile = useIsMobile();
  const [searchParams] = useSearchParams();
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState(searchParams.get("project") || "all");

  // Dialog States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareId, setShareId] = useState<string | null>(null);
  const [viewTodo, setViewTodo] = useState<Todo | null>(null);

  useEffect(() => {
    if (user) {
      fetchTodos();
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('id, name');
    setProjects(data || []);
  };

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error: any) {
      showError("Error fetching todos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (id: string, currentStatus: boolean, e: React.MouseEvent) => {
    e.stopPropagation(); 
    try {
      const { error } = await supabase
        .from("todos")
        .update({ completed: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
      );
    } catch (error: any) {
      showError("Error updating todo: " + error.message);
    }
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteId(id);
  };

  const handleShareClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setShareId(id);
  };

  const handleEditClick = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    navigate(`/todos/${id}`);
  };

  const handleArchiveClick = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from("todos")
        .update({ archived: true })
        .eq("id", id);

      if (error) throw error;
      
      setTodos((prev) => prev.filter((t) => t.id !== id));
      showSuccess("Todo moved to archives");
    } catch (error: any) {
      showError("Error archiving todo: " + error.message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase.from("todos").delete().eq("id", deleteId);
      if (error) throw error;
      setTodos((prev) => prev.filter((t) => t.id !== deleteId));
      showSuccess("Todo deleted");
    } catch (error: any) {
      showError("Error deleting todo: " + error.message);
    } finally {
      setDeleteId(null);
    }
  };

  const filteredTodos = todos.filter((todo) => {
    const matchesSearch = todo.text
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all"
        ? true
        : statusFilter === "completed"
        ? todo.completed
        : !todo.completed;
    const matchesCategory =
      categoryFilter === "all" ? true : todo.category === categoryFilter;
    
    const matchesProject = 
      projectFilter === "all" 
        ? true 
        : projectFilter === "miscellaneous" 
          ? !todo.project_id 
          : todo.project_id === projectFilter;

    return matchesSearch && matchesStatus && matchesCategory && matchesProject;
  });

  const activeFiltersCount = (search ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0) + (projectFilter !== "all" ? 1 : 0);

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'extreme': return "text-red-700 bg-red-100 border-red-300 dark:bg-red-900/40 dark:text-red-200 font-medium";
      case 'high': return "text-red-500 bg-red-50 border-red-200 dark:bg-red-900/20";
      case 'normal': 
      case 'medium': return "text-orange-500 bg-orange-50 border-orange-200 dark:bg-orange-900/20";
      case 'low': return "text-green-500 bg-green-50 border-green-200 dark:bg-green-900/20";
      default: return "";
    }
  };

  const getProjectName = (id?: string | null) => {
    if (!id) return "Miscellaneous";
    const p = projects.find(proj => proj.id === id);
    return p ? p.name : "Project";
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      <div className="flex-none space-y-4 pb-2 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-bold tracking-tight hidden md:block">My Todos</h2>
          {isMobile && (
            <Button onClick={() => navigate("/todos/new")} size="sm">
              <Plus className="mr-2 h-4 w-4" /> New
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isMobile ? (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={search ? "secondary" : "outline"} size="icon" className="h-9 w-9 shrink-0">
                    <Search className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-60 p-2">
                   <div className="space-y-2">
                     <h4 className="font-medium leading-none text-sm">Search</h4>
                     <Input
                        placeholder="Search todos..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        autoFocus
                        className="h-8"
                      />
                   </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={projectFilter !== "all" ? "secondary" : "outline"} size="icon" className="h-9 w-9 shrink-0">
                    <FolderKanban className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-2">
                   <div className="space-y-2">
                     <h4 className="font-medium leading-none text-sm">Project</h4>
                     <Select value={projectFilter} onValueChange={setProjectFilter}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Projects</SelectItem>
                          <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                          {projects.map(p => (
                            <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                   </div>
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant={statusFilter !== "all" ? "secondary" : "outline"} size="icon" className="h-9 w-9 shrink-0">
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-2">
                  <div className="space-y-2">
                     <h4 className="font-medium leading-none text-sm">Status</h4>
                     <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                   </div>
                </PopoverContent>
              </Popover>

              <div className="flex-1 overflow-x-auto flex gap-2 no-scrollbar">
                 {search && (
                   <Badge variant="secondary" className="gap-1 pr-1 shrink-0">
                     "{search}" <X className="h-3 w-3 cursor-pointer" onClick={() => setSearch("")} />
                   </Badge>
                 )}
                 {projectFilter !== "all" && (
                   <Badge variant="secondary" className="gap-1 pr-1 shrink-0">
                     {projectFilter === 'miscellaneous' ? 'Misc' : 'Project'} 
                     <X className="h-3 w-3 cursor-pointer" onClick={() => setProjectFilter("all")} />
                   </Badge>
                 )}
              </div>
            </>
          ) : (
            <>
              <div className="relative w-48">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[140px] h-9">
                   <FolderKanban className="h-4 w-4 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  <SelectItem value="miscellaneous">Miscellaneous</SelectItem>
                  {projects.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[130px] h-9">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="Personal">Personal</SelectItem>
                  <SelectItem value="Professional">Professional</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1"></div>

              <Button onClick={() => navigate("/todos/new")} size="sm">
                <Plus className="mr-2 h-4 w-4" /> New Todo
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {activeFiltersCount > 0 ? "No todos found matching your filters." : "You have no active todos."}
          </div>
        ) : (
          <div className="grid gap-3 pb-20 md:pb-4">
            {filteredTodos.map((todo) => {
              const isTeam = todo.team_id !== null;
              const isShared = isTeam || todo.user_id !== user?.id;
              const isOwner = todo.user_id === user?.id;
              
              return (
                <Card
                  key={todo.id}
                  className="hover:shadow-md transition-shadow duration-200 cursor-pointer group active:scale-[0.99] transition-transform"
                  onClick={() => setViewTodo(todo)}
                >
                  <CardContent className="p-3 md:p-4 flex items-center gap-3">
                    <Checkbox
                      checked={todo.completed}
                      onClick={(e) => toggleTodo(todo.id, todo.completed, e)}
                      className="h-5 w-5 shrink-0 z-10"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p
                          className={cn(
                            "font-medium break-words line-clamp-2",
                            todo.completed && "line-through text-muted-foreground"
                          )}
                        >
                          {todo.text}
                        </p>
                        {todo.project_id && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-200 bg-blue-50 text-blue-600 dark:bg-blue-900/20 shrink-0 gap-1">
                            <FolderKanban className="h-3 w-3" /> {getProjectName(todo.project_id)}
                          </Badge>
                        )}
                        {!todo.project_id && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1 border-gray-200 text-gray-500 shrink-0">
                             Miscellaneous
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                        <Badge variant="secondary" className="text-[10px] px-1.5 h-5 shrink-0">
                          {todo.category}
                        </Badge>
                        {todo.due_date && (
                          <span className="flex items-center gap-1 text-[10px] shrink-0">
                            <CalendarIcon className="h-3 w-3" />
                            {format(new Date(todo.due_date), "MMM d, h:mm a")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0">
                      {isOwner && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-500 hover:bg-blue-50"
                          onClick={(e) => handleShareClick(todo.id, e)}
                          title="Share"
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => handleEditClick(todo.id, e)}
                        title="Edit"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-orange-500 hover:bg-orange-50"
                          onClick={(e) => handleArchiveClick(todo.id, e)}
                          title="Archive"
                        >
                          <Archive className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {isOwner && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleDeleteClick(todo.id, e)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
      
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete Todo"
        description="Are you sure you want to delete this todo? This action cannot be undone."
        onConfirm={confirmDelete}
        confirmText="Delete"
        variant="destructive"
      />
      
      <ShareTodoDialog 
        open={!!shareId} 
        onOpenChange={(open) => !open && setShareId(null)}
        todoId={shareId}
      />
      
      <TodoDetailsDialog 
        open={!!viewTodo}
        onOpenChange={(open) => !open && setViewTodo(null)}
        todo={viewTodo}
        onEdit={(id) => handleEditClick(id)}
      />
    </div>
  );
};

export default Todos;