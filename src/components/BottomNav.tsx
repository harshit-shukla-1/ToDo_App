"use client";

import React from "react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Menu,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { NavContent } from "./Layout"; // We will export this from Layout

interface BottomNavProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const path = location.pathname;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur z-50 pb-safe">
      <div className="flex items-center justify-around h-16 px-2">
        <Link to="/" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          <Button variant="ghost" size="icon" className={cn("h-10 w-10", path === "/" && "bg-secondary text-primary")}>
            <LayoutDashboard className="h-5 w-5" />
          </Button>
          <span className="text-[10px] font-medium text-muted-foreground">Home</span>
        </Link>
        
        <Link to="/todos" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          <Button variant="ghost" size="icon" className={cn("h-10 w-10", path.startsWith("/todos") && "bg-secondary text-primary")}>
            <ListTodo className="h-5 w-5" />
          </Button>
          <span className="text-[10px] font-medium text-muted-foreground">Todos</span>
        </Link>

        <Link to="/messages" className="flex flex-col items-center justify-center w-full h-full space-y-1">
          <Button variant="ghost" size="icon" className={cn("h-10 w-10", path.startsWith("/messages") && "bg-secondary text-primary")}>
            <MessageSquare className="h-5 w-5" />
          </Button>
          <span className="text-[10px] font-medium text-muted-foreground">Chat</span>
        </Link>

        {/* Drawer Toggle */}
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <div className="flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer">
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Menu className="h-5 w-5" />
              </Button>
              <span className="text-[10px] font-medium text-muted-foreground">Menu</span>
            </div>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Mobile navigation menu
            </SheetDescription>
            <NavContent setIsMobileOpen={setIsMobileOpen} />
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
};

export default BottomNav;