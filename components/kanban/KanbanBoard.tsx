"use client";

import { useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import { Task } from "@/modules/workflow/schema";

interface KanbanBoardProps {
  tasks: Task[];
  onTaskUpdate: (taskId: string, status: Task["status"]) => void;
}

export function KanbanBoard({ tasks, onTaskUpdate }: KanbanBoardProps) {
  const columns: { id: Task["status"]; title: string }[] = [
    { id: "todo", title: "To Do" },
    { id: "progress", title: "In Progress" },
    { id: "review", title: "Review" },
    { id: "done", title: "Done" },
  ];

  return (
    <div className="flex gap-4 overflow-x-auto pb-4" role="region" aria-label="Project Kanban Board">
      {columns.map((col) => (
        <KanbanColumn
          key={col.id}
          columnId={col.id}
          title={col.title}
          tasks={tasks.filter((t) => t.status === col.id)}
          onTaskUpdate={onTaskUpdate}
        />
      ))}
    </div>
  );
}