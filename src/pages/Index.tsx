"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import TodoList from "@/components/TodoList";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { showError } from "@/utils/toast";

const Index = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      navigate("/login");
    } catch (error: any) {
      showError(error.message);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4 relative">
      <div className="absolute top-4 right-4">
        <Button variant="outline" onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </Button>
      </div>
      <TodoList />
      <MadeWithDyad />
    </div>
  );
};

export default Index;