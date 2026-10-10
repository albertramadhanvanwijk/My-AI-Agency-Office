import { db } from "@/lib/db";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import {
  GenerateInvoiceInput,
  SendInvoiceInput,
  MarkPaidInput,
  RecordPaymentInput,
  FinalizeInvoiceInput,
  Invoice,
  InvoiceItem,
  InvoiceStatusType,
  PaymentMethodType,
} from "./schema";

/**
 * Generate next invoice number: INV-YYYY-NNNN
 */
async function generateInvoiceNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  
  const lastInvoice = await db.invoice.findFirst({
    where: {
      number: { startsWith: prefix },
    },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  
  let nextNumber = 1;
  if (lastInvoice) {
    const lastNum = parseInt(lastInvoice.number.replace(prefix, ""), 10);
    nextNumber = lastNum + 1;
  }
  
  return `${prefix}${nextNumber.toString().padStart(4, "0")}`;
}

/**
 * Generate default invoice items from project
 */
async function generateDefaultItems(projectId: string): Promise<InvoiceItem[]> {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { title: true, budget: true, divisionIds: true },
  });
  
  if (!project) throw new Error("Project not found");
  
  const budget = Number(project.budget || 0);
  const divisions = project.divisionIds.length > 0 ? project.divisionIds : ["strategy", "creative", "tech", "marketing"];
  
  // Distribute budget across divisions
  const perDivision = budget / divisions.length;
  
  const divisionLabels: Record<string, string> = {
    strategy: "Strategy & Planning",
    creative: "Creative Design",
    tech: "Technical Development",
    marketing: "Marketing & Growth",
    clientrelations: "Client Relations",
    financeadmin: "Finance & Admin",
  };
  
  return divisions.map((div) => ({
    description: divisionLabels[div] || div,
    qty: 1,
    unitPrice: Math.round(perDivision),
    total: Math.round(perDivision),
  }));
}

/**
 * Create a draft invoice from a project
 */
export async function generateInvoice(input: GenerateInvoiceInput): Promise<Invoice> {
  const { projectId, generatedBy, dueDate, customItems } = GenerateInvoiceInput.parse(input);
  
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, clientId: true, title: true },
  });
  
  if (!project) throw new Error("Project not found");
  
  const items = customItems || (await generateDefaultItems(projectId));
  const amount = items.reduce((sum, item) => sum + item.total, 0);
  const number = await generateInvoiceNumber();
  
  const invoice = await db.invoice.create({
    data: {
      projectId: project.id,
      clientId: project.clientId,
      number,
      items: items as any,
      amount,
      status: "draft",
      dueDate: dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days default
      generatedBy,
    },
  });
  
  // Audit log
  await db.auditLog.create({
    data: {
      who: generatedBy,
      action: "invoice_generated",
      targetId: invoice.id,
      projectId: project.id,
    },
  });
  
  return invoice as unknown as Invoice;
}

/**
 * Finalize/approve invoice (draft -> ready to send)
 */
export async function finalizeInvoice(input: FinalizeInvoiceInput): Promise<Invoice> {
  const { invoiceId, approvedBy } = FinalizeInvoiceInput.parse(input);
  
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");
  
  if (invoice.status !== "draft") {
    throw new Error("Only draft invoices can be finalized");
  }
  
  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: { approvedBy },
  });
  
  await db.auditLog.create({
    data: {
      who: approvedBy,
      action: "invoice_finalized",
      targetId: invoiceId,
      projectId: invoice.projectId,
    },
  });
  
  return updated as unknown as Invoice;
}

/**
 * Send invoice to client (draft -> sent)
 */
export async function sendInvoice(input: SendInvoiceInput): Promise<Invoice> {
  const { invoiceId, sentBy } = SendInvoiceInput.parse(input);
  
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");
  
  if (invoice.status !== "draft" && invoice.status !== "sent") {
    throw new Error("Invoice must be in draft or sent status to send");
  }
  
  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "sent" },
  });
  
  await db.auditLog.create({
    data: {
      who: sentBy,
      action: "invoice_sent",
      targetId: invoiceId,
      projectId: invoice.projectId,
    },
  });
  
  // TODO: Trigger email notification to client
  // This would integrate with email service in production
  
  return updated as unknown as Invoice;
}

/**
 * Mark invoice as paid
 */
export async function markPaid(input: MarkPaidInput): Promise<Invoice> {
  const { invoiceId, paidBy } = MarkPaidInput.parse(input);
  
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");
  
  if (invoice.status === "paid") {
    throw new Error("Invoice already paid");
  }
  
  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: { status: "paid" },
  });
  
  await db.auditLog.create({
    data: {
      who: paidBy,
      action: "invoice_paid",
      targetId: invoiceId,
      projectId: invoice.projectId,
    },
  });
  
  return updated as unknown as Invoice;
}

/**
 * Record a payment against an invoice
 */
export async function recordPayment(input: RecordPaymentInput): Promise<Invoice> {
  const { invoiceId, amount, method, reference, recordedBy } = RecordPaymentInput.parse(input);
  
  const invoice = await db.invoice.findUnique({ where: { id: invoiceId } });
  if (!invoice) throw new Error("Invoice not found");
  
  // For MVP, we just mark as paid when full amount received
  // In future, could track partial payments
  const newStatus: InvoiceStatusType = amount >= Number(invoice.amount) ? "paid" : invoice.status;
  
  const updated = await db.invoice.update({
    where: { id: invoiceId },
    data: { status: newStatus },
  });
  
  await db.auditLog.create({
    data: {
      who: recordedBy,
      action: "payment_recorded",
      targetId: invoiceId,
      projectId: invoice.projectId,
      // Store payment details in audit log for now
      // In future, could create a separate Payment table
    },
  });
  
  return updated as unknown as Invoice;
}

/**
 * Generate PDF for invoice
 */
export async function getInvoicePDF(invoiceId: string): Promise<Uint8Array> {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      project: { select: { title: true } },
      client: {
        select: {
          company: true,
          contact: true,
          user: { select: { email: true, name: true } },
        },
      },
    },
  });
  
  if (!invoice) throw new Error("Invoice not found");
  
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const width = page.getWidth();
  const height = page.getHeight();
  
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  
  const margin = 50;
  let y = height - margin;
  const lineHeight = 14;
  const sectionGap = 24;
  
  // Colors
  const darkColor = rgb(0.15, 0.15, 0.2);
  const primaryColor = rgb(0.2, 0.4, 0.8);
  const lightGray = rgb(0.9, 0.9, 0.92);
  const mediumGray = rgb(0.5, 0.5, 0.55);
  
  // Helper functions
  const drawText = (text: string, x: number, yPos: number, size = 10, fontRef = font, color: any = darkColor) => {
    page.drawText(text, { x, y: yPos, size, font: fontRef, color });
  };
  
  const drawRightText = (text: string, x: number, yPos: number, size = 10, fontRef = font, color: any = darkColor) => {
    const textWidth = fontRef.widthOfTextAtSize(text, size);
    page.drawText(text, { x: x - textWidth, y: yPos, size, font: fontRef, color });
  };
  
  const drawLine = (yPos: number, color = mediumGray, opacity = 0.3) => {
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: width - margin, y: yPos },
      thickness: 0.5,
      color,
      opacity,
    });
  };
  
  // ===== HEADER =====
  // Agency name
  drawText("MY AI AGENCY OFFICE", margin, y, 24, fontBold, primaryColor);
  y -= 30;
  
  drawText("Virtual Agency — End-to-End AI Services", margin, y, 9, font, mediumGray);
  y -= 20;
  
  drawLine(y);
  y -= sectionGap;
  
  // ===== INVOICE INFO =====
  drawText("INVOICE", margin, y, 18, fontBold, darkColor);
  y -= 28;
  
  // Invoice details in two columns
  const leftCol = margin;
  const rightCol = width - margin - 200;
  
  drawText(`Invoice No: ${invoice.number}`, leftCol, y, 10, fontBold);
  drawText(`Date: ${new Date(invoice.createdAt).toLocaleDateString("en-GB")}`, rightCol, y, 10, font);
  y -= lineHeight * 1.5;
  
  drawText(`Status: ${invoice.status.toUpperCase()}`, leftCol, y, 10, fontBold, invoice.status === "paid" ? rgb(0.1, 0.6, 0.2) : primaryColor);
  drawText(`Due Date: ${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString("en-GB") : "N/A"}`, rightCol, y, 10, font);
  y -= lineHeight * 1.5;
  
  drawText(`Project: ${invoice.project?.title || "N/A"}`, leftCol, y, 10, font);
  y -= sectionGap;
  
  // ===== FROM / TO =====
  drawLine(y);
  y -= 10;
  
  drawText("FROM", leftCol, y, 9, fontBold, mediumGray);
  drawText("BILL TO", rightCol, y, 9, fontBold, mediumGray);
  y -= 16;
  
  drawText("My AI Agency Office", leftCol, y, 10, fontBold);
  drawText(invoice.client?.company || invoice.client?.user?.name || "Client", rightCol, y, 10, fontBold);
  y -= lineHeight;
  
  drawText("Virtual Agency Platform", leftCol, y, 9, font);
  if (invoice.client?.contact) {
    drawText(`Attn: ${invoice.client.contact}`, rightCol, y, 9, font);
  }
  y -= lineHeight;
  
  drawText("Indonesia", leftCol, y, 9, font);
  if (invoice.client?.user?.email) {
    drawText(invoice.client.user.email, rightCol, y, 9, font);
  }
  y -= sectionGap;
  
  // ===== LINE ITEMS =====
  drawLine(y);
  y -= 10;
  
  // Table header
  const colDesc = margin;
  const colQty = width - margin - 300;
  const colUnit = width - margin - 200;
  const colTotal = width - margin - 80;
  
  drawText("DESCRIPTION", colDesc, y, 9, fontBold, mediumGray);
  drawText("QTY", colQty, y, 9, fontBold, mediumGray);
  drawText("UNIT PRICE", colUnit, y, 9, fontBold, mediumGray);
  drawText("TOTAL", colTotal, y, 9, fontBold, mediumGray);
  y -= 14;
  
  drawLine(y, mediumGray, 0.5);
  y -= 8;
  
  // Items
  const items = invoice.items as unknown as InvoiceItem[];
  for (const item of items) {
    drawText(item.description, colDesc, y, 9, font);
    drawRightText(item.qty.toString(), colQty + 30, y, 9, font);
    drawRightText(formatCurrency(item.unitPrice), colUnit + 90, y, 9, font);
    drawRightText(formatCurrency(item.total), colTotal + 60, y, 9, fontBold);
    y -= lineHeight * 1.5;
  }
  
  drawLine(y, mediumGray, 0.5);
  y -= 12;
  
  // ===== TOTALS =====
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = 0; // No tax for MVP
  const total = subtotal + tax;
  
  drawRightText("Subtotal:", colUnit + 90, y, 10, fontBold);
  drawRightText(formatCurrency(subtotal), colTotal + 60, y, 10, fontBold);
  y -= lineHeight * 1.5;
  
  drawRightText("Tax (0%):", colUnit + 90, y, 10, font);
  drawRightText(formatCurrency(tax), colTotal + 60, y, 10, font);
  y -= lineHeight * 1.5;
  
  drawLine(y, darkColor, 0.8);
  y -= 10;
  
  drawRightText("TOTAL:", colUnit + 90, y, 12, fontBold, primaryColor);
  drawRightText(formatCurrency(total), colTotal + 60, y, 12, fontBold, primaryColor);
  y -= sectionGap * 2;
  
  // ===== PAYMENT TERMS =====
  drawLine(y);
  y -= 10;
  
  drawText("PAYMENT TERMS", margin, y, 10, fontBold, darkColor);
  y -= 16;
  
  const terms = [
    "Payment due within 30 days of invoice date.",
    "Bank Transfer: BCA 1234567890 a.n. My AI Agency Office",
    "Please include invoice number as reference.",
    "For inquiries: finance@myaiagency.example.com",
  ];
  
  for (const term of terms) {
    drawText(`• ${term}`, margin, y, 9, font, mediumGray);
    y -= lineHeight;
  }
  
  y -= sectionGap;
  
  // ===== FOOTER =====
  drawLine(y);
  y -= 10;
  
  drawText("Thank you for your business!", margin, y, 10, fontBold, primaryColor);
  y -= 16;
  
  drawText("Generated by My AI Agency Office Platform", margin, y, 8, font, mediumGray);
  drawRightText(`Page 1 of 1`, width - margin, y, 8, font, mediumGray);
  
  // Save
  const pdfBytes = await pdfDoc.save();
  return pdfBytes;
}

/**
 * Format currency as IDR
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Get invoice list with filters
 */
export async function getInvoices(filters?: {
  status?: InvoiceStatusType;
  clientId?: string;
  projectId?: string;
  page?: number;
  limit?: number;
}) {
  const page = filters?.page || 1;
  const limit = filters?.limit || 20;
  const skip = (page - 1) * limit;
  
  const where: any = {};
  if (filters?.status) where.status = filters.status;
  if (filters?.clientId) where.clientId = filters.clientId;
  if (filters?.projectId) where.projectId = filters.projectId;
  
  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        project: { select: { title: true } },
        client: { select: { company: true, user: { select: { name: true } } } },
      },
    }),
    db.invoice.count({ where }),
  ]);
  
  return {
    invoices: invoices as unknown as Invoice[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get invoice by ID with relations
 */
export async function getInvoiceById(invoiceId: string) {
  const invoice = await db.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      project: { select: { title: true, brief: true } },
      client: {
        select: {
          company: true,
          contact: true,
          user: { select: { email: true, name: true } },
        },
      },
    },
  });
  
  return invoice as unknown as Invoice & {
    project: { title: string; brief: string } | null;
    client: { company: string | null; contact: string | null; user: { email: string; name: string } } | null;
  } | null;
}