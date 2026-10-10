"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { RefreshCw, Zap, ZapOff, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { FeatureFlag, DEFAULT_FEATURE_FLAGS, FEATURE_FLAG_KEYS, FeatureFlagKey } from "@/modules/admin/schema";
import { getFeatureFlagsAction, toggleFeatureFlagAction, setFeatureFlagAction, initializeDefaultFeatureFlagsAction } from "@/modules/admin/actions";

interface FeatureFlagsProps {
  initialFlags: FeatureFlag[];
}

export default function FeatureFlags({ initialFlags }: FeatureFlagsProps) {
  const [flags, setFlags] = useState<FeatureFlag[]>(initialFlags);
  const [toggling, setToggling] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleToggle = async (key: string, currentEnabled: boolean) => {
    setToggling(prev => new Set(prev).add(key));
    setMessage(null);
    
    try {
      const newFlag = await toggleFeatureFlagAction(key);
      setFlags(prev => prev.map(f => f.key === key ? newFlag : f));
      showMessage("success", `${key} ${newFlag.enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : `Failed to toggle ${key}`);
    } finally {
      setToggling(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleSetValue = async (key: string, enabled: boolean) => {
    setToggling(prev => new Set(prev).add(key));
    setMessage(null);
    
    try {
      const newFlag = await setFeatureFlagAction(key, enabled);
      setFlags(prev => prev.map(f => f.key === key ? newFlag : f));
      showMessage("success", `${key} ${enabled ? "enabled" : "disabled"}`);
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : `Failed to update ${key}`);
    } finally {
      setToggling(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    setMessage(null);
    
    try {
      await initializeDefaultFeatureFlagsAction();
      showMessage("success", "Default feature flags initialized");
      window.location.reload();
    } catch (error) {
      showMessage("error", error instanceof Error ? error.message : "Failed to initialize defaults");
    } finally {
      setIsInitializing(false);
    }
  };

  // Ensure all default flags are shown
  const allFlagKeys = [...FEATURE_FLAG_KEYS] as FeatureFlagKey[];
  const displayFlags = allFlagKeys.map(key => {
    const existing = flags.find(f => f.key === key);
    if (existing) return existing;
    const defaultFlag = DEFAULT_FEATURE_FLAGS[key];
    return {
      id: `temp-${key}`,
      key,
      enabled: defaultFlag.enabled,
      description: defaultFlag.description,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as FeatureFlag;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Feature Flags</h1>
          <p className="text-muted-foreground">Toggle features on/off without deploying</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleInitialize} disabled={isInitializing}>
            <RefreshCw className="h-4 w-4 mr-2" /> Initialize Defaults
          </Button>
        </div>
      </div>

      {message && (
        <div className={`flex items-center gap-2 p-3 rounded-lg ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {message.type === "success" ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          <span>{message.text}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Available Feature Flags</CardTitle>
          <CardDescription>
            Toggle features on/off. Changes take effect immediately without requiring a deployment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {displayFlags.map((flag, index) => (
              <div key={flag.key} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${flag.enabled ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {flag.enabled ? <Zap className="h-5 w-5" /> : <ZapOff className="h-5 w-5" />}
                  </div>
                  <div>
                    <Label className="font-medium text-lg">{flag.key}</Label>
                    <p className="text-sm text-muted-foreground">{flag.description || "No description"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={flag.enabled}
                    onCheckedChange={(checked) => handleSetValue(flag.key, checked)}
                    disabled={toggling.has(flag.key)}
                    id={`flag-${flag.key}`}
                  />
                  {toggling.has(flag.key) && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">Note:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Feature flags are evaluated at runtime</li>
                <li>Changes apply immediately to all users</li>
                <li>Use with caution — disabling core features may break workflows</li>
                <li>All changes are logged in Audit Logs</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}