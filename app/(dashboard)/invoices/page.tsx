import { Metadata } from "next";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { InvoiceList } from "./InvoiceList";

export const metadata: Metadata = {
  title: "Invoices | My AI Agency Office",
  description: "Manage invoices and payments",
};

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") redirect("/portal");

  return <InvoiceList />;
}