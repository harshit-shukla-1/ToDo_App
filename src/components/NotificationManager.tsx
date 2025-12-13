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

    // Request permission if not already granted/denied
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkReminders = async () => {
      try {
        const now = new Date();
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

        if (!todos) return;

        todos.forEach(todo => {
          const dueDate = new Date(todo.due_date);
          const reminderTime = new Date(dueDate.getTime() - (todo.reminder_minutes_before * 60 * 1000));
          
          // Identify this specific notification instance
          const notificationId = `${todo.id}-${reminderTime.toISOString()}`;

          // Check if it's time to notify (within the last minute)
          // and we haven't processed this one yet
          if (now >= reminderTime && now < dueDate && !processedRef.current.has(notificationId)) {
            
            // Send browser notification
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification(`Upcoming Todo: ${todo.text}`, {
                body: `Due in ${todo.reminder_minutes_before} minutes at ${dueDate.toLocaleTimeString()}`,
                icon: '/favicon.ico'
              });
            } else {
              // Fallback to toast if notifications aren't allowed/supported
              showSuccess(`Reminder: "${todo.text}" is due in ${todo.reminder_minutes_before} minutes!`);
            }

            // Mark as processed so we don't spam
            processedRef.current.add(notificationId);
          }
        });

      } catch (err) {
        console.error("Notification check failed", err);
      }
    };

    // Check immediately and then every 30 seconds
    checkReminders();
    const intervalId = setInterval(checkReminders, 30 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  return null; // This component doesn't render anything visible
};

export default NotificationManager;