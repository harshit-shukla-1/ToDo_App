import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Todos from "./pages/Todos";
import TodoEditor from "./pages/TodoEditor";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import { SessionContextProvider, useSession } from "./integrations/supabase/auth";
import { ThemeProvider } from "./components/ThemeProvider";
import Layout from "./components/Layout";
import React from "react";
import NotificationManager from "./components/NotificationManager";

const queryClient = new QueryClient();

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
        path="/settings"
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        }
      />
      {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  </BrowserRouter>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
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
  </QueryClientProvider>
);

export default App;