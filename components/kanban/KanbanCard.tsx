"use client";

import { Task } from "@/modules/workflow/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, ChevronRight } from "lucide-react";

interface KanbanCardProps {
  task: Task;
  onUpdate: (taskId: string, status: Task["status"]) => void;
}

const statusTransitions: Record<Task["status"], Task["status"][]> = {
  todo: ["progress"],
  progress: ["review", "todo"],
  review: ["done", "progress"],
  done: ["review"],
};

export function KanbanCard({ task, onUpdate }: KanbanCardProps) {
  const nextStatuses = statusTransitions[task.status] || [];

  return (
    <div
      className="bg-white border border-slate-200 rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
      role="listitem"
      draggable={true}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="font-medium text-slate-900 text-sm line-clamp-1">{task.stage || "Task"}</h4>
        <div className="flex items-center gap-1">
          {task.assigneeRoleId && (
            <Badge variant="secondary" className="text-xs">
              {task.assigneeRoleId}
            </Badge>
          )}
          {task.assigneeStaffId && (
            <Badge variant="outline" className="text-xs">
              {task.assigneeStaffId.slice(0, 8)}
            </Badge>
          )}
        </div>
      </div>

      {task.payload && typeof task.payload === "object" && "description" in task.payload && (
        <p className="text-slate-600 text-sm mb-3 line-clamp-2">
          {String(task.payload.description)}
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <select
          value={task.status}
          onChange={(e) => onUpdate(task.id, e.target.value as Task["status"])}
          className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-primary"
        >
          {["todo", "progress", "review", "done"].map((s) => (
            <option key={s} value={s} disabled={!statusTransitions[task.status].includes(s as Task["status"])}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-600">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}