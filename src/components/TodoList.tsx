"use client";

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import TodoItem from "./TodoItem";
import { Plus, Calendar as CalendarIcon, Loader2, Archive } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface Todo {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  created_at: string;
  due_date: string | null;
  category: string;
  team_id?: string;
  archived?: boolean;
}

type Filter = "all" | "active" | "completed";

const TodoList: React.FC = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  
  // New Todo State
  const [newTodoText, setNewTodoText] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("");
  const [category, setCategory] = useState<string>("Personal");

  // Filters
  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Fetch Todos with React Query
  const { data: todos = [], isLoading: loading } = useQuery({
    queryKey: ['todos', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Todo[];
    },
    enabled: !!user,
  });

  // Mutations
  const addTodoMutation = useMutation({
    mutationFn: async (newTodo: any) => {
      const { data, error } = await supabase
        .from("todos")
        .insert([newTodo])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      showSuccess("Todo added successfully!");
      setNewTodoText("");
      setDate(undefined);
      setTime("");
    },
    onError: (error: any) => {
      showError("Failed to add todo: " + error.message);
    }
  });

  const toggleTodoMutation = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from("todos")
        .update({ completed })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, completed }) => {
      await queryClient.cancelQueries({ queryKey: ['todos'] });
      const previousTodos = queryClient.getQueryData(['todos', user?.id]);
      
      queryClient.setQueryData(['todos', user?.id], (old: Todo[] | undefined) => {
        return old?.map(t => t.id === id ? { ...t, completed } : t) || [];
      });
      
      return { previousTodos };
    },
    onError: (err, newTodo, context) => {
      queryClient.setQueryData(['todos', user?.id], context?.previousTodos);
      showError("Failed to update todo");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    }
  });

  const archiveTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("todos")
        .update({ archived: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      showSuccess("Todo archived!");
    },
    onError: (error: any) => {
      showError("Failed to archive: " + error.message);
    }
  });

  const deleteTodoMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("todos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      showSuccess("Todo deleted!");
    },
    onError: (error: any) => {
      showError("Failed to delete todo: " + error.message);
    }
  });

  const archiveCompletedMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("todos")
        .update({ archived: true })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      showSuccess("Completed todos archived!");
    },
    onError: (error: any) => {
      showError("Failed to archive: " + error.message);
    }
  });

  const addTodo = async () => {
    if (newTodoText.trim() === "") {
      showError("Todo text cannot be empty!");
      return;
    }
    if (!user) {
      showError("You must be logged in to add todos.");
      return;
    }

    let finalDate = date;
    if (date && time) {
      const [hours, minutes] = time.split(':').map(Number);
      finalDate = new Date(date);
      finalDate.setHours(hours);
      finalDate.setMinutes(minutes);
    } else if (time && !date) {
      finalDate = new Date();
      const [hours, minutes] = time.split(':').map(Number);
      finalDate.setHours(hours);
      finalDate.setMinutes(minutes);
    }

    addTodoMutation.mutate({
      user_id: user.id,
      text: newTodoText.trim(),
      completed: false,
      due_date: finalDate ? finalDate.toISOString() : null,
      category: category,
      archived: false
    });
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      addTodo();
    }
  };

  const archiveCompleted = () => {
    const completedIds = todos
      .filter((t) => t.completed && !t.archived && t.user_id === user?.id)
      .map((t) => t.id);
      
    if (completedIds.length === 0) return;
    archiveCompletedMutation.mutate(completedIds);
  };

  const filteredTodos = todos.filter((todo) => {
    // Exclude archived todos from this list
    if (todo.archived) return false;

    const matchesStatus =
      filter === "all"
        ? true
        : filter === "active"
        ? !todo.completed
        : todo.completed;
        
    const matchesCategory = 
      categoryFilter === "all" 
        ? true 
        : todo.category === categoryFilter;

    return matchesStatus && matchesCategory;
  });

  return (
    <Card className="w-full max-w-xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-center">My Todo List</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Input Area */}
        <div className="flex flex-col gap-3 mb-6">
          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="What needs to be done?"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-grow h-10"
            />
            <Button onClick={addTodo} className="h-10 px-4" disabled={addTodoMutation.isPending}>
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Personal">Personal</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-full sm:w-[180px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a due date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Input 
              type="time"
              className="w-full sm:w-auto"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
           <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Personal">Personal</SelectItem>
                <SelectItem value="Professional">Professional</SelectItem>
              </SelectContent>
            </Select>

            <ToggleGroup type="single" value={filter} onValueChange={(value: Filter) => value && setFilter(value)}>
              <ToggleGroupItem value="all" size="sm">All</ToggleGroupItem>
              <ToggleGroupItem value="active" size="sm">Active</ToggleGroupItem>
              <ToggleGroupItem value="completed" size="sm">Done</ToggleGroupItem>
            </ToggleGroup>
        </div>

        {/* Todo List */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTodos.length === 0 && todos.filter(t => !t.archived).length === 0 ? (
          <p className="text-center text-muted-foreground text-lg py-8">No active todos. Add one above!</p>
        ) : filteredTodos.length === 0 ? (
          <p className="text-center text-muted-foreground text-lg py-8">No matching todos found.</p>
        ) : (
          <ScrollArea className="h-[400px] w-full rounded-md border">
            <div>
              {filteredTodos.map((todo) => {
                 const isShared = todo.team_id !== null || todo.user_id !== user?.id;
                 const isOwner = todo.user_id === user?.id;
                 
                 return (
                  <TodoItem
                    key={todo.id}
                    id={todo.id}
                    text={todo.text}
                    completed={todo.completed}
                    dueDate={todo.due_date}
                    category={todo.category}
                    isShared={isShared}
                    isOwner={isOwner}
                    onToggle={(id, status) => toggleTodoMutation.mutate({ id, completed: !status })}
                    onDelete={(id) => deleteTodoMutation.mutate(id)}
                    onArchive={(id) => archiveTodoMutation.mutate(id)}
                  />
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter className="flex justify-end p-4 border-t">
        <Button
          onClick={archiveCompleted}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={!todos.some(todo => todo.completed && !todo.archived && todo.user_id === user?.id)}
        >
          <Archive className="h-4 w-4" />
          Archive Completed
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TodoList;