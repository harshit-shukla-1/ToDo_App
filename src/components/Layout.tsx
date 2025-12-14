"use client";

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListTodo,
  Settings,
  LogOut,
  User,
  MessageSquare,
  Sun,
  Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useTheme } from "@/components/ThemeProvider";
import BottomNav from "./BottomNav";
import NotificationBell from "./NotificationBell";

interface LayoutProps {
  children: React.ReactNode;
}

// Export NavContent so BottomNav can reuse it for the drawer
export const NavContent = ({ setIsMobileOpen }: { setIsMobileOpen?: (open: boolean) => void }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login");
    } catch (error: any) {
      showError(error.message);
    }
  };

  const close = () => {
    if (setIsMobileOpen) setIsMobileOpen(false);
  };

  return (
    <div className="flex flex-col h-full py-4 bg-card">
      <div className="px-6 mb-8">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Mazda Todo
        </h1>
      </div>
      <div className="flex-1 px-4 space-y-2">
        <Link to="/">
          <Button
            variant={location.pathname === "/" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={close}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link to="/todos">
          <Button
            variant={location.pathname.startsWith("/todos") ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={close}
          >
            <ListTodo className="mr-2 h-4 w-4" />
            My Todos
          </Button>
        </Link>
        <Link to="/messages">
          <Button
            variant={location.pathname.startsWith("/messages") ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={close}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            Messages
          </Button>
        </Link>
        <Link to="/profile">
          <Button
            variant={location.pathname === "/profile" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={close}
          >
            <User className="mr-2 h-4 w-4" />
            Profile
          </Button>
        </Link>
        <Link to="/settings">
          <Button
            variant={location.pathname === "/settings" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={close}
          >
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
        </Link>
      </div>
      <div className="px-4 mt-auto">
        <Button
          variant="outline"
          className="w-full justify-start text-destructive hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  
  // Messages page handles its own layout/scrolling
  const isMessagesPage = location.pathname.startsWith("/messages");

  // Helper to determine page title
  const getPageTitle = (pathname: string) => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/todos")) return "My Todos";
    if (pathname.startsWith("/messages")) return "Messages";
    if (pathname === "/profile") return "Profile";
    if (pathname === "/settings") return "Settings";
    return "Mazda Todo";
  };

  return (
    <div className="h-screen w-full bg-background flex overflow-hidden">
      {/* Desktop Sidebar - Fixed Width */}
      <div className="hidden md:block w-64 border-r bg-card h-full flex-none">
        <NavContent />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Header Bar - Fixed Height */}
        <header className="flex-none sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 h-16 flex items-center justify-between gap-2">
            <div className="font-semibold text-lg md:hidden">
              {getPageTitle(location.pathname)}
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="rounded-full"
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
        </header>

        {/* Main Body - Scrollable Area */}
        <main className={cn(
          "flex-1 relative min-h-0", // min-h-0 is crucial for nested flex scrolling
          isMessagesPage ? "overflow-hidden flex flex-col" : "overflow-y-auto"
        )}>
          {isMessagesPage ? (
            // For messages, we pass full height down and let component handle parts
            <div className="flex-1 flex flex-col h-full w-full pb-[64px] md:pb-0">{children}</div>
          ) : (
            // For other pages, we pad and allow scroll
             <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto">{children}</div>
          )}
        </main>

        {/* Mobile Bottom Navigation */}
        <BottomNav isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      </div>
    </div>
  );
};

export default Layout;