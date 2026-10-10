import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import { format } from "date-fns";

export default async function ProjectsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const isOwner = session.user.role === "OWNER";

  const projects = await db.project.findMany({
    where: isOwner ? {} : { clientId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { company: true, name: true } },
      _count: { select: { tasks: true } },
    },
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Projects</h1>
        <Link href="/projects/new" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors">
          New Project
        </Link>
      </div>

      {projects.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
          <p className="text-slate-500 mb-4">No projects yet</p>
          <Link href="/projects/new" className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors inline-block">
            Create your first project
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="bg-white border border-slate-200 rounded-lg p-5 hover:border-primary hover:shadow-md transition-colors"
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 truncate">{project.title}</h3>
                  <p className="text-sm text-slate-500 mt-1 line-clamp-2">{project.brief}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusColors[project.status]}`}>
                  {statusLabels[project.status] || project.status}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-slate-500 border-t border-slate-100 pt-3">
                <span>
                  {project.client?.company || project.client?.name || "Unknown Client"}
                </span>
                <span>{project._count.tasks} tasks</span>
              </div>

              <div className="mt-3 text-xs text-slate-400">
                Created {format(project.createdAt, "MMM d, yyyy")}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}