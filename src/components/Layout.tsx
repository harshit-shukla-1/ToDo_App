"use client";

import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ListTodo,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useTheme } from "@/components/ThemeProvider";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/login");
    } catch (error: any) {
      showError(error.message);
    }
  };

  const NavContent = () => (
    <div className="flex flex-col h-full py-4">
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
            onClick={() => setIsMobileOpen(false)}
          >
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Dashboard
          </Button>
        </Link>
        <Link to="/todos">
          <Button
            variant={
              location.pathname.startsWith("/todos") ? "secondary" : "ghost"
            }
            className="w-full justify-start"
            onClick={() => setIsMobileOpen(false)}
          >
            <ListTodo className="mr-2 h-4 w-4" />
            My Todos
          </Button>
        </Link>
        <Link to="/settings">
          <Button
            variant={location.pathname === "/settings" ? "secondary" : "ghost"}
            className="w-full justify-start"
            onClick={() => setIsMobileOpen(false)}
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

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 border-r bg-card">
        <NavContent />
      </div>

      {/* Mobile Sidebar */}
      <div className="md:hidden absolute top-4 left-4 z-50">
        <Sheet open={isMobileOpen} onOpenChange={setIsMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon">
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden relative">
        {/* Theme Toggle Button */}
        <div className="absolute top-4 right-4 z-50">
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

        <main className="flex-1 overflow-y-auto p-4 md:p-8 pt-16 md:pt-8">
          <div className="max-w-5xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Layout;