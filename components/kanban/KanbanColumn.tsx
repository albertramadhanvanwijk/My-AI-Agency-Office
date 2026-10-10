"use client";

import { KanbanCard } from "./KanbanCard";
import { Task } from "@/modules/workflow/schema";

interface KanbanColumnProps {
  columnId: Task["status"];
  title: string;
  tasks: Task[];
  onTaskUpdate: (taskId: string, status: Task["status"]) => void;
}

export function KanbanColumn({ columnId, title, tasks, onTaskUpdate }: KanbanColumnProps) {
  const statusColors: Record<Task["status"], string> = {
    todo: "bg-slate-100 border-slate-200",
    progress: "bg-blue-50 border-blue-200",
    review: "bg-amber-50 border-amber-200",
    done: "bg-emerald-50 border-emerald-200",
  };

  return (
    <div className="flex flex-col w-72 min-w-72 flex-shrink-0">
      <div className="px-3 py-2 font-semibold text-sm text-slate-700 flex items-center justify-between">
        <span>{title}</span>
        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <div
        className={`flex-1 flex flex-col gap-2 p-2 rounded-lg border ${statusColors[columnId]}`}
        role="list"
        aria-label={`${title} tasks`}
      >
        {tasks.map((task) => (
          <KanbanCard key={task.id} task={task} onUpdate={onTaskUpdate} />
        ))}
        {tasks.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-8">No tasks</div>
        )}
      </div>
    </div>
  );
}