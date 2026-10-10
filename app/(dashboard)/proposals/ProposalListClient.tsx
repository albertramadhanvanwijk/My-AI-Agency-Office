"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ProposalCard from "@/components/proposals/ProposalCard";
import { Building2, Users, LayoutDashboard, Clock, CircleCheck, CircleX } from "lucide-react";

interface Proposal {
  id: string;
  type: "division" | "role" | "room";
  status: "pending" | "approved" | "rejected";
  payload: any;
  triggerProjectId: string | null;
  triggerProject?: { id: string; title: string } | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface ProposalListClientProps {
  initialProposals: Proposal[];
}

export default function ProposalListClient({ initialProposals }: ProposalListClientProps) {
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [proposals, setProposals] = useState<Proposal[]>(initialProposals);

  const filteredProposals = proposals.filter((p) => {
    if (activeTab === "all") return true;
    return p.status === activeTab;
  });

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch("/api/proposals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      const updated = await res.json();
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "approved" as const, updatedAt: new Date().toISOString() } : p))
      );
    } catch (e) {
      console.error("Approve failed:", e);
      alert("Failed to approve proposal");
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason (min 5 chars):");
    if (!reason || reason.length < 5) {
      alert("Rejection reason must be at least 5 characters");
      return;
    }
    try {
      const res = await fetch("/api/proposals/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id, reason }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      setProposals((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: "rejected" as const, updatedAt: new Date().toISOString() } : p))
      );
    } catch (e) {
      console.error("Reject failed:", e);
      alert("Failed to reject proposal");
    }
  };

  const handleView = (id: string) => {
    window.location.href = `/proposals/${id}`;
  };

  const tabConfig = [
    { id: "all", label: "All", icon: null, count: proposals.length },
    { id: "pending", label: "Pending", icon: Clock, count: proposals.filter((p) => p.status === "pending").length },
    { id: "approved", label: "Approved", icon: CircleCheck, count: proposals.filter((p) => p.status === "approved").length },
    { id: "rejected", label: "Rejected", icon: CircleX, count: proposals.filter((p) => p.status === "rejected").length },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proposals</h1>
          <p className="text-muted-foreground">Manage division, role, and room proposals</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "approved" | "rejected" | "all")} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {tabConfig.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="gap-2">
              {tab.icon && <tab.icon className="h-4 w-4" />}
              {tab.label}
              <span className="ml-1 inline-flex h-5 items-center justify-center rounded-full bg-muted px-1.5 text-[10px] font-medium">
                {tab.count}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="all" className="mt-4">
          <ProposalsGrid proposals={proposals} onApprove={handleApprove} onReject={handleReject} onView={handleView} />
        </TabsContent>
        <TabsContent value="pending" className="mt-4">
          <ProposalsGrid
            proposals={proposals.filter((p) => p.status === "pending")}
            onApprove={handleApprove}
            onReject={handleReject}
            onView={handleView}
          />
        </TabsContent>
        <TabsContent value="approved" className="mt-4">
          <ProposalsGrid
            proposals={proposals.filter((p) => p.status === "approved")}
            onApprove={handleApprove}
            onReject={handleReject}
            onView={handleView}
          />
        </TabsContent>
        <TabsContent value="rejected" className="mt-4">
          <ProposalsGrid
            proposals={proposals.filter((p) => p.status === "rejected")}
            onApprove={handleApprove}
            onReject={handleReject}
            onView={handleView}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ProposalsGrid({
  proposals,
  onApprove,
  onReject,
  onView,
}: {
  proposals: Proposal[];
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onView: (id: string) => void;
}) {
  if (proposals.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No proposals found.
        </CardContent>
      </Card>
    );
  }

  return (
    <ScrollArea className="h-[calc(100vh-300px)]">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {proposals.map((proposal) => (
          <ProposalCard
            key={proposal.id}
            proposal={proposal}
            onApprove={onApprove}
            onReject={onReject}
            onView={onView}
          />
        ))}
      </div>
    </ScrollArea>
  );
}