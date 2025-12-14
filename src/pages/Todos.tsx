"use client";

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  X
} from "lucide-react";
import { format } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useIsMobile } from "@/hooks/use-mobile";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: string;
  due_date: string | null;
  created_at: string;
}

const Todos = () => {
  const navigate = useNavigate();
  const { user } = useSession();
  const isMobile = useIsMobile();
  
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filter States
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Dialog State
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchTodos();
    }
  }, [user]);

  const fetchTodos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error: any) {
      showError("Error fetching todos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
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

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
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

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const activeFiltersCount = (search ? 1 : 0) + (statusFilter !== "all" ? 1 : 0) + (categoryFilter !== "all" ? 1 : 0);

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Fixed Header Section */}
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
            /* Mobile View: Icon Popovers */
            <>
              {/* Search Popover */}
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

              {/* Status Filter Popover */}
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

               {/* Category Filter Popover */}
               <Popover>
                <PopoverTrigger asChild>
                  <Button variant={categoryFilter !== "all" ? "secondary" : "outline"} size="icon" className="h-9 w-9 shrink-0">
                    <Tag className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-48 p-2">
                   <div className="space-y-2">
                     <h4 className="font-medium leading-none text-sm">Category</h4>
                     <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Personal">Personal</SelectItem>
                        <SelectItem value="Professional">Professional</SelectItem>
                      </SelectContent>
                    </Select>
                   </div>
                </PopoverContent>
              </Popover>

              {/* Active Filter Chips (Mobile Only) */}
              <div className="flex-1 overflow-x-auto flex gap-2 no-scrollbar">
                 {search && (
                   <Badge variant="secondary" className="gap-1 pr-1 shrink-0">
                     "{search}" <X className="h-3 w-3 cursor-pointer" onClick={() => setSearch("")} />
                   </Badge>
                 )}
                 {statusFilter !== "all" && (
                   <Badge variant="secondary" className="gap-1 pr-1 shrink-0">
                     {statusFilter === 'active' ? 'Active' : 'Completed'} 
                     <X className="h-3 w-3 cursor-pointer" onClick={() => setStatusFilter("all")} />
                   </Badge>
                 )}
                  {categoryFilter !== "all" && (
                   <Badge variant="secondary" className="gap-1 pr-1 shrink-0">
                     {categoryFilter} <X className="h-3 w-3 cursor-pointer" onClick={() => setCategoryFilter("all")} />
                   </Badge>
                 )}
              </div>
            </>
          ) : (
            /* Desktop View: Full Inputs */
            <>
              <div className="relative w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search todos..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] h-9">
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

      {/* Scrollable List Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {activeFiltersCount > 0 ? "No todos found matching your filters." : "You have no todos yet."}
          </div>
        ) : (
          <div className="grid gap-3 pb-20 md:pb-4">
            {filteredTodos.map((todo) => (
              <Card
                key={todo.id}
                className="hover:shadow-md transition-shadow duration-200"
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <Checkbox
                    checked={todo.completed}
                    onCheckedChange={() => toggleTodo(todo.id, todo.completed)}
                    className="h-5 w-5"
                  />
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "font-medium truncate",
                        todo.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {todo.text}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-5">
                        {todo.category}
                      </Badge>
                      {todo.due_date && (
                        <span className="flex items-center gap-1 text-[10px]">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(todo.due_date), "MMM d, h:mm a")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => navigate(`/todos/${todo.id}`)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      onClick={() => handleDeleteClick(todo.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </div>
  );
};

export default Todos;