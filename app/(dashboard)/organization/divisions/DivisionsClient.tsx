"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addDivisionAction } from "@/modules/org/actions";

type DivisionRow = {
  id: string;
  name: string;
  color: string;
  icon: string;
  status: string;
  _count?: { roles: number; staff: number };
};

export default function DivisionsClient({ initialDivisions }: { initialDivisions: DivisionRow[] }) {
  const router = useRouter();
  const [divisions, setDivisions] = useState<DivisionRow[]>(initialDivisions);
  const [form, setForm] = useState({ name: "", color: "#6366f1", icon: "building", status: "provisional" as "active" | "provisional" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.name || form.name.trim().length < 2) {
      setError("Name min 2 chars");
      return;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(form.color)) {
      setError("Color must be #RRGGBB");
      return;
    }
    setSubmitting(true);
    try {
      const created: any = await addDivisionAction({
        name: form.name.trim(),
        color: form.color,
        icon: form.icon.trim() || "building",
        status: form.status,
      });
      setDivisions((prev) => [...prev, { id: created.id, name: created.name, color: created.color, icon: created.icon, status: created.status, _count: { roles: 0, staff: 0 } }].sort((a, b) => a.name.localeCompare(b.name)));
      setForm((f) => ({ ...f, name: "", icon: "building" }));
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create division");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Divisions</h1>
        <p className="text-sm text-muted-foreground">6 core divisions + provisional — add provisional form, promote via proposals inbox.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add division (provisional)</CardTitle>
          <CardDescription>Creates a division. Use status provisional for gap proposals; approve later in Proposals.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="div-name">Name *</Label>
              <Input id="div-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Architecture" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="div-icon">Icon</Label>
              <Input id="div-icon" value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="building" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="div-color">Color *</Label>
              <div className="flex gap-2">
                <Input id="div-color" value={form.color} onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))} placeholder="#6366f1" className="flex-1" />
                <span className="h-10 w-10 shrink-0 rounded-md border" style={{ backgroundColor: form.color }} aria-hidden />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="provisional">provisional</SelectItem>
                  <SelectItem value="active">active</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create division"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Divisions ({divisions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {divisions.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No divisions.</p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {divisions.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
                  <span className="h-8 w-8 shrink-0 rounded-md border" style={{ backgroundColor: d.color }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.icon} · {d._count ? `${d._count.roles} roles · ${d._count.staff} staff` : d.status}
                    </p>
                  </div>
                  <Badge variant={d.status === "active" ? "success" : d.status === "provisional" ? "secondary" : "outline"}>{d.status}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
