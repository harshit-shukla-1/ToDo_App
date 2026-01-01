"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Plus, FolderKanban, Trash2, Pencil, ListTodo, Users, Check } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  user_id: string;
  assigned_teams?: string[]; // Array of team IDs
}

const Projects = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");
  const [editSelectedTeamIds, setEditSelectedTeamIds] = useState<string[]>([]);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  
  const [deleteProjectId, setDeleteProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProjects();
      fetchTeams();
    }
  }, [user]);

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('id, name');
    setAllTeams(data || []);
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      
      // Fetch team assignments for each project
      const projectsWithTeams = await Promise.all((data || []).map(async (p) => {
        const { data: teamData } = await supabase.from('project_teams').select('team_id').eq('project_id', p.id);
        return {
          ...p,
          assigned_teams: teamData?.map(t => t.team_id) || []
        };
      }));

      setProjects(projectsWithTeams);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert({ 
          name: newProjectName, 
          description: newProjectDesc,
          user_id: user?.id
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Assign teams
      if (selectedTeamIds.length > 0) {
        const assignments = selectedTeamIds.map(tid => ({ project_id: project.id, team_id: tid }));
        await supabase.from('project_teams').insert(assignments);
      }
      
      setProjects([{ ...project, assigned_teams: selectedTeamIds }, ...projects]);
      setNewProjectName("");
      setNewProjectDesc("");
      setSelectedTeamIds([]);
      setCreateDialogOpen(false);
      showSuccess("Project created!");
    } catch (err: any) {
      showError(err.message);
    }
  };

  const handleEditClick = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingProject(project);
    setEditProjectName(project.name);
    setEditProjectDesc(project.description || "");
    setEditSelectedTeamIds(project.assigned_teams || []);
    setEditDialogOpen(true);
  };

  const updateProject = async () => {
    if (!editingProject || !editProjectName.trim()) return;
    try {
      // 1. Update project basics
      const { error: pError } = await supabase
        .from('projects')
        .update({ 
          name: editProjectName, 
          description: editProjectDesc
        })
        .eq('id', editingProject.id);

      if (pError) throw pError;
      
      // 2. Update team assignments
      await supabase.from('project_teams').delete().eq('project_id', editingProject.id);
      if (editSelectedTeamIds.length > 0) {
        const assignments = editSelectedTeamIds.map(tid => ({ project_id: editingProject.id, team_id: tid }));
        await supabase.from('project_teams').insert(assignments);
      }
      
      setProjects(projects.map(p => p.id === editingProject.id ? { 
        ...p, 
        name: editProjectName, 
        description: editProjectDesc,
        assigned_teams: editSelectedTeamIds
      } : p));
      setEditDialogOpen(false);
      showSuccess("Project updated");
    } catch (err: any) {
      showError("Failed to update project");
    }
  };

  const deleteProject = async () => {
    if (!deleteProjectId) return;
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', deleteProjectId);

      if (error) throw error;
      
      setProjects(projects.filter(p => p.id !== deleteProjectId));
      setDeleteProjectId(null);
      showSuccess("Project deleted");
    } catch (err: any) {
      showError("Failed to delete project");
    }
  };

  const getTeamNames = (ids: string[]) => {
    return allTeams.filter(t => ids.includes(t.id)).map(t => t.name);
  };

  const toggleTeamSelection = (teamId: string, isEditing: boolean) => {
    const current = isEditing ? editSelectedTeamIds : selectedTeamIds;
    const setter = isEditing ? setEditSelectedTeamIds : setSelectedTeamIds;
    
    if (current.includes(teamId)) {
      setter(current.filter(id => id !== teamId));
    } else {
      setter([...current, teamId]);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Projects</h2>
          <p className="text-muted-foreground">Organize your todos into projects</p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Project</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Project Name</Label>
                <Input 
                  placeholder="Project Name" 
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  placeholder="Short Description" 
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Assign Teams</Label>
                <ScrollArea className="h-40 border rounded-md p-2">
                  <div className="space-y-2">
                    {allTeams.length === 0 ? <p className="text-xs text-muted-foreground p-2">No teams found.</p> : allTeams.map(t => (
                      <div key={t.id} className="flex items-center space-x-2 p-1">
                        <Checkbox 
                          id={`team-${t.id}`} 
                          checked={selectedTeamIds.includes(t.id)}
                          onCheckedChange={() => toggleTeamSelection(t.id, false)}
                        />
                        <label htmlFor={`team-${t.id}`} className="text-sm font-medium leading-none cursor-pointer">
                          {t.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
              <DialogFooter>
                <Button onClick={createProject} className="w-full" disabled={!newProjectName.trim()}>Create Project</Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg bg-muted/10">
          <FolderKanban className="h-12 w-12 mx-auto mb-4 opacity-20" />
          <p>No projects yet. Create one to start organizing!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Card 
              key={project.id} 
              className="flex flex-col cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
              onClick={() => navigate(`/todos?project=${project.id}`)}
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-lg truncate">{project.name}</CardTitle>
                <FolderKanban className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                <div className="flex flex-wrap gap-1">
                  {project.assigned_teams && project.assigned_teams.length > 0 ? (
                    getTeamNames(project.assigned_teams).map((name, idx) => (
                      <Badge key={idx} variant="outline" className="bg-purple-50 text-purple-600 border-purple-200 flex items-center gap-1 text-[10px]">
                        <Users className="h-2 w-2" /> {name}
                      </Badge>
                    ))
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-gray-500">Personal</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {project.description || "No description provided."}
                </p>
              </CardContent>
              <CardFooter className="flex justify-between border-t pt-4 bg-muted/20 min-h-[50px]">
                 <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/todos?project=${project.id}`); }}>
                       <ListTodo className="h-4 w-4 mr-1" /> Tasks
                    </Button>
                 </div>
                 {project.user_id === user?.id && (
                   <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={(e) => handleEditClick(project, e)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteProjectId(project.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                 )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Project Name</Label>
              <Input 
                placeholder="Project Name" 
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Description" 
                value={editProjectDesc}
                onChange={(e) => setEditProjectDesc(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Assign Teams</Label>
              <ScrollArea className="h-40 border rounded-md p-2">
                <div className="space-y-2">
                  {allTeams.map(t => (
                    <div key={t.id} className="flex items-center space-x-2 p-1">
                      <Checkbox 
                        id={`edit-team-${t.id}`} 
                        checked={editSelectedTeamIds.includes(t.id)}
                        onCheckedChange={() => toggleTeamSelection(t.id, true)}
                      />
                      <label htmlFor={`edit-team-${t.id}`} className="text-sm font-medium leading-none cursor-pointer">
                        {t.name}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={updateProject} disabled={!editProjectName.trim()}>Save Changes</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
      
      <ConfirmDialog
        open={!!deleteProjectId}
        onOpenChange={(open) => !open && setDeleteProjectId(null)}
        title="Delete Project"
        description="Are you sure? Todos belonging to this project will become 'Miscellaneous'."
        onConfirm={deleteProject}
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
};

export default Projects;