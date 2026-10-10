"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  generateInvoice,
  finalizeInvoice,
  sendInvoice,
  markPaid,
  recordPayment,
  getInvoicePDF,
  getInvoices,
  getInvoiceById,
} from "./service";
import {
  GenerateInvoiceInput,
  SendInvoiceInput,
  MarkPaidInput,
  RecordPaymentInput,
  FinalizeInvoiceInput,
} from "./schema";
import { z } from "zod";

/**
 * Get server session with OWNER role check
 */
async function getOwnerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER role required");
  }
  return session;
}

/**
 * Generate invoice from project
 */
export async function generateInvoiceAction(input: z.infer<typeof GenerateInvoiceInput>) {
  const session = await getOwnerSession();
  const parsed = GenerateInvoiceInput.parse(input);
  const invoice = await generateInvoice({ ...parsed, generatedBy: session.user.id });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  return invoice;
}

/**
 * Finalize/approve invoice
 */
export async function finalizeInvoiceAction(input: z.infer<typeof FinalizeInvoiceInput>) {
  const session = await getOwnerSession();
  const parsed = FinalizeInvoiceInput.parse(input);
  const invoice = await finalizeInvoice({ ...parsed, approvedBy: session.user.id });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  return invoice;
}

/**
 * Send invoice to client
 */
export async function sendInvoiceAction(input: z.infer<typeof SendInvoiceInput>) {
  const session = await getOwnerSession();
  const parsed = SendInvoiceInput.parse(input);
  const invoice = await sendInvoice({ ...parsed, sentBy: session.user.id });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  return invoice;
}

/**
 * Mark invoice as paid
 */
export async function markPaidAction(input: z.infer<typeof MarkPaidInput>) {
  const session = await getOwnerSession();
  const parsed = MarkPaidInput.parse(input);
  const invoice = await markPaid({ ...parsed, paidBy: session.user.id });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  return invoice;
}

/**
 * Record payment
 */
export async function recordPaymentAction(input: z.infer<typeof RecordPaymentInput>) {
  const session = await getOwnerSession();
  const parsed = RecordPaymentInput.parse(input);
  const invoice = await recordPayment({ ...parsed, recordedBy: session.user.id });
  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  return invoice;
}

/**
 * Get invoices list (server action for dashboard)
 */
export async function getInvoicesAction(filters?: {
  status?: string;
  clientId?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}) {
  const session = await getOwnerSession();
  return getInvoices(filters as any);
}

/**
 * Get invoice detail
 */
export async function getInvoiceDetailAction(invoiceId: string) {
  const session = await getOwnerSession();
  return getInvoiceById(invoiceId);
}

/**
 * Generate and return PDF as base64
 */
export async function getInvoicePDFAction(invoiceId: string) {
  const session = await getOwnerSession();
  const pdfBytes = await getInvoicePDF(invoiceId);
  return Buffer.from(pdfBytes).toString("base64");
}

/**
 * Download invoice PDF (for API route)
 */
export async function downloadInvoicePDF(invoiceId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  
  const invoice = await getInvoiceById(invoiceId);
  if (!invoice) {
    throw new Error("Invoice not found");
  }
  
  // Check access: OWNER can access all, CLIENT only their own
  if (session.user.role === "CLIENT") {
    const client = await (await import("@/lib/db")).db.client.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!client || invoice.clientId !== client.id) {
      throw new Error("Forbidden");
    }
  }
  
  const pdfBytes = await getInvoicePDF(invoiceId);
  return pdfBytes;
}