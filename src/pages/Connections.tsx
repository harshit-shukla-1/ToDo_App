"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { showSuccess, showError } from "@/utils/toast";
import { Loader2, Search, UserPlus, UserCheck, UserX, UserMinus } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ConfirmDialog from "@/components/ConfirmDialog";

interface Profile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
}

interface Connection {
  id: string;
  requester_id: string;
  recipient_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  profile: Profile; // The other person's profile
}

const Connections = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Set active tab based on URL param or default
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "my-connections");
  
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingReceived, setPendingReceived] = useState<Connection[]>([]);
  const [pendingSent, setPendingSent] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Dialog state
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    // Update tab if URL changes
    const tab = searchParams.get("tab");
    if (tab && (tab === 'my-connections' || tab === 'requests' || tab === 'sent')) {
      setActiveTab(tab);
    }
  }, [searchParams]);

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    try {
      setLoading(true);
      // Fetch all connections where user is requester OR recipient
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          requester:profiles!requester_id(*),
          recipient:profiles!recipient_id(*)
        `)
        .or(`requester_id.eq.${user?.id},recipient_id.eq.${user?.id}`);

      if (error) throw error;

      const active: Connection[] = [];
      const received: Connection[] = [];
      const sent: Connection[] = [];

      data?.forEach((conn: any) => {
        const isRequester = conn.requester_id === user?.id;
        const otherProfile = isRequester ? conn.recipient : conn.requester;
        
        const formattedConn: Connection = {
          ...conn,
          profile: otherProfile
        };

        if (conn.status === 'accepted') {
          active.push(formattedConn);
        } else if (conn.status === 'pending') {
          if (isRequester) {
            sent.push(formattedConn);
          } else {
            received.push(formattedConn);
          }
        }
      });

      setConnections(active);
      setPendingReceived(received);
      setPendingSent(sent);
    } catch (err: any) {
      console.error("Error fetching connections:", err);
      showError("Failed to load connections");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    const trimmedQuery = searchQuery.trim();
    if (trimmedQuery.length < 3) return;
    
    setSearchLoading(true);
    try {
      // Find users matching username/name who are NOT the current user
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`username.ilike.%${trimmedQuery}%,first_name.ilike.%${trimmedQuery}%,last_name.ilike.%${trimmedQuery}%`)
        .neq('id', user?.id)
        .eq('is_public', true) // Only show public profiles in search
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (err: any) {
      console.error("Search error:", err);
    } finally {
      setSearchLoading(false);
    }
  };

  const sendRequest = async (targetUserId: string) => {
    try {
      // Check if connection already exists
      const { data: existing } = await supabase
        .from('connections')
        .select('*')
        .or(`and(requester_id.eq.${user?.id},recipient_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},recipient_id.eq.${user?.id})`)
        .maybeSingle();

      if (existing) {
        if (existing.status === 'pending') showError("Request already pending");
        else if (existing.status === 'accepted') showError("Already connected");
        return;
      }

      const { error } = await supabase
        .from('connections')
        .insert({
          requester_id: user?.id,
          recipient_id: targetUserId,
          status: 'pending'
        });

      if (error) throw error;
      showSuccess("Connection request sent!");
      fetchConnections(); // Refresh lists
      
      // Remove from search results to give visual feedback? 
      // Or just keep it. We'll refresh list so it logic holds.
    } catch (err: any) {
      showError("Failed to send request: " + err.message);
    }
  };

  const updateStatus = async (connectionId: string, newStatus: 'accepted' | 'rejected') => {
    try {
      if (newStatus === 'rejected') {
        // Just delete the row for rejection to keep table clean? 
        // Or keep it as rejected. Let's delete for simplicity of re-requesting later, 
        // or update to 'rejected' if we want to block spam.
        // For now, let's just delete it on reject to allow future requests.
        await removeConnection(connectionId);
        showSuccess("Request rejected");
        return;
      }

      const { error } = await supabase
        .from('connections')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', connectionId);

      if (error) throw error;
      showSuccess(`Connection ${newStatus}`);
      fetchConnections();
    } catch (err: any) {
      showError("Failed to update status");
    }
  };

  const handleRemoveClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmRemove = async () => {
    if (deleteId) {
      await removeConnection(deleteId);
      setDeleteId(null);
    }
  };

  const removeConnection = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;
      fetchConnections();
      showSuccess("Connection removed");
    } catch (err: any) {
      showError("Failed to remove connection");
    }
  };

  const getInitials = (p: Profile) => {
    if (p.first_name && p.last_name) return `${p.first_name[0]}${p.last_name[0]}`.toUpperCase();
    if (p.username) return p.username[0].toUpperCase();
    return "U";
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Connections</h2>
          <p className="text-muted-foreground">Manage your network and friends</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Search Section */}
        <Card className="md:col-span-1 h-fit">
          <CardHeader>
            <CardTitle className="text-lg">Find People</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Search username..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button size="icon" onClick={handleSearch} disabled={searchLoading}>
                {searchLoading ? <Loader2 className="animate-spin h-4 w-4" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            
            <div className="space-y-3 mt-4">
              {searchResults.length === 0 && searchQuery.length > 2 && !searchLoading && (
                <p className="text-sm text-muted-foreground text-center py-4">No public profiles found.</p>
              )}
              {searchResults.map(profile => {
                // Check if already connected/pending to disable button
                // This check is client-side simple check against current fetched lists
                const isConnected = connections.some(c => c.profile.id === profile.id);
                const isPending = [...pendingReceived, ...pendingSent].some(c => c.profile.id === profile.id);
                
                return (
                  <div key={profile.id} className="flex items-center justify-between p-2 border rounded-lg hover:bg-muted/50">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/u/${profile.username}`)}>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback>{getInitials(profile)}</AvatarFallback>
                      </Avatar>
                      <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{profile.first_name} {profile.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">@{profile.username}</p>
                      </div>
                    </div>
                    {!isConnected && !isPending && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => sendRequest(profile.id)}>
                        <UserPlus className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {(isConnected || isPending) && (
                       <Badge variant="secondary" className="text-[10px]">
                         {isConnected ? 'Added' : 'Pending'}
                       </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Lists Section */}
        <div className="md:col-span-2">
          <Tabs defaultValue="my-connections" value={activeTab} onValueChange={(val) => {
             setActiveTab(val);
             // Optional: Update URL without navigation to keep state in sync if desired
          }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="my-connections">Connected ({connections.length})</TabsTrigger>
              <TabsTrigger value="requests">Requests ({pendingReceived.length})</TabsTrigger>
              <TabsTrigger value="sent">Sent ({pendingSent.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="my-connections" className="mt-4">
              {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>
              ) : connections.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <UserPlus className="h-12 w-12 mb-4 opacity-20" />
                    <p>No connections yet. Search for people to add!</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {connections.map(conn => (
                    <Card key={conn.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/u/${conn.profile.username}`)}>
                          <Avatar>
                            <AvatarImage src={conn.profile.avatar_url} />
                            <AvatarFallback>{getInitials(conn.profile)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{conn.profile.first_name} {conn.profile.last_name}</p>
                            <p className="text-xs text-muted-foreground">@{conn.profile.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-blue-500" onClick={() => navigate(`/messages/${conn.profile.id}`)}>
                            <UserCheck className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => handleRemoveClick(conn.id)}>
                            <UserMinus className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="requests" className="mt-4">
              {pendingReceived.length === 0 ? (
                 <p className="text-center text-muted-foreground py-12">No pending requests.</p>
              ) : (
                <div className="space-y-4">
                  {pendingReceived.map(conn => (
                     <Card key={conn.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/u/${conn.profile.username}`)}>
                          <Avatar>
                            <AvatarImage src={conn.profile.avatar_url} />
                            <AvatarFallback>{getInitials(conn.profile)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{conn.profile.first_name} {conn.profile.last_name}</p>
                            <p className="text-xs text-muted-foreground">@{conn.profile.username}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => updateStatus(conn.id, 'accepted')}>Accept</Button>
                          <Button size="sm" variant="outline" className="text-destructive hover:text-destructive" onClick={() => updateStatus(conn.id, 'rejected')}>Reject</Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="sent" className="mt-4">
               {pendingSent.length === 0 ? (
                 <p className="text-center text-muted-foreground py-12">No sent requests.</p>
              ) : (
                <div className="space-y-4">
                  {pendingSent.map(conn => (
                     <Card key={conn.id}>
                      <CardContent className="p-4 flex items-center justify-between">
                         <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/u/${conn.profile.username}`)}>
                          <Avatar>
                            <AvatarImage src={conn.profile.avatar_url} />
                            <AvatarFallback>{getInitials(conn.profile)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{conn.profile.first_name} {conn.profile.last_name}</p>
                            <p className="text-xs text-muted-foreground">@{conn.profile.username}</p>
                          </div>
                        </div>
                        <Button size="sm" variant="ghost" onClick={() => handleRemoveClick(conn.id)}>Cancel</Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        title="Remove Connection"
        description="Are you sure you want to remove this connection? You will have to request to connect again."
        onConfirm={confirmRemove}
        confirmText="Remove"
        variant="destructive"
      />
    </div>
  );
};

export default Connections;