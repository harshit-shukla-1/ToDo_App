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
import { 
  Loader2, Plus, Trash2, Crown, 
  Users, Pencil, Save, X, 
  FolderKanban, ListTodo, ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { PREDEFINED_AVATARS } from "@/pages/Profile";
import TodoDetailsDialog from "./TodoDetailsDialog";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  created_at: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
}

interface TeamDetailsDialogProps {
  team: Team | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUserId: string | undefined;
}

const TeamDetailsDialog: React.FC<TeamDetailsDialogProps> = ({ team, open, onOpenChange, currentUserId }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("todos");
  const [members, setMembers] = useState<Member[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [personalTodos, setPersonalTodos] = useState<Todo[]>([]);
  const [personalProjects, setPersonalProjects] = useState<Project[]>([]);
  const [connections, setConnections] = useState<Member[]>([]);
  const [loading, setLoading] = useState(false);
  const [updatingTeam, setUpdatingTeam] = useState(false);
  const [addingMemberId, setAddingMemberId] = useState<string | null>(null);

  // View States
  const [viewTodo, setViewTodo] = useState<Todo | null>(null);

  // Edit states for team details
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");

  const isOwner = team?.created_by === currentUserId;

  useEffect(() => {
    if (open && team && currentUserId) {
      fetchData();
      setName(team.name);
      setDescription(team.description || "");
      setAvatarUrl(team.avatar_url || "");
      setEditMode(false);
    }
  }, [open, team, currentUserId]);

  const fetchData = async () => {
    if (!team || !currentUserId) return;
    setLoading(true);
    try {
      // 1. Fetch Team Todos & Projects
      const [todosRes, projectsRes] = await Promise.all([
        supabase.from('todos').select('*').eq('team_id', team.id).order('created_at', { ascending: false }),
        supabase.from('projects').select('*').eq('team_id', team.id).order('created_at', { ascending: false })
      ]);
      
      setTodos(todosRes.data || []);
      setProjects(projectsRes.data || []);

      // 2. Fetch Personal items (available to be assigned)
      const [pTodosRes, pProjectsRes] = await Promise.all([
        supabase.from('todos').select('*').is('team_id', null).eq('user_id', currentUserId).eq('archived', false),
        supabase.from('projects').select('*').is('team_id', null).eq('user_id', currentUserId)
      ]);
      
      setPersonalTodos(pTodosRes.data || []);
      setPersonalProjects(pProjectsRes.data || []);

      // 3. Fetch Team Members
      const { data: teamMembersData } = await supabase
        .from('team_members')
        .select('user_id, role')
        .eq('team_id', team.id);

      const memberIds = teamMembersData?.map(m => m.user_id) || [];
      const roleMap = new Map(teamMembersData?.map(m => [m.user_id, m.role]));

      if (memberIds.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', memberIds);

        setMembers((profilesData || []).map((p: any) => ({
          ...p,
          role: roleMap.get(p.id) || 'member'
        })));
      } else {
        setMembers([]);
      }

      // 4. Fetch Connections
      const { data: connData, error: connError } = await supabase
        .from('connections')
        .select(`
          requester_id,
          recipient_id,
          requester:profiles!requester_id(*),
          recipient:profiles!recipient_id(*)
        `)
        .or(`requester_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .eq('status', 'accepted');

      if (connError) throw connError;

      const profiles = connData?.map((c: any) => {
        // If I am the requester, return the recipient. Otherwise return the requester.
        return c.requester_id === currentUserId ? c.recipient : c.requester;
      }).filter(p => p && p.id !== currentUserId) || [];

      // Filter out people who are already in the team
      const currentMemberIds = new Set(memberIds);
      const filteredConnections = profiles.filter(p => p && !currentMemberIds.has(p.id));
      
      setConnections(filteredConnections);

    } catch (err) {
      console.error("Team data fetch error:", err);
      showError("Failed to load team details");
    } finally {
      setLoading(false);
    }
  };

  const assignTodoToTeam = async (todoId: string) => {
    if (!team) return;
    try {
      const { error } = await supabase.from('todos').update({ team_id: team.id }).eq('id', todoId);
      if (error) throw error;
      fetchData();
      showSuccess("Todo assigned to team");
    } catch (err) {
      showError("Assignment failed");
    }
  };

  const removeTodoFromTeam = async (todoId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('todos').update({ team_id: null }).eq('id', todoId);
      if (error) throw error;
      fetchData();
      showSuccess("Todo removed from team");
    } catch (err) {
      showError("Removal failed");
    }
  };

  const assignProjectToTeam = async (projectId: string) => {
    if (!team) return;
    try {
      const { error } = await supabase.from('projects').update({ team_id: team.id }).eq('id', projectId);
      if (error) throw error;
      fetchData();
      showSuccess("Project assigned to team");
    } catch (err) {
      showError("Assignment failed");
    }
  };

  const removeProjectFromTeam = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase.from('projects').update({ team_id: null }).eq('id', projectId);
      if (error) throw error;
      fetchData();
      showSuccess("Project removed from team");
    } catch (err) {
      showError("Removal failed");
    }
  };

  const updateTeamDetails = async () => {
    if (!team) return;
    setUpdatingTeam(true);
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name, description, avatar_url: avatarUrl })
        .eq('id', team.id);

      if (error) throw error;
      showSuccess("Team updated!");
      setEditMode(false);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setUpdatingTeam(false);
    }
  };

  const addMember = async (userId: string) => {
    if (!team || userId === "none" || !userId) return;
    setAddingMemberId(userId);
    try {
      const { error } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: userId,
        role: 'member'
      });
      if (error) throw error;
      fetchData();
      showSuccess("Member added");
    } catch (err) {
      showError("Failed to add member");
    } finally {
      setAddingMemberId(null);
    }
  };

  const removeMember = async (userId: string) => {
    if (!team) return;
    try {
      const { error } = await supabase.from('team_members').delete()
        .eq('team_id', team.id)
        .eq('user_id', userId);
      if (error) throw error;
      fetchData();
      showSuccess("Member removed");
    } catch (err) {
      showError("Failed to remove member");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[95vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-6">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border">
                  <AvatarImage src={avatarUrl} />
                  <AvatarFallback><Users className="h-5 w-5" /></AvatarFallback>
                </Avatar>
                <div className="overflow-hidden">
                  <DialogTitle className="text-xl truncate">{name}</DialogTitle>
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
                  <div className="w-full space-y-2">
                    <Label className="text-xs text-muted-foreground block text-center">Choose a team avatar</Label>
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
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="todos">Todos ({todos.length})</TabsTrigger>
                <TabsTrigger value="projects">Projects ({projects.length})</TabsTrigger>
                <TabsTrigger value="members">Members ({members.length})</TabsTrigger>
              </TabsList>

              <div className="flex-1 min-h-0 mt-4 overflow-hidden relative">
                {loading && <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>}

                <TabsContent value="todos" className="h-[450px] m-0 flex flex-col gap-4 overflow-y-auto pr-2">
                  <div className="border rounded-lg p-2 shrink-0">
                    <h4 className="text-sm font-medium mb-2 px-2 flex items-center gap-2">
                      <ListTodo className="h-4 w-4 text-primary" /> Team Tasks
                    </h4>
                    <div className="space-y-1">
                        {todos.length === 0 ? <p className="text-center py-4 text-xs text-muted-foreground">No tasks in this team.</p> : (
                          todos.map(t => (
                            <div 
                              key={t.id} 
                              className="flex items-center justify-between p-2 rounded hover:bg-muted/50 border border-transparent hover:border-border cursor-pointer transition-colors"
                              onClick={() => setViewTodo(t)}
                            >
                              <span className="text-sm truncate pr-2">{t.text}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={(e) => removeTodoFromTeam(t.id, e)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-2 shrink-0">
                    <h4 className="text-sm font-medium mb-2 px-2">Assign from Personal</h4>
                    <div className="space-y-1">
                      {personalTodos.length === 0 ? <p className="text-center py-4 text-xs text-muted-foreground">No unassigned personal tasks.</p> : (
                        personalTodos.map(t => (
                            <div 
                              key={t.id} 
                              className="flex items-center justify-between p-2 rounded border hover:bg-muted/30 cursor-pointer"
                              onClick={() => setViewTodo(t)}
                            >
                              <span className="text-sm truncate pr-2">{t.text}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); assignTodoToTeam(t.id); }}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="projects" className="h-[450px] m-0 flex flex-col gap-4 overflow-y-auto pr-2">
                  <div className="border rounded-lg p-2 shrink-0">
                    <h4 className="text-sm font-medium mb-2 px-2 flex items-center gap-2">
                      <FolderKanban className="h-4 w-4 text-primary" /> Team Projects
                    </h4>
                    <div className="space-y-1">
                        {projects.length === 0 ? <p className="text-center py-4 text-xs text-muted-foreground">No projects in this team.</p> : (
                          projects.map(p => (
                            <div 
                              key={p.id} 
                              className="flex items-center justify-between p-2 rounded hover:bg-muted/50 border border-transparent hover:border-border cursor-pointer"
                              onClick={() => { onOpenChange(false); navigate(`/todos?project=${p.id}`); }}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-sm truncate pr-2 font-medium">{p.name}</span>
                                <ExternalLink className="h-3 w-3 text-muted-foreground" />
                              </div>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive shrink-0" onClick={(e) => removeProjectFromTeam(p.id, e)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ))
                        )}
                    </div>
                  </div>

                  <div className="border rounded-lg p-2 shrink-0">
                    <h4 className="text-sm font-medium mb-2 px-2">Assign from Personal</h4>
                    <div className="space-y-1">
                      {personalProjects.length === 0 ? <p className="text-center py-4 text-xs text-muted-foreground">No unassigned personal projects.</p> : (
                        personalProjects.map(p => (
                            <div 
                              key={p.id} 
                              className="flex items-center justify-between p-2 rounded border hover:bg-muted/30 cursor-pointer"
                              onClick={() => { onOpenChange(false); navigate(`/todos?project=${p.id}`); }}
                            >
                              <span className="text-sm truncate pr-2">{p.name}</span>
                              <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); assignProjectToTeam(p.id); }}>
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="members" className="h-[450px] m-0 flex flex-col gap-4 overflow-y-auto pr-2">
                  {isOwner && (
                    <div className="border-b pb-4 mb-4">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Add Connections</Label>
                      <div className="flex gap-2">
                        <Select onValueChange={addMember} disabled={addingMemberId !== null}>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={connections.length > 0 ? "Select a connection..." : "No connections to add"} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>Select to add</SelectItem>
                            {connections.map(c => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.first_name ? `${c.first_name} ${c.last_name || ''}` : `@${c.username}`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="flex-1">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 block">Current Members</Label>
                      <div className="space-y-2">
                        {members.map(m => (
                          <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/30 border">
                            <div className="flex items-center gap-3 min-w-0">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={m.avatar_url} />
                                <AvatarFallback>{(m.first_name?.[0] || m.username?.[0] || "U").toUpperCase()}</AvatarFallback>
                              </Avatar>
                              <div className="flex flex-col min-w-0">
                                <span className="text-sm font-medium truncate">
                                  {m.first_name ? `${m.first_name} ${m.last_name || ''}` : m.username}
                                </span>
                                <span className="text-[10px] text-muted-foreground truncate">@{m.username}</span>
                              </div>
                              {m.role === 'owner' && (
                                <Badge variant="secondary" className="h-5 px-1.5 bg-yellow-100 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400 gap-1 text-[10px]">
                                  <Crown className="h-3 w-3" /> Owner
                                </Badge>
                              )}
                            </div>
                            {isOwner && m.role !== 'owner' && (
                              <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive shrink-0" onClick={() => removeMember(m.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <TodoDetailsDialog 
        open={!!viewTodo}
        onOpenChange={(open) => !open && setViewTodo(null)}
        todo={viewTodo}
        onEdit={(id) => { setViewTodo(null); onOpenChange(false); navigate(`/todos/${id}`); }}
      />
    </>
  );
};

export default TeamDetailsDialog;