"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

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
  
  const [mode, setModeState] = useState<ThemeMode>(
    () => (localStorage.getItem(`${storageKey}-mode`) as ThemeMode) || defaultMode
  );
  
  const [color, setColorState] = useState<ThemeColor>(
    () => (localStorage.getItem(`${storageKey}-color`) as ThemeColor) || defaultColor
  );

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
    // Special case: Christmas might override mode in CSS, but we add the class regardless
    if (color !== "default") {
      root.classList.add(`theme-${color}`);
    }

  }, [mode, color]);

  const setMode = (mode: ThemeMode) => {
    localStorage.setItem(`${storageKey}-mode`, mode);
    setModeState(mode);
  };

  const setColor = (color: ThemeColor) => {
    localStorage.setItem(`${storageKey}-color`, color);
    setColorState(color);
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