"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toggleStaffStatusAction } from "@/modules/org/actions";

type StaffRow = {
  id: string;
  name: string;
  avatar?: string | null;
  status: string;
  deskId?: string | null;
  role?: { title: string; level: string } | null;
  division?: { id: string; name: string; color: string } | null;
};

type DeskRow = { id: string; staffId: string | null; roomId: string | null; clusterId: string | null };

function statusVariant(s: string) {
  if (s === "active") return "success" as const;
  if (s === "break") return "secondary" as const;
  return "outline" as const;
}

export default function HrClient({
  initialStaff,
  initialDesks,
}: {
  initialStaff: StaffRow[];
  initialDesks: DeskRow[];
}) {
  const router = useRouter();
  const [staff, setStaff] = useState<StaffRow[]>(initialStaff);
  const [desks] = useState<DeskRow[]>(initialDesks);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const activeDesks = desks.filter((d) => d.staffId);
  const filtered = staff.filter((s) => (filterStatus === "all" ? true : s.status === filterStatus));

  async function onToggle(staffId: string, next: "active" | "standby" | "break") {
    setBusyId(staffId);
    try {
      const res: any = await toggleStaffStatusAction({ staffId, status: next });
      setStaff((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, status: res.status, deskId: res.deskId } : s))
      );
      router.refresh();
    } catch (e: any) {
      alert(e?.message ?? "Toggle failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">HR — Roster & Presence</h1>
          <p className="text-sm text-muted-foreground">Active / Standby toggle — active spawns desk, standby removes. Desk preview below.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Filter</span>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({staff.length})</SelectItem>
              <SelectItem value="active">Active ({staff.filter((s) => s.status === "active").length})</SelectItem>
              <SelectItem value="standby">Standby ({staff.filter((s) => s.status === "standby").length})</SelectItem>
              <SelectItem value="break">Break ({staff.filter((s) => s.status === "break").length})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active now</CardDescription>
            <CardTitle className="text-2xl">{staff.filter((s) => s.status === "active").length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">{activeDesks.length} desks occupied</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Standby</CardDescription>
            <CardTitle className="text-2xl">{staff.filter((s) => s.status === "standby").length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">No desk — ready to spawn</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Desk preview</CardDescription>
            <CardTitle className="text-sm">Floor · lobby + divisions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-8 gap-1">
              {Array.from({ length: 16 }).map((_, i) => {
                const occupied = i < activeDesks.length;
                return (
                  <span
                    key={i}
                    title={occupied ? activeDesks[i]?.staffId ?? "" : "empty"}
                    className={"h-6 rounded-sm border " + (occupied ? "bg-emerald-500/20 border-emerald-500/40" : "bg-muted")}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{activeDesks.length} / 16 desks shown (flex floor)</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roster ({filtered.length})</CardTitle>
          <CardDescription>OWNER only — toggles call /api/presence logic via server action + realtime event.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Desk</TableHead>
                <TableHead className="text-right">Toggle</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs">{s.role?.title ?? "—"}</TableCell>
                  <TableCell>
                    {s.division ? (
                      <span className="inline-flex items-center gap-2 text-xs">
                        <span className="h-3 w-3 rounded-sm border" style={{ backgroundColor: s.division.color }} />
                        {s.division.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{s.deskId ? s.deskId.slice(0, 8) : "—"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant={s.status === "active" ? "default" : "outline"} disabled={busyId === s.id || s.status === "active"} onClick={() => onToggle(s.id, "active")}>
                        Active
                      </Button>
                      <Button size="sm" variant={s.status === "standby" ? "default" : "outline"} disabled={busyId === s.id || s.status === "standby"} onClick={() => onToggle(s.id, "standby")}>
                        Standby
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-sm text-muted-foreground">
                    No staff in this filter.
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
