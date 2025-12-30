"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shuffle } from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";

const UsernameSetupDialog = () => {
  const { user } = useSession();
  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (user) {
      checkUsername();
    }
  }, [user]);

  const checkUsername = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user?.id)
        .single();

      if (error) throw error;
      
      if (!data?.username) {
        setOpen(true);
      }
    } catch (err) {
      console.error("Error checking username:", err);
    } finally {
      setChecking(false);
    }
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(val);
  };

  const generateRandomUsername = () => {
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    setUsername(`user_${randomSuffix}`.toLowerCase());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (username.length < 3) {
      showError("Username must be at least 3 characters");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ 
          username: username.toLowerCase(),
          updated_at: new Date().toISOString()
        })
        .eq("id", user?.id);

      if (error) {
        if (error.code === '23505') {
          throw new Error("Username already taken. Please choose another.");
        }
        throw error;
      }

      showSuccess("Username set successfully!");
      setOpen(false);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (checking || !open) return null;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader>
          <DialogTitle>Setup Your Profile</DialogTitle>
          <DialogDescription>
            Choose a unique username to start chatting and sharing todos. 
            This cannot be changed later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-muted-foreground">@</span>
                <Input 
                  id="username" 
                  value={username} 
                  onChange={handleUsernameChange} 
                  className="pl-7"
                  placeholder="username"
                  required
                />
              </div>
              <Button type="button" variant="outline" size="icon" onClick={generateRandomUsername} title="Generate Random">
                <Shuffle className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={loading || username.length < 3}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Set Username
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default UsernameSetupDialog;