import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import CreateProjectForm from "./CreateProjectForm";

export default async function NewProjectPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/projects");

  const clients = await db.client.findMany({
    where: { user: { role: "CLIENT" } },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { company: "asc" },
  });

  return <CreateProjectForm initialClients={clients} />;
}