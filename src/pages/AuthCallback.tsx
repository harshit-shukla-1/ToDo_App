"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    // The supabase client automatically handles the hash fragment parsing for us
    // when the component mounts. We just need to wait a moment or check the session.
    
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (session) {
          // Successful verification/login
          setVerifying(false);
          // Small delay to show success message before redirecting
          setTimeout(() => {
            navigate("/");
          }, 2000);
        } else {
          // If no session found immediately, it might be because the hash hasn't processed
          // or the link was invalid.
          // Listen for the auth state change which happens after hash parsing
          const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
             if (event === 'SIGNED_IN' && session) {
               setVerifying(false);
               setTimeout(() => navigate("/"), 2000);
             }
          });
          
          // Fallback if nothing happens after a timeout
          setTimeout(() => {
             if (verifying) {
                 setVerifying(false);
                 // If we still don't have a session, maybe show login
                 if (!session) navigate("/login");
             }
          }, 5000);
          
          return () => {
            authListener.subscription.unsubscribe();
          };
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setError(err.message);
        setVerifying(false);
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-center">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4 py-6">
          {verifying ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-muted-foreground">Verifying your email...</p>
            </>
          ) : error ? (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <p className="text-center font-medium">Verification Failed</p>
              <p className="text-center text-sm text-muted-foreground">{error}</p>
              <Button onClick={() => navigate("/login")} className="mt-4">
                Back to Login
              </Button>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <p className="text-center font-medium">Email Verified Successfully!</p>
              <p className="text-center text-sm text-muted-foreground">Redirecting you to the app...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthCallback;