import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import DivisionsClient from "./DivisionsClient";

export const dynamic = "force-dynamic";

export default async function DivisionsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") redirect("/login");

  let divisions: any[] = [];
  try {
    divisions = await db.division.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { roles: true, staff: true } } },
    });
  } catch {
    divisions = [];
  }

  return <DivisionsClient initialDivisions={divisions as any} />;
}
