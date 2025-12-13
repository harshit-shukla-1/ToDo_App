"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Trash2, Mail, Info, Check } from "lucide-react";
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
      
      // Subscribe to both tables
      const msgChannel = supabase.channel('public:messages:bell')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, fetchAll)
        .subscribe();
        
      const notifChannel = supabase.channel('public:notifications:bell')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` }, fetchAll)
        .subscribe();

      return () => {
        supabase.removeChannel(msgChannel);
        supabase.removeChannel(notifChannel);
      };
    }
  }, [user]);

  const fetchAll = async () => {
    if (!user) return;
    
    // Fetch unread messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*, sender:sender_id(first_name, last_name, username)')
      .eq('receiver_id', user.id)
      .eq('read', false)
      .order('created_at', { ascending: false });
      
    // Fetch system notifications
    const { data: notifs } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setMessageNotifications(msgs || []);
    setSystemNotifications(notifs || []);
    
    const unreadSystem = notifs?.filter(n => !n.read).length || 0;
    setUnreadCount((msgs?.length || 0) + unreadSystem);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    // State updates via subscription automatically, or we can optimistic update:
    setSystemNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const deleteNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from('notifications').delete().eq('id', id);
    setSystemNotifications(prev => prev.filter(n => n.id !== id));
  };

  const handleMessageClick = () => {
    setOpen(false);
    navigate('/messages');
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
      <PopoverContent className="w-80 p-0" align="end">
        <Tabs defaultValue="all" className="w-full">
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <span className="font-semibold">Notifications</span>
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs h-6 px-2">All</TabsTrigger>
              <TabsTrigger value="messages" className="text-xs h-6 px-2">Chats</TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="all" className="m-0">
            <ScrollArea className="h-[300px]">
              {systemNotifications.length === 0 && messageNotifications.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                <div className="flex flex-col">
                  {/* System Notifications First */}
                  {systemNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 border-b hover:bg-muted/30 transition-colors relative group ${!notif.read ? 'bg-primary/5' : ''}`}
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">
                          <Info className="h-4 w-4 text-blue-500" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className={`text-sm ${!notif.read ? 'font-semibold' : ''}`}>{notif.title}</p>
                          <p className="text-xs text-muted-foreground">{notif.message}</p>
                          <p className="text-[10px] text-muted-foreground pt-1">
                            {format(new Date(notif.created_at), 'MMM d, h:mm a')}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                           {!notif.read && (
                             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markAsRead(notif.id)} title="Mark as read">
                               <Check className="h-3 w-3" />
                             </Button>
                           )}
                           <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={(e) => deleteNotification(notif.id, e)} title="Delete">
                             <Trash2 className="h-3 w-3" />
                           </Button>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Message Notifications */}
                  {messageNotifications.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={handleMessageClick}
                      className="p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 w-full"
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">
                          <Mail className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">
                              {msg.sender?.first_name || 'User'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="messages" className="m-0">
             <ScrollArea className="h-[300px]">
                {messageNotifications.length === 0 ? (
                  <div className="p-8 text-center text-sm text-muted-foreground">No unread messages</div>
                ) : (
                   messageNotifications.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={handleMessageClick}
                      className="p-3 text-left hover:bg-muted/50 transition-colors border-b last:border-0 w-full"
                    >
                      <div className="flex gap-3">
                        <div className="mt-1">
                          <Mail className="h-4 w-4 text-green-500" />
                        </div>
                        <div className="flex-1">
                           <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm">
                              {msg.sender?.first_name || 'User'}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {format(new Date(msg.created_at), 'h:mm a')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {msg.content}
                          </p>
                        </div>
                      </div>
                    </button>
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