"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Users, UserPlus, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ShareTodoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  todoId: string | null;
}

const ShareTodoDialog: React.FC<ShareTodoDialogProps> = ({ open, onOpenChange, todoId }) => {
  const { user } = useSession();
  const [loading, setLoading] = useState(false);
  const [connections, setConnections] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [sharedUsers, setSharedUsers] = useState<Set<string>>(new Set());
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(null);

  useEffect(() => {
    if (open && user && todoId) {
      fetchData();
    }
  }, [open, user, todoId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Connections
      const { data: connData } = await supabase
        .from('connections')
        .select(`
          requester:profiles!requester_id(*),
          recipient:profiles!recipient_id(*)
        `)
        .or(`requester_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .eq('status', 'accepted');

      const profiles = connData?.map((c: any) => 
        c.requester_id === user?.id ? c.recipient : c.requester
      ) || [];
      setConnections(profiles);

      // 2. Fetch Teams
      const { data: teamData } = await supabase
        .from('teams')
        .select('*');
      
      // Filter via RLS automatically, but explicit query helps
      setTeams(teamData || []);

      // 3. Fetch Existing Shares
      const { data: shares } = await supabase
        .from('todo_shares')
        .select('user_id')
        .eq('todo_id', todoId);
      
      setSharedUsers(new Set(shares?.map(s => s.user_id)));

      // 4. Fetch Current Team Assignment
      const { data: todo } = await supabase
        .from('todos')
        .select('team_id')
        .eq('id', todoId)
        .single();
      
      setCurrentTeamId(todo?.team_id || null);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShareUser = async (userId: string) => {
    if (!todoId) return;
    try {
      if (sharedUsers.has(userId)) {
        // Unshare
        await supabase.from('todo_shares').delete().match({ todo_id: todoId, user_id: userId });
        const next = new Set(sharedUsers);
        next.delete(userId);
        setSharedUsers(next);
        showSuccess("Removed access");
      } else {
        // Share
        await supabase.from('todo_shares').insert({ todo_id: todoId, user_id: userId });
        setSharedUsers(new Set(sharedUsers).add(userId));
        showSuccess("Shared with user");
      }
    } catch (err: any) {
      showError("Action failed");
    }
  };

  const handleShareTeam = async (teamId: string) => {
    if (!todoId) return;
    try {
      const newId = currentTeamId === teamId ? null : teamId;
      await supabase.from('todos').update({ team_id: newId }).eq('id', todoId);
      setCurrentTeamId(newId);
      showSuccess(newId ? "Assigned to team" : "Removed from team");
    } catch (err: any) {
      showError("Action failed");
    }
  };

  const getInitials = (p: any) => {
    if (p.first_name && p.last_name) return `${p.first_name[0]}${p.last_name[0]}`.toUpperCase();
    if (p.username) return p.username[0].toUpperCase();
    return "U";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Todo</DialogTitle>
          <DialogDescription>
            Share this task with people or teams to collaborate.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
        ) : (
          <Tabs defaultValue="people" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="people">People</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
            </TabsList>
            
            <TabsContent value="people" className="mt-4">
              <ScrollArea className="h-[250px] pr-4">
                {connections.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No connections found.</p>
                ) : (
                  <div className="space-y-3">
                    {connections.map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={p.avatar_url} />
                            <AvatarFallback>{getInitials(p)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{p.first_name} {p.last_name}</p>
                            <p className="text-xs text-muted-foreground">@{p.username}</p>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant={sharedUsers.has(p.id) ? "secondary" : "outline"}
                          onClick={() => handleShareUser(p.id)}
                        >
                          {sharedUsers.has(p.id) ? "Shared" : "Share"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>
            
            <TabsContent value="teams" className="mt-4">
               <ScrollArea className="h-[250px] pr-4">
                {teams.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No teams found.</p>
                ) : (
                  <div className="space-y-3">
                    {teams.map((t) => (
                      <div key={t.id} className="flex items-center justify-between border p-3 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                            <Users className="h-4 w-4" />
                          </div>
                          <p className="font-medium">{t.name}</p>
                        </div>
                        <Button 
                          size="sm" 
                          variant={currentTeamId === t.id ? "default" : "outline"}
                          onClick={() => handleShareTeam(t.id)}
                        >
                           {currentTeamId === t.id ? <Check className="h-4 w-4 mr-1" /> : <UserPlus className="h-4 w-4 mr-1" />}
                           {currentTeamId === t.id ? "Assigned" : "Assign"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
               </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ShareTodoDialog;