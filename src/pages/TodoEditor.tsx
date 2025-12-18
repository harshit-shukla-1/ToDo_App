"use client";

import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import { format } from "date-fns";
import { Calendar as CalendarIcon, Save, ArrowLeft, Loader2, Bell, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";

const TodoEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useSession();
  const isEditing = !!id;

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    text: "",
    category: "Personal",
    priority: "normal",
    due_date: undefined as Date | undefined,
    completed: false,
    reminder_minutes_before: "0",
  });

  useEffect(() => {
    if (isEditing && user) {
      fetchTodo();
    }
  }, [id, user]);

  const fetchTodo = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("todos")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          text: data.text,
          category: data.category || "Personal",
          priority: data.priority || "normal",
          due_date: data.due_date ? new Date(data.due_date) : undefined,
          completed: data.completed,
          reminder_minutes_before: data.reminder_minutes_before 
            ? data.reminder_minutes_before.toString() 
            : "0",
        });
      }
    } catch (error: any) {
      showError("Error fetching todo: " + error.message);
      navigate("/todos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.text.trim()) {
      showError("Please enter a todo title");
      return;
    }

    try {
      setLoading(true);
      
      const reminderValue = formData.reminder_minutes_before === "0" 
        ? null 
        : parseInt(formData.reminder_minutes_before);

      // Base payload without user_id to prevent ownership transfer on edit
      const basePayload = {
        text: formData.text,
        category: formData.category,
        priority: formData.priority,
        due_date: formData.due_date ? formData.due_date.toISOString() : null,
        reminder_minutes_before: reminderValue
      };

      if (isEditing) {
        const { error } = await supabase
          .from("todos")
          .update(basePayload)
          .eq("id", id);
        if (error) throw error;
        showSuccess("Todo updated successfully");
      } else {
        // For new todos, we attach the creator's user_id
        const { error } = await supabase.from("todos").insert([{
          ...basePayload,
          user_id: user?.id
        }]);
        if (error) throw error;
        showSuccess("Todo created successfully");
      }
      navigate("/todos");
    } catch (error: any) {
      showError("Error saving todo: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date && formData.due_date) {
      date.setHours(formData.due_date.getHours());
      date.setMinutes(formData.due_date.getMinutes());
    }
    setFormData({ ...formData, due_date: date });
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const timeStr = e.target.value;
    if (!timeStr) return;
    
    const [hours, minutes] = timeStr.split(':').map(Number);
    const newDate = formData.due_date ? new Date(formData.due_date) : new Date();
    newDate.setHours(hours);
    newDate.setMinutes(minutes);
    newDate.setSeconds(0);
    
    setFormData({ ...formData, due_date: newDate });
  };

  if (loading && isEditing) {
    return <div className="flex justify-center p-8"><Loader2 className="animate-spin" /></div>;
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/todos")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-3xl font-bold tracking-tight hidden md:block">
          {isEditing ? "Edit Todo" : "Create New Todo"}
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Todo Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="text">What needs to be done?</Label>
              <Textarea
                id="text"
                placeholder="Enter todo description..."
                value={formData.text}
                onChange={(e) =>
                  setFormData({ ...formData, text: e.target.value })
                }
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Personal">Personal</SelectItem>
                    <SelectItem value="Professional">Professional</SelectItem>
                  </SelectContent>
                </Select>
              </div>

               <div className="space-y-2">
                <Label>Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={(value) =>
                    setFormData({ ...formData, priority: value })
                  }
                >
                  <SelectTrigger>
                     <AlertCircle className="w-4 h-4 mr-2 text-muted-foreground"/>
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="extreme">Extreme</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2 flex flex-col">
                <Label>Due Date & Time</Label>
                <div className="flex flex-wrap gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.due_date && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.due_date ? (
                          format(formData.due_date, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.due_date}
                        onSelect={handleDateSelect}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  
                  <Input
                    type="time"
                    aria-label="Time"
                    className="w-full"
                    value={formData.due_date ? format(formData.due_date, "HH:mm") : ""}
                    onChange={handleTimeChange}
                  />
                </div>
              </div>

              <div className="space-y-2">
                 <Label>Reminder</Label>
                 <Select
                  value={formData.reminder_minutes_before}
                  onValueChange={(value) =>
                    setFormData({ ...formData, reminder_minutes_before: value })
                  }
                >
                  <SelectTrigger>
                    <Bell className="w-4 h-4 mr-2 text-muted-foreground"/>
                    <SelectValue placeholder="No reminder" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No reminder</SelectItem>
                    <SelectItem value="5">5 minutes before</SelectItem>
                    <SelectItem value="15">15 minutes before</SelectItem>
                    <SelectItem value="30">30 minutes before</SelectItem>
                    <SelectItem value="60">1 hour before</SelectItem>
                    <SelectItem value="1440">1 day before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" disabled={loading} className="w-full sm:w-auto">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" />
                {isEditing ? "Update Todo" : "Save Todo"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default TodoEditor;