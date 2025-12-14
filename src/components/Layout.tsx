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
  Moon,
  Users
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { showError } from "@/utils/toast";
import { useTheme } from "@/components/ThemeProvider";
import BottomNav from "./BottomNav";
import NotificationBell from "./NotificationBell";
import ProfileCompletionBanner from "./ProfileCompletionBanner";

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
  const { mode, setMode } = useTheme();
  const location = useLocation();
  
  const isMessagesPage = location.pathname.startsWith("/messages");
  const isTodoListPage = location.pathname === "/todos";
  
  // Pages that manage their own scroll containers (fixed layout)
  // This prevents double scrollbars and allows for fixed headers/footers within the page component
  const isFixedLayout = isMessagesPage || isTodoListPage;

  // Helper to determine page title
  const getPageTitle = (pathname: string) => {
    if (pathname === "/") return "Dashboard";
    if (pathname.startsWith("/todos")) return "My Todos";
    if (pathname.startsWith("/messages")) return "Messages";
    if (pathname.startsWith("/connections")) return "Connections";
    if (pathname === "/profile") return "Profile";
    if (pathname === "/settings") return "Settings";
    return "Mazda Todo";
  };

  return (
    <div className="fixed inset-0 w-full flex overflow-hidden bg-background">
      {/* Desktop Sidebar - Fixed Width */}
      <div className="hidden md:block w-64 border-r bg-card h-full flex-none">
        <NavContent />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Header Bar - Fixed Height */}
        <header className="flex-none w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 h-16 flex items-center justify-between gap-2 z-40">
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

        {/* Profile Completion Banner */}
        <ProfileCompletionBanner />

        {/* Main Body - Scrollable Area */}
        <main className={cn(
          "flex-1 relative min-h-0", // min-h-0 is crucial for nested flex scrolling
          isFixedLayout ? "overflow-hidden flex flex-col" : "overflow-y-auto"
        )}>
          {isFixedLayout ? (
            // For fixed layout pages (Messages, Todo List), we pass full height down
            // The pages themselves handle scrolling areas
            <div className={cn(
              "flex-1 flex flex-col h-full w-full",
              // Mobile nav padding
              "pb-[64px] md:pb-0", 
              // Container constraints for Todos, but full width for Messages
              isTodoListPage && "p-4 md:p-8 max-w-5xl mx-auto"
            )}>
              {children}
            </div>
          ) : (
            // For other pages, we provide standard scrolling container with padding
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
</dyad-file>

<dyad-write path="src/globals.css" description="Ensuring root elements have full height to support the fixed layout.">
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%; /* Default Zinc */
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
    --radius: 0.5rem;
    --sidebar-background: 0 0% 98%;
    --sidebar-foreground: 240 5.3% 26.1%;
    --sidebar-primary: 240 5.9% 10%;
    --sidebar-primary-foreground: 0 0% 98%;
    --sidebar-accent: 240 4.8% 95.9%;
    --sidebar-accent-foreground: 240 5.9% 10%;
    --sidebar-border: 220 13% 91%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 0 0% 100%;
    --card: 222.2 84% 4.9%;
    --card-foreground: 0 0% 100%;
    --popover: 222.2 84% 4.9%;
    --popover-foreground: 0 0% 100%;
    --primary: 210 40% 98%;
    --primary-foreground: 222.2 47.4% 11.2%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 0 0% 100%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 75.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 0 0% 100%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 0 0% 100%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 212.7 26.8% 83.9%;
    --sidebar-background: 240 5.9% 10%;
    --sidebar-foreground: 240 4.8% 95.9%;
    --sidebar-primary: 224.3 76.3% 48%;
    --sidebar-primary-foreground: 0 0% 100%;
    --sidebar-accent: 240 3.7% 15.9%;
    --sidebar-accent-foreground: 240 4.8% 95.9%;
    --sidebar-border: 240 3.7% 15.9%;
    --sidebar-ring: 217.2 91.2% 59.8%;
  }

  /* --- Color Themes --- */

  /* Ocean (Blue) */
  .theme-ocean {
    --primary: 221.2 83.2% 53.3%; /* Blue 600 */
    --primary-foreground: 210 40% 98%;
    --ring: 221.2 83.2% 53.3%;
  }
  .dark .theme-ocean {
    --primary: 217.2 91.2% 59.8%; /* Blue 500 */
    --primary-foreground: 222.2 47.4% 11.2%;
  }

  /* Forest (Green) */
  .theme-forest {
    --primary: 142.1 76.2% 36.3%; /* Green 600 */
    --primary-foreground: 355.7 100% 97.3%;
    --ring: 142.1 76.2% 36.3%;
  }
  .dark .theme-forest {
    --primary: 142.1 70.6% 45.3%; /* Green 500 */
    --primary-foreground: 144.9 80.4% 10%;
  }

  /* Rose (Pink) */
  .theme-rose {
    --primary: 346.8 77.2% 49.8%; /* Rose 600 */
    --primary-foreground: 355.7 100% 97.3%;
    --ring: 346.8 77.2% 49.8%;
  }
  .dark .theme-rose {
    --primary: 343.4 81.2% 58.1%; /* Rose 500 */
    --primary-foreground: 355.7 100% 97.3%;
  }

  /* Christmas Special (Forces its own look mostly) */
  .theme-christmas {
    --background: 220 30% 15%; /* Dark winter blue/green */
    --foreground: 0 0% 98%;
    --card: 220 25% 20%;
    --card-foreground: 0 0% 98%;
    --popover: 220 25% 20%;
    --popover-foreground: 0 0% 98%;
    --primary: 350 80% 50%; /* Festive Red */
    --primary-foreground: 0 0% 100%;
    --secondary: 145 60% 35%; /* Christmas Green */
    --secondary-foreground: 0 0% 100%;
    --muted: 220 20% 25%;
    --muted-foreground: 220 10% 70%;
    --accent: 45 90% 60%; /* Gold */
    --accent-foreground: 220 30% 15%;
    --border: 220 20% 30%;
    --input: 220 20% 30%;
    --ring: 350 80% 50%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  html, body, #root {
    height: 100%;
    width: 100%;
    margin: 0;
    padding: 0;
    overflow: hidden; /* Let Layout handle scrolling */
  }
  body {
    @apply bg-background text-foreground;
  }
}