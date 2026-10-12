import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { format } from "date-fns";
import { Building2, MessageSquare, FileText, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

const statusLabels: Record<string, string> = {
  INQUIRY: "Inquiry",
  BRIEF: "Brief",
  PLANNING: "Planning",
  EXECUTION: "Execution",
  QA: "QA",
  DELIVERY: "Delivery",
  CLOSING: "Closing",
};

const statusColors: Record<string, string> = {
  INQUIRY: "bg-gray-100 text-gray-700",
  BRIEF: "bg-blue-100 text-blue-700",
  PLANNING: "bg-purple-100 text-purple-700",
  EXECUTION: "bg-orange-100 text-orange-700",
  QA: "bg-amber-100 text-amber-700",
  DELIVERY: "bg-emerald-100 text-emerald-700",
  CLOSING: "bg-indigo-100 text-indigo-700",
};

const invoiceStatusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-700",
};

async function getUserProjects(userId: string, role: "OWNER" | "CLIENT") {
  const isOwner = role === "OWNER";
  let clientId: string | null = null;
  if (!isOwner) {
    const c = await db.client.findUnique({ where: { userId }, select: { id: true } });
    if (!c) return [];
    clientId = c.id;
  }
  return db.project.findMany({
    where: isOwner ? {} : { clientId: clientId! },
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
      },
    },
  });
}

export default async function PortalDashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as { id: string; role: "OWNER" | "CLIENT"; name?: string | null; email?: string | null };
  const isOwner = user.role === "OWNER";

  const projects = await getUserProjects(user.id, user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Projects</h1>
          <p className="text-slate-500 mt-1">
            {isOwner ? "All projects across all clients" : "Track progress, chat with team, and manage invoices"}
          </p>
        </div>
        
        {isOwner && (
          <Link href="/projects/new" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors inline-flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            New Project
          </Link>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Projects</CardTitle>
            <Building2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">In Progress</CardTitle>
            <Loader2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter(p => ["PLANNING", "EXECUTION", "QA"].includes(p.status)).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Delivered</CardTitle>
            <CheckCircle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.filter(p => p.status === "DELIVERY").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Pending Invoices</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projects.reduce((acc, p) => acc + p.invoices.filter(i => i.status === "sent" || i.status === "overdue").length, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-900 mb-2">No projects yet</h3>
            <p className="text-slate-500 mb-6">
              {isOwner 
                ? "Create your first project from the dashboard" 
                : "Projects will appear here once created"}
            </p>
            {isOwner && (
              <Link href="/projects/new" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors inline-block">
                Create Project
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/portal/projects/${project.id}`}
              className="group block bg-white border border-slate-200 rounded-lg p-5 hover:border-primary hover:shadow-md transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0 flex items-center gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building2 className="w-6 h-6 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate group-hover:text-primary transition-colors">
                      {project.title}
                    </h3>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-1">{project.brief}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-slate-400">
                      <span>{project.client?.company || project.client?.name || "Unknown Client"}</span>
                      <span>•</span>
                      <span>{project._count.tasks} tasks</span>
                      <span>•</span>
                      <span>Updated {format(project.updatedAt, "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:items-end gap-2 sm:flex-row sm:gap-4">
                  <Badge variant="outline" className={statusColors[project.status]}>
                    {statusLabels[project.status] || project.status}
                  </Badge>
                  
                  {/* Latest Invoice */}
                  {project.invoices.length > 0 && (
                    <Badge variant="outline" className={invoiceStatusColors[project.invoices[0].status]}>
                      {project.invoices[0].number}: {invoiceStatusLabels[project.invoices[0].status] || project.invoices[0].status}
                    </Badge>
                  )}

                  {/* Latest Message Preview */}
                  {project.conversations.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 w-full sm:w-auto truncate">
                      <MessageSquare className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">View conversation</span>
                    </div>
                  )}

                  <span className="text-slate-400 text-sm">
                    <Clock className="w-4 h-4 inline" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}