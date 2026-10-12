import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DeliverClient from "./DeliverClient";

export default async function DeliverPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") redirect("/login");

  const { id } = await params;

  const project = await db.project.findUnique({
    where: { id },
    include: { client: true },
  });

  if (!project) notFound();

  const statusVariant = project.status === "DELIVERY" ? "success" as const : "default" as const;

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-2xl">Deliver Project</CardTitle>
            <Badge variant={statusVariant}>{project.status}</Badge>
          </div>
          <CardDescription>Project: {project.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 whitespace-pre-wrap">{project.brief}</p>
          </div>
          <DeliverClient projectId={id} currentStatus={project.status} />
        </CardContent>
      </Card>
    </div>
  );
}
