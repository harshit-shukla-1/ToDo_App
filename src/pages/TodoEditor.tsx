"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Save, ArrowLeft, Loader2, AlertCircle, FolderKanban, Users, UserCheck, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";

const TodoEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [availableTeams, setAvailableTeams] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    text: "",
    category: "Personal",
    priority: "normal",
    due_date: undefined as Date | undefined,
    completed: false,
    reminder_minutes_before: "0",
    project_id: "none",
    team_id: "none",
  });

  const [assignedUserIds, setAssignedUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchContextData();
      if (isEditing) {
        fetchTodo();
      }
    }
  }, [id, user]);

  // When project changes, filter teams
  useEffect(() => {
    if (formData.project_id === "none") {
      setAvailableTeams([]);
      setFormData(prev => ({ ...prev, team_id: "none" }));
    } else {
      fetchProjectTeams(formData.project_id);
    }
  }, [formData.project_id]);

  // When team changes, fetch members
  useEffect(() => {
    if (formData.team_id === "none") {
      setTeamMembers([]);
      setAssignedUserIds([]);
    } else {
      fetchTeamMembers(formData.team_id);
    }
  }, [formData.team_id]);

  const fetchContextData = async () => {
    const { data: projData } = await supabase.from('projects').select('id, name');
    setProjects(projData || []);
  };

  const fetchProjectTeams = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_teams')
        .select('team_id, teams(name)')
        .eq('project_id', projectId);

      if (error) throw error;
      
      const teams = data?.map(d => ({
        id: d.team_id,
        name: (d.teams as any)?.name
      })) || [];
      
      setAvailableTeams(teams);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTeamMembers = async (teamId: string) => {
    try {
      const { data, error } = await supabase
        .from('team_members')
        .select('user_id, profiles(*)')
        .eq('team_id', teamId);

      if (error) throw error;
      
      const members = data?.map(d => d.profiles) || [];
      setTeamMembers(members);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchTodo = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          text: data.text,
          category: data.category || "Personal",
          priority: data.priority || "normal",
          due_date: data.due_date ? new Date(data.due_date) : undefined,
          completed: data.completed,
          reminder_minutes_before: data.reminder_minutes_before 
            ? data.reminder_minutes_before.toString() 
            : "0",
          project_id: data.project_id || "none",
          team_id: data.team_id || "none",
        });
        
        // Fetch assignments
        const { data: assignments } = await supabase
          .from('todo_assignments')
          .select('user_id')
          .eq('todo_id', id);
        
        setAssignedUserIds(assignments?.map(a => a.user_id) || []);
      }
    } catch (error: any) {
      showError("Error fetching todo: " + error.message);
      navigate("/todos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim()) {
      showError("Please enter a todo title");
      return;
    }

    try {
      setLoading(true);
      
      const reminderValue = formData.reminder_minutes_before === "0" 
        ? null 
        : parseInt(formData.reminder_minutes_before);

      const basePayload = {
        text: formData.text,
        category: formData.category,
        priority: formData.priority,
        due_date: formData.due_date ? formData.due_date.toISOString() : null,
        reminder_minutes_before: reminderValue,
        project_id: formData.project_id === "none" ? null : formData.project_id,
        team_id: formData.team_id === "none" ? null : formData.team_id,
      };

      let todoId = id;

      if (isEditing) {
        const { error } = await supabase
          .from("todos")
          .update(basePayload)
          .eq("id", id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("todos").insert([{
          ...basePayload,
          user_id: user?.id
        }]).select('id').single();
        if (error) throw error;
        todoId = data.id;
      }

      // Handle assignments
      if (todoId) {
        await supabase.from('todo_assignments').delete().eq('todo_id', todoId);
        if (assignedUserIds.length > 0) {
          const assignments = assignedUserIds.map(uid => ({ todo_id: todoId, user_id: uid }));
          await supabase.from('todo_assignments').insert(assignments);
        }
      }

      showSuccess(isEditing ? "Todo updated" : "Todo created");
      navigate("/todos");
    } catch (error: any) {
      showError("Error saving todo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleAssignment = (userId: string) => {
    setAssignedUserIds(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && formData.due_date) {
      date.setHours(formData.due_date.getHours());
      date.setMinutes(formData.due_date.getMinutes());
    }
    setFormData({ ...formData, due_date: date });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value;
    if (!timeStr) return;
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = formData.due_date ? new Date(formData.due_date) : new Date();
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    
    setFormData({ ...formData, due_date: newDate });
  };

  if (loading && isEditing) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/todos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight hidden md:block">
          {isEditing ? "Edit Todo" : "Create New Todo"}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todo Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="text">What needs to be done?</Label>
              <Textarea
                id="text"
                placeholder="Enter todo description..."
                value={formData.text}
                onChange={(e) =>
                  setFormData({ ...formData, text: e.target.value })
                }
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, project_id: value })
                  }
                >
                  <SelectTrigger>
                    <FolderKanban className="w-4 h-4 mr-2 text-muted-foreground"/>
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Miscellaneous (No Project)</SelectItem>
                    {projects.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Team Assignment</Label>
                <Select
                  value={formData.team_id}
                  onValueChange={(value) =>
                    setFormData({ ...formData, team_id: value })
                  }
                >
                  <SelectTrigger>
                    <Users className="w-4 h-4 mr-2 text-muted-foreground"/>
                    <SelectValue placeholder={formData.project_id === 'none' ? "Personal Todo" : "Select Team"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Personal (No Team)</SelectItem>
                    {availableTeams.map(t => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Assignments Section - Only show if team is selected */}
            {formData.team_id !== "none" && teamMembers.length > 0 && (
               <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label className="flex items-center gap-2">
                     <UserCheck className="h-4 w-4 text-primary" /> Assign to Members
                  </Label>
                  <ScrollArea className="h-40 border rounded-md p-2 bg-muted/20">
                     <div className="space-y-2">
                        {teamMembers.map((member) => (
                           <div key={member.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-card border border-transparent hover:border-border transition-colors">
                              <Checkbox 
                                 id={`assign-${member.id}`} 
                                 checked={assignedUserIds.includes(member.id)}
                                 onCheckedChange={() => toggleAssignment(member.id)}
                              />
                              <label htmlFor={`assign-${member.id}`} className="flex items-center gap-3 cursor-pointer flex-1">
                                 <Avatar className="h-8 w-8">
                                    <AvatarImage src={member.avatar_url} />
                                    <AvatarFallback>{member.username?.[0].toUpperCase()}</AvatarFallback>
                                 </Avatar>
                                 <div className="flex flex-col">
                                    <span className="text-sm font-medium">{member.first_name || member.username}</span>
                                    {member.first_name && <span className="text-[10px] text-muted-foreground">@{member.username}</span>}
                                 </div>
                              </label>
                              {assignedUserIds.includes(member.id) && <Check className="h-4 w-4 text-primary" />}
                           </div>
                        ))}
                     </div>
                  </ScrollArea>
                  <p className="text-[10px] text-muted-foreground italic">You can assign this task to one or multiple members of the team.</p>
               </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Personal">Personal</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

               <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                     <AlertCircle className="w-4 h-4 mr-2 text-muted-foreground"/>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="extreme">Extreme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 flex flex-col">
              <Label>Due Date & Time</Label>
              <div className="flex flex-wrap gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "flex-1 min-w-[150px] justify-start text-left font-normal",
                        !formData.due_date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formData.due_date ? (
                        format(formData.due_date, "PPP")
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.due_date}
                      onSelect={handleDateSelect}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                
                <Input
                  type="time"
                  aria-label="Time"
                  className="w-full sm:w-[150px]"
                  value={formData.due_date ? format(formData.due_date, "HH:mm") : ""}
                  onChange={handleTimeChange}
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? "Update Todo" : "Save Todo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TodoEditor;