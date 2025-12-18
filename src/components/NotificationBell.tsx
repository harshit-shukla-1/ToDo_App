"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Trash2, Mail, Info, Check, UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { showSuccess } from "@/utils/toast";

const NotificationBell = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [systemNotifications, setSystemNotifications] = useState<any[]>([]);
  const [messageNotifications, setMessageNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchAll();
      
      const msgChannel = supabase.channel('bell-messages')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages', 
          filter: `receiver_id=eq.${user.id}` 
        }, (payload) => {
          fetchNewMessage(payload.new.id);
        })
        .subscribe();
        
      const notifChannel = supabase.channel('bell-notifications')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications', 
          filter: `user_id=eq.${user.id}` 
        }, (payload) => {
          setSystemNotifications(prev => [payload.new, ...prev]);
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(msgChannel);
        supabase.removeChannel(notifChannel);
      };
    }
  }, [user]);

  const fetchNewMessage = async (msgId: string) => {
    const { data: msg } = await supabase
      .from('messages')
      .select('*')
      .eq('id', msgId)
      .single();
      
    if (msg) {
      const { data: sender } = await supabase
        .from('profiles')
        .select('first_name, last_name, username')
        .eq('id', msg.sender_id)
        .single();

      const msgWithSender = { ...msg, sender: sender || null };
      
      setMessageNotifications(prev => [msgWithSender, ...prev]);
      setUnreadCount(prev => prev + 1);
    }
  };

  const fetchAll = async () => {
    if (!user) return;
    
    // Fetch unread messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*')
      .eq('receiver_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false });

    let msgsWithSenders: any[] = [];
    
    if (msgs && msgs.length > 0) {
      const senderIds = [...new Set(msgs.map((m) => m.sender_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, username')
        .in('id', senderIds);
        
      const profileMap = new Map(profiles?.map(p => [p.id, p]));
      
      msgsWithSenders = msgs.map(m => ({
        ...m,
        sender: profileMap.get(m.sender_id)
      }));
    }
      
    // Fetch system notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setMessageNotifications(msgsWithSenders || []);
    setSystemNotifications(notifs || []);
    
    const unreadSystem = notifs?.filter(n => !n.read).length || 0;
    setUnreadCount((msgsWithSenders?.length || 0) + unreadSystem);
  };

  const markAsRead = async (id: string) => {
    // Persist read status
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setSystemNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Persist deletion
    await supabase.from('notifications').delete().eq('id', id);
    setSystemNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = async () => {
    if (systemNotifications.length === 0) return;
    await supabase.from('notifications').delete().eq('user_id', user?.id);
    setSystemNotifications([]);
    setUnreadCount(prev => Math.max(0, prev - systemNotifications.filter(n => !n.read).length));
    showSuccess("Notifications cleared");
  };

  // For messages, "delete" from bell means marking as read so it disappears from the unread list
  const dismissMessageAlert = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('messages').update({ read: true }).eq('id', id);
    setMessageNotifications(prev => prev.filter(m => m.id !== id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const handleMessageClick = () => {
    setOpen(false);
    navigate('/messages');
  };

  const handleSystemNotificationClick = (notif: any) => {
      if (!notif.read) markAsRead(notif.id);
      setOpen(false);
      
      if (notif.type === 'connection_request') {
          navigate('/connections?tab=requests');
      } else if (notif.type === 'reminder') {
          navigate('/todos');
      }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px] rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[calc(100vw-32px)] p-0" align="end">
        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="font-semibold text-sm">Notifications</span>
            <div className="flex items-center gap-2">
              <TabsList className="h-7">
                <TabsTrigger value="all" className="text-xs h-5 px-2">All</TabsTrigger>
                <TabsTrigger value="messages" className="text-xs h-5 px-2">Chats</TabsTrigger>
              </TabsList>
              {systemNotifications.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-muted-foreground hover:text-destructive" 
                  onClick={clearAllNotifications}
                  title="Clear all system notifications"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
          
          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[300px] w-full">
              {systemNotifications.length === 0 && messageNotifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                <div className="flex flex-col w-full">
                  {/* Message Notifications */}
                  {messageNotifications.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={handleMessageClick}
                      className="relative p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 w-full bg-primary/5 cursor-pointer group"
                    >
                      <div className="flex gap-3 pr-8 w-full">
                        <div className="mt-1 shrink-0">
                          <Mail className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start mb-0.5">
                            <span className="font-medium text-sm truncate pr-1">
                              {msg.sender?.first_name || 'User'}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground break-all line-clamp-2">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                      
                      {/* Dismiss/Mark Read Button for Messages */}
                      <Button 
                         variant="ghost" 
                         size="icon" 
                         className="absolute top-2 right-2 h-7 w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 hover:bg-muted"
                         onClick={(e) => dismissMessageAlert(msg.id, e)}
                         title="Dismiss"
                      >
                         <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  {/* System Notifications */}
                  {systemNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleSystemNotificationClick(notif)}
                      className={cn(
                        "p-3 border-b hover:bg-muted/30 transition-colors relative group cursor-pointer w-full",
                        !notif.read && "bg-primary/5"
                      )}
                    >
                      <div className="flex gap-3 w-full">
                        <div className="mt-1 shrink-0">
                          {notif.type === 'connection_request' ? (
                             <UserPlus className="h-4 w-4 text-blue-500" />
                          ) : (
                             <Info className="h-4 w-4 text-gray-500" />
                          )}
                        </div>
                        <div className="flex-1 space-y-0.5 min-w-0">
                          <p className={`text-sm truncate ${!notif.read ? 'font-semibold' : ''}`}>{notif.title}</p>
                          <p className="text-xs text-muted-foreground break-words whitespace-normal leading-tight pr-8">
                            {notif.message}
                          </p>
                          <p className="text-[10px] text-muted-foreground pt-1">
                            {format(new Date(notif.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        
                        {/* Actions Container */}
                        <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                           {!notif.read && (
                             <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }} title="Mark as read">
                               <Check className="h-4 w-4" />
                             </Button>
                           )}
                           <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={(e) => deleteNotification(notif.id, e)} title="Delete">
                             <Trash2 className="h-4 w-4" />
                           </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="messages" className="m-0">
             <ScrollArea className="h-[300px] w-full">
                {messageNotifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No unread messages</div>
                ) : (
                   messageNotifications.map((msg) => (
                    <div
                      key={msg.id}
                      onClick={handleMessageClick}
                      className="relative p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 w-full cursor-pointer group"
                    >
                      <div className="flex gap-3 pr-8 w-full">
                        <div className="mt-1 shrink-0">
                          <Mail className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                           <div className="flex justify-between items-start mb-0.5">
                            <span className="font-medium text-sm truncate pr-1">
                              {msg.sender?.first_name || 'User'}
                            </span>
                            <span className="text-[10px] text-muted-foreground shrink-0">
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground break-all line-clamp-2">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                      <Button 
                         variant="ghost" 
                         size="icon" 
                         className="absolute top-2 right-2 h-7 w-7 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10 hover:bg-muted"
                         onClick={(e) => dismissMessageAlert(msg.id, e)}
                         title="Dismiss"
                      >
                         <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
             </ScrollArea>
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;