"use client";

import { useState } from "react";
import ProposalDetail from "@/components/proposals/ProposalDetail";
import { Building2, CircleCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Proposal {
  id: string;
  type: "division" | "role" | "room";
  status: "pending" | "approved" | "rejected";
  payload: any;
  triggerProjectId: string | null;
  triggerProject?: { id: string; title: string; status: string } | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  division?: any;
  room?: any;
  roles?: any[];
}

interface ProposalDetailClientProps {
  initialProposal: Proposal;
}

export default function ProposalDetailClient({ initialProposal }: ProposalDetailClientProps) {
  const [proposal, setProposal] = useState<Proposal>(initialProposal);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/proposals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id }),
      });
      if (!res.ok) throw new Error("Failed to approve");
      const updated = await res.json();
      setProposal({ ...proposal, ...updated, status: "approved" });
      setSuccess("Proposal approved successfully");
    } catch (e) {
      setError("Failed to approve proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt("Enter rejection reason (min 5 chars):");
    if (!reason || reason.length < 5) {
      alert("Rejection reason must be at least 5 characters");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/proposals/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id, reason }),
      });
      if (!res.ok) throw new Error("Failed to reject");
      const updated = await res.json();
      setProposal({ ...proposal, ...updated, status: "rejected" });
      setSuccess("Proposal rejected");
    } catch (e) {
      setError("Failed to reject proposal");
    } finally {
      setLoading(false);
    }
  };

  const handleMigrate = async (id: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/proposals/migrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId: id }),
      });
      if (!res.ok) throw new Error("Failed to migrate");
      const result = await res.json();
      setProposal({ ...proposal, division: result.division, room: result.room, roles: result.roles });
      setSuccess("Division migrated successfully! Room and roles created.");
    } catch (e) {
      setError("Failed to migrate division");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.location.href = "/proposals";
  };

  return (
    <div className="space-y-4">
      {(error || success) && (
        <Alert variant={error ? "destructive" : "default"} className="mb-4">
          <AlertDescription>{error || success}</AlertDescription>
        </Alert>
      )}
      <ProposalDetail
        proposal={proposal}
        onApprove={handleApprove}
        onReject={handleReject}
        onMigrate={handleMigrate}
        onBack={handleBack}
      />
    </div>
  );
}