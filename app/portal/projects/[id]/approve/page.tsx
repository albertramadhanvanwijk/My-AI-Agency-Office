import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import ApproveGateClient from "./ApproveGateClient";

export default async function PortalApproveGatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gate?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { id } = await params;
  const { gate: gateParam } = await searchParams;
  const gate = (gateParam as "brief" | "plan") || "brief";
  const approver: "client" | "owner" = session.user.role === "OWNER" ? "owner" : "client";

  const project = await db.project.findUnique({
    where: { id },
    include: { client: { select: { company: true, name: true, user: { select: { name: true, email: true } } } } },
  });
  if (!project) notFound();

  // Portal: only OWNER or the owning CLIENT may approve (resolve Client.id via User.id)
  const isOwner = session.user.role === "OWNER";
  let isClientOwner = false;
  const sid = (session.user as unknown as { id: string }).id;
  if (sid) {
    const c = await db.client.findUnique({ where: { userId: sid }, select: { id: true } });
    if (c && project.clientId === c.id) isClientOwner = true;
  }
  // Also allow by email match for seed where user.id may be different
  const sessionEmail = (session.user as unknown as { email?: string }).email;
  const clientEmail = project.client?.user?.email;
  const isEmailOwner = !!sessionEmail && !!clientEmail && sessionEmail === clientEmail;
  if (!isOwner && !isClientOwner && !isEmailOwner) {
    return (
      <div className="container mx-auto py-12 max-w-2xl">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-red-800">Access denied</h2>
          <p className="mt-2 text-sm text-red-700">You do not have permission to approve this project.</p>
          <a href="/portal" className="mt-4 inline-block text-sm text-red-600 underline">Back to Portal</a>
        </div>
      </div>
    );
  }

  const gateStatus: "approved" | "pending" =
    gate === "brief"
      ? project.briefApprovedByClient || (isOwner ? project.briefApprovedByOwner : false) ? "approved" : "pending"
      : project.planApprovedByClient || (isOwner ? project.planApprovedByOwner : false) ? "approved" : "pending";

  // For client view, reflect client-side flag; for owner viewing portal, reflect owner flag too
  const effectiveStatus: "approved" | "pending" =
    approver === "client"
      ? gate === "brief"
        ? project.briefApprovedByClient ? "approved" : "pending"
        : project.planApprovedByClient ? "approved" : "pending"
      : gate === "brief"
        ? project.briefApprovedByOwner ? "approved" : "pending"
        : project.planApprovedByOwner ? "approved" : "pending";

  void gateStatus; // keep for future combined display

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <a href={`/portal/projects/${id}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4">
          Back to Project
        </a>
      </div>
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Approve {gate === "brief" ? "Brief" : "Plan"} Gate</h1>
        <p className="text-slate-500 mb-6">Project: {project.title} — approving as {approver}</p>
        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-slate-500">Client</dt><dd className="font-medium">{project.client?.company || project.client?.name || "Unknown"}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Status</dt><dd className="font-medium capitalize">{project.status.toLowerCase()}</dd></div>
            <div className="flex justify-between"><dt className="text-slate-500">Gate Status</dt><dd><span className={`px-2 py-1 text-xs font-medium rounded-full ${effectiveStatus === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{effectiveStatus === "approved" ? "Approved" : "Pending"}</span></dd></div>
          </dl>
        </div>
        <ApproveGateClient projectId={id} gate={gate} currentStatus={effectiveStatus} approver={approver} />
      </div>
    </div>
  );
}
