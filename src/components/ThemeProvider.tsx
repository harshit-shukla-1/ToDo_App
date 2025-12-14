"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";

export type ThemeMode = "dark" | "light" | "system";
export type ThemeColor = "default" | "ocean" | "forest" | "rose" | "christmas";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultMode?: ThemeMode;
  defaultColor?: ThemeColor;
  storageKey?: string;
};

type ThemeProviderState = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  color: ThemeColor;
  setColor: (color: ThemeColor) => void;
};

const initialState: ThemeProviderState = {
  mode: "system",
  setMode: () => null,
  color: "default",
  setColor: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultMode = "system",
  defaultColor = "default",
  storageKey = "mazda-todo-ui-theme",
}: ThemeProviderProps) {
  
  const { user } = useSession(); // Now available because App.tsx wraps this
  
  const [mode, setModeState] = useState<ThemeMode>(
    () => (localStorage.getItem(`${storageKey}-mode`) as ThemeMode) || defaultMode
  );
  
  const [color, setColorState] = useState<ThemeColor>(
    () => (localStorage.getItem(`${storageKey}-color`) as ThemeColor) || defaultColor
  );

  // Sync with DB on load/login
  useEffect(() => {
    if (user) {
      const fetchTheme = async () => {
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
          }
        } catch (e) {
          console.error("Failed to fetch theme preferences", e);
        }
      };
      fetchTheme();
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

  const updateDb = async (newMode: ThemeMode, newColor: ThemeColor) => {
    if (!user) return;
    
    // We do this optimistically and don't await/block UI
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
          theme_color: newColor
        }
      }).eq('id', user.id);
    } catch (e) {
      console.error("Failed to save theme preferences", e);
    }
  };

  const setMode = (newMode: ThemeMode) => {
    localStorage.setItem(`${storageKey}-mode`, newMode);
    setModeState(newMode);
    updateDb(newMode, color);
  };

  const setColor = (newColor: ThemeColor) => {
    localStorage.setItem(`${storageKey}-color`, newColor);
    setColorState(newColor);
    updateDb(mode, newColor);
  };

  return (
    <ThemeProviderContext.Provider value={{ mode, setMode, color, setColor }}>
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