"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Plus, FolderKanban, Trash2, Pencil, ListTodo, Users } from "lucide-react";
import ConfirmDialog from "@/components/ConfirmDialog";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
  team_id?: string | null;
}

const Projects = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDesc, setNewProjectDesc] = useState("");
  const [newProjectTeamId, setNewProjectTeamId] = useState("none");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editProjectName, setEditProjectName] = useState("");
  const [editProjectDesc, setEditProjectDesc] = useState("");
  const [editProjectTeamId, setEditProjectTeamId] = useState("none");
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
    setTeams(data || []);
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('projects').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      setProjects(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({ 
          name: newProjectName, 
          description: newProjectDesc,
          user_id: user?.id,
          team_id: newProjectTeamId === "none" ? null : newProjectTeamId
        })
        .select()
        .single();
      
      if (error) throw error;
      
      setProjects([data, ...projects]);
      setNewProjectName("");
      setNewProjectDesc("");
      setNewProjectTeamId("none");
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
    setEditProjectTeamId(project.team_id || "none");
    setEditDialogOpen(true);
  };

  const updateProject = async () => {
    if (!editingProject || !editProjectName.trim()) return;
    try {
      const { error } = await supabase
        .from('projects')
        .update({ 
          name: editProjectName, 
          description: editProjectDesc,
          team_id: editProjectTeamId === "none" ? null : editProjectTeamId
        })
        .eq('id', editingProject.id);

      if (error) throw error;
      
      setProjects(projects.map(p => p.id === editingProject.id ? { 
        ...p, 
        name: editProjectName, 
        description: editProjectDesc,
        team_id: editProjectTeamId === "none" ? null : editProjectTeamId
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

  const getTeamName = (id?: string | null) => {
    if (!id) return null;
    const team = teams.find(t => t.id === id);
    return team ? team.name : "Unknown Team";
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
          <DialogContent>
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
                <Label>Team (Optional)</Label>
                <Select value={newProjectTeamId} onValueChange={setNewProjectTeamId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No Team" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Team (Personal)</SelectItem>
                    {teams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input 
                  placeholder="Short Description (Optional)" 
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button onClick={createProject} className="w-full" disabled={!newProjectName.trim()}>Create</Button>
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
              <CardContent className="flex-1">
                {project.team_id && (
                  <Badge variant="outline" className="mb-2 bg-purple-50 text-purple-600 border-purple-200 flex items-center gap-1 w-fit">
                    <Users className="h-3 w-3" /> {getTeamName(project.team_id)}
                  </Badge>
                )}
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
                 <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                   <Button variant="ghost" size="icon" onClick={(e) => handleEditClick(project, e)}>
                     <Pencil className="h-4 w-4" />
                   </Button>
                   <Button variant="ghost" size="icon" className="text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteProjectId(project.id); }}>
                     <Trash2 className="h-4 w-4" />
                   </Button>
                 </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
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
              <Label>Team Association</Label>
              <Select value={editProjectTeamId} onValueChange={setEditProjectTeamId}>
                <SelectTrigger>
                  <SelectValue placeholder="No Team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Team (Personal)</SelectItem>
                  {teams.map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                placeholder="Description" 
                value={editProjectDesc}
                onChange={(e) => setEditProjectDesc(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={updateProject} disabled={!editProjectName.trim()}>Save</Button>
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