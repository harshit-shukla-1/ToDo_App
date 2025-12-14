"use client";

import React, { useEffect, useState, useRef } from "react";
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
import { CheckCircle2, Circle, Clock, ListTodo } from "lucide-react";
import { animate, stagger } from "motion";

const Dashboard = () => {
  const { user } = useSession();
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    active: 0,
    personal: 0,
    professional: 0,
  });
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  // Animation effect when loading finishes
  useEffect(() => {
    if (!loading && containerRef.current) {
      animate(
        ".dashboard-card",
        { opacity: [0, 1], y: [20, 0] },
        { delay: stagger(0.1), duration: 0.5, easing: "ease-out" }
      );
    }
  }, [loading]);

  const fetchStats = async () => {
    try {
      const { data: todos, error } = await supabase
        .from("todos")
        .select("*")
        .eq("user_id", user?.id);

      if (error) throw error;

      if (todos) {
        const total = todos.length;
        const completed = todos.filter((t) => t.completed).length;
        const active = total - completed;
        const personal = todos.filter((t) => t.category === "Personal").length;
        const professional = todos.filter((t) => t.category === "Professional").length;

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
    <div className="space-y-6" ref={containerRef}>
      <h2 className="text-3xl font-bold tracking-tight dashboard-card opacity-0">Dashboard</h2>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="dashboard-card opacity-0 card-hover-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Todos</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="dashboard-card opacity-0 card-hover-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completed}</div>
          </CardContent>
        </Card>
        <Card className="dashboard-card opacity-0 card-hover-effect">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <Circle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
          </CardContent>
        </Card>
        <Card className="dashboard-card opacity-0 card-hover-effect">
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

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1 dashboard-card opacity-0 card-hover-effect">
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
        <Card className="col-span-1 dashboard-card opacity-0 card-hover-effect">
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
    </div>
  );
};

export default Dashboard;