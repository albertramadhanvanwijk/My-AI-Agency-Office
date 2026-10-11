"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { addRoleAction } from "@/modules/org/actions";

type RoleRow = {
  id: string;
  title: string;
  level: string;
  divisionId: string;
  division?: { id: string; name: string; color: string } | null;
  systemPrompt?: string | null;
  modelVia9Router?: string | null;
};

export default function RolesClient({
  initialRoles,
  divisions,
}: {
  initialRoles: RoleRow[];
  divisions: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [roles, setRoles] = useState<RoleRow[]>(initialRoles);
  const [form, setForm] = useState({
    divisionId: divisions[0]?.id ?? "",
    title: "",
    level: "STAFF" as "HEAD" | "MANAGER" | "STAFF" | "SUPPORT",
    systemPrompt: "",
    modelVia9Router: "",
    tools: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.divisionId || !form.title || form.title.trim().length < 2) {
      setError("Division and title (min 2 chars) required");
      return;
    }
    setSubmitting(true);
    try {
      const tools = form.tools
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const created: any = await addRoleAction({
        divisionId: form.divisionId,
        title: form.title.trim(),
        level: form.level,
        systemPrompt: form.systemPrompt || undefined,
        modelVia9Router: form.modelVia9Router || undefined,
        tools: tools.length ? tools : undefined,
      });
      setRoles((prev) => [
        {
          id: created.id,
          title: created.title,
          level: created.level,
          divisionId: created.divisionId,
          division: divisions.find((d) => d.id === created.divisionId) as any,
        },
        ...prev,
      ]);
      setForm((f) => ({ ...f, title: "", systemPrompt: "", tools: "" }));
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Failed to create role");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Roles</h1>
        <p className="text-sm text-muted-foreground">Tier-1 — add roles without redeploy. Audit-logged, realtime invalidated.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add role</CardTitle>
          <CardDescription>Creates a row in roles. Division must exist.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Division *</Label>
              <Select value={form.divisionId} onValueChange={(v) => setForm((f) => ({ ...f, divisionId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select division" />
                </SelectTrigger>
                <SelectContent>
                  {divisions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Level *</Label>
              <Select value={form.level} onValueChange={(v) => setForm((f) => ({ ...f, level: v as any }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HEAD">HEAD</SelectItem>
                  <SelectItem value="MANAGER">MANAGER</SelectItem>
                  <SelectItem value="STAFF">STAFF</SelectItem>
                  <SelectItem value="SUPPORT">SUPPORT</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="role-title">Title *</Label>
              <Input
                id="role-title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. QA Engineer"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="role-prompt">System prompt</Label>
              <Textarea
                id="role-prompt"
                value={form.systemPrompt}
                onChange={(e) => setForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                placeholder="You are a..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-model">Model via 9Router</Label>
              <Input
                id="role-model"
                value={form.modelVia9Router}
                onChange={(e) => setForm((f) => ({ ...f, modelVia9Router: e.target.value }))}
                placeholder="gpt-4o-mini"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-tools">Tools (comma separated)</Label>
              <Input
                id="role-tools"
                value={form.tools}
                onChange={(e) => setForm((f) => ({ ...f, tools: e.target.value }))}
                placeholder="execute, review"
              />
            </div>
            {error ? <p className="md:col-span-2 text-sm text-destructive">{error}</p> : null}
            <div className="md:col-span-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Creating..." : "Create role"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Roles ({roles.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No roles yet.</p>
          ) : (
            <div className="space-y-2">
              {roles.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.division?.name ?? r.divisionId} · {r.level}
                    </p>
                  </div>
                  <Badge variant={r.level === "HEAD" ? "default" : r.level === "MANAGER" ? "secondary" : "outline"}>{r.level}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
