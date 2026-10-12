"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CheckCircle, Loader2, PackageCheck } from "lucide-react";
import { deliverAction } from "@/modules/workflow/actions";

interface DeliverClientProps {
  projectId: string;
  currentStatus: string;
}

export default function DeliverClient({ projectId, currentStatus }: DeliverClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  if (currentStatus === "DELIVERY") {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-emerald-800">Already delivered</p>
          <p className="text-sm text-emerald-700">This project has already been marked as DELIVERY.</p>
        </div>
      </div>
    );
  }

  const handleDeliver = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await deliverAction(projectId);
      setMessage({ type: "success", text: "Project delivered successfully" });
      router.push(`/projects/${projectId}`);
      router.refresh();
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to deliver project" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded-lg border text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
              : "bg-red-50 text-red-800 border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}
      <p className="text-sm text-slate-500">
        Confirm to mark this project as <span className="font-medium text-slate-700">DELIVERY</span>. This will update the project status.
      </p>
      <Button onClick={handleDeliver} disabled={loading} className="w-full">
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PackageCheck className="w-4 h-4 mr-2" />}
        Confirm Deliver
      </Button>
    </div>
  );
}
