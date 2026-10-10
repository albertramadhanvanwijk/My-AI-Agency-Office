import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { migrateProvisional } from "@/modules/proposals/service";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { proposalId } = await request.json();
    if (!proposalId) {
      return NextResponse.json({ error: "proposalId required" }, { status: 400 });
    }

    const result = await migrateProvisional(proposalId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Migrate provisional error:", error);
    return NextResponse.json({ error: "Failed to migrate provisional division" }, { status: 500 });
  }
}