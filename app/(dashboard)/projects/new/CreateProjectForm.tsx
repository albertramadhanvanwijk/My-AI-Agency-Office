"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { createProjectAction } from "@/modules/workflow/actions";

const createProjectSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().min(3, "Title must be at least 3 characters"),
  brief: z.string().min(10, "Brief must be at least 10 characters"),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

interface Client {
  id: string;
  company: string | null;
  name: string | null;
  user: { name: string | null; email: string | null };
}

interface CreateProjectFormProps {
  initialClients: Client[];
}

export default function CreateProjectForm({ initialClients }: CreateProjectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { errors },
  } = useForm<CreateProjectFormData>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      clientId: "",
      title: "",
      brief: "",
    },
  });

  const clientIdValue = watch("clientId");

  const onSubmit = async (data: CreateProjectFormData) => {
    setLoading(true);
    setError(null);

    try {
      const project = await createProjectAction(data);
      if (project?.id) {
        router.push(`/projects/${project.id}`);
        router.refresh();
      } else {
        setError("Failed to create project");
      }
    } catch (err) {
      console.error("Create project error:", err);
      setError(err instanceof Error ? err.message : "Failed to create project");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <div className="mb-6">
        <Link href="/projects" className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-700 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Projects
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New Project</CardTitle>
          <CardDescription>Create a new project with client, title, and brief</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                {error}
              </div>
            )}

            <div>
              <Label htmlFor="clientId" className="block text-sm font-medium mb-1">
                Client <span className="text-red-500">*</span>
              </Label>
              <Controller
                name="clientId"
                control={control}
                rules={{ required: "Client is required" }}
                render={({ field }) => (
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value || ""}
                  >
                    <SelectTrigger className="w-full" aria-invalid={!!errors.clientId}>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {initialClients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.company || client.name || client.user.name || client.user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.clientId && (
                <p className="mt-1 text-sm text-red-500">{errors.clientId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="title" className="block text-sm font-medium mb-1">
                Project Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                placeholder="e.g. Company Profile Website"
                {...register("title")}
                aria-invalid={!!errors.title}
                disabled={loading}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-500">{errors.title.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="brief" className="block text-sm font-medium mb-1">
                Project Brief <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="brief"
                placeholder="Describe the project scope, goals, and requirements..."
                rows={6}
                {...register("brief")}
                aria-invalid={!!errors.brief}
                disabled={loading}
              />
              {errors.brief && (
                <p className="mt-1 text-sm text-red-500">{errors.brief.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
                {loading ? "Creating..." : "Create Project"}
              </Button>
              <Link href="/projects" className="flex items-center justify-center px-4 py-2 border border-slate-300 rounded-md text-slate-700 hover:bg-slate-50">
                Cancel
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}