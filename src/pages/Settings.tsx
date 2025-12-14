"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Bell, Moon, Sun, Lock, Loader2, Palette, Gift, Snowflake } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";

const Settings = () => {
  const { setTheme, theme, setStyle, style } = useTheme();
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if notifications are supported and permitted
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);

  const handleNotificationToggle = async () => {
    if (!("Notification" in window)) {
      showError("Notifications are not supported in this browser.");
      return;
    }

    if (Notification.permission === "granted") {
      // We can't actually revoke permissions via JS, just update state
      showSuccess("Notifications are enabled.");
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        showSuccess("Notifications enabled!");
        new Notification("Mazda Todo", { body: "Notifications are now active!" });
      }
    } else {
      showError("Notifications are blocked. Please enable them in browser settings.");
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      showError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.auth.updateUser({ password: password });
      
      if (error) throw error;
      
      showSuccess("Password updated successfully");
      setPassword("");
    } catch (error: any) {
      showError("Error updating password: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold tracking-tight">Settings</h2>

      <Card className="card-hover-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" /> Appearance
          </CardTitle>
          <CardDescription>
            Customize the look and feel of your app
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Theme Mode Selection */}
          <div className="space-y-3">
             <Label className="text-base font-medium">Theme Mode</Label>
             <div className="grid grid-cols-3 gap-2">
                <Button 
                  variant={theme === "light" ? "default" : "outline"} 
                  onClick={() => setTheme("light")}
                  className="w-full"
                >
                  <Sun className="mr-2 h-4 w-4" /> Light
                </Button>
                <Button 
                  variant={theme === "dark" ? "default" : "outline"} 
                  onClick={() => setTheme("dark")}
                  className="w-full"
                >
                  <Moon className="mr-2 h-4 w-4" /> Dark
                </Button>
                <Button 
                  variant={theme === "system" ? "default" : "outline"} 
                  onClick={() => setTheme("system")}
                  className="w-full"
                >
                  <span className="mr-2 text-xs">🖥️</span> System
                </Button>
             </div>
          </div>

          <div className="border-t pt-4"></div>

          {/* Theme Style Selection */}
          <div className="space-y-3">
             <Label className="text-base font-medium">Visual Style</Label>
             <RadioGroup 
                value={style} 
                onValueChange={(val) => setStyle(val as any)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="default" id="style-default" className="peer sr-only" />
                  <Label
                    htmlFor="style-default"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:text-primary cursor-pointer h-full"
                  >
                    <div className="mb-3 rounded-full bg-slate-200 dark:bg-slate-800 p-2">
                      <Palette className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">Classic</div>
                      <div className="text-xs text-muted-foreground mt-1">Clean, minimalist standard interface</div>
                    </div>
                  </Label>
                </div>

                <div>
                  <RadioGroupItem value="christmas" id="style-christmas" className="peer sr-only" />
                  <Label
                    htmlFor="style-christmas"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-red-500 peer-data-[state=checked]:text-red-500 cursor-pointer h-full relative overflow-hidden"
                  >
                     <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 via-green-500 to-red-500" />
                    <div className="mb-3 rounded-full bg-red-100 dark:bg-red-900/30 p-2 text-red-500">
                      <Gift className="h-6 w-6" />
                    </div>
                    <div className="text-center">
                      <div className="font-semibold flex items-center justify-center gap-1">
                        Christmas <Snowflake className="h-3 w-3 text-blue-400 animate-spin-slow" />
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">Festive colors, animations & cheer</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
          </div>

        </CardContent>
      </Card>

      <Card className="card-hover-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" /> Notifications
          </CardTitle>
          <CardDescription>
            Manage your notification preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Push Notifications</Label>
              <div className="text-sm text-muted-foreground">
                Receive alerts about upcoming todos
              </div>
            </div>
            <Switch
              checked={notificationsEnabled}
              onCheckedChange={handleNotificationToggle}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="card-hover-effect">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" /> Security
          </CardTitle>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter new password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Settings;