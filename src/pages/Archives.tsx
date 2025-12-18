"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Archive, RotateCcw } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import TodoItem from "@/components/TodoItem";
import { Button } from "@/components/ui/button";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: string;
  due_date: string | null;
  created_at: string;
  priority?: string;
  archived?: boolean;
  user_id: string;
  team_id?: string;
}

const Archives = () => {
  const { user } = useSession();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchArchivedTodos();
    }
  }, [user]);

  const fetchArchivedTodos = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("archived", true)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error: any) {
      showError("Error fetching archives: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (id: string) => {
    try {
      const { error } = await supabase
        .from("todos")
        .update({ archived: false })
        .eq("id", id);

      if (error) throw error;
      
      setTodos(prev => prev.filter(t => t.id !== id));
      showSuccess("Todo restored to list");
    } catch (error: any) {
      showError("Failed to restore: " + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
       const { error } = await supabase.from("todos").delete().eq("id", id);
       if (error) throw error;
       setTodos(prev => prev.filter(t => t.id !== id));
       showSuccess("Todo permanently deleted");
    } catch (error: any) {
       showError("Failed to delete: " + error.message);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Header */}
      <div className="flex-none space-y-2 pb-4 border-b">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
            <Archive className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Archives</h2>
            <p className="text-sm text-muted-foreground">Manage your archived tasks</p>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground bg-muted/10 rounded-lg border border-dashed">
            <Archive className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No archived todos found.</p>
            <p className="text-xs mt-1">Archive tasks from your todo list to clean up.</p>
          </div>
        ) : (
          <div className="flex flex-col border rounded-md">
            {todos.map((todo) => {
               const isOwner = todo.user_id === user?.id;
               
               return (
                <TodoItem 
                  key={todo.id}
                  id={todo.id}
                  text={todo.text}
                  completed={todo.completed}
                  dueDate={todo.due_date}
                  category={todo.category}
                  isArchived={true}
                  isOwner={isOwner}
                  onToggle={() => {}} // Disabled in archive
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Archives;