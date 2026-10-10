import { z } from "zod";

export const InvoiceStatus = z.enum([
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
]);

export const PaymentMethod = z.enum([
  "bank_transfer",
  "credit_card",
  "ewallet",
  "cash",
  "other",
]);

export const InvoiceItemSchema = z.object({
  description: z.string().min(1),
  qty: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
});

export const InvoiceSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  clientId: z.string(),
  number: z.string(),
  items: z.array(InvoiceItemSchema),
  amount: z.number(),
  status: InvoiceStatus,
  dueDate: z.date().nullable(),
  pdfUrl: z.string().nullable(),
  generatedBy: z.string().nullable(),
  approvedBy: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const PaymentSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  amount: z.number().positive(),
  method: PaymentMethod,
  reference: z.string().nullable(),
  paidAt: z.date(),
  recordedBy: z.string(),
  createdAt: z.date(),
});

export const GenerateInvoiceInput = z.object({
  projectId: z.string(),
  generatedBy: z.string(),
  dueDate: z.date().optional(),
  customItems: z.array(InvoiceItemSchema).optional(),
});

export const SendInvoiceInput = z.object({
  invoiceId: z.string(),
  sentBy: z.string(),
});

export const MarkPaidInput = z.object({
  invoiceId: z.string(),
  paidBy: z.string(),
});

export const RecordPaymentInput = z.object({
  invoiceId: z.string(),
  amount: z.number().positive(),
  method: PaymentMethod,
  reference: z.string().optional(),
  recordedBy: z.string(),
});

export const FinalizeInvoiceInput = z.object({
  invoiceId: z.string(),
  approvedBy: z.string(),
});

export type InvoiceStatusType = z.infer<typeof InvoiceStatus>;
export type PaymentMethodType = z.infer<typeof PaymentMethod>;
export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;
export type Invoice = z.infer<typeof InvoiceSchema>;
export type Payment = z.infer<typeof PaymentSchema>;
export type GenerateInvoiceInput = z.infer<typeof GenerateInvoiceInput>;
export type SendInvoiceInput = z.infer<typeof SendInvoiceInput>;
export type MarkPaidInput = z.infer<typeof MarkPaidInput>;
export type RecordPaymentInput = z.infer<typeof RecordPaymentInput>;
export type FinalizeInvoiceInput = z.infer<typeof FinalizeInvoiceInput>;