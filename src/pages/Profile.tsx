"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Plus, Trash2, Save, Upload, User as UserIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";

// Predefined anime/character avatars using DiceBear
const PREDEFINED_AVATARS = [
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Felix",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Aneka",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Molly",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Buster",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Shadow",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Coco",
];

interface CustomProperty {
  key: string;
  value: string;
}

const Profile = () => {
  const { user } = useSession();
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [completion, setCompletion] = useState(0);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [about, setAbout] = useState("");
  const [birthday, setBirthday] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [hobbies, setHobbies] = useState(""); // Comma separated string
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  
  // Custom Properties State
  const [customProperties, setCustomProperties] = useState<CustomProperty[]>([]);
  const [newPropKey, setNewPropKey] = useState("");
  const [newPropValue, setNewPropValue] = useState("");

  useEffect(() => {
    if (user) {
      setEmail(user.email || "");
      fetchProfile();
    }
  }, [user]);

  useEffect(() => {
    calculateCompletion();
  }, [firstName, lastName, about, birthday, height, weight, hobbies, avatarUrl]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user?.id)
        .single();

      if (error && error.code !== "PGRST116") throw error;

      if (data) {
        setFirstName(data.first_name || "");
        setLastName(data.last_name || "");
        setAbout(data.about || "");
        setBirthday(data.birthday || "");
        setHeight(data.height?.toString() || "");
        setWeight(data.weight?.toString() || "");
        setHobbies(data.hobbies ? data.hobbies.join(", ") : "");
        setAvatarUrl(data.avatar_url || "");
        
        // Parse custom properties
        if (data.custom_properties) {
          const props = Object.entries(data.custom_properties).map(([key, value]) => ({
            key,
            value: String(value)
          }));
          setCustomProperties(props);
        }
      }
    } catch (error: any) {
      showError("Error fetching profile: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateCompletion = () => {
    const fields = [firstName, lastName, about, birthday, height, weight, hobbies, avatarUrl];
    const filledFields = fields.filter(field => field && field.trim() !== "").length;
    const totalFields = fields.length;
    setCompletion(Math.round((filledFields / totalFields) * 100));
  };

  const handleUpdateProfile = async () => {
    try {
      setUpdating(true);
      
      // Convert hobbies string to array
      const hobbiesArray = hobbies.split(",").map(h => h.trim()).filter(h => h !== "");
      
      // Convert custom properties array to object
      const customPropsObj = customProperties.reduce((acc, curr) => {
        if (curr.key.trim()) {
          acc[curr.key.trim()] = curr.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const updates = {
        id: user?.id,
        first_name: firstName,
        last_name: lastName,
        about,
        birthday: birthday || null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        hobbies: hobbiesArray,
        avatar_url: avatarUrl,
        custom_properties: customPropsObj,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) throw error;
      showSuccess("Profile updated successfully!");
    } catch (error: any) {
      showError("Error updating profile: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!email || email === user?.email) return;
    
    try {
      setUpdating(true);
      const { error } = await supabase.auth.updateUser({ email });
      if (error) throw error;
      showSuccess("Confirmation email sent to both old and new addresses.");
    } catch (error: any) {
      showError("Error updating email: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const addCustomProperty = () => {
    if (!newPropKey.trim()) return;
    setCustomProperties([...customProperties, { key: newPropKey, value: newPropValue }]);
    setNewPropKey("");
    setNewPropValue("");
  };

  const removeCustomProperty = (index: number) => {
    const newProps = [...customProperties];
    newProps.splice(index, 1);
    setCustomProperties(newProps);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0) return;
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}-${Math.random()}.${fileExt}`;

      setUpdating(true);
      
      // Upload to 'avatars' bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        // If bucket doesn't exist or other error, fallback to just error message
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      showSuccess("Image uploaded successfully!");
    } catch (error: any) {
      showError("Upload failed: " + error.message + ". Make sure 'avatars' bucket exists.");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Profile Settings</h2>
        <div className="flex items-center gap-4">
          <Progress value={completion} className="w-full h-3" />
          <span className="text-sm font-medium whitespace-nowrap">{completion}% Completed</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Picture</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32 border-2 border-border">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="text-4xl"><UserIcon className="h-16 w-16" /></AvatarFallback>
              </Avatar>
              
              <div className="w-full space-y-2">
                <Label htmlFor="avatar-upload" className="w-full cursor-pointer">
                  <div className="flex items-center justify-center w-full h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground">
                    <Upload className="mr-2 h-4 w-4" /> Upload Custom
                  </div>
                  <Input 
                    id="avatar-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </Label>
              </div>

              <div className="space-y-2 w-full">
                <Label className="text-xs text-muted-foreground text-center block">Or choose an avatar</Label>
                <div className="grid grid-cols-3 gap-2">
                  {PREDEFINED_AVATARS.map((url, i) => (
                    <button 
                      key={i}
                      type="button"
                      onClick={() => setAvatarUrl(url)}
                      className={`rounded-full overflow-hidden border-2 transition-all ${avatarUrl === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted'}`}
                    >
                      <img src={url} alt="Avatar option" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Details Form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Manage your public profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" value={firstName} onChange={e => setFirstName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" value={lastName} onChange={e => setLastName(e.target.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="flex gap-2">
                  <Input id="email" value={email} onChange={e => setEmail(e.target.value)} />
                  <Button variant="outline" onClick={handleUpdateEmail} disabled={email === user?.email || updating}>
                    Update
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground">Changing email will require verification.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="about">About Me</Label>
                <Textarea 
                  id="about" 
                  value={about} 
                  onChange={e => setAbout(e.target.value)} 
                  placeholder="Tell us a bit about yourself..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Input type="date" id="birthday" value={birthday} onChange={e => setBirthday(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hobbies">Hobbies</Label>
                  <Input 
                    id="hobbies" 
                    value={hobbies} 
                    onChange={e => setHobbies(e.target.value)} 
                    placeholder="Gaming, Reading, Hiking..." 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input type="number" id="height" value={height} onChange={e => setHeight(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input type="number" id="weight" value={weight} onChange={e => setWeight(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Additional Details</CardTitle>
              <CardDescription>Add any other custom information you want to share</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {customProperties.map((prop, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <Input value={prop.key} readOnly className="w-1/3 bg-muted" />
                    <Input value={prop.value} readOnly className="flex-1 bg-muted" />
                    <Button variant="ghost" size="icon" onClick={() => removeCustomProperty(index)} className="text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              
              <Separator />

              <div className="flex gap-2 items-end">
                <div className="space-y-2 w-1/3">
                  <Label htmlFor="newKey">Property Name</Label>
                  <Input 
                    id="newKey" 
                    placeholder="e.g. LinkedIn" 
                    value={newPropKey} 
                    onChange={e => setNewPropKey(e.target.value)} 
                  />
                </div>
                <div className="space-y-2 flex-1">
                  <Label htmlFor="newValue">Value</Label>
                  <Input 
                    id="newValue" 
                    placeholder="Value..." 
                    value={newPropValue} 
                    onChange={e => setNewPropValue(e.target.value)} 
                  />
                </div>
                <Button variant="secondary" onClick={addCustomProperty} disabled={!newPropKey.trim()}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button size="lg" onClick={handleUpdateProfile} disabled={updating}>
              {updating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Save className="mr-2 h-4 w-4" /> Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;