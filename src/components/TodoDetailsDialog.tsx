"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Tag, AlertCircle, CheckCircle2, Circle } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  category: string;
  due_date: string | null;
  priority?: string;
  created_at: string;
}

interface TodoDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todo: Todo | null;
  onEdit: (id: string) => void;
}

const TodoDetailsDialog: React.FC<TodoDetailsDialogProps> = ({ 
  open, 
  onOpenChange, 
  todo,
  onEdit 
}) => {
  if (!todo) return null;

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'extreme': return "text-red-700 border-red-300 bg-red-100 dark:bg-red-900/40 dark:text-red-200";
      case 'high': return "text-red-500 border-red-200 bg-red-50 dark:bg-red-900/20";
      case 'normal': 
      case 'medium': return "text-orange-500 border-orange-200 bg-orange-50 dark:bg-orange-900/20";
      case 'low': return "text-green-500 border-green-200 bg-green-50 dark:bg-green-900/20";
      default: return "text-gray-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-start justify-between gap-4">
            <span className="text-xl font-bold leading-tight mt-1">{todo.text}</span>
            <div className="shrink-0">
               {todo.completed ? (
                 <Badge variant="secondary" className="bg-green-100 text-green-800 hover:bg-green-100 flex items-center gap-1">
                   <CheckCircle2 className="h-3 w-3" /> Done
                 </Badge>
               ) : (
                 <Badge variant="secondary" className="flex items-center gap-1">
                   <Circle className="h-3 w-3" /> Active
                 </Badge>
               )}
            </div>
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Created on {format(new Date(todo.created_at), "PPP")}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="flex items-center gap-4 p-3 rounded-lg border bg-card/50">
             <div className="flex items-center gap-3 flex-1">
                <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Tag className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Category</p>
                  <p className="font-medium text-sm">{todo.category}</p>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-lg border bg-card/50">
             <div className="flex items-center gap-3 flex-1">
                <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Due Date</p>
                  <p className="font-medium text-sm">
                    {todo.due_date 
                      ? format(new Date(todo.due_date), "PPP 'at' p") 
                      : "No due date set"}
                  </p>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-4 p-3 rounded-lg border bg-card/50">
             <div className="flex items-center gap-3 flex-1">
                <div className={cn("h-8 w-8 rounded-full flex items-center justify-center border", getPriorityColor(todo.priority))}>
                  <AlertCircle className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Priority</p>
                  <p className="font-medium text-sm capitalize">{todo.priority || "Normal"}</p>
                </div>
             </div>
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
            Close
          </Button>
          <Button onClick={() => onEdit(todo.id)} className="flex-1 sm:flex-none">
            Edit Details
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TodoDetailsDialog;