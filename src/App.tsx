import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createSyncStoragePersister } from "@tanstack/query-sync-storage-persister";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Todos from "./pages/Todos";
import TodoEditor from "./pages/TodoEditor";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import PublicProfile from "./pages/PublicProfile";
import AuthCallback from "./pages/AuthCallback";
import NotFound from "./pages/NotFound";
import Messages from "./pages/Messages";
import { SessionContextProvider, useSession } from "./integrations/supabase/auth";
import { ThemeProvider } from "./components/ThemeProvider";
import Layout from "./components/Layout";
import React from "react";
import NotificationManager from "./components/NotificationManager";

// Configure Persistence with LocalStorage (or IDB if needed, but localStorage is simple for this scale)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
    },
  },
});

const persister = createSyncStoragePersister({
  storage: window.localStorage,
});

// ProtectedRoute component to guard routes
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, isLoading } = useSession();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading authentication...</div>;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

const AppContent = () => (
  <BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/todos"
        element={
          <ProtectedRoute>
            <Todos />
          </ProtectedRoute>
        }
      />
      <Route
        path="/todos/new"
        element={
          <ProtectedRoute>
            <TodoEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/todos/:id"
        element={
          <ProtectedRoute>
            <TodoEditor />
          </ProtectedRoute>
        }
      />
      <Route
        path="/messages"
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      
      {/* Public Profile Routes */}
      <Route path="/@:username" element={<PublicProfile />} />
      <Route path="/u/:username" element={<PublicProfile />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <PersistQueryClientProvider 
    client={queryClient} 
    persistOptions={{ persister }}
  >
    <ThemeProvider defaultTheme="system" storageKey="mazda-todo-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <SessionContextProvider>
          <NotificationManager />
          <AppContent />
        </SessionContextProvider>
      </TooltipProvider>
    </ThemeProvider>
  </PersistQueryClientProvider>
);

export default App;