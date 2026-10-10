import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: "OWNER" | "CLIENT" };
    const isOwner = user.role === "OWNER";
    const { id } = await params;

    const project = await db.project.findUnique({
      where: { id },
      include: {
        client: { select: { company: true, name: true } },
        tasks: {
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            status: true,
            stage: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        invoices: {
          orderBy: { createdAt: "desc" },
        },
        conversations: {
          where: { type: "project" },
          include: {
            messages: {
              orderBy: { createdAt: "desc" },
              take: 50,
            },
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Check access: CLIENT can only access their own projects
    if (!isOwner && project.clientId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    return NextResponse.json(project);
  } catch (e) {
    console.error("Failed to fetch project:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}