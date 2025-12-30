"use client";

import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

const VerifyEmail = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        // Supabase client automatically parses the hash fragment for access tokens
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        
        if (session) {
          // If we have a session, verification (or login via link) was successful
          setVerifying(false);
          setTimeout(() => {
            navigate("/");
          }, 2500);
        } else {
          // Listen for the SIGNED_IN event which happens after the client parses the link
          const { data: authListener } = supabase.auth.onAuthStateChange((event, currentSession) => {
             if ((event === 'SIGNED_IN' || event === 'USER_UPDATED') && currentSession) {
               setVerifying(false);
               setTimeout(() => navigate("/"), 2500);
             }
          });
          
          // Safety timeout
          const timeout = setTimeout(() => {
             if (verifying) {
                 setVerifying(false);
                 // If after 5 seconds nothing happened, we check if it was just an invalid link
                 setError("The verification link may have expired or is invalid.");
             }
          }, 6000);
          
          return () => {
            authListener.subscription.unsubscribe();
            clearTimeout(timeout);
          };
        }
      } catch (err: any) {
        console.error("Verification error:", err);
        setError(err.message || "An unexpected error occurred during verification.");
        setVerifying(false);
      }
    };

    checkStatus();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Mail className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Email Verification</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-6 py-8">
          {verifying ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <div className="text-center space-y-2">
                <p className="font-medium">Validating your link...</p>
                <p className="text-sm text-muted-foreground">This will only take a moment.</p>
              </div>
            </>
          ) : error ? (
            <>
              <div className="bg-destructive/10 p-3 rounded-full">
                <XCircle className="h-12 w-12 text-destructive" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-bold text-lg text-destructive">Verification Failed</p>
                <p className="text-sm text-muted-foreground max-w-[280px]">{error}</p>
              </div>
              <div className="flex flex-col w-full gap-2 pt-2">
                <Button onClick={() => navigate("/login")} className="w-full">
                  Return to Login
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="w-full">
                  Go to Homepage
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="bg-green-100 dark:bg-green-900/30 p-3 rounded-full">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-center space-y-2">
                <p className="font-bold text-xl text-green-600 dark:text-green-400">Success!</p>
                <p className="text-sm text-muted-foreground">Your email has been verified. We're redirecting you to your dashboard now...</p>
              </div>
              <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default VerifyEmail;