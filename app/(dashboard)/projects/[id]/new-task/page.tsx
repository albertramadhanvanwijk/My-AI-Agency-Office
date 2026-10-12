"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { createTaskAction } from "@/modules/workflow/actions";

const createTaskSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  assigneeRoleId: z.string().min(1, "Assignee role is required"),
  stage: z.string().min(1, "Stage is required"),
});

type CreateTaskFormData = z.infer<typeof createTaskSchema>;

const stages = [
  { value: "strategy", label: "Strategy & Planning" },
  { value: "creative", label: "Creative & Content" },
  { value: "tech", label: "Technology & Product" },
  { value: "marketing", label: "Marketing & Growth" },
  { value: "client-relations", label: "Client Relations" },
  { value: "finance", label: "Finance, Legal & Admin" },
];

const roles = [
  { value: "strategy-lead", label: "Strategy Lead", stage: "strategy" },
  { value: "creative-lead", label: "Creative Lead", stage: "creative" },
  { value: "tech-lead", label: "Tech Lead", stage: "tech" },
  { value: "marketing-lead", label: "Marketing Lead", stage: "marketing" },
  { value: "client-relations-lead", label: "Client Relations Lead", stage: "client-relations" },
  { value: "finance-lead", label: "Finance Lead", stage: "finance" },
];

export default function NewTaskPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    control,
    formState: { errors },
  } = useForm<CreateTaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      title: "",
      description: "",
      assigneeRoleId: "",
      stage: "",
    },
  });

  const selectedStage = watch("stage");

  const filteredRoles = roles.filter((role) => !selectedStage || role.stage === selectedStage);

  const onSubmit = async (data: CreateTaskFormData) => {
    setLoading(true);
    setError(null);

    try {
      const task = await createTaskAction({
        projectId,
        ...data,
      });
      if (task?.id) {
        router.push(`/projects/${projectId}`);
        router.refresh();
      } else {
        setError("Failed to create task");
      }
    } catch (err) {
      console.error("Create task error:", err);
      setError(err instanceof Error ? err.message : "Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Link href={`/projects/${projectId}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Project
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Task</CardTitle>
          <CardDescription>Create a new task for this project</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="title" className="block text-sm font-medium mb-1">
                Task Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Design Homepage"
                {...register("title")}
                aria-invalid={!!errors.title}
                disabled={loading}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="description" className="block text-sm font-medium mb-1">
                Description <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="Describe the task requirements and deliverables..."
                rows={6}
                {...register("description")}
                aria-invalid={!!errors.description}
                disabled={loading}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-500">{errors.description.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="stage" className="block text-sm font-medium mb-1">
                Stage/Division <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="stage"
                control={control}
                rules={{ required: "Stage is required" }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || ""}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!errors.stage}>
                      <SelectValue placeholder="Select a stage" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.value} value={stage.value}>
                          {stage.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.stage && (
                <p className="mt-1 text-sm text-red-500">{errors.stage.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="assigneeRoleId" className="block text-sm font-medium mb-1">
                Assignee Role <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="assigneeRoleId"
                control={control}
                rules={{ required: "Assignee role is required" }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || ""}
                    disabled={!selectedStage || filteredRoles.length === 0}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!errors.assigneeRoleId}>
                      <SelectValue placeholder={selectedStage ? "Select a role" : "Select stage first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredRoles.map((role) => (
                        <SelectItem key={role.value} value={role.value}>
                          {role.label}
                        </SelectItem>
                      ))}
                      {filteredRoles.length === 0 && (
                        <SelectItem disabled value="">
                          No roles available for selected stage
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.assigneeRoleId && (
                <p className="mt-1 text-sm text-red-500">{errors.assigneeRoleId.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                {loading ? "Creating..." : "Create Task"}
              </Button>
              <Link href={`/projects/${projectId}`} className="flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}