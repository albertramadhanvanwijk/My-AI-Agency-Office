import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getInvoiceById } from "@/modules/finance/service";
import { InvoiceForm } from "@/components/invoicing/InvoiceForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

function serializeInvoiceForForm(invoice: any) {
  return {
    id: invoice.id,
    projectId: invoice.projectId,
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    items: invoice.items.map((item: any) => ({
      description: item.description,
      qty: item.qty,
      unitPrice: Number(item.unitPrice),
    })),
  };
}

function serializeProject(project: any) {
  return {
    ...project,
    budget: project.budget ? Number(project.budget) : null,
  };
}

export const metadata: Metadata = {
  title: "Edit Invoice | My AI Agency Office",
  description: "Edit an existing invoice",
};

export default async function EditInvoicePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/portal");

  const { id } = await params;
  const invoice = await getInvoiceById(id);
  
  if (!invoice) notFound();

  // Only allow editing draft invoices
  if (invoice.status !== "draft") {
    redirect(`/invoices/${id}`);
  }

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

  return <InvoiceForm initialInvoice={serializeInvoiceForForm(invoice)} projects={projects.map(serializeProject)} />;
}