"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, UserCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

const ProfileCompletionBanner = () => {
  const { user } = useSession();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [completion, setCompletion] = useState(100);
  const [loading, setLoading] = useState(true);

  // Don't show on the profile page itself
  if (location.pathname === "/profile") return null;

  useEffect(() => {
    if (user) {
      checkProfileCompletion();
    }
  }, [user]);

  const checkProfileCompletion = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error || !data) return;

      // Fields to check (matching Profile.tsx logic)
      const fields = [
        data.first_name,
        data.last_name,
        data.about,
        data.birthday,
        data.height,
        data.weight,
        data.hobbies,
        data.avatar_url,
        data.username,
        data.contact // New field
      ];

      const filledFields = fields.filter((field) => {
        if (field === null || field === undefined) return false;
        if (typeof field === "string" && field.trim() === "") return false;
        if (Array.isArray(field) && field.length === 0) return false;
        return true;
      }).length;

      const totalFields = fields.length;
      const percentage = Math.round((filledFields / totalFields) * 100);

      setCompletion(percentage);

      // Show if incomplete and not dismissed in this session
      const isDismissed = sessionStorage.getItem("dismiss_profile_banner");
      if (percentage < 100 && !isDismissed) {
        setIsVisible(true);
      }
    } catch (error) {
      console.error("Error checking profile", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("dismiss_profile_banner", "true");
  };

  if (!isVisible || loading) return null;

  return (
    <div className="p-4 bg-orange-50 dark:bg-orange-950/20 border-b border-orange-200 dark:border-orange-800">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 dark:text-orange-300 shrink-0">
            <UserCheck className="h-5 w-5" />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-semibold text-orange-900 dark:text-orange-100">
              Complete your profile ({completion}%)
            </h4>
            <div className="w-full max-w-[200px]">
              <Progress value={completion} className="h-1.5 bg-orange-200 dark:bg-orange-800" indicatorClassName="bg-orange-500" />
            </div>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              Add your contact info and details to connect better.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Link to="/profile" className="w-full sm:w-auto">
            <Button size="sm" variant="outline" className="w-full border-orange-300 hover:bg-orange-100 text-orange-900 dark:border-orange-700 dark:hover:bg-orange-900 dark:text-orange-100 bg-transparent">
              Complete Now
            </Button>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            onClick={handleDismiss}
            className="h-8 w-8 text-orange-500 hover:text-orange-700 hover:bg-orange-200/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionBanner;