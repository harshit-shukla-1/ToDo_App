"use client";

import React, { useEffect, useState, useRef } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { User, Send, Search, MessageSquare, ArrowLeft, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { showSuccess, showError } from "@/utils/toast";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
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
  const [conversations, setConversations] = useState<Map<string, { profile: Profile, lastMessage: Message }>>(new Map());
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Fetch conversations list
  useEffect(() => {
    if (user) {
      fetchConversations();
      
      // Subscribe to new messages
      const channel = supabase
        .channel('public:messages')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}` 
        }, (payload) => {
          fetchConversations(); // Refresh list on new message
          if (selectedUserId && payload.new.sender_id === selectedUserId) {
            setMessages(prev => [...prev, payload.new as Message]);
            markAsRead([payload.new.id]);
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, selectedUserId]);

  // Fetch specific conversation messages
  useEffect(() => {
    if (selectedUserId && user) {
      fetchMessages(selectedUserId);
      const interval = setInterval(() => fetchMessages(selectedUserId), 5000); // Polling backup
      return () => clearInterval(interval);
    }
  }, [selectedUserId, user]);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchConversations = async () => {
    try {
      // Get all messages where user is sender or receiver
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

      // Fetch profiles for these users
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

    // Mark unread messages as read
    const unreadIds = data
      ?.filter((m: Message) => m.receiver_id === user?.id && !m.read)
      .map((m: Message) => m.id);

    if (unreadIds && unreadIds.length > 0) {
      markAsRead(unreadIds);
    }
  };

  const markAsRead = async (ids: string[]) => {
    await supabase.from('messages').update({ read: true }).in('id', ids);
    fetchConversations(); // Update unread indicators
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId || !user) return;

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

  const startConversation = (profile: Profile) => {
    setSelectedUserId(profile.id);
    setSearchQuery("");
    setSearchResults([]);
    
    // Optimistically add to list if not exists
    if (!conversations.has(profile.id)) {
      setConversations(new Map(conversations).set(profile.id, { 
        profile, 
        lastMessage: { content: "Start a conversation", created_at: new Date().toISOString() } as Message 
      }));
    }
  };

  const getOtherProfile = () => {
    return conversations.get(selectedUserId!)?.profile || searchResults.find(p => p.id === selectedUserId);
  };

  const otherProfile = selectedUserId ? getOtherProfile() : null;

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-100px)] gap-4">
      {/* Sidebar / List */}
      <Card className={cn("w-full md:w-1/3 flex flex-col", selectedUserId ? "hidden md:flex" : "flex")}>
        <CardHeader className="pb-3">
          <CardTitle>Messages</CardTitle>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search users by username..." 
              className="pl-8" 
              value={searchQuery}
              onChange={(e) => searchUsers(e.target.value)}
            />
          </div>
          {searchResults.length > 0 && (
            <div className="absolute top-[85px] z-10 w-[calc(100%-48px)] bg-popover border rounded-md shadow-md p-2">
              {searchResults.map(p => (
                <div 
                  key={p.id} 
                  className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                  onClick={() => startConversation(p)}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={p.avatar_url} />
                    <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">@{p.username}</span>
                    <span className="text-xs text-muted-foreground">{p.first_name} {p.last_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardHeader>
        <CardContent className="flex-1 overflow-hidden p-0">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-1 p-2">
              {loading ? (
                <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
              ) : Array.from(conversations.entries()).length === 0 ? (
                <p className="text-center text-muted-foreground p-4 text-sm">No conversations yet. Search for a user to start chatting.</p>
              ) : (
                Array.from(conversations.entries()).map(([id, data]) => (
                  <button
                    key={id}
                    onClick={() => setSelectedUserId(id)}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg transition-colors text-left",
                      selectedUserId === id ? "bg-secondary" : "hover:bg-muted/50",
                      // Highlight unread messages
                      (data.lastMessage.receiver_id === user?.id && !data.lastMessage.read) && "bg-primary/5 border-l-4 border-primary"
                    )}
                  >
                    <Avatar>
                      <AvatarImage src={data.profile?.avatar_url} />
                      <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
                    </Avatar>
                    <div className="flex-1 overflow-hidden">
                      <div className="flex justify-between items-center">
                        <span className="font-medium truncate">{data.profile?.first_name || 'User'}</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {format(new Date(data.lastMessage.created_at), 'MMM d')}
                        </span>
                      </div>
                      <p className={cn(
                        "text-xs truncate",
                        (data.lastMessage.receiver_id === user?.id && !data.lastMessage.read) ? "font-bold text-foreground" : "text-muted-foreground"
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
        </CardContent>
      </Card>

      {/* Chat Area */}
      <Card className={cn("w-full md:w-2/3 flex flex-col", !selectedUserId ? "hidden md:flex" : "flex")}>
        {!selectedUserId ? (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4 opacity-20" />
            <p>Select a conversation to start messaging</p>
          </div>
        ) : (
          <>
            <CardHeader className="py-3 border-b flex flex-row items-center gap-3 space-y-0">
               <Button variant="ghost" size="icon" className="md:hidden -ml-2" onClick={() => setSelectedUserId(null)}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Avatar className="h-8 w-8">
                <AvatarImage src={otherProfile?.avatar_url} />
                <AvatarFallback><User className="h-4 w-4" /></AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="font-medium text-sm">
                  {otherProfile?.first_name || 'Unknown User'} 
                  {otherProfile?.username && <span className="text-muted-foreground font-normal ml-1">@{otherProfile.username}</span>}
                </span>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 flex flex-col">
              <div 
                ref={scrollRef} 
                className="flex-1 overflow-y-auto p-4 space-y-4"
              >
                {messages.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground mt-10">No messages yet. Say hello!</p>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.sender_id === user?.id;
                    return (
                      <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[75%] px-4 py-2 rounded-lg text-sm",
                          isMe ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-muted rounded-tl-none"
                        )}>
                          <p>{msg.content}</p>
                          <p className={cn("text-[10px] mt-1 text-right opacity-70", isMe ? "text-primary-foreground" : "text-muted-foreground")}>
                            {format(new Date(msg.created_at), 'p')}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              <div className="p-3 border-t bg-background flex gap-2">
                <Input 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button size="icon" onClick={sendMessage} disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </>
        )}
      </Card>
    </div>
  );
};

export default Messages;