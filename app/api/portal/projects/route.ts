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

    const projects = await db.project.findMany({
      where: isOwner ? {} : { clientId: user.id },
      orderBy: { updatedAt: "desc" },
      include: {
        client: { select: { company: true, name: true } },
        _count: { select: { tasks: true } },
        invoices: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        conversations: {
          where: { type: "project" },
          take: 1,
          orderBy: { updatedAt: "desc" },
          include: {
            messages: {
              take: 1,
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    return NextResponse.json({ projects });
  } catch (e) {
    console.error("Failed to fetch projects:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}