"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Loader2, DollarSign } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { z } from "zod";

const invoiceItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  qty: z.coerce.number().positive("Quantity must be positive"),
  unitPrice: z.coerce.number().nonnegative("Unit price cannot be negative"),
});

const formSchema = z.object({
  projectId: z.string().min(1, "Project is required"),
  dueDate: z.date().nullable().refine((d) => d instanceof Date, "Due date is required"),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

type FormData = z.infer<typeof formSchema>;
type InvoiceItem = z.infer<typeof invoiceItemSchema>;

interface Project {
  id: string;
  title: string;
  clientId: string;
  client: { company: string | null; user: { name: string } } | null;
  budget: number | null;
}

interface InvoiceFormProps {
  initialInvoice?: {
    id: string;
    projectId: string;
    dueDate: string | null;
    items: InvoiceItem[];
  } | null;
  projects: Project[];
}

export function InvoiceForm({ initialInvoice, projects }: InvoiceFormProps) {
  const router = useRouter();
  const isEditing = !!initialInvoice;
  const [formData, setFormData] = useState<FormData>({
    projectId: initialInvoice?.projectId || "",
    dueDate: initialInvoice?.dueDate ? new Date(initialInvoice.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    items: initialInvoice?.items.length ? initialInvoice.items : [{ description: "", qty: 1, unitPrice: 0 }],
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [itemErrors, setItemErrors] = useState<Array<{ description?: string; qty?: string; unitPrice?: string }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  // Update selected project when projectId changes
  useEffect(() => {
    const project = projects.find((p) => p.id === formData.projectId);
    setSelectedProject(project || null);
    
    // Auto-populate items from project budget if no items yet or creating new
    if (project && (!initialInvoice || formData.items.length === 1 && formData.items[0].description === "")) {
      const budget = Number(project.budget || 0);
      if (budget > 0) {
        // Default division split
        const divisions = [
          { description: "Strategy & Planning", percentage: 0.3 },
          { description: "Creative Design", percentage: 0.4 },
          { description: "Technical Development", percentage: 0.3 },
        ];
        const newItems = divisions.map((div) => ({
          description: div.description,
          qty: 1,
          unitPrice: Math.round(budget * div.percentage),
        }));
        setFormData((prev) => ({ ...prev, items: newItems }));
      }
    }
  }, [formData.projectId, initialInvoice, projects]);

  const validateForm = (): boolean => {
    const result = formSchema.safeParse(formData);
    if (!result.success) {
      const newErrors: Partial<Record<keyof FormData, string>> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0] !== "items") {
          newErrors[err.path[0] as keyof FormData] = err.message;
        }
      });
      setErrors(newErrors);
      
      // Validate items
      const newItemErrors = formData.items.map((item, index) => {
        const itemResult = invoiceItemSchema.safeParse(item);
        if (!itemResult.success) {
          const err: { description?: string; qty?: string; unitPrice?: string } = {};
          itemResult.error.issues.forEach((e) => {
            const key = e.path[0] as keyof InvoiceItem;
            if (key === "description" || key === "qty" || key === "unitPrice") {
              err[key] = e.message;
            }
          });
          return err;
        }
        return {};
      });
      setItemErrors(newItemErrors);
      return false;
    }
    setErrors({});
    setItemErrors(formData.items.map(() => ({})));
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      const url = isEditing ? `/api/invoices/${initialInvoice!.id}` : "/api/invoices";
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: formData.projectId,
          dueDate: formData.dueDate.toISOString(),
          items: formData.items,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save invoice");
      }

      const data = await res.json();
      router.push(`/invoices/${data.id}`);
      router.refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save invoice");
    } finally {
      setSubmitting(false);
    }
  };

  const addItem = () => {
    setFormData((prev) => ({
      ...prev,
      items: [...prev.items, { description: "", qty: 1, unitPrice: 0 }],
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length <= 1) return;
    setFormData((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const updateItem = (index: number, field: keyof InvoiceItem, value: any) => {
    setFormData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    }));
    // Clear error for this field
    setItemErrors((prev) => {
      const newErrors = [...prev];
      newErrors[index] = { ...newErrors[index], [field]: undefined };
      return newErrors;
    });
  };

  const getTotal = () => {
    return formData.items.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/invoices" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{isEditing ? "Edit Invoice" : "Create Invoice"}</h1>
          <p className="text-slate-500 text-sm">{isEditing ? "Update invoice details" : "Generate a new invoice from a project"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">Project Selection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="projectId">Project *</Label>
                <select
                  id="projectId"
                  value={formData.projectId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, projectId: e.target.value }))}
                  className={cn("mt-1 w-full rounded-md border px-3 py-2 text-sm", errors.projectId ? "border-red-500" : "border-slate-300")}
                  required
                >
                  <option value="">Select a project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title} — {project.client?.company || project.client?.user?.name || "Unknown Client"}
                    </option>
                  ))}
                </select>
                {errors.projectId && <p className="mt-1 text-sm text-red-600">{errors.projectId}</p>}
              </div>

              {selectedProject && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-2">
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Client:</span> {selectedProject.client?.company || selectedProject.client?.user?.name}
                  </p>
                  <p className="text-sm text-slate-600">
                    <span className="font-medium">Budget:</span> {formatCurrency(Number(selectedProject.budget || 0))}
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="dueDate">Due Date *</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={format(formData.dueDate, "yyyy-MM-dd")}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: new Date(e.target.value) }))}
                  className={cn("mt-1", errors.dueDate ? "border-red-500" : "")}
                  required
                />
                {errors.dueDate && <p className="mt-1 text-sm text-red-600">{errors.dueDate}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" /> Line Items
            </CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-3 p-4 border border-slate-200 rounded-lg bg-slate-50">
                  <div className="flex-1 min-w-0">
                    <Label htmlFor={`item-${index}-description`} className="block text-sm font-medium text-slate-700">Description *</Label>
                    <Input
                      id={`item-${index}-description`}
                      value={item.description}
                      onChange={(e) => updateItem(index, "description", e.target.value)}
                      className={cn("mt-1", itemErrors[index]?.description ? "border-red-500" : "")}
                      placeholder="e.g., Strategy & Planning"
                    />
                    {itemErrors[index]?.description && (
                      <p className="mt-1 text-sm text-red-600">{itemErrors[index].description}</p>
                    )}
                  </div>
                  <div className="w-24">
                    <Label htmlFor={`item-${index}-qty`} className="block text-sm font-medium text-slate-700">Qty *</Label>
                    <Input
                      id={`item-${index}-qty`}
                      type="number"
                      min="1"
                      value={item.qty}
                      onChange={(e) => updateItem(index, "qty", parseInt(e.target.value) || 1)}
                      className={cn("mt-1", itemErrors[index]?.qty ? "border-red-500" : "")}
                    />
                    {itemErrors[index]?.qty && <p className="mt-1 text-sm text-red-600">{itemErrors[index].qty}</p>}
                  </div>
                  <div className="w-40">
                    <Label htmlFor={`item-${index}-unitPrice`} className="block text-sm font-medium text-slate-700">Unit Price *</Label>
                    <Input
                      id={`item-${index}-unitPrice`}
                      type="number"
                      min="0"
                      step="1000"
                      value={item.unitPrice}
                      onChange={(e) => updateItem(index, "unitPrice", parseInt(e.target.value) || 0)}
                      className={cn("mt-1", itemErrors[index]?.unitPrice ? "border-red-500" : "")}
                      placeholder="0"
                    />
                    {itemErrors[index]?.unitPrice && <p className="mt-1 text-sm text-red-600">{itemErrors[index].unitPrice}</p>}
                  </div>
                  <div className="w-40 flex items-end">
                    <Label className="block text-sm font-medium text-slate-700 w-full">Total</Label>
                    <div className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-right font-medium text-slate-900">
                      {formatCurrency(item.qty * item.unitPrice)}
                    </div>
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(index)}
                      disabled={formData.items.length <= 1}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Total */}
            <div className="mt-6 pt-6 border-t border-slate-200 flex justify-end">
              <div className="text-right">
                <p className="text-sm text-slate-500">Subtotal</p>
                <p className="text-2xl font-bold text-slate-900">{formatCurrency(getTotal())}</p>
                <p className="text-sm text-slate-500">Tax (0%)</p>
                <p className="text-2xl font-bold text-primary">Total: {formatCurrency(getTotal())}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <Link href={isEditing ? `/invoices/${initialInvoice!.id}` : "/invoices"}>
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Saving...
              </>
            ) : (
              isEditing ? "Update Invoice" : "Create Invoice"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}