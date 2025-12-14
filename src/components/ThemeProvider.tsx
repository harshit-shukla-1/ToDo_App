"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";
type ThemeStyle = "default" | "christmas";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  defaultStyle?: ThemeStyle;
  storageKey?: string;
  styleKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  style: ThemeStyle;
  setTheme: (theme: Theme) => void;
  setStyle: (style: ThemeStyle) => void;
};

const initialState: ThemeProviderState = {
  theme: "system",
  style: "default",
  setTheme: () => null,
  setStyle: () => null,
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultStyle = "default",
  storageKey = "vite-ui-theme",
  styleKey = "vite-ui-style",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  );
  
  const [style, setStyle] = useState<ThemeStyle>(
    () => (localStorage.getItem(styleKey) as ThemeStyle) || defaultStyle
  );

  useEffect(() => {
    const root = window.document.documentElement;

    root.classList.remove("light", "dark");

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, [theme]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.setAttribute("data-style", style);
  }, [style]);

  const value = {
    theme,
    style,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme);
      setTheme(theme);
    },
    setStyle: (style: ThemeStyle) => {
      localStorage.setItem(styleKey, style);
      setStyle(style);
    },
  };

  return (
    <ThemeProviderContext.Provider value={value}>
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