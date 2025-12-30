"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "dark" | "light" | "system";
export type ThemeColor = "default" | "ocean" | "forest" | "rose" | "christmas";
export type MobileMenuType = "popover" | "drawer";

// Available items for the mobile menu
export type NavItemKey = "dashboard" | "todos" | "archives" | "teams" | "messages" | "connections" | "profile" | "settings" | "admin";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  defaultColor?: ThemeColor;
  defaultMobileNav?: NavItemKey[];
  defaultMobileMenuType?: MobileMenuType;
  storageKey?: string;
};

type ThemeProviderState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  color: ThemeColor;
  setColor: (color: ThemeColor) => void;
  mobileNavItems: NavItemKey[];
  setMobileNavItems: (items: NavItemKey[]) => void;
  mobileMenuType: MobileMenuType;
  setMobileMenuType: (type: MobileMenuType) => void;
  isLoading: boolean;
};

const defaultNavItems: NavItemKey[] = ["connections", "profile", "settings"];

const initialState: ThemeProviderState = {
  mode: "system",
  setMode: () => null,
  color: "default",
  setColor: () => null,
  mobileNavItems: defaultNavItems,
  setMobileNavItems: () => null,
  mobileMenuType: "popover",
  setMobileMenuType: () => null,
  isLoading: true,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultMode = "system",
  defaultColor = "default",
  defaultMobileNav = defaultNavItems,
  defaultMobileMenuType = "popover",
  storageKey = "mazda-todo-ui-theme",
}: ThemeProviderProps) {
  
  const { user } = useSession(); 
  
  const [mode, setModeState] = useState<ThemeMode>(
    () => (localStorage.getItem(`${storageKey}-mode`) as ThemeMode) || defaultMode
  );
  
  const [color, setColorState] = useState<ThemeColor>(
    () => (localStorage.getItem(`${storageKey}-color`) as ThemeColor) || defaultColor
  );

  const [mobileNavItems, setMobileNavItemsState] = useState<NavItemKey[]>(
    () => {
      const stored = localStorage.getItem(`${storageKey}-nav`);
      return stored ? JSON.parse(stored) : defaultMobileNav;
    }
  );

  const [mobileMenuType, setMobileMenuTypeState] = useState<MobileMenuType>(
    () => (localStorage.getItem(`${storageKey}-menu-type`) as MobileMenuType) || defaultMobileMenuType
  );

  const [isLoading, setIsLoading] = useState(true);

  // Sync with DB on load/login
  useEffect(() => {
    if (user) {
      const fetchPreferences = async () => {
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', user.id)
            .single();
            
          if (data?.preferences) {
            const prefs = data.preferences as any;
            if (prefs.theme_mode) {
              setModeState(prefs.theme_mode);
              localStorage.setItem(`${storageKey}-mode`, prefs.theme_mode);
            }
            if (prefs.theme_color) {
              setColorState(prefs.theme_color);
              localStorage.setItem(`${storageKey}-color`, prefs.theme_color);
            }
            if (prefs.mobile_nav_items && Array.isArray(prefs.mobile_nav_items)) {
              setMobileNavItemsState(prefs.mobile_nav_items);
              localStorage.setItem(`${storageKey}-nav`, JSON.stringify(prefs.mobile_nav_items));
            }
            if (prefs.mobile_menu_type) {
              setMobileMenuTypeState(prefs.mobile_menu_type);
              localStorage.setItem(`${storageKey}-menu-type`, prefs.mobile_menu_type);
            }
          }
        } catch (e) {
          console.error("Failed to fetch theme preferences", e);
        } finally {
          setIsLoading(false);
        }
      };
      fetchPreferences();
    } else {
      setIsLoading(false);
    }
  }, [user, storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;

    // Reset classes
    root.classList.remove("light", "dark");
    root.classList.remove("theme-default", "theme-ocean", "theme-forest", "theme-rose", "theme-christmas");

    // Apply Mode
    let systemMode = mode;
    if (mode === "system") {
      systemMode = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    }
    root.classList.add(systemMode);

    // Apply Color
    if (color !== "default") {
      root.classList.add(`theme-${color}`);
    }

  }, [mode, color]);

  const updateDb = async (newMode: ThemeMode, newColor: ThemeColor, newNavItems: NavItemKey[], newMenuType: MobileMenuType) => {
    if (!user) return;
    
    try {
      const { data } = await supabase
        .from('profiles')
        .select('preferences')
        .eq('id', user.id)
        .single();
        
      const currentPrefs = (data?.preferences as any) || {};
      
      await supabase.from('profiles').update({
        preferences: {
          ...currentPrefs,
          theme_mode: newMode,
          theme_color: newColor,
          mobile_nav_items: newNavItems,
          mobile_menu_type: newMenuType
        }
      }).eq('id', user.id);
    } catch (e) {
      console.error("Failed to save preferences", e);
    }
  };

  const setMode = (newMode: ThemeMode) => {
    localStorage.setItem(`${storageKey}-mode`, newMode);
    setModeState(newMode);
    updateDb(newMode, color, mobileNavItems, mobileMenuType);
  };

  const setColor = (newColor: ThemeColor) => {
    localStorage.setItem(`${storageKey}-color`, newColor);
    setColorState(newColor);
    updateDb(mode, newColor, mobileNavItems, mobileMenuType);
  };

  const setMobileNavItems = (newItems: NavItemKey[]) => {
    localStorage.setItem(`${storageKey}-nav`, JSON.stringify(newItems));
    setMobileNavItemsState(newItems);
    updateDb(mode, color, newItems, mobileMenuType);
  };

  const setMobileMenuType = (newType: MobileMenuType) => {
    localStorage.setItem(`${storageKey}-menu-type`, newType);
    setMobileMenuTypeState(newType);
    updateDb(mode, color, mobileNavItems, newType);
  };

  return (
    <ThemeProviderContext.Provider value={{ 
      mode, 
      setMode, 
      color, 
      setColor, 
      mobileNavItems, 
      setMobileNavItems,
      mobileMenuType,
      setMobileMenuType,
      isLoading
    }}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};