import { format as fnsFormat, formatDistanceToNow, parseISO, isValid } from "date-fns";
import { id } from "date-fns/locale";

/**
 * Format date to Indonesian locale string
 */
export function formatDate(date: Date | string, pattern: string = "dd MMMM yyyy"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "Invalid date";
  return fnsFormat(d, pattern, { locale: id });
}

/**
 * Format date time to Indonesian locale
 */
export function formatDateTime(date: Date | string): string {
  return formatDate(date, "dd MMMM yyyy, HH:mm");
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(d)) return "Unknown time";
  return formatDistanceToNow(d, { addSuffix: true, locale: id });
}

/**
 * Format currency in IDR
 */
export function formatCurrency(amount: number, currency: "IDR" | "USD" = "IDR"): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency,
    minimumFractionDigits: currency === "IDR" ? 0 : 2,
    maximumFractionDigits: currency === "IDR" ? 0 : 2,
  }).format(amount);
}

/**
 * Format number with Indonesian locale
 */
export function formatNumber(num: number): string {
  return new Intl.NumberFormat("id-ID").format(num);
}

/**
 * Format percentage
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

/**
 * Capitalize first letter
 */
export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert string to title case
 */
export function toTitleCase(text: string): string {
  return text
    .split(" ")
    .map((word) => capitalize(word))
    .join(" ");
}

/**
 * Generate slug from string
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Format project status for display
 */
export function formatProjectStatus(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" } {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
    INQUIRY: { label: "Inquiry", variant: "outline" },
    BRIEF: { label: "Brief & Discovery", variant: "default" },
    PLANNING: { label: "Planning", variant: "secondary" },
    EXECUTION: { label: "Execution", variant: "default" },
    QA: { label: "QA & Consolidation", variant: "warning" },
    DELIVERY: { label: "Delivery", variant: "success" },
    CLOSING: { label: "Closing", variant: "secondary" },
  };
  return statusMap[status] ?? { label: status, variant: "default" };
}

/**
 * Format task status for display
 */
export function formatTaskStatus(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" } {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
    todo: { label: "To Do", variant: "outline" },
    progress: { label: "In Progress", variant: "default" },
    review: { label: "Review", variant: "warning" },
    done: { label: "Done", variant: "success" },
  };
  return statusMap[status] ?? { label: status, variant: "default" };
}

/**
 * Format invoice status for display
 */
export function formatInvoiceStatus(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" } {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
    draft: { label: "Draft", variant: "outline" },
    sent: { label: "Sent", variant: "default" },
    paid: { label: "Paid", variant: "success" },
    overdue: { label: "Overdue", variant: "destructive" },
    cancelled: { label: "Cancelled", variant: "secondary" },
  };
  return statusMap[status] ?? { label: status, variant: "default" };
}

/**
 * Format staff status for display
 */
export function formatStaffStatus(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; dotColor: string } {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning"; dotColor: string }> = {
    active: { label: "Active", variant: "success", dotColor: "text-green-500" },
    standby: { label: "Standby", variant: "outline", dotColor: "text-gray-400" },
    break: { label: "Break", variant: "warning", dotColor: "text-yellow-500" },
  };
  return statusMap[status] ?? { label: status, variant: "default", dotColor: "text-gray-400" };
}

/**
 * Format proposal status for display
 */
export function formatProposalStatus(status: string): { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" } {
  const statusMap: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" | "warning" }> = {
    pending: { label: "Pending", variant: "warning" },
    approved: { label: "Approved", variant: "success" },
    rejected: { label: "Rejected", variant: "destructive" },
  };
  return statusMap[status] ?? { label: status, variant: "default" };
}