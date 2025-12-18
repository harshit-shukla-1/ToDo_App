"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Plus, Users, Trash2, Crown, Pencil } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import TeamDetailsDialog from "@/components/TeamDetailsDialog";

interface Team {
  id: string;
  name: string;
  created_by: string;
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
  
  // Details/Manage Dialog State
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

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
      
      // Auto add creator (although trigger or policy might handle this, explicit is safer)
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

  const handleEditClick = (team: Team, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTeam(team);
    setEditTeamName(team.name);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (teamId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTeamId(teamId);
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

  const handleTeamClick = (team: Team) => {
    setSelectedTeam(team);
    setDetailsDialogOpen(true);
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
            <Card 
              key={team.id} 
              className="flex flex-col cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
              onClick={() => handleTeamClick(team)}
            >
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
              <CardFooter className="flex justify-end border-t pt-4 bg-muted/20 min-h-[50px]">
                 {team.created_by === user?.id && (
                   <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                     <Button variant="ghost" size="icon" onClick={(e) => handleEditClick(team, e)} title="Rename Team">
                       <Pencil className="h-4 w-4" />
                     </Button>
                     <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={(e) => handleDeleteClick(team.id, e)} title="Delete Team">
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

      {/* Team Details & Management Dialog */}
      <TeamDetailsDialog 
        team={selectedTeam}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        currentUserId={user?.id}
      />
      
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