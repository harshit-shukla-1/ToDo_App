"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useTheme, ThemeColor, NavItemKey } from "@/components/ThemeProvider";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { 
  Bell, Moon, Sun, Lock, Loader2, Monitor, Palette, Droplets, Trees, Heart, Snowflake, 
  Menu, Check, PanelBottom, MousePointerClick
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const Settings = () => {
  const { 
    setMode, mode, 
    setColor, color, 
    mobileNavItems, setMobileNavItems,
    mobileMenuType, setMobileMenuType
  } = useTheme();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
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
      showSuccess("Notifications are enabled.");
    } else if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setNotificationsEnabled(true);
        showSuccess("Notifications enabled!");
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

  const toggleNavItem = (item: NavItemKey) => {
    if (mobileNavItems.includes(item)) {
      setMobileNavItems(mobileNavItems.filter(i => i !== item));
    } else {
      setMobileNavItems([...mobileNavItems, item]);
    }
  };

  const themes: { id: ThemeColor; name: string; icon: any; colorClass: string }[] = [
    { id: 'default', name: 'Default', icon: Palette, colorClass: 'bg-zinc-900' },
    { id: 'ocean', name: 'Ocean', icon: Droplets, colorClass: 'bg-blue-600' },
    { id: 'forest', name: 'Forest', icon: Trees, colorClass: 'bg-green-600' },
    { id: 'rose', name: 'Rose', icon: Heart, colorClass: 'bg-rose-600' },
    { id: 'christmas', name: 'Christmas', icon: Snowflake, colorClass: 'bg-gradient-to-br from-red-600 to-green-800' },
  ];

  const availableNavItems: { key: NavItemKey; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'todos', label: 'Todos' },
    { key: 'archives', label: 'Archives' },
    { key: 'teams', label: 'Teams' },
    { key: 'messages', label: 'Messages' },
    { key: 'connections', label: 'Connections' },
    { key: 'profile', label: 'Profile' },
    { key: 'settings', label: 'Settings' },
  ];

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div>
        <h2 className="text-3xl font-bold tracking-tight hidden md:block">Settings</h2>
        <p className="text-muted-foreground hidden md:block">Manage your account settings and preferences.</p>
        <p className="text-muted-foreground md:hidden mt-2">Manage your account settings and preferences.</p>
      </div>

      <div className="grid gap-6">
        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" /> Appearance
            </CardTitle>
            <CardDescription>
              Customize the look and feel of your application
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Color Theme Selection */}
            <div className="space-y-3">
              <Label className="text-base">Color Theme</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setColor(t.id)}
                    className={cn(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-lg border-2 transition-all hover:bg-accent",
                      color === t.id ? "border-primary bg-accent" : "border-transparent bg-card shadow-sm hover:border-muted"
                    )}
                  >
                    <div className={cn("h-8 w-8 rounded-full flex items-center justify-center text-white", t.colorClass)}>
                      <t.icon className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t my-4"></div>

            {/* Mode Selection */}
            <div className="space-y-3">
              <Label className="text-base">Display Mode</Label>
              <div className="flex flex-wrap gap-4">
                 <Button
                    variant={mode === 'light' ? 'default' : 'outline'}
                    className="flex-1 min-w-[100px]"
                    onClick={() => setMode('light')}
                 >
                    <Sun className="mr-2 h-4 w-4" /> Light
                 </Button>
                 <Button
                    variant={mode === 'dark' ? 'default' : 'outline'}
                    className="flex-1 min-w-[100px]"
                    onClick={() => setMode('dark')}
                 >
                    <Moon className="mr-2 h-4 w-4" /> Dark
                 </Button>
                 <Button
                    variant={mode === 'system' ? 'default' : 'outline'}
                    className="flex-1 min-w-[100px]"
                    onClick={() => setMode('system')}
                 >
                    <Monitor className="mr-2 h-4 w-4" /> System
                 </Button>
              </div>
              {color === 'christmas' && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  * Christmas theme applies its own special background styles
                </p>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Mobile Navigation Configuration */}
        <Card>
          <CardHeader>
             <CardTitle className="flex items-center gap-2">
               <Menu className="h-5 w-5" /> Mobile Menu
             </CardTitle>
             <CardDescription>
               Customize your mobile navigation experience
             </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
             {/* Menu Type Selection */}
             <div className="space-y-3">
               <Label className="text-base">Menu Style</Label>
               <RadioGroup 
                 defaultValue={mobileMenuType} 
                 onValueChange={(val) => setMobileMenuType(val as 'popover' | 'drawer')}
                 className="grid grid-cols-2 gap-4"
               >
                 <div>
                   <RadioGroupItem value="popover" id="popover" className="peer sr-only" />
                   <Label
                     htmlFor="popover"
                     className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                   >
                     <MousePointerClick className="mb-3 h-6 w-6" />
                     Pop-up Menu
                   </Label>
                 </div>
                 <div>
                   <RadioGroupItem value="drawer" id="drawer" className="peer sr-only" />
                   <Label
                     htmlFor="drawer"
                     className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
                   >
                     <PanelBottom className="mb-3 h-6 w-6" />
                     Drawer Menu
                   </Label>
                 </div>
               </RadioGroup>
               <p className="text-xs text-muted-foreground">
                 "Pop-up" shows a small list of shortcuts. "Drawer" shows the full application menu.
               </p>
             </div>

             {/* Menu Items Config (Only for Popover) */}
             {mobileMenuType === 'popover' && (
               <>
                 <div className="border-t my-4"></div>
                 <div className="space-y-3">
                   <Label className="text-base">Quick Access Items</Label>
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {availableNavItems.map((item) => (
                       <div key={item.key} className="flex items-center space-x-2 border p-3 rounded-md hover:bg-muted/50 transition-colors">
                         <Checkbox 
                           id={`nav-${item.key}`} 
                           checked={mobileNavItems.includes(item.key)}
                           onCheckedChange={() => toggleNavItem(item.key)}
                         />
                         <label 
                           htmlFor={`nav-${item.key}`} 
                           className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                         >
                           {item.label}
                         </label>
                       </div>
                     ))}
                   </div>
                   <p className="text-xs text-muted-foreground mt-4">
                     Select which items appear in the pop-up menu. Fixed items (Home, Todos, Chat) are always visible on the bar.
                   </p>
                 </div>
               </>
             )}
          </CardContent>
        </Card>

        {/* Notifications Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notifications
            </CardTitle>
            <CardDescription>
              Manage your push notification preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Push Notifications</Label>
                <div className="text-sm text-muted-foreground">
                  Receive alerts about upcoming todos and messages
                </div>
              </div>
              <Switch
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationToggle}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Security
            </CardTitle>
            <CardDescription>Update your password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="flex gap-4 items-end">
              <div className="flex-1 space-y-2">
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;