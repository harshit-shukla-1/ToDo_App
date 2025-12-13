"use client";

import React, { useEffect, useRef } from 'react';
import { useSession } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess } from '@/utils/toast';

const NotificationManager: React.FC = () => {
  const { user } = useSession();
  const processedRef = useRef<Set<string>>(new Set());
  const initialCheckDone = useRef(false);

  useEffect(() => {
    if (!user) return;

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

        if (error) {
          console.error('Error checking reminders:', error);
          return;
        }

        if (!todos || todos.length === 0) return;

        // Fetch existing notifications to avoid duplicates (persisted check)
        // We only check recently created notifications to be efficient
        const { data: existingNotifs } = await supabase
          .from('notifications')
          .select('related_entity_id')
          .eq('type', 'reminder')
          .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

        const notifiedTodoIds = new Set(existingNotifs?.map(n => n.related_entity_id) || []);

        for (const todo of todos) {
          if (!todo.due_date || todo.reminder_minutes_before === null) continue;

          const dueDate = new Date(todo.due_date);
          const reminderMinutes = parseInt(String(todo.reminder_minutes_before));
          
          if (isNaN(reminderMinutes) || reminderMinutes <= 0) continue;

          const reminderTime = new Date(dueDate.getTime() - (reminderMinutes * 60 * 1000));
          
          // ID for local session tracking
          const notificationId = `${todo.id}-remind-${reminderTime.getTime()}`;

          // TRIGGER LOGIC:
          // 1. Time is past the reminder time
          // 2. Time is NOT past the due date (unless we want to notify "Overdue")
          //    *Adjusted*: If we just opened the app, we want to see reminders that happened while closed.
          //    So we check if now >= reminderTime. 
          // 3. We haven't locally processed it in this session.
          // 4. We haven't persisted it to DB yet (checked via notifiedTodoIds).
          
          if (now >= reminderTime && !processedRef.current.has(notificationId)) {
            
            // Check if we already have a DB record for this specific reminder
            // This prevents re-notifying on every page refresh if the DB record exists
            if (notifiedTodoIds.has(todo.id)) {
               processedRef.current.add(notificationId);
               continue; 
            }

            console.log(`Triggering reminder for todo: ${todo.text}`);
            
            // 1. Send Browser Notification (if permission granted)
            if ("Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(`Reminder: ${todo.text}`, {
                  body: `Due in ${reminderMinutes} minutes`,
                  icon: '/favicon.ico',
                  tag: notificationId 
                });
              } catch (e) {
                console.error("Notification API error:", e);
              }
            } else {
              showSuccess(`Reminder: "${todo.text}" is due soon!`);
            }

            // 2. Persist to Notifications Table (for the Bell Panel)
            // This ensures it shows up even if the user missed the push
            await supabase.from('notifications').insert({
              user_id: user.id,
              title: `Reminder: ${todo.text}`,
              message: `This task is due at ${dueDate.toLocaleTimeString()}`,
              type: 'reminder',
              related_entity_id: todo.id,
              read: false
            });

            // Mark locally
            processedRef.current.add(notificationId);
          }
        }
        
        initialCheckDone.current = true;

      } catch (err) {
        console.error("Notification check failed", err);
      }
    };

    // Check frequently
    checkReminders();
    const intervalId = setInterval(checkReminders, 10 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  return null;
};

export default NotificationManager;