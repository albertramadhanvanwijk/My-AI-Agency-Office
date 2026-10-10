import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import { rejectProposal } from "@/modules/proposals/service";

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { proposalId, reason } = await request.json();
    if (!proposalId || !reason) {
      return NextResponse.json({ error: "proposalId and reason required" }, { status: 400 });
    }

    const result = await rejectProposal(proposalId, reason);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Reject proposal error:", error);
    return NextResponse.json({ error: "Failed to reject proposal" }, { status: 500 });
  }
}