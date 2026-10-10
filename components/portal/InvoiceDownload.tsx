"use client";

import { useState } from "react";
import { Download, FileText, ExternalLink, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InvoiceDownloadProps {
  invoiceId: string;
  className?: string;
}

export function InvoiceDownload({ invoiceId, className }: InvoiceDownloadProps) {
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleDownload = async () => {
    setDownloading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await fetch(`/api/portal/invoices/${invoiceId}/download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        if (res.status === 403) {
          throw new Error("Access denied: You don't have permission to download this invoice");
        } else if (res.status === 404) {
          throw new Error("Invoice not found");
        } else {
          throw new Error("Failed to generate download link");
        }
      }

      const data = await res.json();
      
      if (data.url) {
        // Open the signed URL in a new tab
        window.open(data.url, "_blank", "noopener,noreferrer");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        throw new Error("No download URL received");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to download invoice");
      setTimeout(() => setError(null), 5000);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        size="icon"
        onClick={handleDownload}
        disabled={downloading}
        className="text-slate-500 hover:text-slate-700"
        aria-label="Download invoice"
      >
        {downloading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : success ? (
          <CheckCircle className="w-4 h-4 text-emerald-500" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </Button>

      {error && (
        <div className="absolute right-0 bottom-full mb-2 w-72 p-3 bg-red-50 border border-red-200 rounded-lg shadow-lg text-xs text-red-800 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="absolute right-0 bottom-full mb-2 w-48 p-3 bg-emerald-50 border border-emerald-200 rounded-lg shadow-lg text-xs text-emerald-800 animate-in fade-in zoom-in-95">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            <span>Download started</span>
          </div>
        </div>
      )}
    </div>
  );
}