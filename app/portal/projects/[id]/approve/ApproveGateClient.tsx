"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Label } from "@/components/ui/label";
import { approveGateAction } from "@/modules/workflow/actions";

const approveFormSchema = z.object({
  confirm: z.boolean().refine((val) => val === true, "You must confirm approval"),
});

type ApproveFormData = z.infer<typeof approveFormSchema>;

interface Props {
  projectId: string;
  gate: "brief" | "plan";
  currentStatus: "approved" | "pending";
  approver: "owner" | "client";
}

export default function ApproveGateClient({ projectId, gate, currentStatus, approver }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ApproveFormData>({
    resolver: zodResolver(approveFormSchema),
    defaultValues: { confirm: false },
  });

  const gateLabels: Record<string, string> = { brief: "Brief", plan: "Plan" };

  const onSubmit = async () => {
    setLoading(true);
    setMessage(null);
    try {
      await approveGateAction({ projectId, gate, approver });
      setMessage({ type: "success", text: `${gateLabels[gate]} gate approved (${approver})` });
      setTimeout(() => {
        router.push(`/portal/projects/${projectId}`);
        router.refresh();
      }, 1200);
    } catch (err) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to approve gate" });
    } finally {
      setLoading(false);
    }
  };

  if (currentStatus === "approved") {
    return (
      <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0" />
        <div>
          <p className="font-medium text-emerald-800">{gateLabels[gate]} gate already approved</p>
          <p className="text-sm text-emerald-700">This gate has been approved as {approver}.</p>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Confirm Approval ({approver})</CardTitle>
        <CardDescription>By confirming, you approve the {gateLabels[gate].toLowerCase()} gate as {approver}.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {message && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {message.type === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}
          <div className="flex items-start gap-3">
            <input type="checkbox" id="confirm-portal" {...register("confirm")} className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />
            <Label htmlFor="confirm-portal" className="mt-1 text-sm text-slate-700">
              I confirm that I have reviewed the {gateLabels[gate].toLowerCase()} and approve it as {approver}.
            </Label>
          </div>
          {errors.confirm && <p className="text-sm text-red-500">{errors.confirm.message}</p>}
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null} Approve Gate
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
