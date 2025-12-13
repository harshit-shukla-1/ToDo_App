"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface TodoItemProps {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string | null;
  category?: string;
  onToggle: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({
  id,
  text,
  completed,
  dueDate,
  category,
  onToggle,
  onDelete,
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0 group hover:bg-muted/50 transition-colors">
      <div className="flex items-center space-x-3 flex-1 overflow-hidden">
        <Checkbox
          id={`todo-${id}`}
          checked={completed}
          onCheckedChange={() => onToggle(id, completed)}
          className="peer h-5 w-5 shrink-0"
        />
        <div className="flex flex-col gap-1 overflow-hidden">
          <Label
            htmlFor={`todo-${id}`}
            className={cn(
              "text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 truncate",
              completed && "line-through text-muted-foreground",
            )}
          >
            {text}
          </Label>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {category && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                {category}
              </Badge>
            )}
            {dueDate && (
              <span className="flex items-center gap-1">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(dueDate), "PPP")}
              </span>
            )}
          </div>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(id)}
        aria-label="Delete todo"
        className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
};

export default TodoItem;