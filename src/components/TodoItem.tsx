"use client";

import React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2, CalendarIcon, Share2, Users, Archive, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface TodoItemProps {
  id: string;
  text: string;
  completed: boolean;
  dueDate?: string | null;
  category?: string;
  isShared?: boolean;
  isTeam?: boolean;
  isOwner?: boolean;
  // If true, shows restore button instead of archive
  isArchived?: boolean; 
  onToggle: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => void;
  onShare?: (id: string) => void;
  onArchive?: (id: string) => void;
  onRestore?: (id: string) => void;
}

const TodoItem: React.FC<TodoItemProps> = ({
  id,
  text,
  completed,
  dueDate,
  category,
  isShared,
  isTeam,
  isOwner = true,
  isArchived = false,
  onToggle,
  onDelete,
  onShare,
  onArchive,
  onRestore
}) => {
  return (
    <div className="flex items-center justify-between p-4 border-b last:border-b-0 group hover:bg-muted/50 transition-colors gap-3">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Checkbox
          id={`todo-${id}`}
          checked={completed}
          onCheckedChange={() => onToggle(id, completed)}
          className="peer h-5 w-5 shrink-0"
          disabled={isArchived} // Disable toggling if archived
        />
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Label
              htmlFor={`todo-${id}`}
              className={cn(
                "text-base font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 break-words line-clamp-2",
                completed && "line-through text-muted-foreground",
              )}
            >
              {text}
            </Label>
            {isTeam && (
               <Badge variant="outline" className="text-[9px] h-4 px-1 text-purple-600 border-purple-200 bg-purple-50 dark:bg-purple-900/20 shrink-0 gap-1">
                  <Users className="h-3 w-3" /> Team
               </Badge>
            )}
            {isShared && !isTeam && (
               <Badge variant="outline" className="text-[9px] h-4 px-1 text-blue-500 border-blue-200 shrink-0">Shared</Badge>
            )}
            {isArchived && (
               <Badge variant="outline" className="text-[9px] h-4 px-1 text-gray-500 border-gray-300 bg-gray-100 shrink-0">Archived</Badge>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
            {category && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5 shrink-0">
                {category}
              </Badge>
            )}
            {dueDate && (
              <span className="flex items-center gap-1 shrink-0">
                <CalendarIcon className="h-3 w-3" />
                {format(new Date(dueDate), "MMM d, p")}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {onRestore && isArchived && (
           <Button
             variant="ghost"
             size="icon"
             onClick={() => onRestore(id)}
             aria-label="Restore todo"
             className="text-blue-500 hover:text-blue-600 hover:bg-blue-50"
           >
             <RotateCcw className="h-4 w-4" />
           </Button>
        )}
        
        {onArchive && !isArchived && isOwner && (
           <Button
             variant="ghost"
             size="icon"
             onClick={() => onArchive(id)}
             aria-label="Archive todo"
             className="text-muted-foreground hover:text-orange-500 hover:bg-orange-50 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
           >
             <Archive className="h-4 w-4" />
           </Button>
        )}

        {onShare && isOwner && !isArchived && (
           <Button
            variant="ghost"
            size="icon"
            onClick={() => onShare(id)}
            aria-label="Share todo"
            className="text-muted-foreground md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            <Share2 className="h-4 w-4" />
          </Button>
        )}
        
        {isOwner && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onDelete(id)}
            aria-label="Delete todo"
            className="text-destructive md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-5 w-5" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default TodoItem;