import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { TaskStatus } from "@/modules/workflow/schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; taskId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, taskId } = await params;

  try {
    const body = await request.json();
    const { status } = body;

    // Validate status
    if (!Object.values(TaskStatus.enum).includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const task = await db.task.update({
      where: { id: taskId, projectId: id },
      data: { status },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
  }
}