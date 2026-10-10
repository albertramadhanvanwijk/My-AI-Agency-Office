"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Settings, Save, RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import { SettingCategory, SettingValue, SettingInput, DEFAULT_SETTINGS, SettingCategoryType, SettingValueType } from "@/modules/admin/schema";
import { updateSettingAction, initializeDefaultSettingsAction } from "@/modules/admin/actions";

type SettingFormData = z.infer<typeof SettingInput>;

interface SettingsFormProps {
  initialSettings: Record<SettingCategoryType, Array<{
    id: string;
    key: string;
    value: unknown;
    description: string | null;
    category: string | null;
  }>>;
}

const settingFormSchema = z.record(z.string(), SettingInput);

export default function SettingsForm({ initialSettings }: SettingsFormProps) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const form = useForm<Record<string, SettingFormData>>({
    resolver: zodResolver(settingFormSchema),
    defaultValues: {},
    mode: "onChange",
  });

  // Initialize form with current settings
  const categories: SettingCategoryType[] = ["General", "AI", "Email", "Storage"];
  
  categories.forEach((category) => {
    initialSettings[category]?.forEach((setting) => {
      form.setValue(setting.key, {
        key: setting.key,
        value: setting.value as SettingValueType,
        description: setting.description || undefined,
        category: setting.category as SettingCategoryType || category,
      });
    });
  });

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleSubmit = async (data: Record<string, SettingFormData>) => {
    setIsSubmitting(true);
    setMessage(null);
    
    try {
      for (const [key, value] of Object.entries(data)) {
        await updateSettingAction(value);
      }
      showMessage("success", "All settings saved successfully");
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Failed to save settings");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    setMessage(null);
    
    try {
      await initializeDefaultSettingsAction();
      showMessage("success", "Default settings initialized");
      // Page will reload via revalidatePath
      window.location.reload();
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Failed to initialize defaults");
    } finally {
      setIsInitializing(false);
    }
  };

  const renderValueInput = (key: string, value: unknown) => {
    const fieldValue = form.watch(key) ?? { key, value, description: undefined, category: "General" as SettingCategoryType };
    const currentValue = fieldValue.value ?? value;
    
    // Determine input type based on value
    if (typeof currentValue === "boolean") {
      return (
        <Select
          value={String(currentValue)}
          onValueChange={(v) => form.setValue(key, { ...fieldValue, value: v === "true" }, { shouldValidate: true })}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="true">True</SelectItem>
            <SelectItem value="false">False</SelectItem>
          </SelectContent>
        </Select>
      );
    }
    
    if (typeof currentValue === "number") {
      return (
        <Input
          type="number"
          value={String(currentValue)}
          onChange={(e) => form.setValue(key, { ...fieldValue, value: Number(e.target.value) }, { shouldValidate: true })}
          placeholder="Enter number"
        />
      );
    }
    
    if (typeof currentValue === "object" && currentValue !== null) {
      return (
        <Textarea
          value={JSON.stringify(currentValue, null, 2)}
          onChange={(e) => {
            try {
              const parsed = JSON.parse(e.target.value);
              form.setValue(key, { ...fieldValue, value: parsed }, { shouldValidate: true });
            } catch {
              // Invalid JSON, keep as string
            }
          }}
          placeholder="Enter JSON"
          rows={4}
          className="font-mono text-xs"
        />
      );
    }
    
    return (
      <Input
        value={String(currentValue)}
        onChange={(e) => form.setValue(key, { ...fieldValue, value: e.target.value }, { shouldValidate: true })}
        placeholder="Enter value"
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage application configuration</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInitialize} disabled={isInitializing}>
            <RefreshCw className="h-4 w-4 mr-2" /> Initialize Defaults
          </Button>
          <Button onClick={() => form.handleSubmit(handleSubmit)()} disabled={isSubmitting}>
            <Save className="h-4 w-4 mr-2" /> Save All
          </Button>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      )}

      <Tabs defaultValue="General" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category} value={category} className="space-y-4 pt-4">
            {initialSettings[category]?.map((setting) => (
              <Card key={setting.key}>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="md:col-span-1">
                      <Label htmlFor={setting.key}>{setting.key}</Label>
                      <p className="text-sm text-muted-foreground mt-1">{setting.description || "No description"}</p>
                    </div>
                    <div className="md:col-span-2">
                      {renderValueInput(setting.key, setting.value)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}