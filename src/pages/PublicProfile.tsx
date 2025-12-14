"use client";

import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, User as UserIcon, Calendar, ArrowLeft, Ruler, Weight, Mail, Home } from "lucide-react";

interface PublicSettings {
  show_email: boolean;
  show_about: boolean;
  show_birthday: boolean;
  show_measurements: boolean;
  show_hobbies: boolean;
  show_custom: boolean;
}

const PublicProfile = () => {
  const { username } = useParams();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (username) {
      fetchPublicProfile();
    }
  }, [username]);

  const fetchPublicProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Clean up username if it starts with @ (just in case)
      let cleanUsername = username || "";
      if (cleanUsername.startsWith('@')) {
        cleanUsername = cleanUsername.substring(1);
      }
      
      console.log("Fetching profile for:", cleanUsername);

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .ilike("username", cleanUsername) // Case-insensitive match
        .eq("is_public", true)
        .single();

      if (error) {
        console.error("Supabase error:", error);
        if (error.code === 'PGRST116') {
             throw new Error("Profile not found or is set to private.");
        }
        throw error;
      }
      
      setProfile(data);
    } catch (err: any) {
      console.error("Error fetching public profile:", err);
      setError(err.message || "User not found or profile is private.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-screen space-y-4 p-4 text-center">
        <h1 className="text-2xl font-bold">Profile Unavailable</h1>
        <p className="text-muted-foreground max-w-md">{error}</p>
        <Link to="/">
          <Button variant="outline"><ArrowLeft className="mr-2 h-4 w-4" /> Go Home</Button>
        </Link>
      </div>
    );
  }

  // Fallback defaults in case older profiles haven't updated
  const rawSettings = profile.public_settings || {};
  const settings: PublicSettings = {
    show_email: rawSettings.show_email ?? false,
    show_about: rawSettings.show_about ?? true,
    show_birthday: rawSettings.show_birthday ?? rawSettings.show_stats ?? true,
    show_measurements: rawSettings.show_measurements ?? rawSettings.show_stats ?? true,
    show_hobbies: rawSettings.show_hobbies ?? true,
    show_custom: rawSettings.show_custom ?? true,
  };

  const customProperties = profile.custom_properties || {};
  const hasVisibleMeasurements = settings.show_measurements && (profile.height || profile.weight);
  const hasVisibleBirthday = settings.show_birthday && profile.birthday;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      {/* Navigation Header */}
      <div className="max-w-3xl mx-auto mb-6">
        <Link to="/">
          <Button variant="ghost" className="gap-2 pl-0 hover:bg-transparent -ml-2">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Button>
        </Link>
      </div>

      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header / Avatar */}
        <Card className="overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-blue-500 to-purple-600"></div>
          <div className="px-6 pb-6">
            <div className="-mt-16 mb-4 inline-block">
              <Avatar className="h-32 w-32 border-4 border-background shadow-sm">
                <AvatarImage src={profile.avatar_url} className="object-cover" />
                <AvatarFallback><UserIcon className="h-16 w-16" /></AvatarFallback>
              </Avatar>
            </div>
            <div className="flex flex-col items-start space-y-1">
              <h1 className="text-3xl font-bold break-words">{profile.first_name} {profile.last_name}</h1>
              <p className="text-muted-foreground font-medium text-lg">@{profile.username}</p>
              
              {settings.show_email && (
                 <div className="flex items-center text-sm text-muted-foreground mt-2">
                   <Mail className="w-4 h-4 mr-1" />
                   <span className="italic">Email hidden (not in public profile data)</span>
                 </div>
              )}
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="md:col-span-2 space-y-6">
            {settings.show_about && profile.about && (
              <Card>
                <CardHeader>
                  <CardTitle>About</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line leading-relaxed">{profile.about}</p>
                </CardContent>
              </Card>
            )}

            {settings.show_hobbies && profile.hobbies && profile.hobbies.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Hobbies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {profile.hobbies.map((hobby: string, i: number) => (
                      <Badge key={i} variant="secondary">{hobby}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

             {settings.show_custom && Object.keys(customProperties).length > 0 && (
               <Card>
                 <CardHeader>
                   <CardTitle>More Info</CardTitle>
                 </CardHeader>
                 <CardContent>
                   <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-4">
                     {Object.entries(customProperties).map(([key, value]) => (
                       <div key={key} className="border-b pb-2 last:border-0">
                         <dt className="text-sm font-medium text-muted-foreground">{key}</dt>
                         <dd className="text-base">{String(value)}</dd>
                       </div>
                     ))}
                   </dl>
                 </CardContent>
               </Card>
             )}
          </div>

          {/* Sidebar Stats */}
          <div className="space-y-6">
            {(hasVisibleBirthday || hasVisibleMeasurements) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Personal Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {settings.show_birthday && profile.birthday && (
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-300">
                        <Calendar className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Birthday</p>
                        <p className="font-medium">{new Date(profile.birthday).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                  {settings.show_measurements && profile.height && (
                     <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center text-green-600 dark:text-green-300">
                        <Ruler className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Height</p>
                        <p className="font-medium">{profile.height} cm</p>
                      </div>
                    </div>
                  )}
                  {settings.show_measurements && profile.weight && (
                     <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 flex items-center justify-center text-orange-600 dark:text-orange-300">
                        <Weight className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Weight</p>
                        <p className="font-medium">{profile.weight} kg</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            <div className="flex justify-center">
              <Link to="/">
                 <Button variant="outline" className="w-full">
                    <Home className="mr-2 h-4 w-4" /> Create your own profile
                 </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PublicProfile;