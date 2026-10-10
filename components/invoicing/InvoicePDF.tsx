"use client";

import { FileText, Building2, Mail, Phone, DollarSign, Calendar } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const statusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-700",
};

interface InvoicePDFProps {
  invoice: {
    id: string;
    number: string;
    status: string;
    amount: number;
    dueDate: string | null;
    createdAt: string;
    items: Array<{ description: string; qty: number; unitPrice: number; total: number }>;
    project: { title: string; brief: string } | null;
    client: { company: string | null; contact: string | null; user: { email: string; name: string } } | null;
  };
  className?: string;
}

export function InvoicePDF({ invoice, className }: InvoicePDFProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);

  return (
    <div className={cn("max-w-3xl mx-auto p-8 bg-white shadow-sm", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6 mb-8 pb-6 border-b-2 border-slate-200">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 text-primary">MY AI AGENCY OFFICE</h1>
          <p className="text-slate-500 mt-1">Virtual Agency — End-to-End AI Services</p>
        </div>
        <div className="text-right">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
            style={{ backgroundColor: statusColors[invoice.status]?.replace("bg-", "bg-").replace("text-", "text-") || "bg-gray-100 text-gray-700" }}>
            <FileText className="w-4 h-4" />
            {statusLabels[invoice.status] || invoice.status}
          </div>
        </div>
      </div>

      {/* Invoice Info */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" /> From
          </h2>
          <address className="not-italic text-slate-700 space-y-1">
            <p className="font-medium">My AI Agency Office</p>
            <p>Virtual Agency Platform</p>
            <p>Indonesia</p>
          </address>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5" /> Bill To
          </h2>
          <address className="not-italic text-slate-700 space-y-1">
            <p className="font-medium">{invoice.client?.company || invoice.client?.user?.name || "Client"}</p>
            {invoice.client?.contact && <p>Attn: {invoice.client.contact}</p>}
            {invoice.client?.user?.email && <p><Mail className="w-4 h-4 inline" /> {invoice.client.user.email}</p>}
          </address>
        </div>
      </div>

      {/* Invoice Details */}
      <div className="grid grid-cols-4 gap-4 mb-8 p-4 bg-slate-50 rounded-lg">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Invoice No.</p>
          <p className="font-mono font-medium text-slate-900">{invoice.number}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Issue Date</p>
          <p className="font-medium text-slate-900 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {format(new Date(invoice.createdAt), "MMMM d, yyyy")}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Due Date</p>
          <p className="font-medium text-slate-900 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {invoice.dueDate ? format(new Date(invoice.dueDate), "MMMM d, yyyy") : "Not set"}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">Project</p>
          <p className="font-medium text-slate-900 truncate">{invoice.project?.title || "N/A"}</p>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="overflow-x-auto mb-8">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b-2 border-slate-200">
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-16">Qty</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Unit Price</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.items.map((item, index) => (
              <tr key={index} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">{item.description}</td>
                <td className="px-4 py-3 text-right text-slate-500">{item.qty}</td>
                <td className="px-4 py-3 text-right text-slate-500">{formatCurrency(item.unitPrice)}</td>
                <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals */}
      <div className="flex justify-end mb-8">
        <div className="w-64 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Subtotal</span>
            <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Tax (0%)</span>
            <span className="font-medium text-slate-900">{formatCurrency(0)}</span>
          </div>
          <div className="border-t border-slate-200 pt-2"></div>
          <div className="flex justify-between text-lg font-bold text-primary">
            <span>Total</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
        </div>
      </div>

      {/* Payment Terms */}
      <div className="border-t border-slate-200 pt-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" /> Payment Terms
        </h3>
        <div className="space-y-2 text-sm text-slate-600">
          <p>• Payment due within 30 days of invoice date.</p>
          <p>• Bank Transfer: BCA 1234567890 a.n. My AI Agency Office</p>
          <p>• Please include invoice number as reference.</p>
          <p>• For inquiries: finance@myaiagency.example.com</p>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-12 pt-6 border-t border-slate-200 text-center text-slate-500 text-sm">
        <p>Thank you for your business!</p>
        <p className="mt-2">Generated by My AI Agency Office Platform</p>
      </div>
    </div>
  );
}