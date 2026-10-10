"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Download, 
  Search, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Eye,
  Loader2,
  Calendar,
  Database
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { AuditLogQuery, AuditLogResponse, getAuditLogsAction, exportAuditLogsCSVAction } from "@/modules/admin/actions";
import { AuditLogEntry } from "@/modules/admin/schema";
import { AuditLogFilters } from "./AuditLogFilters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface AuditLogTableProps {
  initialData: AuditLogResponse;
  initialQuery: AuditLogQuery;
}

export default function AuditLogTable({ initialData, initialQuery }: AuditLogTableProps) {
  const [data, setData] = useState<AuditLogResponse>(initialData);
  const [query, setQuery] = useState<AuditLogQuery>(initialQuery);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  const fetchLogs = async (newQuery?: Partial<AuditLogQuery>) => {
    setLoading(true);
    const mergedQuery = { ...query, ...newQuery, offset: newQuery?.offset ?? 0 };
    setQuery(mergedQuery);
    
    try {
      const result = await getAuditLogsAction(mergedQuery);
      setData(result);
    } catch (error) {
      console.error("Failed to fetch audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const csv = await exportAuditLogsCSVAction({ ...query, limit: 10000, offset: 0 });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `audit-logs-${format(new Date(), "yyyy-MM-dd")}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export:", error);
    } finally {
      setExporting(false);
    }
  };

  const handlePageChange = (newPage: number) => {
    const newOffset = (newPage - 1) * query.limit;
    fetchLogs({ offset: newOffset });
  };

  const handleLimitChange = (newLimit: number) => {
    fetchLogs({ limit: newLimit, offset: 0 });
  };

  const openDetail = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setShowDetail(true);
  };

  const { logs, pagination } = data;
  const { page, limit, total, totalPages } = pagination;

  const actionColors: Record<string, string> = {
    project_created: "bg-blue-100 text-blue-700",
    project_updated: "bg-blue-100 text-blue-700",
    task_created: "bg-green-100 text-green-700",
    task_completed: "bg-green-100 text-green-700",
    invoice_generated: "bg-purple-100 text-purple-700",
    invoice_sent: "bg-purple-100 text-purple-700",
    invoice_paid: "bg-emerald-100 text-emerald-700",
    setting_created: "bg-amber-100 text-amber-700",
    setting_updated: "bg-amber-100 text-amber-700",
    feature_flag_toggled: "bg-orange-100 text-orange-700",
    feature_flag_created: "bg-orange-100 text-orange-700",
    user_login: "bg-indigo-100 text-indigo-700",
    user_logout: "bg-indigo-100 text-indigo-700",
    ai_dispatch: "bg-cyan-100 text-cyan-700",
    ai_chat: "bg-cyan-100 text-cyan-700",
  };

  const getActionBadge = (action: string) => {
    const colorClass = actionColors[action] || "bg-gray-100 text-gray-700";
    return (
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
        {action.replace(/_/g, " ")}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">View and filter system activity logs</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" /> Export CSV
            {exporting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
          </Button>
        </div>
      </div>

      <AuditLogFilters 
        query={query} 
        onChange={fetchLogs} 
        loading={loading}
      />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">#</TableHead>
                  <TableHead className="w-40">Date</TableHead>
                  <TableHead className="w-32">Actor</TableHead>
                  <TableHead className="w-40">Action</TableHead>
                  <TableHead className="w-40">Target</TableHead>
                  <TableHead className="w-32">Model</TableHead>
                  <TableHead className="w-24">Tokens</TableHead>
                  <TableHead className="w-24">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No audit logs found
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log: AuditLogEntry, index: number) => (
                    <TableRow 
                      key={log.id} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => openDetail(log)}
                    >
                      <TableCell className="text-muted-foreground text-sm">
                        {((page - 1) * limit) + index + 1}
                      </TableCell>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {format(parseISO(log.createdAt.toString()), "MMM d, HH:mm")}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-mono text-xs">{log.who}</TableCell>
                      <TableCell>{getActionBadge(log.action)}</TableCell>
                      <TableCell className="text-sm font-mono text-xs text-muted-foreground">
                        {log.targetId || "—"}
                      </TableCell>
                      <TableCell className="text-sm font-mono text-xs">
                        {log.modelUsed ? (
                          <span className="bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded text-xs">
                            {log.modelUsed}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-right font-mono">
                        {log.tokens ? log.tokens.toLocaleString() : "—"}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); openDetail(log); }}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={8} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, total)} of {total} entries
                      </div>
                      <div className="flex items-center gap-2">
                        <Select value={String(limit)} onValueChange={(v) => handleLimitChange(Number(v))}>
                          <SelectTrigger className="w-[100px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="10">10 per page</SelectItem>
                            <SelectItem value="25">25 per page</SelectItem>
                            <SelectItem value="50">50 per page</SelectItem>
                            <SelectItem value="100">100 per page</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" onClick={() => handlePageChange(1)} disabled={page === 1}>
                            <ChevronsLeft className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                            <ChevronLeft className="h-4 w-4" />
                          </Button>
                          <span className="px-2 text-sm">{page} / {totalPages}</span>
                          <Button variant="outline" size="icon" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={() => handlePageChange(totalPages)} disabled={page >= totalPages}>
                            <ChevronsRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Audit Log Detail</DialogTitle>
            <DialogDescription>Entry ID: {selectedLog?.id}</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">ID</Label>
                  <p className="font-mono text-sm break-all">{selectedLog.id}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Created At</Label>
                  <p>{format(parseISO(selectedLog.createdAt.toString()), "PPpp")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Actor (who)</Label>
                  <p className="font-mono text-sm">{selectedLog.who}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Action</Label>
                  <p>{getActionBadge(selectedLog.action)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Target ID</Label>
                  <p className="font-mono text-sm">{selectedLog.targetId || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Model Used</Label>
                  <p className="font-mono text-sm">{selectedLog.modelUsed || "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Tokens</Label>
                  <p>{selectedLog.tokens ? selectedLog.tokens.toLocaleString() : "—"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Project ID</Label>
                  <p className="font-mono text-sm">{selectedLog.projectId || "—"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}