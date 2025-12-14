"use client";

import React, { useEffect, useRef } from 'react';
import { useSession } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';

const NotificationManager: React.FC = () => {
  const { user } = useSession();
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;

    // Request permission immediately
    const requestPermission = async () => {
      if ("Notification" in window && Notification.permission === "default") {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.error("Failed to request notification permission", e);
        }
      }
    };
    
    requestPermission();

    // --- Message Notifications ---
    // Messages don't strictly generate database notifications in this app model yet,
    // so we keep listening to the messages table for direct alerts.
    const messageChannel = supabase
      .channel('public:messages:notify')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `receiver_id=eq.${user.id}` 
      }, async (payload) => {
        const newMessage = payload.new;
        
        const { data: sender } = await supabase
          .from('profiles')
          .select('first_name, username')
          .eq('id', newMessage.sender_id)
          .single();

        const senderName = sender?.first_name || sender?.username || "Someone";
        const title = `New message from ${senderName}`;
        
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(title, {
            body: newMessage.content,
            icon: '/favicon.ico',
            tag: `msg-${newMessage.id}`
          });
        } else {
          showSuccess(`${title}: ${newMessage.content}`);
        }
      })
      .subscribe();

    // --- General Notifications Listener ---
    // Listens for ANY new row in the notifications table.
    // This handles Connection Requests (created via DB Trigger) and Reminders.
    const notificationChannel = supabase
      .channel('public:notifications:toasts')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'notifications',
        filter: `user_id=eq.${user.id}` 
      }, (payload) => {
         const notif = payload.new;
         
         // Avoid double toasting if we handled it elsewhere (though we shouldn't now)
         if (processedRef.current.has(notif.related_entity_id)) return;

         if ("Notification" in window && Notification.permission === "granted") {
             new Notification(notif.title, { 
               body: notif.message, 
               icon: '/favicon.ico',
               tag: `notif-${notif.id}`
             });
         } else {
             showSuccess(notif.message);
         }
      })
      .subscribe();

    // --- Todo Reminders ---
    const checkReminders = async () => {
      try {
        const now = new Date();
        
        // Fetch active todos with reminders
        const { data: todos, error } = await supabase
          .from('todos')
          .select('*')
          .eq('completed', false)
          .not('due_date', 'is', null)
          .not('reminder_minutes_before', 'is', null);

        if (error || !todos) return;

        // Fetch existing notifications to avoid duplicates
        const { data: existingNotifs } = await supabase
          .from('notifications')
          .select('related_entity_id')
          .eq('type', 'reminder')
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()); 

        const notifiedTodoIds = new Set(existingNotifs?.map(n => n.related_entity_id) || []);

        for (const todo of todos) {
          if (!todo.due_date || todo.reminder_minutes_before === null) continue;

          const dueDate = new Date(todo.due_date);
          const reminderMinutes = parseInt(String(todo.reminder_minutes_before));
          
          if (isNaN(reminderMinutes) || reminderMinutes <= 0) continue;

          const reminderTime = new Date(dueDate.getTime() - (reminderMinutes * 60 * 1000));
          const notificationId = `${todo.id}-remind-${reminderTime.getTime()}`;
          
          if (now >= reminderTime && !processedRef.current.has(notificationId)) {
            
            if (notifiedTodoIds.has(todo.id)) {
               processedRef.current.add(notificationId);
               continue; 
            }

            // Only INSERT the notification. 
            // The 'notificationChannel' listener above will catch the INSERT and show the Toast.
            await supabase.from('notifications').insert({
              user_id: user.id,
              title: `Reminder: ${todo.text}`,
              message: `This task is due at ${dueDate.toLocaleTimeString()}`,
              type: 'reminder',
              related_entity_id: todo.id,
              read: false
            });

            // Mark as processed locally to prevent loop in this session
            processedRef.current.add(notificationId);
            // Also mark the related_entity_id so the listener knows we "caused" it, 
            // though the listener logic is simple enough to just show it. 
            // We'll let the listener handle the UI part.
          }
        }

      } catch (err) {
        console.error("Notification check failed", err);
      }
    };

    const intervalId = setInterval(checkReminders, 10 * 1000); // Check every 10 sec
    checkReminders(); // Initial check

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(notificationChannel);
    };
  }, [user]);

  return null;
};

export default NotificationManager;