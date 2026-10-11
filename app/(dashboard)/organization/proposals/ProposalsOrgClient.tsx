"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { approveProposalOneClickAction } from "@/modules/org/actions";

type Proposal = {
  id: string;
  type: string;
  status: string;
  payload: any;
  triggerProjectId: string | null;
  triggerProject?: { id: string; title: string } | null;
  createdAt: string | Date;
};

export default function ProposalsOrgClient({ initialProposals }: { initialProposals: Proposal[] }) {
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState("pending");

  async function onApprove(id: string) {
    setBusyId(id);
    try {
      const res: any = await approveProposalOneClickAction(id);
      // optimistic: mark approved
      setProposals((prev) => prev.map((p) => (p.id === id ? { ...p, status: "approved" } : p)));
      router.refresh();
      // optional toast-like feedback via console
      if (res?.division) console.log("1-click: division", res.division.name, "room", res.room?.id);
    } catch (e: any) {
      alert(e?.message ?? "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  const filtered = proposals.filter((p) => (tab === "all" ? true : p.status === tab));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Proposals</h1>
          <p className="text-sm text-muted-foreground">Inbox — reuse /proposals with 1-click approve (division → room + roles + project link).</p>
        </div>
        <Link href="/proposals" className="text-xs font-medium text-primary underline-offset-4 hover:underline">
          View /proposals →
        </Link>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="pending">Pending ({proposals.filter((p) => p.status === "pending").length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({proposals.filter((p) => p.status === "approved").length})</TabsTrigger>
          <TabsTrigger value="all">All ({proposals.length})</TabsTrigger>
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">No proposals in this tab.</CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {filtered.map((p) => (
                <Card key={p.id} className="overflow-hidden">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Badge variant={p.type === "division" ? "default" : "secondary"}>{p.type}</Badge>
                      <Badge variant={p.status === "pending" ? "secondary" : p.status === "approved" ? "success" : "outline"}>{p.status}</Badge>
                    </div>
                    <p className="text-sm font-medium">{p.payload?.name ?? p.payload?.title ?? p.type}</p>
                    {p.payload?.color ? (
                      <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="h-3 w-3 rounded-sm border" style={{ backgroundColor: p.payload.color }} /> {p.payload.color} · {p.payload?.icon ?? ""}
                      </span>
                    ) : null}
                    {p.triggerProject ? <p className="text-xs text-muted-foreground">Project: {p.triggerProject.title}</p> : null}
                    <div className="flex gap-2 pt-2">
                      {p.status === "pending" ? (
                        <Button size="sm" onClick={() => onApprove(p.id)} disabled={busyId === p.id}>
                          {busyId === p.id ? "Approving..." : "Approve (1-click)"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No action</span>
                      )}
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/proposals/${p.id}`}>View</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        {/* mirror other tabs so content shows when switching */}
        <TabsContent value="pending" className="hidden" />
        <TabsContent value="approved" className="hidden" />
        <TabsContent value="all" className="hidden" />
      </Tabs>
    </div>
  );
}
