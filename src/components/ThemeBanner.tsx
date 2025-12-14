"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { useSession } from "@/integrations/supabase/auth";
import { X, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { showSuccess } from "@/utils/toast";
import { motion, AnimatePresence } from "framer-motion";

const ThemeBanner = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useSession();
  const [isVisible, setIsVisible] = useState(true);

  // If already on christmas theme, don't show the banner (or show a different one? No, just hide it to not annoy)
  if (theme === "christmas" || !isVisible) {
    return null;
  }

  const handleApplyTheme = () => {
    setTheme("christmas");
    showSuccess("Ho Ho Ho! Christmas theme applied! 🎄");
    setIsVisible(false);
  };

  const handleClose = () => {
    setIsVisible(false);
    // Optional: save preference to localStorage so it doesn't pop up again this session
    sessionStorage.setItem("hide_christmas_banner", "true");
  };

  useEffect(() => {
    if (sessionStorage.getItem("hide_christmas_banner") === "true") {
      setIsVisible(false);
    }
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-gradient-to-r from-red-600 to-green-600 text-white relative z-50"
        >
          <div className="container mx-auto px-4 py-2 flex items-center justify-between text-sm sm:text-base">
            <div className="flex items-center gap-2">
              <Gift className="h-4 w-4 animate-bounce" />
              <span className="font-medium">
                The Christmas theme is here!
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  <Button 
                    size="sm" 
                    variant="secondary" 
                    className="h-7 px-3 text-xs bg-white text-red-600 hover:bg-gray-100 border-none"
                    onClick={handleApplyTheme}
                  >
                    Apply Theme
                  </Button>
                </>
              ) : (
                <span className="text-xs opacity-90 hidden sm:inline">Log in to apply</span>
              )}
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-white hover:bg-white/20 hover:text-white" 
                onClick={handleClose}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ThemeBanner;