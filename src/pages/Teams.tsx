"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Plus, Users, UserPlus, Trash2, Crown, Pencil, Settings } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Team {
  id: string;
  name: string;
  created_by: string;
}

interface Member {
  id: string; // profile id
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
  role?: string;
}

const Teams = () => {
  const { user } = useSession();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Create State
  const [newTeamName, setNewTeamName] = useState("");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  // Edit State
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  // Delete State
  const [deleteTeamId, setDeleteTeamId] = useState<string | null>(null);
  
  // Member Management State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<Member[]>([]);
  const [connections, setConnections] = useState<Member[]>([]);
  const [manageDialogOpen, setManageDialogOpen] = useState(false);
  const [memberLoading, setMemberLoading] = useState(false);

  useEffect(() => {
    if (user) fetchTeams();
  }, [user]);

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      setTeams(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('teams')
        .insert({ name: newTeamName, created_by: user?.id })
        .select()
        .single();
      
      if (error) throw error;
      
      // Auto add creator
      await supabase.from('team_members').insert({ 
        team_id: data.id, 
        user_id: user?.id, 
        role: 'owner' 
      });
      
      setTeams([...teams, data]);
      setNewTeamName("");
      setCreateDialogOpen(false);
      showSuccess("Team created!");
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleEditClick = (team: Team) => {
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditDialogOpen(true);
  };

  const updateTeam = async () => {
    if (!editingTeam || !editTeamName.trim()) return;
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: editTeamName })
        .eq('id', editingTeam.id);

      if (error) throw error;
      
      setTeams(teams.map(t => t.id === editingTeam.id ? { ...t, name: editTeamName } : t));
      setEditDialogOpen(false);
      showSuccess("Team updated");
    } catch (err: any) {
      showError("Failed to update team");
    }
  };

  const deleteTeam = async () => {
    if (!deleteTeamId) return;
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', deleteTeamId);

      if (error) throw error;
      
      setTeams(teams.filter(t => t.id !== deleteTeamId));
      setDeleteTeamId(null);
      showSuccess("Team deleted");
    } catch (err: any) {
      showError("Failed to delete team");
    }
  };

  const openManageDialog = async (team: Team) => {
    setSelectedTeam(team);
    setManageDialogOpen(true);
    setMemberLoading(true);
    
    try {
      // Fetch Members
      const { data: members } = await supabase
        .from('team_members')
        .select('user_id, role, profiles:user_id(*)')
        .eq('team_id', team.id);
      
      const formattedMembers = members?.map((m: any) => ({
        ...m.profiles,
        role: m.role
      })).filter(p => p) || []; // Filter null profiles
      
      setTeamMembers(formattedMembers);

      // Fetch Connections (Potential members)
      const { data: connData } = await supabase
        .from('connections')
        .select(`
          requester:profiles!requester_id(*),
          recipient:profiles!recipient_id(*)
        `)
        .or(`requester_id.eq.${user?.id},recipient_id.eq.${user?.id}`)
        .eq('status', 'accepted');

      // Process connections to find the "other" person
      const profiles = connData?.map((c: any) => {
        const otherProfile = c.requester_id === user?.id ? c.recipient : c.requester;
        return otherProfile;
      }).filter(p => p && p.id !== user?.id) || []; // Ensure profile exists and is NOT me

      // Filter out existing members from the potential list
      const memberIds = new Set(formattedMembers.map((m: any) => m.id));
      setConnections(profiles.filter((p: any) => !memberIds.has(p.id)));

    } catch (err) {
      console.error(err);
    } finally {
      setMemberLoading(false);
    }
  };

  const addMember = async (userId: string) => {
    if (!selectedTeam) return;
    try {
      const { error } = await supabase.from('team_members').insert({
        team_id: selectedTeam.id,
        user_id: userId,
        role: 'member'
      });

      if (error) throw error;
      
      // Refresh local state roughly
      const addedProfile = connections.find(c => c.id === userId);
      if (addedProfile) {
        setTeamMembers([...teamMembers, { ...addedProfile, role: 'member' }]);
        setConnections(connections.filter(c => c.id !== userId));
      }
      showSuccess("Member added");
    } catch (err: any) {
      console.error("Add member error:", err);
      showError("Failed to add member: " + err.message);
    }
  };

  const removeMember = async (userId: string) => {
    if (!selectedTeam) return;
    try {
      const { error } = await supabase.from('team_members').delete()
        .eq('team_id', selectedTeam.id)
        .eq('user_id', userId);

      if (error) throw error;
        
      setTeamMembers(teamMembers.filter(m => m.id !== userId));
      showSuccess("Member removed");
    } catch (err: any) {
      console.error("Remove member error:", err);
      showError("Failed to remove member: " + err.message);
    }
  };

  const getInitials = (p: any) => {
    if (!p) return "U";
    if (p.first_name && p.last_name) return `${p.first_name[0]}${p.last_name[0]}`.toUpperCase();
    if (p.username) return p.username[0].toUpperCase();
    return "U";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Teams</h2>
          <p className="text-muted-foreground">Collaborate with your connections</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Team
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Team</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Input 
                  placeholder="Team Name" 
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={createTeam} className="w-full" disabled={!newTeamName.trim()}>Create</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>You haven't joined any teams yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <Card key={team.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg truncate">{team.name}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-1">
                 <div className="text-sm text-muted-foreground mb-4">
                    {team.created_by === user?.id ? (
                      <span className="flex items-center gap-1 text-yellow-600 dark:text-yellow-500 font-medium">
                        <Crown className="h-3 w-3" /> Team Owner
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> Member
                      </span>
                    )}
                 </div>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4 bg-muted/20">
                 <Button variant="outline" size="sm" onClick={() => openManageDialog(team)}>
                   Members
                 </Button>
                 
                 {team.created_by === user?.id && (
                   <div className="flex gap-1">
                     <Button variant="ghost" size="icon" onClick={() => handleEditClick(team)} title="Rename Team">
                       <Pencil className="h-4 w-4" />
                     </Button>
                     <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => setDeleteTeamId(team.id)} title="Delete Team">
                       <Trash2 className="h-4 w-4" />
                     </Button>
                   </div>
                 )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Team Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Input 
                placeholder="Team Name" 
                value={editTeamName}
                onChange={(e) => setEditTeamName(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={updateTeam} disabled={!editTeamName.trim()}>Save</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage Members Dialog */}
      <Dialog open={manageDialogOpen} onOpenChange={setManageDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Manage {selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Current Members */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Team Members</h4>
              {memberLoading ? <Loader2 className="animate-spin h-4 w-4" /> : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                   {teamMembers.map(m => (
                     <div key={m.id} className="flex items-center justify-between p-2 rounded bg-muted/50">
                        <div className="flex items-center gap-2">
                           <Avatar className="h-6 w-6">
                            <AvatarImage src={m.avatar_url} />
                            <AvatarFallback>{getInitials(m)}</AvatarFallback>
                          </Avatar>
                          <span className="text-sm">{m.username || m.first_name}</span>
                          {m.role === 'owner' && <Crown className="h-3 w-3 text-yellow-500" />}
                        </div>
                        {m.role !== 'owner' && selectedTeam?.created_by === user?.id && (
                           <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => removeMember(m.id)}>
                             <Trash2 className="h-3 w-3" />
                           </Button>
                        )}
                     </div>
                   ))}
                </div>
              )}
            </div>

            {/* Add Members */}
            {selectedTeam?.created_by === user?.id && (
               <div className="space-y-2">
                 <h4 className="text-sm font-medium text-muted-foreground">Add from Connections</h4>
                 {connections.length === 0 ? (
                   <p className="text-xs text-muted-foreground italic">No available connections to add.</p>
                 ) : (
                   <div className="space-y-2 max-h-[200px] overflow-y-auto">
                     {connections.map(c => (
                        <div key={c.id} className="flex items-center justify-between p-2 border rounded">
                           <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={c.avatar_url} />
                                <AvatarFallback>{getInitials(c)}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm">{c.username || c.first_name}</span>
                           </div>
                           <Button size="sm" variant="ghost" onClick={() => addMember(c.id)}>
                             <Plus className="h-4 w-4" />
                           </Button>
                        </div>
                     ))}
                   </div>
                 )}
               </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTeamId}
        onOpenChange={(open) => !open && setDeleteTeamId(null)}
        title="Delete Team"
        description="Are you sure you want to delete this team? This will remove all members and cannot be undone."
        onConfirm={deleteTeam}
        confirmText="Delete Team"
        variant="destructive"
      />
    </div>
  );
};

export default Teams;