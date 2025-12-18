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
import { Loader2, Plus, Trash2, Crown, CheckCircle2, Circle, Users, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface Team {
  id: string;
  name: string;
  created_by: string;
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
  const [addingMember, setAddingMember] = useState(false);

  const isOwner = team?.created_by === currentUserId;

  useEffect(() => {
    if (open && team) {
      fetchData();
    }
  }, [open, team]);

  const fetchData = async () => {
    if (!team) return;
    setLoading(true);
    try {
      // Fetch Todos
      const { data: todosData } = await supabase
        .from('todos')
        .select('*')
        .eq('team_id', team.id)
        .order('created_at', { ascending: false });
      
      setTodos(todosData || []);

      // Fetch Members
      const { data: membersData } = await supabase
        .from('team_members')
        .select('user_id, role, profiles:user_id(*)')
        .eq('team_id', team.id);

      const formattedMembers = membersData?.map((m: any) => ({
        ...m.profiles,
        role: m.role
      })).filter(p => p) || [];
      
      setMembers(formattedMembers);

      // Fetch Connections (for adding members)
      if (isOwner) {
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
        const memberIds = new Set(formattedMembers.map(m => m.id));
        setConnections(profiles.filter(p => !memberIds.has(p.id)));
      }

    } catch (err) {
      console.error(err);
      showError("Failed to load team details");
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (userId: string) => {
    if (!team) return;
    setAddingMember(true);
    try {
      const { error } = await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: userId,
        role: 'member'
      });

      if (error) throw error;
      
      showSuccess("Member added successfully");
      // Refresh data
      fetchData();
    } catch (err: any) {
      console.error(err);
      showError("Failed to add member: " + err.message);
    } finally {
      setAddingMember(false);
    }
  };

  const removeMember = async (userId: string) => {
    if (!team) return;
    try {
      const { error } = await supabase.from('team_members').delete()
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (error) throw error;
      
      setMembers(prev => prev.filter(m => m.id !== userId));
      // Add back to connections list if applicable
      const removedMember = members.find(m => m.id === userId);
      if (removedMember && connections.every(c => c.id !== userId)) {
         setConnections(prev => [...prev, removedMember]);
      }
      showSuccess("Member removed");
    } catch (err: any) {
      showError("Failed to remove member");
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
          <DialogTitle className="text-xl flex items-center gap-2">
            <Users className="h-5 w-5" /> {team?.name}
          </DialogTitle>
        </DialogHeader>

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
                               <Button size="sm" variant="ghost" onClick={() => addMember(c.id)} disabled={addingMember}>
                                 <Plus className="h-4 w-4" />
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
      </DialogContent>
    </Dialog>
  );
};

export default TeamDetailsDialog;