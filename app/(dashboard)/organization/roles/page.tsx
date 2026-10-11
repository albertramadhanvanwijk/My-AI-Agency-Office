import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import RolesClient from "./RolesClient";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") redirect("/login");

  let roles: any[] = [];
  let divisions: { id: string; name: string }[] = [];
  try {
    [roles, divisions] = await Promise.all([
      db.role.findMany({
        orderBy: { createdAt: "desc" },
        include: { division: { select: { id: true, name: true, color: true } } },
      }),
      db.division.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    ]);
  } catch {
    roles = [];
    divisions = [];
  }

  return <RolesClient initialRoles={roles as any} divisions={divisions} />;
}
