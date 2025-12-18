"use client";

import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/integrations/supabase/auth";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
} from "recharts";
import { CheckCircle2, Circle, Clock, ListTodo, Users, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Todo {
  id: string;
  user_id: string;
  text: string;
  completed: boolean;
  category: string;
  due_date: string | null;
  priority?: string;
}

const Dashboard = () => {
  const { user } = useSession();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    active: 0,
    personal: 0,
    professional: 0,
  });
  const [sharedTodos, setSharedTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    try {
      // Fetch ALL visible todos (RLS policy allows seeing own + shared)
      const { data: todos, error } = await supabase
        .from("todos")
        .select("*");

      if (error) throw error;

      if (todos) {
        // Filter for My Stats
        const myTodos = todos.filter(t => t.user_id === user?.id);
        const shared = todos.filter(t => t.user_id !== user?.id);
        
        setSharedTodos(shared);

        const total = myTodos.length;
        const completed = myTodos.filter((t) => t.completed).length;
        const active = total - completed;
        const personal = myTodos.filter((t) => t.category === "Personal").length;
        const professional = myTodos.filter((t) => t.category === "Professional").length;

        setStats({ total, completed, active, personal, professional });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: "Completed", value: stats.completed, color: "#22c55e" },
    { name: "Active", value: stats.active, color: "#f97316" },
  ];

  const categoryData = [
    { name: "Personal", count: stats.personal },
    { name: "Professional", count: stats.professional },
  ];

  if (loading) {
    return <div className="flex justify-center p-8">Loading stats...</div>;
  }

  return (
    <div className="space-y-6 pb-10">
      <h2 className="text-3xl font-bold tracking-tight hidden md:block">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Todos</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Circle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productivity</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.total > 0
                ? Math.round((stats.completed / stats.total) * 100)
                : 0}
              %
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Todos by Category</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryData}>
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Shared Todos Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Users className="h-5 w-5" /> Shared with me
        </h3>
        
        {sharedTodos.length === 0 ? (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <p>No todos have been shared with you.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {sharedTodos.map(todo => (
              <Card key={todo.id} className="hover:bg-accent/50 transition-colors">
                <CardContent className="p-4 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <p className={`font-medium line-clamp-2 ${todo.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {todo.text}
                    </p>
                    <Badge variant="outline" className="shrink-0 text-[10px] border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-900/20">
                      Shared
                    </Badge>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-5 font-normal">
                      {todo.category}
                    </Badge>
                    {todo.due_date && (
                      <span>{format(new Date(todo.due_date), "MMM d")}</span>
                    )}
                  </div>
                  
                  <div className="pt-2 flex justify-end">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => navigate(`/todos/${todo.id}`)}>
                      View Details <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;