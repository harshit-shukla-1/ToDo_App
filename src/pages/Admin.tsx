"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, ListTodo, FolderKanban, ShieldAlert, Trash2, 
  Loader2, RefreshCcw, Search, ShieldCheck 
} from "lucide-react";
import { showSuccess, showError } from "@/utils/toast";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const Admin = () => {
  const { user } = useSession();
  const [stats, setStats] = useState({ users: 0, todos: 0, projects: 0, teams: 0 });
  const [loading, setLoading] = useState(true);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [resetDialogOpen, setResetDialogOpen] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, []);

  const fetchStats = async () => {
    try {
      const results = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('todos').select('*', { count: 'exact', head: true }),
        supabase.from('projects').select('*', { count: 'exact', head: true }),
        supabase.from('teams').select('*', { count: 'exact', head: true }),
      ]);
      
      setStats({ 
        users: results[0].count || 0, 
        todos: results[1].count || 0, 
        projects: results[2].count || 0, 
        teams: results[3].count || 0 
      });
    } catch (err) {
      console.error("Error fetching stats:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUsersList(data || []);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async () => {
    if (!deleteId) return;
    try {
      // Clear user data from profiles
      const { error } = await supabase.from('profiles').delete().eq('id', deleteId);
      if (error) throw error;
      
      setUsersList(prev => prev.filter(u => u.id !== deleteId));
      setDeleteId(null);
      showSuccess("User data removed from public system.");
      fetchStats();
    } catch (err: any) {
      showError(err.message);
    }
  };

  const resetApplicationData = async () => {
    try {
      setLoading(true);
      // Delete all key data except for system defaults
      await Promise.all([
        supabase.from('todos').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('teams').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);

      showSuccess("All application data has been reset.");
      fetchStats();
      setResetDialogOpen(false);
    } catch (err: any) {
      showError("Reset failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = usersList.filter(u => 
    (u.first_name?.toLowerCase().includes(search.toLowerCase())) ||
    (u.username?.toLowerCase().includes(search.toLowerCase())) ||
    (u.email?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <ShieldAlert className="text-primary h-8 w-8" /> Admin Dashboard
          </h2>
          <p className="text-muted-foreground">Global oversight and application management.</p>
        </div>
        <Button variant="destructive" className="gap-2" onClick={() => setResetDialogOpen(true)}>
          <RefreshCcw className="h-4 w-4" /> Reset App Data
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.users}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Todos</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todos}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.teams}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage all registered accounts.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, username or email..." 
                className="pl-8" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchUsers}>
              <RefreshCcw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>

          <div className="rounded-md border overflow-hidden">
            <div className="bg-muted p-3 grid grid-cols-4 font-medium text-sm">
              <span className="col-span-1">Profile</span>
              <span className="col-span-1">Email</span>
              <span className="col-span-1">Role</span>
              <span className="col-span-1 text-right">Actions</span>
            </div>
            {loading ? (
              <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">No users found.</div>
            ) : (
              <div className="divide-y">
                {filteredUsers.map((u) => (
                  <div key={u.id} className="p-3 grid grid-cols-4 items-center hover:bg-muted/30 transition-colors">
                    <div className="col-span-1 flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={u.avatar_url} />
                        <AvatarFallback>{(u.first_name?.[0] || u.username?.[0] || "U").toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm font-medium truncate">{u.first_name} {u.last_name}</span>
                        <span className="text-xs text-muted-foreground truncate">@{u.username}</span>
                      </div>
                    </div>
                    <span className="col-span-1 text-sm truncate">{u.email}</span>
                    <span className="col-span-1">
                      {u.role === 'admin' ? (
                        <Badge className="bg-primary/20 text-primary border-primary/30 hover:bg-primary/20 gap-1">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="outline">User</Badge>
                      )}
                    </span>
                    <div className="col-span-1 text-right">
                      {u.role !== 'admin' && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => setDeleteId(u.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Delete User Data"
        description="Are you sure? This will remove their public profile and linked data."
        onConfirm={deleteUser}
        confirmText="Delete Data"
        variant="destructive"
      />

      <ConfirmDialog
        open={resetDialogOpen}
        onOpenChange={setResetDialogOpen}
        title="RESET ENTIRE APPLICATION"
        description="DANGER: This will permanently delete all todos, projects, messages, and teams across the entire platform. This action is irreversible."
        onConfirm={resetApplicationData}
        confirmText="Yes, Reset Everything"
        variant="destructive"
      />
    </div>
  );
};

export default Admin;