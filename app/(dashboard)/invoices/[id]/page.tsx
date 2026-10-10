import { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInvoiceById } from "@/modules/finance/service";
import { InvoiceDetail } from "./InvoiceDetail";

interface PageProps {
  params: Promise<{ id: string }>;
}

function serializeInvoice(invoice: any) {
  return {
    ...invoice,
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString() : null,
    createdAt: invoice.createdAt.toISOString(),
    updatedAt: invoice.updatedAt.toISOString(),
    items: invoice.items.map((item: any) => ({
      ...item,
      unitPrice: Number(item.unitPrice),
      total: Number(item.total),
    })),
    amount: Number(invoice.amount),
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Invoice ${id} | My AI Agency Office`,
    description: "Invoice details and actions",
  };
}

export default async function InvoicePage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/portal");

  const { id } = await params;
  const invoice = await getInvoiceById(id);
  
  if (!invoice) notFound();

  return <InvoiceDetail invoice={serializeInvoice(invoice)} />;
}