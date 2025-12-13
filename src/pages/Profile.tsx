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
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Plus, Trash2, Save, Upload, User as UserIcon, Lock, Globe, Shuffle, Eye, Copy, Calendar as CalendarIcon } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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

interface PublicSettings {
  show_email: boolean;
  show_about: boolean;
  show_birthday: boolean;
  show_measurements: boolean; // Height & Weight
  show_hobbies: boolean;
  show_custom: boolean;
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
  const [birthday, setBirthday] = useState<Date | undefined>(undefined);
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [hobbies, setHobbies] = useState(""); // Comma separated string
  const [avatarUrl, setAvatarUrl] = useState("");
  const [email, setEmail] = useState("");
  
  // Username & Public Profile
  const [username, setUsername] = useState("");
  const [isUsernameSet, setIsUsernameSet] = useState(false); // To lock it
  const [isPublic, setIsPublic] = useState(false);
  const [publicSettings, setPublicSettings] = useState<PublicSettings>({
    show_email: false,
    show_about: true,
    show_birthday: true,
    show_measurements: true,
    show_hobbies: true,
    show_custom: true,
  });

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
  }, [firstName, lastName, about, birthday, height, weight, hobbies, avatarUrl, username]);

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
        setBirthday(data.birthday ? new Date(data.birthday) : undefined);
        setHeight(data.height?.toString() || "");
        setWeight(data.weight?.toString() || "");
        setHobbies(data.hobbies ? data.hobbies.join(", ") : "");
        setAvatarUrl(data.avatar_url || "");
        
        if (data.username) {
          setUsername(data.username);
          setIsUsernameSet(true);
        }
        
        setIsPublic(data.is_public || false);
        if (data.public_settings) {
          // Migration/Fallback logic for old settings structure
          const settings = data.public_settings as any;
          setPublicSettings({
            show_email: settings.show_email ?? false,
            show_about: settings.show_about ?? true,
            show_birthday: settings.show_birthday ?? settings.show_stats ?? true,
            show_measurements: settings.show_measurements ?? settings.show_stats ?? true,
            show_hobbies: settings.show_hobbies ?? true,
            show_custom: settings.show_custom ?? true,
          });
        }

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
    const fields = [firstName, lastName, about, birthday, height, weight, hobbies, avatarUrl, username];
    const filledFields = fields.filter(field => field && (typeof field === 'string' ? field.trim() !== "" : true)).length;
    const totalFields = fields.length;
    setCompletion(Math.round((filledFields / totalFields) * 100));
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isUsernameSet) {
      // Force lowercase and only allow alphanumeric + underscores
      const val = e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '');
      setUsername(val);
    }
  };

  const generateRandomUsername = () => {
    if (isUsernameSet) return;
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    setUsername(`user_${randomSuffix}`.toLowerCase());
  };

  const handleUpdateProfile = async () => {
    try {
      setUpdating(true);
      
      // Basic validation
      if (!isUsernameSet && username.trim().length < 3) {
        showError("Username must be at least 3 characters long");
        setUpdating(false);
        return;
      }

      // Convert hobbies string to array
      const hobbiesArray = hobbies.split(",").map(h => h.trim()).filter(h => h !== "");
      
      // Convert custom properties array to object
      const customPropsObj = customProperties.reduce((acc, curr) => {
        if (curr.key.trim()) {
          acc[curr.key.trim()] = curr.value;
        }
        return acc;
      }, {} as Record<string, string>);

      const updates: any = {
        id: user?.id,
        first_name: firstName,
        last_name: lastName,
        about,
        birthday: birthday ? format(birthday, 'yyyy-MM-dd') : null,
        height: height ? parseFloat(height) : null,
        weight: weight ? parseFloat(weight) : null,
        hobbies: hobbiesArray,
        avatar_url: avatarUrl,
        custom_properties: customPropsObj,
        is_public: isPublic,
        public_settings: publicSettings,
        updated_at: new Date().toISOString(),
      };

      // Only update username if it wasn't set before
      if (!isUsernameSet && username) {
        updates.username = username.toLowerCase(); // Ensure lowercase
      }

      const { error } = await supabase.from("profiles").upsert(updates);

      if (error) {
        if (error.code === '23505') { // Unique violation
          throw new Error("Username already taken. Please choose another.");
        }
        throw error;
      }
      
      setIsUsernameSet(true);
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
        throw uploadError;
      }

      // Get public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      showSuccess("Image uploaded successfully!");
    } catch (error: any) {
      showError("Upload failed: " + error.message);
    } finally {
      setUpdating(false);
    }
  };

  const copyPublicLink = () => {
    // We use the new /@username format or fallback to /u/username if needed
    // Using /@ for display preference
    const url = `${window.location.origin}/@${username}`;
    navigator.clipboard.writeText(url);
    showSuccess("Public profile link copied to clipboard!");
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

          {/* Public Profile Settings */}
           <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" /> Public Profile
              </CardTitle>
              <CardDescription>Manage your public presence</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">@</span>
                    <Input 
                      id="username" 
                      value={username} 
                      onChange={handleUsernameChange} 
                      className="pl-7"
                      placeholder="username"
                      readOnly={isUsernameSet}
                      disabled={isUsernameSet}
                    />
                    {isUsernameSet && <Lock className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" />}
                  </div>
                  {!isUsernameSet && (
                    <Button variant="outline" size="icon" onClick={generateRandomUsername} title="Generate Random">
                      <Shuffle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  {isUsernameSet 
                    ? "Username cannot be changed. Only lowercase letters, numbers, and underscores." 
                    : "Choose carefully! Cannot be changed later. Lowercase only."}
                </p>
              </div>

              {isUsernameSet && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <Label htmlFor="isPublic" className="cursor-pointer">Public Profile</Label>
                    <Switch id="isPublic" checked={isPublic} onCheckedChange={setIsPublic} />
                  </div>

                  {isPublic && (
                    <div className="space-y-3 pt-2">
                      <div className="flex items-center justify-between bg-background p-2 rounded border">
                        <Link to={`/@${username}`} target="_blank" className="text-sm text-blue-500 hover:underline flex items-center gap-1">
                          View Profile <Eye className="h-3 w-3" />
                        </Link>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copyPublicLink}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Publicly Visible Fields</Label>
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="show_about" checked={publicSettings.show_about} onCheckedChange={(c) => setPublicSettings({...publicSettings, show_about: !!c})} />
                            <label htmlFor="show_about" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">About</label>
                          </div>
                          
                           <div className="flex items-center space-x-2">
                            <Checkbox id="show_birthday" checked={publicSettings.show_birthday} onCheckedChange={(c) => setPublicSettings({...publicSettings, show_birthday: !!c})} />
                            <label htmlFor="show_birthday" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Birthday</label>
                          </div>
                          
                           <div className="flex items-center space-x-2">
                            <Checkbox id="show_measurements" checked={publicSettings.show_measurements} onCheckedChange={(c) => setPublicSettings({...publicSettings, show_measurements: !!c})} />
                            <label htmlFor="show_measurements" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Measurements (Height/Weight)</label>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Checkbox id="show_hobbies" checked={publicSettings.show_hobbies} onCheckedChange={(c) => setPublicSettings({...publicSettings, show_hobbies: !!c})} />
                            <label htmlFor="show_hobbies" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Hobbies</label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="show_custom" checked={publicSettings.show_custom} onCheckedChange={(c) => setPublicSettings({...publicSettings, show_custom: !!c})} />
                            <label htmlFor="show_custom" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Custom Properties</label>
                          </div>
                           <div className="flex items-center space-x-2">
                            <Checkbox id="show_email" checked={publicSettings.show_email} onCheckedChange={(c) => setPublicSettings({...publicSettings, show_email: !!c})} />
                            <label htmlFor="show_email" className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email Address</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Details Form */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Manage your profile details</CardDescription>
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
                <div className="space-y-2 flex flex-col">
                  <Label htmlFor="birthday">Birthday</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !birthday && "text-muted-foreground"
                        )}
                      >
                        {birthday ? (
                          format(birthday, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={birthday}
                        onSelect={setBirthday}
                        disabled={(date) =>
                          date > new Date() || date < new Date("1900-01-01")
                        }
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
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