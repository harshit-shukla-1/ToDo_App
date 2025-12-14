"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  User, 
  Send, 
  Search, 
  MessageSquare, 
  ArrowLeft, 
  Loader2, 
  MoreVertical, 
  Pencil, 
  Trash2, 
  X,
  AlertCircle,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  read: boolean;
}

interface Profile {
  id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url: string;
}

const Messages = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const { id: routeId } = useParams();
  
  // Use URL param as the selected user ID
  const selectedUserId = routeId || null;

  const [conversations, setConversations] = useState<Map<string, { profile: Profile, lastMessage: Message }>>(new Map());
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null); // To store profile if not in conversations map
  
  // Current user profile state
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [hasUsername, setHasUsername] = useState(true); // Optimistic default

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Editing State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);

  // Fetch current user profile to check for username
  useEffect(() => {
    if (user) {
      const fetchCurrentUser = async () => {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (data) {
          setCurrentUserProfile(data as Profile);
          setHasUsername(!!data.username);
        } else {
          setHasUsername(false);
        }
      };
      fetchCurrentUser();
    }
  }, [user]);

  // Fetch conversations list
  useEffect(() => {
    if (user) {
      fetchConversations();
      
      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { 
          event: '*', // Listen to all events to catch updates/deletes too
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}` 
        }, (payload) => {
          fetchConversations();
          // If we are looking at this chat
          if (selectedUserId && (payload.new as any).sender_id === selectedUserId) {
            if (payload.eventType === 'INSERT') {
               setMessages(prev => [...prev, payload.new as Message]);
               markAsRead([payload.new.id]);
            } else if (payload.eventType === 'UPDATE') {
               setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new as Message : m));
            } else if (payload.eventType === 'DELETE') {
               setMessages(prev => prev.filter(m => m.id !== payload.old.id));
            }
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, selectedUserId]);

  // Fetch specific conversation messages and profile details if needed
  useEffect(() => {
    if (selectedUserId && user) {
      fetchMessages(selectedUserId);
      setEditingMessageId(null);
      setNewMessage("");

      // Ensure we have the profile data for the header
      const conversation = conversations.get(selectedUserId);
      if (conversation?.profile) {
        setActiveProfile(conversation.profile);
      } else {
        // Fallback fetch if navigating directly or starting new chat
        fetchProfile(selectedUserId);
      }
    } else {
      setActiveProfile(null);
    }
  }, [selectedUserId, user, conversations]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUserId]);

  const fetchProfile = async (id: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url')
      .eq('id', id)
      .single();
    if (data) setActiveProfile(data as Profile);
  };

  const fetchConversations = async () => {
    try {
      const { data: msgs, error } = await supabase
        .from('messages')
        .select('*')
        .or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const convos = new Map();
      const userIdsToFetch = new Set<string>();

      msgs?.forEach((msg: Message) => {
        const otherId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
        if (!convos.has(otherId)) {
          convos.set(otherId, { lastMessage: msg, profile: null });
          userIdsToFetch.add(otherId);
        }
      });

      if (userIdsToFetch.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, first_name, last_name, avatar_url')
          .in('id', Array.from(userIdsToFetch));

        profiles?.forEach(p => {
          if (convos.has(p.id)) {
            const entry = convos.get(p.id);
            convos.set(p.id, { ...entry, profile: p });
          }
        });
      }

      setConversations(convos);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (otherId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${otherId}),and(sender_id.eq.${otherId},receiver_id.eq.${user?.id})`)
      .order('created_at', { ascending: true });

    if (error) {
      showError("Failed to load chat");
      return;
    }

    setMessages(data || []);

    const unreadIds = data
      ?.filter((m: Message) => m.receiver_id === user?.id && !m.read)
      .map((m: Message) => m.id);

    if (unreadIds && unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  const markAsRead = async (ids: string[]) => {
    await supabase.from('messages').update({ read: true }).in('id', ids);
    fetchConversations();
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedUserId || !user) return;
    if (!hasUsername) {
      showError("Please set a username in your profile to send messages.");
      return;
    }

    if (editingMessageId) {
      // Update existing message
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: newMessage.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMessageId);

      if (error) {
        showError("Failed to update message");
        return;
      }
      
      setMessages(prev => prev.map(m => m.id === editingMessageId ? { 
        ...m, 
        content: newMessage.trim(),
        updated_at: new Date().toISOString()
      } : m));
      
      setEditingMessageId(null);
      setNewMessage("");
    } else {
      // Send new message
      const msg = {
        sender_id: user.id,
        receiver_id: selectedUserId,
        content: newMessage.trim(),
      };

      const { data, error } = await supabase.from('messages').insert([msg]).select().single();

      if (error) {
        showError("Failed to send");
        return;
      }

      setMessages([...messages, data]);
      setNewMessage("");
      fetchConversations();
    }
  };

  const deleteMessage = async (id: string) => {
    if (!confirm("Are you sure you want to delete this message?")) return;
    
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) {
      showError("Failed to delete message");
      return;
    }
    setMessages(prev => prev.filter(m => m.id !== id));
  };

  const startEditing = (msg: Message) => {
    setEditingMessageId(msg.id);
    setNewMessage(msg.content);
  };

  const cancelEditing = () => {
    setEditingMessageId(null);
    setNewMessage("");
  };

  const searchUsers = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 3) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('id, username, first_name, last_name, avatar_url')
      .ilike('username', `%${query}%`)
      .neq('id', user?.id)
      .limit(5);

    setSearchResults(data || []);
  };

  const selectConversation = (id: string) => {
    setSearchQuery("");
    setSearchResults([]);
    navigate(`/messages/${id}`);
  };

  const getInitials = (profile: Profile | null) => {
    if (!profile) return "U";
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    if (profile.first_name) return profile.first_name[0].toUpperCase();
    if (profile.username) return profile.username[0].toUpperCase();
    return "U";
  };

  // Helper to check if message was edited
  const isEdited = (msg: Message) => {
    return !!msg.updated_at;
  };

  return (
    <div className="flex flex-col h-full w-full md:p-4">
      <div className="flex flex-1 overflow-hidden bg-background md:gap-4 h-full">
        
        {/* Sidebar / List */}
        <div className={cn(
          "w-full md:w-1/3 flex-col border-r md:border bg-card md:rounded-lg overflow-hidden",
          selectedUserId ? "hidden md:flex" : "flex"
        )}>
          {/* Sidebar Header */}
          <div className="p-3 border-b flex-none">
            <h2 className="text-lg font-semibold mb-2 px-1 hidden md:block">Messages</h2>
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                className="pl-8 bg-muted/50" 
                value={searchQuery}
                onChange={(e) => searchUsers(e.target.value)}
              />
            </div>
            {searchResults.length > 0 && (
              <div className="absolute top-[120px] left-0 z-20 w-full px-2">
                <div className="bg-popover border rounded-md shadow-md p-2">
                  {searchResults.map(p => (
                    <div 
                      key={p.id} 
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                      onClick={() => selectConversation(p.id)}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={p.avatar_url} />
                        <AvatarFallback>{getInitials(p)}</AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">@{p.username}</span>
                        <span className="text-xs text-muted-foreground">{p.first_name} {p.last_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <ScrollArea className="flex-1">
            <div className="flex flex-col">
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : Array.from(conversations.entries()).length === 0 ? (
                <p className="text-center text-muted-foreground p-8 text-sm">No conversations yet.</p>
              ) : (
                Array.from(conversations.entries()).map(([id, data]) => (
                  <button
                    key={id}
                    onClick={() => selectConversation(id)}
                    className={cn(
                      "flex items-center gap-3 p-4 transition-colors text-left border-b last:border-0",
                      selectedUserId === id ? "bg-muted" : "hover:bg-muted/50",
                      (data.lastMessage.receiver_id === user?.id && !data.lastMessage.read) && "bg-blue-50 dark:bg-blue-950/20"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={data.profile?.avatar_url} />
                      <AvatarFallback>{getInitials(data.profile)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center mb-1">
                        <span className={cn("font-medium truncate", (data.lastMessage.receiver_id === user?.id && !data.lastMessage.read) && "font-bold")}>
                          {data.profile?.first_name || 'User'}
                        </span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(data.lastMessage.created_at), 'MMM d')}
                        </span>
                      </div>
                      <p className={cn(
                        "text-xs truncate",
                        (data.lastMessage.receiver_id === user?.id && !data.lastMessage.read) ? "font-semibold text-foreground" : "text-muted-foreground"
                      )}>
                        {data.lastMessage.sender_id === user?.id && "You: "}
                        {data.lastMessage.content}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Chat Area */}
        <div className={cn(
          "w-full md:w-2/3 flex-col bg-card md:border md:rounded-lg overflow-hidden h-full",
          !selectedUserId ? "hidden md:flex" : "flex"
        )}>
          {!selectedUserId ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
              <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
              <p>Select a conversation to start messaging</p>
              {!hasUsername && (
                 <Alert className="max-w-md mt-4 text-left" variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Action Required</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <p>You need to set a username before you can message anyone.</p>
                    <Link to="/profile">
                      <Button size="sm" variant="outline" className="w-full">Go to Profile</Button>
                    </Link>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="p-3 border-b flex items-center gap-3 bg-card z-10 shadow-sm flex-none justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => navigate('/messages')}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={activeProfile?.avatar_url} />
                    <AvatarFallback>{getInitials(activeProfile)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm">
                      {activeProfile?.first_name || 'User'} 
                    </span>
                    {activeProfile?.username && <span className="text-[10px] text-muted-foreground">@{activeProfile.username}</span>}
                  </div>
                </div>
                
                {/* View Profile Action */}
                {activeProfile?.username && (
                   <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/u/${activeProfile.username}`)}>
                        <Eye className="mr-2 h-4 w-4" /> View Profile
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>

              {/* Messages List */}
              <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-black/20 p-4 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-xs text-muted-foreground mt-10">No messages yet. Say hello!</p>
                ) : (
                  messages.map((msg, index) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[80%] relative group",
                          isMe ? "items-end" : "items-start"
                        )}>
                          <div className={cn(
                            "px-4 py-2 rounded-2xl text-sm shadow-sm",
                            isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-card text-card-foreground border rounded-tl-none"
                          )}>
                            <p>{msg.content}</p>
                            <div className="flex items-center justify-end gap-1 mt-1">
                               {isEdited(msg) && (
                                 <span className="text-[9px] opacity-70 italic mr-1 flex items-center">
                                   <Pencil className="h-[8px] w-[8px] mr-0.5 inline" /> edited
                                 </span>
                               )}
                               <p className={cn("text-[9px] opacity-70", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </p>
                              {/* Dropdown Menu Trigger for Edit/Delete */}
                              {isMe && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => startEditing(msg)}>
                                      <Pencil className="mr-2 h-3 w-3" /> Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => deleteMessage(msg.id)} className="text-destructive">
                                      <Trash2 className="mr-2 h-3 w-3" /> Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-3 bg-card border-t flex flex-col gap-2 flex-none">
                 {!hasUsername ? (
                    <Alert variant="destructive" className="py-2">
                       <AlertCircle className="h-4 w-4" />
                       <AlertTitle className="text-sm font-medium">Username Required</AlertTitle>
                       <AlertDescription className="text-xs flex items-center justify-between">
                         <span>You must set a username to chat.</span>
                         <Link to="/profile">
                            <Button size="sm" variant="secondary" className="h-6 text-xs">Set Username</Button>
                         </Link>
                       </AlertDescription>
                    </Alert>
                 ) : (
                   <>
                    {editingMessageId && (
                      <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                        <span>Editing message...</span>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={cancelEditing}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={editingMessageId ? "Update message..." : "Type a message..."}
                        className="flex-1 bg-muted/50 rounded-full px-4"
                      />
                      <Button size="icon" onClick={handleSend} disabled={!newMessage.trim()} className="rounded-full h-10 w-10 shrink-0">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                   </>
                 )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Messages;