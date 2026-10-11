import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import HrClient from "./HrClient";

export const dynamic = "force-dynamic";

export default async function HrPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") redirect("/login");

  let staff: any[] = [];
  let desks: any[] = [];
  try {
    [staff, desks] = await Promise.all([
      db.staff.findMany({
        orderBy: { name: "asc" },
        include: {
          role: { select: { id: true, title: true, level: true } },
          division: { select: { id: true, name: true, color: true } },
        },
      }),
      db.desk.findMany({ select: { id: true, staffId: true, roomId: true, clusterId: true } }),
    ]);
  } catch {
    staff = [];
    desks = [];
  }

  return <HrClient initialStaff={staff as any} initialDesks={desks as any} />;
}
