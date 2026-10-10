import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { InvoiceForm } from "@/components/invoicing/InvoiceForm";

function serializeProject(project: any) {
  return {
    ...project,
    budget: project.budget ? Number(project.budget) : null,
  };
}

export const metadata: Metadata = {
  title: "Create Invoice | My AI Agency Office",
  description: "Create a new invoice",
};

export default async function CreateInvoicePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/portal");

  // Fetch projects for dropdown
  const projects = await db.project.findMany({
    where: { status: { in: ["DELIVERY", "CLOSING"] } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      clientId: true,
      client: { select: { company: true, user: { select: { name: true } } } },
      budget: true,
    },
  });

  return <InvoiceForm projects={projects.map(serializeProject)} />;
}