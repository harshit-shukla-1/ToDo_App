"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Archive, CalendarIcon, CheckCircle2 } from "lucide-react";
import { format, subMonths } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: string;
  due_date: string | null;
  created_at: string;
  priority?: string;
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
      const sixMonthsAgo = subMonths(new Date(), 6).toISOString();
      
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("completed", true)
        .gte("created_at", sixMonthsAgo)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setTodos(data || []);
    } catch (error: any) {
      showError("Error fetching archives: " + error.message);
    } finally {
      setLoading(false);
    }
  };

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
            <p className="text-sm text-muted-foreground">Completed tasks from the last 6 months</p>
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
            <p className="text-xs mt-1">Complete some tasks to see them here!</p>
          </div>
        ) : (
          <div className="grid gap-3 pb-20 md:pb-4">
            {todos.map((todo) => (
              <Card key={todo.id} className="opacity-80 hover:opacity-100 transition-opacity">
                <CardContent className="p-3 md:p-4 flex items-center gap-3">
                  <div className="text-green-500 shrink-0">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium break-words line-clamp-2 line-through text-muted-foreground">
                        {todo.text}
                      </p>
                      {todo.priority && todo.priority !== 'medium' && (
                         <Badge variant="outline" className={cn("text-[9px] h-4 px-1 shrink-0", getPriorityColor(todo.priority))}>
                           {todo.priority}
                         </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground flex-wrap">
                      <Badge variant="secondary" className="text-[10px] px-1.5 h-5 shrink-0">
                        {todo.category}
                      </Badge>
                      <span className="flex items-center gap-1 text-[10px] shrink-0">
                        <CalendarIcon className="h-3 w-3" />
                        Completed on {format(new Date(todo.created_at), "MMM d")}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Archives;