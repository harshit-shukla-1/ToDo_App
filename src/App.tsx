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
import Connections from "./pages/Connections";
import { SessionContextProvider, useSession } from "./integrations/supabase/auth";
import { ThemeProvider } from "./components/ThemeProvider";
import Layout from "./components/Layout";
import React from "react";
import NotificationManager from "./components/NotificationManager";
import ThemeBanner from "./components/ThemeBanner";
import BackgroundDecorations from "./components/BackgroundDecorations";
import { useIsMobile } from "@/hooks/use-mobile";

// Configure Persistence with LocalStorage
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

// Wrapper to handle responsive toaster positioning
const AppToaster = () => {
  const isMobile = useIsMobile();
  return (
    <>
      <Toaster />
      <Sonner position={isMobile ? "top-center" : "bottom-right"} />
    </>
  );
};

const AppContent = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <div className="relative min-h-screen flex flex-col">
      <ThemeBanner />
      <BackgroundDecorations />
      <div className="flex-1 relative z-10">
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
            path="/messages/:id"
            element={
              <ProtectedRoute>
                <Messages />
              </ProtectedRoute>
            }
          />
          <Route
            path="/connections"
            element={
              <ProtectedRoute>
                <Connections />
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
          
          <Route path="/@:username" element={<PublicProfile />} />
          <Route path="/u/:username" element={<PublicProfile />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
    </div>
  </BrowserRouter>
);

const App = () => (
  <PersistQueryClientProvider 
    client={queryClient} 
    persistOptions={{ persister }}
  >
    <SessionContextProvider>
      <ThemeProvider defaultMode="system" defaultColor="default">
        <TooltipProvider>
          <AppToaster />
          <NotificationManager />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </SessionContextProvider>
  </PersistQueryClientProvider>
);

export default App;