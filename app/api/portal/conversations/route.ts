import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: "OWNER" | "CLIENT" };
    const isOwner = user.role === "OWNER";
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    // Verify project access
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { clientId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (!isOwner && project.clientId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Find or create project conversation
    let conversation = await db.conversation.findFirst({
      where: {
        projectId,
        type: "project",
      },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!conversation) {
      // Create conversation for this project
      conversation = await db.conversation.create({
        data: {
          projectId,
          type: "project",
          title: "Project Chat",
          participantIds: [user.id], // Will be expanded when other participants join
          status: "open",
        },
        include: {
          messages: true,
        },
      });
    }

    // Check if user is a participant, add if not
    const participantIds = conversation.participantIds as string[];
    if (!participantIds.includes(user.id)) {
      conversation = await db.conversation.update({
        where: { id: conversation.id },
        data: {
          participantIds: {
            push: user.id,
          },
        },
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 50,
          },
        },
      });
    }

    return NextResponse.json({ 
      conversation: {
        ...conversation,
        messages: conversation.messages.reverse(), // Return in chronological order
      },
      currentUserId: user.id,
    });
  } catch (e) {
    console.error("Failed to fetch conversation:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: "OWNER" | "CLIENT" };
    const body = await req.json();
    const { projectId, participantIds, title } = body;

    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    // Verify project access
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { clientId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const isOwner = user.role === "OWNER";
    if (!isOwner && project.clientId !== user.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Create conversation
    const conversation = await db.conversation.create({
      data: {
        projectId,
        type: "project",
        title: title || "Project Chat",
        participantIds: participantIds || [user.id],
        status: "open",
      },
    });

    return NextResponse.json({ conversation });
  } catch (e) {
    console.error("Failed to create conversation:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}