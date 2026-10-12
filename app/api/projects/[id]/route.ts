import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    include: {
      client: {
        select: {
          company: true,
          name: true,
          user: {
            select: { name: true, email: true }
          }
        }
      },
      _count: { select: { tasks: true } },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Check access: owner can see all, client can only see their own (Client.id via User.id)
  if (session.user.role !== "OWNER") {
    const c = await db.client.findUnique({ where: { userId: session.user.id }, select: { id: true } });
    if (!c || project.clientId !== c.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  return NextResponse.json(project);
}