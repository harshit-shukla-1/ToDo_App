"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import TodoItem from "./TodoItem";
import { Plus, Calendar as CalendarIcon, Loader2 } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface Todo {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  created_at: string;
  due_date: string | null;
  category: string;
}

type Filter = "all" | "active" | "completed";

const TodoList: React.FC = () => {
  const { user } = useSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Todo State
  const [newTodoText, setNewTodoText] = useState<string>("");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [category, setCategory] = useState<string>("Personal");

  // Filters
  const [filter, setFilter] = useState<Filter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

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
      showError("Failed to fetch todos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const addTodo = async () => {
    if (newTodoText.trim() === "") {
      showError("Todo text cannot be empty!");
      return;
    }
    if (!user) {
      showError("You must be logged in to add todos.");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("todos")
        .insert([
          {
            user_id: user.id,
            text: newTodoText.trim(),
            completed: false,
            due_date: date ? date.toISOString() : null,
            category: category,
          },
        ])
        .select()
        .single();

      if (error) throw error;

      setTodos((prev) => [data, ...prev]);
      setNewTodoText("");
      setDate(undefined);
      // Keep category selection or reset? Resetting to default seems safer.
      // setCategory("Personal"); 
      showSuccess("Todo added successfully!");
    } catch (error: any) {
      showError("Failed to add todo: " + error.message);
    }
  };

  const toggleTodo = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("todos")
        .update({ completed: !currentStatus })
        .eq("id", id);

      if (error) throw error;

      setTodos((prevTodos) =>
        prevTodos.map((todo) =>
          todo.id === id ? { ...todo, completed: !todo.completed } : todo
        )
      );
    } catch (error: any) {
      showError("Failed to update todo: " + error.message);
    }
  };

  const deleteTodo = async (id: string) => {
    try {
      const { error } = await supabase.from("todos").delete().eq("id", id);

      if (error) throw error;

      setTodos((prevTodos) => prevTodos.filter((todo) => todo.id !== id));
      showSuccess("Todo deleted!");
    } catch (error: any) {
      showError("Failed to delete todo: " + error.message);
    }
  };

  const clearCompleted = async () => {
    const completedIds = todos.filter((t) => t.completed).map((t) => t.id);
    if (completedIds.length === 0) return;

    try {
      const { error } = await supabase
        .from("todos")
        .delete()
        .in("id", completedIds);

      if (error) throw error;

      setTodos((prevTodos) => prevTodos.filter((todo) => !todo.completed));
      showSuccess("Completed todos cleared!");
    } catch (error: any) {
      showError("Failed to clear completed todos: " + error.message);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      addTodo();
    }
  };

  const filteredTodos = todos.filter((todo) => {
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
            <Button onClick={addTodo} className="h-10 px-4">
              <Plus className="mr-2 h-4 w-4" /> Add
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[140px]">
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
                    "w-[240px] justify-start text-left font-normal",
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
              <ToggleGroupItem value="all" size="sm" aria-label="Show all todos">All</ToggleGroupItem>
              <ToggleGroupItem value="active" size="sm" aria-label="Show active todos">Active</ToggleGroupItem>
              <ToggleGroupItem value="completed" size="sm" aria-label="Show completed todos">Done</ToggleGroupItem>
            </ToggleGroup>
        </div>

        {/* Todo List */}
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredTodos.length === 0 && todos.length === 0 ? (
          <p className="text-center text-muted-foreground text-lg py-8">No todos yet! Add one above.</p>
        ) : filteredTodos.length === 0 ? (
          <p className="text-center text-muted-foreground text-lg py-8">No matching todos found.</p>
        ) : (
          <ScrollArea className="h-[400px] w-full rounded-md border">
            <div>
              {filteredTodos.map((todo) => (
                <TodoItem
                  key={todo.id}
                  id={todo.id}
                  text={todo.text}
                  completed={todo.completed}
                  dueDate={todo.due_date}
                  category={todo.category}
                  onToggle={toggleTodo}
                  onDelete={deleteTodo}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter className="flex justify-end p-4 border-t">
        <Button
          onClick={clearCompleted}
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          disabled={!todos.some(todo => todo.completed)}
        >
          Clear Completed
        </Button>
      </CardFooter>
    </Card>
  );
};

export default TodoList;