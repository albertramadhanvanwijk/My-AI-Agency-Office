"use client";

import Link from "next/link";
import { FileText, Download, Eye, Edit, Clock, DollarSign, Building2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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

interface InvoiceCardProps {
  invoice: {
    id: string;
    number: string;
    status: string;
    amount: number;
    dueDate: string | null;
    createdAt: string;
    project: { title: string } | null;
    client: { company: string | null; user: { name: string } } | null;
  };
  variant?: "default" | "compact";
  onDownload?: (invoiceId: string) => void;
}

export function InvoiceCard({ invoice, variant = "default", onDownload }: InvoiceCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const isOverdue = invoice.status === "sent" && invoice.dueDate && new Date(invoice.dueDate) < new Date();

  if (variant === "compact") {
    return (
      <Link
        href={`/invoices/${invoice.id}`}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <FileText className="w-10 h-10 text-slate-400 flex-shrink-0" />
          <div>
            <p className="font-medium text-slate-900">{invoice.number}</p>
            <p className="text-sm text-slate-500">
              {invoice.project?.title || "No project"} • {invoice.client?.company || invoice.client?.user?.name || "Unknown"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 sm:flex-row flex-wrap">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <DollarSign className="w-4 h-4" />
            <span className="font-medium text-slate-900">{formatCurrency(invoice.amount)}</span>
          </div>
          <Badge variant="outline" className={cn(statusColors[invoice.status], "text-xs")}>
            {isOverdue ? "Overdue" : (statusLabels[invoice.status] || invoice.status)}
          </Badge>
          {invoice.dueDate && (
            <span className={cn("text-sm flex items-center gap-1", isOverdue ? "text-red-600" : "text-slate-500")}>
              <Clock className="w-4 h-4" />
              Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}
            </span>
          )}
        </div>
      </Link>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-slate-500" />
            </div>
            <div>
              <Link href={`/invoices/${invoice.id}`} className="font-medium text-slate-900 hover:text-primary text-lg">
                {invoice.number}
              </Link>
              <p className="text-sm text-slate-500 mt-1">{invoice.project?.title || "No project"}</p>
              <p className="text-sm text-slate-500">{invoice.client?.company || invoice.client?.user?.name || "Unknown client"}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4 text-slate-400" />
                <span className="font-bold text-slate-900 text-lg">{formatCurrency(invoice.amount)}</span>
              </div>
              <Badge variant="outline" className={cn(statusColors[invoice.status], "text-sm")}>
                {isOverdue ? "Overdue" : (statusLabels[invoice.status] || invoice.status)}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              {invoice.dueDate && (
                <span className={cn("text-sm flex items-center gap-1", isOverdue ? "text-red-600" : "text-slate-500")}>
                  <Clock className="w-4 h-4" />
                  Due: {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                </span>
              )}
              <span className="text-sm text-slate-500 flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {format(new Date(invoice.createdAt), "MMM d, yyyy")}
              </span>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/invoices/${invoice.id}`} title="View">
                    <Eye className="w-4 h-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDownload?.(invoice.id)} title="Download PDF">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}