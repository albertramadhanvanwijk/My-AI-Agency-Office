"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar, Filter, X, Search } from "lucide-react";
import { format, parseISO } from "date-fns";
import { AuditLogQuery } from "@/modules/admin/actions";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface AuditLogFiltersProps {
  query: AuditLogQuery;
  onChange: (query: Partial<AuditLogQuery>) => void;
  loading?: boolean;
}

export function AuditLogFilters({ query, onChange, loading }: AuditLogFiltersProps) {
  const [who, setWho] = useState(query.who || "");
  const [action, setAction] = useState(query.action || "");
  const [targetId, setTargetId] = useState(query.targetId || "");
  const [modelUsed, setModelUsed] = useState(query.modelUsed || "");
  const [from, setFrom] = useState(query.from ? format(query.from, "yyyy-MM-dd") : "");
  const [to, setTo] = useState(query.to ? format(query.to, "yyyy-MM-dd") : "");
  const [projectId, setProjectId] = useState(query.projectId || "");
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Sync with query prop changes
  useEffect(() => {
    setWho(query.who || "");
    setAction(query.action || "");
    setTargetId(query.targetId || "");
    setModelUsed(query.modelUsed || "");
    setFrom(query.from ? format(query.from, "yyyy-MM-dd") : "");
    setTo(query.to ? format(query.to, "yyyy-MM-dd") : "");
    setProjectId(query.projectId || "");
  }, [query]);

  const hasFilters = Boolean(
    who || action || targetId || modelUsed || from || to || projectId
  );

  const handleApply = () => {
    const newQuery: Partial<AuditLogQuery> = {};
    if (who) newQuery.who = who;
    if (action) newQuery.action = action;
    if (targetId) newQuery.targetId = targetId;
    if (modelUsed) newQuery.modelUsed = modelUsed;
    if (from) newQuery.from = new Date(from);
    if (to) newQuery.to = new Date(to);
    if (projectId) newQuery.projectId = projectId;
    
    onChange(newQuery);
  };

  const handleClear = () => {
    setWho("");
    setAction("");
    setTargetId("");
    setModelUsed("");
    setFrom("");
    setTo("");
    setProjectId("");
    onChange({
      who: undefined,
      action: undefined,
      targetId: undefined,
      modelUsed: undefined,
      from: undefined,
      to: undefined,
      projectId: undefined,
    });
  };

  return (
    <div className="border rounded-lg bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Filter className="h-4 w-4" />
          Filters
        </h3>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <X className="h-3 w-3 mr-1" /> Clear
          </Button>
        )}
      </div>

      {/* Basic Filters */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <Label htmlFor="who" className="block text-sm mb-1">Actor (who)</Label>
          <Input
            id="who"
            placeholder="e.g. user-1, ai-staff"
            value={who}
            onChange={(e) => setWho(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <Label htmlFor="action" className="block text-sm mb-1">Action</Label>
          <Input
            id="action"
            placeholder="e.g. project_created"
            value={action}
            onChange={(e) => setAction(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <Label htmlFor="targetId" className="block text-sm mb-1">Target ID</Label>
          <Input
            id="targetId"
            placeholder="e.g. proj-1, task-1"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={loading}
          />
        </div>
        <div>
          <Label htmlFor="modelUsed" className="block text-sm mb-1">Model</Label>
          <Input
            id="modelUsed"
            placeholder="e.g. gpt-4o"
            value={modelUsed}
            onChange={(e) => setModelUsed(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Advanced Filters */}
      <Button
        variant="ghost"
        size="sm"
        className="mt-2"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? "Hide" : "Show"} Advanced Filters
      </Button>

      {showAdvanced && (
        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4 animate-in slide-in-from-top-2 duration-200">
          <div>
            <Label htmlFor="from" className="block text-sm mb-1">From Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Input
                  id="from"
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  readOnly
                  disabled={loading}
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <input
                  type="date"
                  className="p-2 border rounded-md"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  disabled={loading}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="to" className="block text-sm mb-1">To Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Input
                  id="to"
                  type="text"
                  placeholder="YYYY-MM-DD"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  readOnly
                  disabled={loading}
                />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <input
                  type="date"
                  className="p-2 border rounded-md"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  disabled={loading}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div>
            <Label htmlFor="projectId" className="block text-sm mb-1">Project ID</Label>
            <Input
              id="projectId"
              placeholder="e.g. proj-1"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <Button onClick={handleApply} disabled={loading}>
          <Search className="h-4 w-4 mr-2" /> Apply Filters
        </Button>
        {hasFilters && (
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
        )}
      </div>
    </div>
  );
}