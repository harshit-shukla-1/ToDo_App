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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { 
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
  Eye,
  Ban,
  Image as ImageIcon,
  Camera
} from "lucide-react";
import { format } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import ConfirmDialog from "@/components/ConfirmDialog";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ImageEditor from "@/components/ImageEditor";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  image_url?: string | null;
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
  const [activeProfile, setActiveProfile] = useState<Profile | null>(null);
  
  // Current user profile state
  const [currentUserProfile, setCurrentUserProfile] = useState<Profile | null>(null);
  const [hasUsername, setHasUsername] = useState(true);

  // File Upload State
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [fileToEdit, setFileToEdit] = useState<File | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Editing State
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  
  // Deleting State
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

  // Blocking State
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);

  // Enlarged Image State
  const [viewImage, setViewImage] = useState<string | null>(null);

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

  useEffect(() => {
    if (user) {
      fetchConversations();
      
      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}` 
        }, (payload) => {
          fetchConversations();
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

  useEffect(() => {
    if (selectedUserId && user) {
      fetchMessages(selectedUserId);
      setEditingMessageId(null);
      setNewMessage("");

      const conversation = conversations.get(selectedUserId);
      if (conversation?.profile) {
        setActiveProfile(conversation.profile);
      } else {
        fetchProfile(selectedUserId);
      }
    } else {
      setActiveProfile(null);
    }
  }, [selectedUserId, user, conversations]);

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

  const handleSend = async (imageUrl?: string, captionText?: string) => {
    // Determine if we can send (needs text OR image)
    const contentToSend = captionText !== undefined ? captionText : newMessage;
    const hasContent = contentToSend.trim().length > 0;
    const hasImage = !!imageUrl;
    
    if ((!hasContent && !hasImage) || !selectedUserId || !user) return;
    
    if (!hasUsername) {
      showError("Please set a username in your profile to send messages.");
      return;
    }

    if (editingMessageId && !hasImage) {
      // Update existing message
      const { error } = await supabase
        .from('messages')
        .update({ 
          content: contentToSend.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', editingMessageId);

      if (error) {
        showError("Failed to update message");
        return;
      }
      
      setMessages(prev => prev.map(m => m.id === editingMessageId ? { 
        ...m, 
        content: contentToSend.trim(),
        updated_at: new Date().toISOString()
      } : m));
      
      setEditingMessageId(null);
      setNewMessage("");
    } else {
      // Send new message
      const msg = {
        sender_id: user.id,
        receiver_id: selectedUserId,
        content: contentToSend.trim(), // Can be empty string if image is present
        image_url: imageUrl || null
      };

      const { data, error } = await supabase.from('messages').insert([msg]).select().single();

      if (error) {
        if (error.message.includes('Rate limit')) {
           showError("Rate limit exceeded.");
        } else if (error.code === '42501') {
           showError("Failed to send. Blocked or restricted.");
        } else {
           showError("Failed to send message: " + error.message);
        }
        return;
      }

      setMessages([...messages, data]);
      setNewMessage("");
      fetchConversations();
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      setFileToEdit(file);
      // Reset input value to allow re-selecting same file
      event.target.value = "";
  };

  const handleEditorSend = async (blob: Blob, caption: string) => {
    try {
      if (!user) return;
      setIsUploading(true);
      setFileToEdit(null); // Close editor immediately

      // Generate a unique file path
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.jpeg`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('chat_bucket')
        .upload(filePath, blob, {
           contentType: 'image/jpeg'
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('chat_bucket').getPublicUrl(filePath);
      
      // Send message with the image and caption
      await handleSend(data.publicUrl, caption);
      
    } catch (error: any) {
      showError("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteMessageId(id);
  };

  const confirmDeleteMessage = async () => {
    if (!deleteMessageId) return;
    
    // 1. Get the message first to check for image_url
    const { data: msg } = await supabase
      .from('messages')
      .select('image_url')
      .eq('id', deleteMessageId)
      .single();

    if (msg?.image_url) {
      try {
        // Extract file path from URL
        // URL format: .../storage/v1/object/public/chat_bucket/USER_ID/FILENAME
        const urlObj = new URL(msg.image_url);
        // Path starts after 'chat_bucket/'
        const pathParts = urlObj.pathname.split('chat_bucket/');
        if (pathParts.length > 1) {
          const filePath = pathParts[1];
          // Delete from storage
          await supabase.storage.from('chat_bucket').remove([filePath]);
        }
      } catch (err) {
        console.error("Failed to delete image file:", err);
        // Continue to delete message record even if file deletion fails
      }
    }

    // 2. Delete the message record
    const { error } = await supabase.from('messages').delete().eq('id', deleteMessageId);
    if (error) {
      showError("Failed to delete message");
      return;
    }
    setMessages(prev => prev.filter(m => m.id !== deleteMessageId));
    setDeleteMessageId(null);
  };

  const confirmBlockUser = async () => {
    if (!activeProfile || !user) return;
    try {
       const { error } = await supabase.from('blocks').insert({
          blocker_id: user.id,
          blocked_id: activeProfile.id
       });
       
       if (error && error.code !== '23505') throw error;
       
       showSuccess(`Blocked @${activeProfile.username}`);
       // Cleanup connections
       await supabase.from('connections').delete().or(`and(requester_id.eq.${user.id},recipient_id.eq.${activeProfile.id}),and(requester_id.eq.${activeProfile.id},recipient_id.eq.${user.id})`);
       
       navigate('/messages');
    } catch (err: any) {
       showError("Failed to block: " + err.message);
    } finally {
      setBlockDialogOpen(false);
    }
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

  const isEdited = (msg: Message) => {
    return !!msg.updated_at;
  };

  return (
    <div className="flex flex-col h-full w-full md:p-4">
      <div className="flex flex-1 overflow-hidden bg-background md:gap-4 h-full">
        
        {/* Sidebar */}
        <div className={cn(
          "w-full md:w-1/3 flex-col border-r md:border bg-card md:rounded-lg overflow-hidden h-full",
          selectedUserId ? "hidden md:flex" : "flex"
        )}>
          {/* Sidebar Header */}
          <div className="p-3 border-b flex-none h-[60px] flex flex-col justify-center">
             <div className="flex items-center justify-between mb-2 md:mb-0">
               <h2 className="text-lg font-semibold px-1 hidden md:block">Messages</h2>
             </div>
             <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search users..." 
                className="pl-8 bg-muted/50 h-9" 
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
                      (data.lastMessage.receiver_id === user?.id && !data.lastMessage.read) && "bg-primary/10"
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
                        {data.lastMessage.image_url ? "📷 Image" : data.lastMessage.content}
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
              {/* Chat Header */}
              <div className="p-3 border-b flex items-center gap-3 bg-card z-10 shadow-sm flex-none justify-between h-[60px]">
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
                
                {/* Actions Menu */}
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => setBlockDialogOpen(true)} 
                        className="text-destructive focus:text-destructive"
                      >
                        <Ban className="mr-2 h-4 w-4" /> Block User
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
                            {msg.image_url && (
                              <div className="mb-2 -mx-2 -mt-1">
                                <img 
                                  src={msg.image_url} 
                                  alt="Shared" 
                                  className="rounded-lg max-h-[300px] object-cover cursor-pointer hover:opacity-95"
                                  onClick={() => setViewImage(msg.image_url || null)}
                                />
                              </div>
                            )}
                            
                            {msg.content && <p>{msg.content}</p>}
                            
                            <div className="flex items-center justify-end gap-1 mt-1">
                               {isEdited(msg) && (
                                 <span className="text-[9px] opacity-70 italic mr-1 flex items-center">
                                   <Pencil className="h-[8px] w-[8px] mr-0.5 inline" /> edited
                                 </span>
                               )}
                               <p className={cn("text-[9px] opacity-70", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </p>
                              {/* Menu Trigger */}
                              {isMe && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                                      <MoreVertical className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {msg.content && (
                                      <DropdownMenuItem onClick={() => startEditing(msg)}>
                                        <Pencil className="mr-2 h-3 w-3" /> Edit
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={() => handleDeleteClick(msg.id)} className="text-destructive">
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
                    <div className="flex gap-2 items-center">
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp" 
                        className="hidden" 
                        ref={fileInputRef} 
                        onChange={handleFileSelect} 
                      />
                       <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp"
                        capture="environment"
                        className="hidden" 
                        ref={cameraInputRef} 
                        onChange={handleFileSelect} 
                      />
                      
                      <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="shrink-0 text-muted-foreground">
                        <ImageIcon className="h-5 w-5" />
                      </Button>
                       <Button variant="ghost" size="icon" onClick={() => cameraInputRef.current?.click()} disabled={isUploading} className="shrink-0 text-muted-foreground hidden sm:inline-flex">
                        <Camera className="h-5 w-5" />
                      </Button>

                      <Input 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        placeholder={editingMessageId ? "Update message..." : "Type a message..."}
                        className="flex-1 bg-muted/50 rounded-full px-4"
                        disabled={isUploading}
                      />
                      <Button 
                        size="icon" 
                        onClick={() => handleSend()} 
                        disabled={(!newMessage.trim() && !isUploading) || isUploading} 
                        className="rounded-full h-10 w-10 shrink-0"
                      >
                         {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                   </>
                 )}
              </div>
            </>
          )}
        </div>
      </div>

       {/* Image Editor Overlay */}
      {fileToEdit && (
        <ImageEditor
          file={fileToEdit}
          recipientName={activeProfile?.first_name || activeProfile?.username || 'User'}
          onClose={() => {
            setFileToEdit(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
            if (cameraInputRef.current) cameraInputRef.current.value = "";
          }}
          onSend={handleEditorSend}
        />
      )}
      
      {/* Modals/Dialogs */}
      <ConfirmDialog
        open={!!deleteMessageId}
        onOpenChange={(open) => !open && setDeleteMessageId(null)}
        title="Delete Message"
        description="Are you sure you want to delete this message? This action cannot be undone."
        onConfirm={confirmDeleteMessage}
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmDialog
        open={blockDialogOpen}
        onOpenChange={setBlockDialogOpen}
        title={`Block @${activeProfile?.username}?`}
        description="They will no longer be able to message you or see your profile. This action will also remove any existing connection."
        onConfirm={confirmBlockUser}
        confirmText="Block User"
        variant="destructive"
      />

      {/* Image Viewer */}
      <Dialog open={!!viewImage} onOpenChange={(open) => !open && setViewImage(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden bg-transparent border-none shadow-none flex items-center justify-center">
            <DialogTitle className="sr-only">View Image</DialogTitle>
            <DialogDescription className="sr-only">Full size view of the shared image</DialogDescription>
            {viewImage && (
              <img 
                src={viewImage} 
                alt="Full size" 
                className="max-w-full max-h-[90vh] object-contain rounded-md"
              />
            )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Messages;