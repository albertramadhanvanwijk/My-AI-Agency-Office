"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { KanbanBoard } from "@/components/kanban";
import { Task } from "@/modules/workflow/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Clock, Users, Target } from "lucide-react";
import Link from "next/link";

const statusLabels: Record<Task["status"], string> = {
  todo: "To Do",
  progress: "In Progress",
  review: "Review",
  done: "Done",
};

const statusColors: Record<Task["status"], string> = {
  todo: "bg-slate-100 text-slate-700",
  progress: "bg-blue-100 text-blue-700",
  review: "bg-amber-100 text-amber-700",
  done: "bg-emerald-100 text-emerald-700",
};

export default function ProjectDetailPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, status: Task["status"]) => {
    // Optimistic update
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));

    try {
      await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
    } catch (e) {
      console.error(e);
      fetchTasks(); // Revert on error
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Project {projectId.slice(0, 8)}</h1>
            <p className="text-slate-500 text-sm">Kanban Board & Timeline</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/projects/${projectId}/new-task`}>
            <Plus className="w-4 h-4 mr-2" /> New Task
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Project Info</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium">Execution</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Client</dt>
              <dd className="font-medium">Demo Client</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Progress</dt>
              <dd className="font-medium">45%</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Timeline</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4" /> Started: Jan 15, 2026
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Target className="w-4 h-4" /> Target: Feb 28, 2026
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Users className="w-4 h-4" /> 12 active staff
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <h3 className="font-semibold text-slate-900 mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href={`/projects/${projectId}/approve`}>Approve Gate</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href={`/projects/${projectId}/deliver`}>Deliver</Link>
            </Button>
            <Button variant="outline" className="w-full justify-start" asChild>
              <Link href={`/projects/${projectId}/invoice`}>Generate Invoice</Link>
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900">Kanban Board</h2>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="h-96 flex items-center justify-center text-slate-400">Loading...</div>
          ) : (
            <KanbanBoard tasks={tasks} onTaskUpdate={handleTaskUpdate} />
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Task Summary</h3>
        <div className="grid grid-cols-4 gap-4">
          {(["todo", "progress", "review", "done"] as Task["status"][]).map((status) => (
            <div key={status} className={`p-4 rounded-lg ${statusColors[status]}`}>
              <dt className="text-sm text-slate-600">{statusLabels[status]}</dt>
              <dd className="text-2xl font-bold text-slate-900">
                {tasks.filter((t) => t.status === status).length}
              </dd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}