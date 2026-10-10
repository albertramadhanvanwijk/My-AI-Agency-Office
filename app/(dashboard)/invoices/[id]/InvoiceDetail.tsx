"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Send, CheckCircle, AlertCircle, Edit, Trash2, Loader2, FileText, Clock, DollarSign, User, Building2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { InvoicePDF } from "@/components/invoicing/InvoicePDF";

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

interface InvoiceDetailProps {
  invoice: {
    id: string;
    number: string;
    status: string;
    amount: number;
    dueDate: string | null;
    pdfUrl: string | null;
    generatedBy: string | null;
    approvedBy: string | null;
    createdAt: string;
    updatedAt: string;
    items: Array<{ description: string; qty: number; unitPrice: number; total: number }>;
    project: { title: string; brief: string } | null;
    client: { company: string | null; contact: string | null; user: { email: string; name: string } } | null;
  };
}

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  const [pdfPreview, setPdfPreview] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setActionLoading(action);
    try {
      const res = await fetch(`/api/invoices/${invoice.id}/${action}`, { method: "POST" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${action}`);
      }
      // Refresh page to get updated data
      window.location.reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : `Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const subtotal = invoice.items.reduce((sum, item) => sum + item.total, 0);

  const canSend = invoice.status === "draft";
  const canMarkPaid = invoice.status === "sent" || invoice.status === "overdue";
  const canCancel = invoice.status === "draft" || invoice.status === "sent";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/invoices" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{invoice.number}</h1>
            <p className="text-slate-500 text-sm">{invoice.project?.title || "No project"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={cn(statusColors[invoice.status], "text-lg px-3 py-1.5")}>
            {statusLabels[invoice.status] || invoice.status}
          </Badge>
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button variant="outline"><Edit className="w-4 h-4 mr-2" /> Edit</Button>
          </Link>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {pdfPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPdfPreview(false)}>
          <div className="bg-white w-full max-w-4xl h-[90vh] rounded-lg shadow-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold">Invoice PDF Preview</h2>
              <Button variant="ghost" size="icon" onClick={() => setPdfPreview(false)}>
                <AlertCircle className="w-5 h-5" />
              </Button>
            </div>
            <div className="h-[calc(90vh-60px)] overflow-auto p-4 bg-slate-100">
              <InvoicePDF invoice={invoice} />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Invoice Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Invoice Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-500">Invoice Number</dt>
                  <dd className="font-medium mt-1 font-mono">{invoice.number}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Status</dt>
                  <dd className="font-medium mt-1">
                    <Badge variant="outline" className={cn(statusColors[invoice.status])}>
                      {statusLabels[invoice.status] || invoice.status}
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Issue Date</dt>
                  <dd className="font-medium mt-1">{format(new Date(invoice.createdAt), "MMMM d, yyyy")}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Due Date</dt>
                  <dd className="font-medium mt-1">{invoice.dueDate ? format(new Date(invoice.dueDate), "MMMM d, yyyy") : "Not set"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Generated By</dt>
                  <dd className="font-medium mt-1">{invoice.generatedBy || "—"}</dd>
                </div>
                <div>
                  <dt className="text-slate-500">Approved By</dt>
                  <dd className="font-medium mt-1">{invoice.approvedBy || "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" /> Line Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-sm font-medium text-slate-500">
                      <th className="pb-3">Description</th>
                      <th className="pb-3 text-right w-20">Qty</th>
                      <th className="pb-3 text-right w-32">Unit Price</th>
                      <th className="pb-3 text-right w-32">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invoice.items.map((item, index) => (
                      <tr key={index} className="text-sm">
                        <td className="py-3 text-slate-900">{item.description}</td>
                        <td className="py-3 text-right text-slate-500">{item.qty}</td>
                        <td className="py-3 text-right text-slate-500">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-3 text-right font-medium text-slate-900">{formatCurrency(item.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 text-sm">
                      <td className="pt-3 text-slate-500"></td>
                      <td className="pt-3 text-slate-500"></td>
                      <td className="pt-3 text-right font-medium text-slate-500">Subtotal</td>
                      <td className="pt-3 text-right font-medium text-slate-900">{formatCurrency(subtotal)}</td>
                    </tr>
                    <tr className="text-sm">
                      <td className="py-2 text-slate-500"></td>
                      <td className="py-2 text-slate-500"></td>
                      <td className="py-2 text-right font-medium text-slate-500">Tax (0%)</td>
                      <td className="py-2 text-right font-medium text-slate-900">{formatCurrency(0)}</td>
                    </tr>
                    <tr className="border-t border-slate-200 text-base">
                      <td className="pt-3 text-slate-500"></td>
                      <td className="pt-3 text-slate-500"></td>
                      <td className="pt-3 text-right font-bold text-slate-900">Total</td>
                      <td className="pt-3 text-right font-bold text-slate-900 text-lg">{formatCurrency(subtotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setPdfPreview(true)}
                  disabled={actionLoading === "preview"}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  {actionLoading === "preview" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Preview PDF"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={() => window.open(`/api/invoices/${invoice.id}/download`, "_blank")}
                  disabled={actionLoading === "download"}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {actionLoading === "download" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Download PDF"}
                </Button>

                {canSend && (
                  <Button
                    onClick={() => handleAction("send")}
                    disabled={actionLoading === "send"}
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {actionLoading === "send" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send to Client"}
                  </Button>
                )}

                {canMarkPaid && (
                  <Button
                    onClick={() => handleAction("mark-paid")}
                    disabled={actionLoading === "mark-paid"}
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    {actionLoading === "mark-paid" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Mark as Paid"}
                  </Button>
                )}

                {canCancel && (
                  <Button
                    variant="destructive"
                    onClick={() => handleAction("cancel")}
                    disabled={actionLoading === "cancel"}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    {actionLoading === "cancel" ? <Loader2 className="w-4 h-4 animate-spin" /> : "Cancel"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Client & Project Info */}
        <div className="space-y-6">
          {/* Client Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" /> Client
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <dt className="text-slate-500 text-sm">Company</dt>
                <dd className="font-medium mt-1">{invoice.client?.company || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-sm">Contact</dt>
                <dd className="font-medium mt-1">{invoice.client?.contact || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-sm">Email</dt>
                <dd className="font-medium mt-1">{invoice.client?.user?.email || "—"}</dd>
              </div>
            </CardContent>
          </Card>

          {/* Project Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" /> Project
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <dt className="text-slate-500 text-sm">Title</dt>
                <dd className="font-medium mt-1">{invoice.project?.title || "—"}</dd>
              </div>
              <div>
                <dt className="text-slate-500 text-sm">Brief</dt>
                <dd className="font-medium mt-1 text-slate-700 line-clamp-3">{invoice.project?.brief || "—"}</dd>
              </div>
            </CardContent>
          </Card>

          {/* Total Amount */}
          <Card className="border-primary">
            <CardContent className="pt-6 text-center">
              <dt className="text-slate-500 text-sm">Total Amount</dt>
              <dd className="font-bold text-3xl text-primary mt-1">{formatCurrency(invoice.amount)}</dd>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}