import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import ProposalsOrgClient from "./ProposalsOrgClient";

export const dynamic = "force-dynamic";

export default async function OrganizationProposalsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") redirect("/login");

  let proposals: any[] = [];
  try {
    proposals = await db.proposal.findMany({
      orderBy: { createdAt: "desc" },
      include: { triggerProject: { select: { id: true, title: true } } },
    });
  } catch {
    proposals = [];
  }

  return <ProposalsOrgClient initialProposals={proposals as any} />;
}
