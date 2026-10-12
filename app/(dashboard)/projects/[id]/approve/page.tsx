import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { approveGateAction } from "@/modules/workflow/actions";
import { z } from "zod";
import ApproveGateForm from "./ApproveGateForm";

const approveGateSchema = z.object({
  projectId: z.string(),
  gate: z.enum(["brief", "plan"]),
  approver: z.enum(["owner", "client"]),
});

export default async function ApproveGatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ gate?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/projects");

  const { id } = await params;
  const { gate: gateParam } = await searchParams;
  const gate = (gateParam as "brief" | "plan") || "brief";

  const project = await db.project.findUnique({
    where: { id },
    include: {
      client: { select: { company: true, name: true, user: { select: { name: true, email: true } } } },
    },
  });

  if (!project) redirect("/projects");

  const gateLabels: Record<string, string> = {
    brief: "Brief",
    plan: "Plan",
  };

  const gateStatus = gate === "brief"
    ? (project.briefApprovedByOwner ? "approved" : "pending")
    : (project.planApprovedByOwner ? "approved" : "pending");

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <a href={`/projects/${id}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Project
        </a>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Approve {gateLabels[gate]} Gate</h1>
        <p className="text-slate-500 mb-6">Project: {project.title}</p>

        <div className="mb-6 p-4 bg-slate-50 rounded-lg">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Client</dt>
              <dd className="font-medium">
                {project.client?.company || project.client?.name || project.client?.user?.name || "Unknown"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Current Status</dt>
              <dd className="font-medium capitalize">{project.status.toLowerCase()}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Gate Status</dt>
              <dd className="font-medium">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  gateStatus === "approved" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {gateStatus === "approved" ? "Approved" : "Pending"}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <ApproveGateForm
          projectId={id}
          gate={gate}
          currentStatus={gateStatus}
        />
      </div>
    </div>
  );
}