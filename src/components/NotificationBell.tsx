"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "@/integrations/supabase/auth";
import { supabase } from "@/integrations/supabase/client";
import { Bell } from "lucide-react";
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

const NotificationBell = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      
      const channel = supabase
        .channel('public:messages:bell')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `receiver_id=eq.${user.id}` 
        }, () => {
          fetchUnreadCount();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', user?.id)
      .eq('read', false);

    setUnreadCount(count || 0);

    // If popover is open, fetch details
    if (open) {
      fetchNotifications();
    }
  };

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*, sender:sender_id(first_name, last_name, username)')
      .eq('receiver_id', user?.id)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10);
      
    setNotifications(data || []);
  };

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open]);

  const handleNotificationClick = () => {
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
        <div className="p-4 font-medium border-b flex justify-between items-center">
          <span>Notifications</span>
          {unreadCount > 0 && <span className="text-xs text-muted-foreground">{unreadCount} unread</span>}
        </div>
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              No new notifications
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((msg) => (
                <button
                  key={msg.id}
                  onClick={handleNotificationClick}
                  className="p-4 text-left hover:bg-muted/50 transition-colors border-b last:border-0"
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-medium text-sm">
                      {msg.sender?.first_name || 'User'} sent you a message
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(msg.created_at), 'h:mm a')}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {msg.content}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t text-center">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('/messages')}>
            View all messages
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;