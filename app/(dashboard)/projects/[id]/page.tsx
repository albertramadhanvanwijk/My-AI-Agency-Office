"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { KanbanBoard } from "@/components/kanban";
import { Task } from "@/modules/workflow/schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, Clock, Users, Target } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";

interface Project {
  id: string;
  title: string;
  brief: string;
  status: string;
  clientId: string;
  client: {
    company: string | null;
    name: string | null;
    user: { name: string | null; email: string | null };
  } | null;
  createdAt: string;
  _count: { tasks: number };
}

const statusLabels: Record<Task["status"], string> = {
  todo: "To Do",
  progress: "In Progress",
  review: "Review",
  done: "Done",
};

const projectStatusLabels: Record<string, string> = {
  INQUIRY: "Inquiry",
  BRIEF: "Brief",
  PLANNING: "Planning",
  EXECUTION: "Execution",
  QA: "QA",
  DELIVERY: "Delivery",
  CLOSING: "Closing",
};

const projectStatusColors: Record<string, string> = {
  INQUIRY: "bg-gray-100 text-gray-700",
  BRIEF: "bg-blue-100 text-blue-700",
  PLANNING: "bg-purple-100 text-purple-700",
  EXECUTION: "bg-orange-100 text-orange-700",
  QA: "bg-amber-100 text-amber-700",
  DELIVERY: "bg-emerald-100 text-emerald-700",
  CLOSING: "bg-indigo-100 text-indigo-700",
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
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [projectId]);

  useEffect(() => {
    fetchProject();
    fetchTasks();
  }, [fetchProject, fetchTasks]);

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

  if (loading && !project) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/projects" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {project?.title || `Project ${projectId.slice(0, 8)}`}
            </h1>
            <p className="text-slate-500 text-sm">Kanban Board & Timeline</p>
          </div>
        </div>
        <Button asChild>
          <Link href={`/projects/${projectId}/new-task`}>
            <Plus className="w-4 h-4 mr-2" /> New Task
          </Link>
        </Button>
      </div>

      {project && (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Project Info</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${projectStatusColors[project.status] || "bg-slate-100 text-slate-700"}`}>
                      {projectStatusLabels[project.status] || project.status}
                    </span>
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Client</dt>
                  <dd className="font-medium">
                    {project.client?.company || project.client?.name || project.client?.user?.name || project.client?.user?.email || "Unknown"}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-slate-500">Tasks</dt>
                  <dd className="font-medium">{project._count.tasks}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-semibold text-slate-900 mb-3">Timeline</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-slate-600">
                  <Clock className="w-4 h-4" />
                  Started: {project.createdAt ? format(new Date(project.createdAt), "MMM d, yyyy") : "N/A"}
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Target className="w-4 h-4" /> Target: TBD
                </div>
                <div className="flex items-center gap-2 text-slate-600">
                  <Users className="w-4 h-4" /> {project._count.tasks} tasks
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
        </>
      )}
    </div>
  );
}