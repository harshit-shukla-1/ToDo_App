"use client";

import React, { useEffect, useRef } from 'react';
import { useSession } from '@/integrations/supabase/auth';
import { supabase } from '@/integrations/supabase/client';
import { showSuccess, showError } from '@/utils/toast';

const NotificationManager: React.FC = () => {
  const { user } = useSession();
  const processedRef = useRef<Set<string>>(new Set());

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
    
    // Only try to request permission once on mount
    requestPermission();

    const checkReminders = async () => {
      try {
        const now = new Date();
        
        // Fetch todos that have a due date and a reminder set, and are not completed
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

        todos.forEach(todo => {
          if (!todo.due_date || todo.reminder_minutes_before === null) return;

          const dueDate = new Date(todo.due_date);
          const reminderMinutes = parseInt(String(todo.reminder_minutes_before));
          
          if (isNaN(reminderMinutes) || reminderMinutes <= 0) return;

          const reminderTime = new Date(dueDate.getTime() - (reminderMinutes * 60 * 1000));
          
          // Unique ID for this specific reminder instance
          const notificationId = `${todo.id}-remind-${reminderTime.toISOString()}`;

          // Logic:
          // 1. Current time (now) is PAST the reminder time (now >= reminderTime)
          // 2. Current time (now) is BEFORE the actual due date (now < dueDate) - preventing very old overdue reminders
          // 3. We haven't shown this exact reminder yet
          if (now >= reminderTime && now < dueDate && !processedRef.current.has(notificationId)) {
            
            console.log(`Triggering reminder for todo: ${todo.text}`);
            
            // Send browser notification
            if ("Notification" in window && Notification.permission === "granted") {
              try {
                new Notification(`Reminder: ${todo.text}`, {
                  body: `Due in ${reminderMinutes} minutes at ${dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
                  icon: '/favicon.ico',
                  tag: notificationId // Prevent duplicate notifications in OS center
                });
              } catch (e) {
                console.error("Notification API error:", e);
                // Fallback to toast on error
                showSuccess(`Reminder: "${todo.text}" is due soon!`);
              }
            } else {
              // Fallback to toast if notifications aren't allowed/supported
              showSuccess(`Reminder: "${todo.text}" is due in ${reminderMinutes} minutes!`);
            }

            // Mark as processed
            processedRef.current.add(notificationId);
          }
        });

      } catch (err) {
        console.error("Notification check failed", err);
      }
    };

    // Check immediately and then every 10 seconds
    checkReminders();
    const intervalId = setInterval(checkReminders, 10 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  return null;
};

export default NotificationManager;