"use client";

import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListTodo,
  MessageSquare,
  Menu,
  User,
  Settings,
  Users,
  Grid,
  LogOut,
  Briefcase,
  Archive
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useTheme, NavItemKey } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { NavContent } from "./Layout";

interface BottomNavProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const { mobileNavItems, mobileMenuType } = useTheme();
  const [open, setOpen] = useState(false);

  const getIcon = (key: NavItemKey) => {
    switch (key) {
      case 'dashboard': return LayoutDashboard;
      case 'todos': return ListTodo;
      case 'archives': return Archive;
      case 'teams': return Briefcase;
      case 'messages': return MessageSquare;
      case 'connections': return Users;
      case 'profile': return User;
      case 'settings': return Settings;
      default: return Grid;
    }
  };

  const getLabel = (key: NavItemKey) => {
    return key.charAt(0).toUpperCase() + key.slice(1);
  };

  const getPath = (key: NavItemKey) => {
    return key === 'dashboard' ? '/' : `/${key}`;
  };

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login");
    } catch (error: any) {
      showError(error.message);
    }
  };

  const MenuButton = (
    <div className="flex flex-col items-center justify-center w-full h-full space-y-1 cursor-pointer">
      <Button variant="ghost" size="icon" className={cn("h-10 w-10", open && "bg-secondary")}>
        <Menu className="h-5 w-5" />
      </Button>
      <span className="text-[10px] font-medium text-muted-foreground">Menu</span>
    </div>
  );

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

        {/* Conditional Menu: Popover or Drawer */}
        {mobileMenuType === 'drawer' ? (
           <Drawer open={open} onOpenChange={setOpen}>
             <DrawerTrigger asChild>
               {MenuButton}
             </DrawerTrigger>
             <DrawerContent>
               <div className="p-4 pb-8">
                 <NavContent setIsMobileOpen={setOpen} />
               </div>
             </DrawerContent>
           </Drawer>
        ) : (
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              {MenuButton}
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 mb-2 mr-2" align="end" side="top">
              <div className="grid gap-1">
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground mb-1">
                  Shortcuts
                </div>
                {mobileNavItems.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    No items selected.<br/>Go to Settings to configure.
                  </div>
                ) : (
                  mobileNavItems.map((key) => {
                    const Icon = getIcon(key);
                    const itemPath = getPath(key);
                    const isActive = path === itemPath || (itemPath !== '/' && path.startsWith(itemPath));
                    
                    return (
                      <Link 
                        key={key} 
                        to={itemPath} 
                        onClick={() => setOpen(false)}
                        className={cn(
                          "flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors",
                          isActive && "bg-secondary text-primary"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        {getLabel(key)}
                      </Link>
                    );
                  })
                )}
                
                {/* Fallback Settings Link */}
                {!mobileNavItems.includes('settings') && (
                  <>
                    <div className="h-px bg-border my-1" />
                    <Link 
                      to="/settings" 
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md hover:bg-muted transition-colors"
                    >
                      <Settings className="h-4 w-4" />
                      Settings
                    </Link>
                  </>
                )}

                {/* Logout Button (Fixed) */}
                <div className="h-px bg-border my-1" />
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm font-medium rounded-md hover:bg-destructive/10 text-destructive transition-colors text-left"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </button>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};

export default BottomNav;