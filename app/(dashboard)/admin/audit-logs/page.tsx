import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAuditLogs } from "@/modules/admin/service";
import { AuditLogQuery, AuditLogResponse } from "@/modules/admin/schema";
import AuditLogTable from "@/components/admin/AuditLogTable";

export const dynamic = "force-dynamic";

async function getOwnerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER role required");
  }
  return session;
}

// Default query
const defaultQuery: AuditLogQuery = {
  limit: 50,
  offset: 0,
};

export default async function AdminAuditLogsPage() {
  const session = await getOwnerSession();
  
  const initialData: AuditLogResponse = await getAuditLogs(defaultQuery);

  return (
    <div className="container mx-auto py-6">
      <AuditLogTable initialData={initialData} initialQuery={defaultQuery} />
    </div>
  );
}