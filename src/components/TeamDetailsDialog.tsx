"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Plus, Trash2, Crown, CheckCircle2, Circle, Users, Calendar, Pencil, Upload, Save, Info, X } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PREDEFINED_AVATARS } from "@/pages/Profile";

interface Team {
  id: string;
  name: string;
  created_by: string;
  description?: string;
  avatar_url?: string;
}

interface Member {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  role?: string;
}

interface Todo {
  id: string;
  text: string;
  completed: boolean;
  due_date: string | null;
  category: string;
  priority?: string;
}

interface TeamDetailsDialogProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string | undefined;
}

const TeamDetailsDialog: React.FC<TeamDetailsDialogProps> = ({ team, open, onOpenChange, currentUserId }) => {
  const [activeTab, setActiveTab] = useState("todos");
  const [members, setMembers] = useState<Member[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [connections, setConnections] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingTeam, setUpdatingTeam] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);

  // Edit states for team details
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const isOwner = team?.created_by === currentUserId;

  useEffect(() => {
    if (open && team) {
      fetchData();
      setName(team.name);
      setDescription(team.description || "");
      setAvatarUrl(team.avatar_url || "");
      setEditMode(false);
    }
  }, [open, team]);

  const fetchData = async () => {
    if (!team) return;
    setLoading(true);
    try {
      // 1. Fetch Todos
      const { data: todosData } = await supabase
        .from('todos')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false });
      
      setTodos(todosData || []);

      // 2. Fetch Team Members (IDs and Roles)
      const { data: teamMembersData } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', team.id);

      const memberIds = teamMembersData?.map(m => m.user_id) || [];
      const roleMap = new Map(teamMembersData?.map(m => [m.user_id, m.role]));

      // 3. Fetch Profiles for those members
      let formattedMembers: Member[] = [];
      
      if (memberIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', memberIds);

        formattedMembers = (profilesData || []).map((p: any) => ({
          ...p,
          role: roleMap.get(p.id) || 'member'
        }));
      }
      
      setMembers(formattedMembers);

      // 4. Fetch Connections (for adding new members)
      const { data: connData } = await supabase
        .from('connections')
        .select(`
          requester:profiles!requester_id(*),
          recipient:profiles!recipient_id(*)
        `)
        .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .eq('status', 'accepted');

      const profiles = connData?.map((c: any) => {
        return c.requester_id === currentUserId ? c.recipient : c.requester;
      }).filter(p => p && p.id !== currentUserId) || [];

      // Filter out existing members
      const currentMemberIds = new Set(memberIds);
      setConnections(profiles.filter(p => !currentMemberIds.has(p.id)));

    } catch (err) {
      console.error(err);
      showError("Failed to load team details");
    } finally {
      setLoading(false);
    }
  };

  const updateTeamDetails = async () => {
    if (!team) return;
    setUpdatingTeam(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ 
          name, 
          description, 
          avatar_url: avatarUrl 
        })
        .eq('id', team.id);

      if (error) throw error;
      showSuccess("Team details updated!");
      setEditMode(false);
    } catch (err: any) {
      showError("Failed to update: " + err.message);
    } finally {
      setUpdatingTeam(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      if (!event.target.files || event.target.files.length === 0 || !team) return;
      
      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `team_${team.id}_${Date.now()}.${fileExt}`;
      const filePath = `teams/${fileName}`;

      setUpdatingTeam(true);
      
      const { error: uploadError } = await supabase.storage
        .from('avatar_bucket')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('avatar_bucket').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      showSuccess("Avatar uploaded. Click Save to apply.");
    } catch (error: any) {
      showError("Upload failed: " + error.message);
    } finally {
      setUpdatingTeam(false);
    }
  };

  const addMember = async (userId: string) => {
    if (!team) return;
    setAddingMemberId(userId);

    const userToAdd = connections.find(c => c.id === userId);
    if (userToAdd) {
       setMembers(prev => [...prev, { ...userToAdd, role: 'member' }]);
       setConnections(prev => prev.filter(c => c.id !== userId));
    }

    try {
      const { error } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: userId,
        role: 'member'
      });

      if (error) throw error;
      showSuccess("Member added successfully");
    } catch (err: any) {
      console.error(err);
      showError("Failed to add member");
      if (userToAdd) {
        setMembers(prev => prev.filter(m => m.id !== userId));
        setConnections(prev => [...prev, userToAdd]);
      }
    } finally {
      setAddingMemberId(null);
    }
  };

  const removeMember = async (userId: string) => {
    if (!team) return;
    
    const removedMember = members.find(m => m.id === userId);
    setMembers(prev => prev.filter(m => m.id !== userId));
    if (removedMember) {
       setConnections(prev => [...prev, removedMember]);
    }

    try {
      const { error } = await supabase.from('team_members').delete()
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (error) throw error;
      showSuccess("Member removed");
    } catch (err: any) {
      showError("Failed to remove member");
      if (removedMember) {
         setMembers(prev => [...prev, removedMember]);
         setConnections(prev => prev.filter(c => c.id !== userId));
      }
    }
  };

  const getInitials = (p: any) => {
    if (!p) return "U";
    if (p.first_name && p.last_name) return `${p.first_name[0]}${p.last_name[0]}`.toUpperCase();
    if (p.username) return p.username[0].toUpperCase();
    return "U";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback><Users className="h-5 w-5" /></AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-xl">{name}</DialogTitle>
                <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-md">
                  {description || "No description set"}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setEditMode(!editMode)}>
              {editMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            </Button>
          </div>
        </DialogHeader>

        {editMode ? (
          <ScrollArea className="flex-1 px-1">
            <div className="space-y-4 py-4 pr-4">
              <div className="flex flex-col items-center gap-4 mb-4">
                <Avatar className="h-20 w-20 border-2">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback className="text-2xl"><Users className="h-10 w-10" /></AvatarFallback>
                </Avatar>
                <div className="flex gap-2">
                  <Label htmlFor="team-avatar" className="cursor-pointer">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm hover:bg-muted">
                      <Upload className="h-4 w-4" /> Upload Custom
                    </div>
                    <input id="team-avatar" type="file" accept="image/*" className="hidden" onChange={handleFileUpload} disabled={updatingTeam} />
                  </Label>
                </div>
                
                <div className="w-full space-y-2">
                  <Label className="text-xs text-muted-foreground block text-center">Or choose a team avatar</Label>
                  <ScrollArea className="h-32 w-full border rounded-md p-2">
                    <div className="grid grid-cols-6 gap-2">
                      {PREDEFINED_AVATARS.map((url, i) => (
                        <button 
                          key={i}
                          type="button"
                          onClick={() => setAvatarUrl(url)}
                          className={`aspect-square rounded-full overflow-hidden border-2 transition-all ${avatarUrl === url ? 'border-primary ring-2 ring-primary/30' : 'border-transparent hover:border-muted'}`}
                        >
                          <img src={url} alt={`Option ${i+1}`} className="h-full w-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Team Name</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Team Name" />
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe your team..." className="min-h-[100px]" />
              </div>

              <Button onClick={updateTeamDetails} className="w-full" disabled={updatingTeam || !name.trim()}>
                {updatingTeam ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Team Details
              </Button>
            </div>
          </ScrollArea>
        ) : (
          <Tabs defaultValue="todos" value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="todos">Todos ({todos.length})</TabsTrigger>
              <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 mt-4 overflow-hidden relative">
              {loading ? (
                <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                  <Loader2 className="animate-spin h-8 w-8 text-primary" />
                </div>
              ) : null}

              <TabsContent value="todos" className="h-[400px] m-0">
                <ScrollArea className="h-full pr-4">
                  {todos.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
                      <p>No todos assigned to this team.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {todos.map(todo => (
                        <div key={todo.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50">
                          {todo.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-orange-500 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`font-medium text-sm ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {todo.text}
                            </p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <Badge variant="secondary" className="text-[10px] h-5">{todo.category}</Badge>
                              {todo.due_date && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(todo.due_date), 'MMM d')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              <TabsContent value="members" className="h-[400px] m-0 flex flex-col gap-4">
                <div className="flex-1 min-h-0 flex flex-col gap-4">
                  {/* Current Members List */}
                  <div className="flex-1 min-h-0 border rounded-lg p-2">
                     <h4 className="text-sm font-medium mb-2 px-2">Current Members</h4>
                     <ScrollArea className="h-[150px] sm:h-[180px]">
                        <div className="space-y-1 p-1">
                          {members.map(m => (
                            <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarImage src={m.avatar_url} />
                                  <AvatarFallback>{getInitials(m)}</AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col">
                                  <span className="text-sm font-medium">{m.first_name || m.username}</span>
                                  <span className="text-[10px] text-muted-foreground">@{m.username}</span>
                                </div>
                                {m.role === 'owner' && <Crown className="h-3 w-3 text-yellow-500 ml-1" />}
                              </div>
                              {isOwner && m.role !== 'owner' && (
                                <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeMember(m.id)}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                     </ScrollArea>
                  </div>

                  {/* Add Members Section (Owner Only) */}
                  {isOwner && (
                    <div className="flex-1 min-h-0 border rounded-lg p-2">
                      <h4 className="text-sm font-medium mb-2 px-2">Add from Connections</h4>
                      <ScrollArea className="h-[120px]">
                         {connections.length === 0 ? (
                           <div className="text-center py-4 text-xs text-muted-foreground">
                             No more connections to add.
                           </div>
                         ) : (
                           <div className="space-y-1 p-1">
                             {connections.map(c => (
                               <div key={c.id} className="flex items-center justify-between p-2 rounded border hover:bg-muted/50">
                                 <div className="flex items-center gap-2">
                                    <Avatar className="h-6 w-6">
                                      <AvatarImage src={c.avatar_url} />
                                      <AvatarFallback>{getInitials(c)}</AvatarFallback>
                                    </Avatar>
                                    <span className="text-sm">{c.first_name || c.username}</span>
                                 </div>
                                 <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => addMember(c.id)} 
                                    disabled={addingMemberId === c.id}
                                  >
                                   {addingMemberId === c.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                                 </Button>
                               </div>
                             ))}
                           </div>
                         )}
                      </ScrollArea>
                    </div>
                  )}
                </div>
              </TabsContent>
            </div>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default TeamDetailsDialog;