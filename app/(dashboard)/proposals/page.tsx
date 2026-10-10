import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { listProposals } from "@/modules/proposals/service";
import ProposalListClient from "./ProposalListClient";

export default async function ProposalsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") {
    redirect("/login");
  }

  const proposals = await listProposals();

  return <ProposalListClient initialProposals={proposals} />;
}