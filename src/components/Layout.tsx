"use client";

import React, { useEffect, useState } from "react";
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
  Moon,
  Users,
  Briefcase,
  Archive,
  FolderKanban,
  ShieldAlert
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useTheme } from "@/components/ThemeProvider";
import BottomNav from "./BottomNav";
import NotificationBell from "./NotificationBell";
import ProfileCompletionBanner from "./ProfileCompletionBanner";
import UsernameSetupDialog from "./UsernameSetupDialog";
import { useSession } from "@/integrations/supabase/auth";

interface LayoutProps {
  children: React.ReactNode;
}

export const NavContent = ({ setIsMobileOpen }: { setIsMobileOpen?: (open: boolean) => void }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSession();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      const checkAdmin = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        setIsAdmin(data?.role === 'admin');
      };
      checkAdmin();
    }
  }, [user]);

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
      <div className="px-6 mb-6 flex-none">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Mazda Todo
        </h1>
      </div>
      <div className="flex-1 px-4 space-y-2 overflow-y-auto no-scrollbar">
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
            variant={location.pathname === "/todos" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={close}
          >
            <ListTodo className="mr-2 h-4 w-4" />
            My Todos
          </Button>
        </Link>
        <Link to="/projects">
          <Button
            variant={location.pathname.startsWith("/projects") ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={close}
          >
            <FolderKanban className="mr-2 h-4 w-4" />
            Projects
          </Button>
        </Link>
        <Link to="/archives">
          <Button
            variant={location.pathname === "/archives" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={close}
          >
            <Archive className="mr-2 h-4 w-4" />
            Archives
          </Button>
        </Link>
        <Link to="/teams">
           <Button
            variant={location.pathname.startsWith("/teams") ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={close}
          >
            <Briefcase className="mr-2 h-4 w-4" />
            Teams
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
        <Link to="/connections">
          <Button
            variant={location.pathname.startsWith("/connections") ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={close}
          >
            <Users className="mr-2 h-4 w-4" />
            Connections
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
        
        {isAdmin && (
          <div className="pt-4 mt-4 border-t border-border/50">
             <Link to="/admin">
              <Button
                variant={location.pathname === "/admin" ? "secondary" : "ghost"}
                className="w-full justify-start text-primary"
                onClick={close}
              >
                <ShieldAlert className="mr-2 h-4 w-4" />
                Admin Dashboard
              </Button>
            </Link>
          </div>
        )}
      </div>
      <div className="px-4 mt-auto pt-4 flex-none border-t border-border/50 mx-4 -mx-4">
        <Button
          variant="ghost"
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
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
  const { mode, setMode } = useTheme();
  const location = useLocation();
  
  const isMessagesPage = location.pathname.startsWith("/messages");
  const isTodoListPage = location.pathname === "/todos";
  const isArchivesPage = location.pathname === "/archives";
  const isFixedLayout = isMessagesPage || isTodoListPage || isArchivesPage;

  const getPageTitle = (pathname: string) => {
    if (pathname === "/") return "Dashboard";
    if (pathname === "/todos") return "My Todos";
    if (pathname === "/projects") return "Projects";
    if (pathname === "/archives") return "Archives";
    if (pathname.startsWith("/messages")) return "Messages";
    if (pathname.startsWith("/connections")) return "Connections";
    if (pathname.startsWith("/teams")) return "Teams";
    if (pathname === "/profile") return "Profile";
    if (pathname === "/settings") return "Settings";
    if (pathname === "/admin") return "Admin Control";
    return "Mazda Todo";
  };

  return (
    <div className="absolute inset-0 w-full flex overflow-hidden">
      <UsernameSetupDialog />
      <aside className="hidden md:block w-64 border-r bg-card h-full flex-none z-30">
        <NavContent />
      </aside>

      <div className="flex-1 flex flex-col h-full relative min-w-0">
        <header className="flex-none sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 h-16 flex items-center justify-between gap-2">
            <div className="font-semibold text-lg md:hidden">
              {getPageTitle(location.pathname)}
            </div>
            
            <div className="flex items-center gap-2 ml-auto">
              <NotificationBell />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMode(mode === "dark" ? "light" : "dark")}
                className="rounded-full"
              >
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </div>
        </header>

        <div className="flex-none z-30">
          <ProfileCompletionBanner />
        </div>

        <main className={cn(
          "flex-1 relative min-h-0 w-full",
          isFixedLayout ? "overflow-hidden flex flex-col" : "overflow-y-auto"
        )}>
          {isFixedLayout ? (
            <div className={cn(
              "flex-1 flex flex-col w-full min-h-0 md:pb-0 p-4 md:p-8 max-w-5xl mx-auto",
              "pb-[80px]" // Explicit padding for fixed layout on mobile to clear bottom nav
            )}>
              {children}
            </div>
          ) : (
             <div className="p-4 md:p-8 pb-24 md:pb-8 max-w-5xl mx-auto">{children}</div>
          )}
        </main>

        <BottomNav isMobileOpen={isMobileOpen} setIsMobileOpen={setIsMobileOpen} />
      </div>
    </div>
  );
};

export default Layout;