"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, FileText, MessageSquare, Clock, CheckCircle, AlertCircle, Loader2, Download, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChatDrawer } from "@/components/portal/ChatDrawer";
import { InvoiceDownload } from "@/components/portal/InvoiceDownload";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  INQUIRY: "Inquiry",
  BRIEF: "Brief",
  PLANNING: "Planning",
  EXECUTION: "Execution",
  QA: "QA",
  DELIVERY: "Delivery",
  CLOSING: "Closing",
};

const statusColors: Record<string, string> = {
  INQUIRY: "bg-gray-100 text-gray-700",
  BRIEF: "bg-blue-100 text-blue-700",
  PLANNING: "bg-purple-100 text-purple-700",
  EXECUTION: "bg-orange-100 text-orange-700",
  QA: "bg-amber-100 text-amber-700",
  DELIVERY: "bg-emerald-100 text-emerald-700",
  CLOSING: "bg-indigo-100 text-indigo-700",
};

const invoiceStatusLabels: Record<string, string> = {
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

const invoiceStatusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-emerald-100 text-emerald-700",
  overdue: "bg-red-100 text-red-700",
  cancelled: "bg-slate-100 text-slate-700",
};

interface ProjectData {
  id: string;
  title: string;
  brief: string;
  status: string;
  clientId: string;
  client: { company?: string | null; name?: string | null };
  createdAt: string;
  updatedAt: string;
  resultAssetUrl?: string | null;
  tasks: Array<{
    id: string;
    status: string;
    stage?: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  invoices: Array<{
    id: string;
    number: string;
    status: string;
    amount: number;
    dueDate?: string | null;
    pdfUrl?: string | null;
    createdAt: string;
  }>;
  conversations: Array<{
    id: string;
    type: string;
    title?: string | null;
    messages: Array<{
      id: string;
      content: string;
      senderType: string;
      senderId: string;
      createdAt: string;
    }>;
  }>;
}

export default function ProjectDetailPage() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "deliverables" | "invoices" | "chat">("overview");
  const handleTabChange = (value: string) => {
    setActiveTab(value as "overview" | "deliverables" | "invoices" | "chat");
  };

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/portal/projects/${projectId}`);
      if (!res.ok) {
        if (res.status === 403) {
          setError("Access denied: You don't have permission to view this project");
        } else if (res.status === 404) {
          setError("Project not found");
        } else {
          setError("Failed to load project");
        }
        return;
      }
      const data = await res.json();
      setProject(data);
    } catch (e) {
      setError("Failed to load project");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/portal" className="text-slate-400 hover:text-slate-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Loading...</h1>
              <p className="text-slate-500 text-sm">Loading project details</p>
            </div>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-6">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-2" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="pt-6">
            <div className="h-96 bg-slate-200 rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/portal" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Error</h1>
          </div>
        </div>
        <Card className="border-red-200">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Access Denied</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <Button asChild variant="outline">
              <Link href="/portal">Back to Projects</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  const projectConversation = project.conversations.find(c => c.type === "project");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/portal" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{project.title}</h1>
            <p className="text-slate-500 text-sm">{project.brief}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant="outline" className={statusColors[project.status]}>
            {statusLabels[project.status] || project.status}
          </Badge>
          {(project.status === "INQUIRY" || project.status === "BRIEF") && (
            <Button variant="outline" asChild>
              <Link href={`/portal/projects/${projectId}/approve?gate=brief`}>Approve Brief</Link>
            </Button>
          )}
          {project.status === "PLANNING" && (
            <Button variant="outline" asChild>
              <Link href={`/portal/projects/${projectId}/approve?gate=plan`}>Approve Plan</Link>
            </Button>
          )}
          <Button variant="outline" onClick={() => setChatOpen(true)}>
            <MessageSquare className="w-4 h-4 mr-2" /> Chat
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Tasks</CardTitle>
            <CheckCircle className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.tasks.length}</div>
            <div className="text-xs text-slate-500">
              {project.tasks.filter(t => t.status === "done").length} completed
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">In Progress</CardTitle>
            <Loader2 className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {project.tasks.filter(t => t.status === "progress").length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Invoices</CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{project.invoices.length}</div>
            <div className="text-xs text-slate-500">
              {project.invoices.filter(i => i.status === "sent" || i.status === "overdue").length} pending
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectConversation?.messages.length || 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deliverables">Deliverables</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Project Info */}
            <Card className="md:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Project Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="text-slate-500">Status</dt>
                    <dd className="font-medium mt-1">
                      <Badge variant="outline" className={statusColors[project.status]}>
                        {statusLabels[project.status] || project.status}
                      </Badge>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Client</dt>
                    <dd className="font-medium mt-1">{project.client?.company || project.client?.name || "Unknown"}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Created</dt>
                    <dd className="font-medium mt-1">{format(new Date(project.createdAt), "MMM d, yyyy")}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Last Updated</dt>
                    <dd className="font-medium mt-1">{format(new Date(project.updatedAt), "MMM d, yyyy")}</dd>
                  </div>
                </dl>
                
                {project.resultAssetUrl && (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-2 text-green-800 mb-2">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-medium">Deliverable Available</span>
                    </div>
                    <a 
                      href={project.resultAssetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-green-700 hover:underline flex items-center gap-1"
                    >
                      View Deliverable <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="md:col-span-1 lg:col-span-1">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Project Created</p>
                      <p className="text-xs text-slate-500">{format(new Date(project.createdAt), "MMM d, yyyy HH:mm")}</p>
                    </div>
                  </div>
                  
                  {project.tasks.length > 0 && (
                    <>
                      <div className="border-l border-slate-200 pl-4 ml-1" />
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-500 mt-2" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">Tasks Created</p>
                          <p className="text-xs text-slate-500">{project.tasks.length} tasks across stages</p>
                        </div>
                      </div>
                    </>
                  )}
                  
                  {project.invoices.length > 0 && (
                    <>
                      <div className="border-l border-slate-200 pl-4 ml-1" />
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-2 h-2 rounded-full bg-amber-500 mt-2" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">Invoice Generated</p>
                          <p className="text-xs text-slate-500">{format(new Date(project.invoices[0].createdAt), "MMM d, yyyy")}</p>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="border-l border-slate-200 pl-4 ml-1" />
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-2 h-2 rounded-full bg-slate-400 mt-2" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Last Updated</p>
                      <p className="text-xs text-slate-500">{format(new Date(project.updatedAt), "MMM d, yyyy HH:mm")}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Task Summary */}
            <Card className="md:col-span-2 lg:col-span-2">
              <CardHeader>
                <CardTitle>Task Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4">
                  {([
                    { status: "todo", label: "To Do", color: "bg-slate-100 text-slate-700" },
                    { status: "progress", label: "In Progress", color: "bg-blue-100 text-blue-700" },
                    { status: "review", label: "Review", color: "bg-amber-100 text-amber-700" },
                    { status: "done", label: "Done", color: "bg-emerald-100 text-emerald-700" },
                  ] as const).map(({ status, label, color }) => (
                    <div key={status} className={`p-4 rounded-lg ${color}`}>
                      <dt className="text-sm text-slate-600">{label}</dt>
                      <dd className="text-2xl font-bold text-slate-900">
                        {project.tasks.filter((t) => t.status === status).length}
                      </dd>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Deliverables Tab */}
        <TabsContent value="deliverables" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Project Deliverables
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.resultAssetUrl ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-8 h-8 text-green-600" />
                      <div>
                        <p className="font-medium text-green-900">Final Deliverable</p>
                        <p className="text-sm text-green-700">Project completed and delivered</p>
                      </div>
                    </div>
                    <a 
                      href={project.resultAssetUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-green-700 hover:underline flex items-center gap-1"
                    >
                      View <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No deliverables yet</h3>
                  <p className="text-slate-500">Deliverables will appear here once the project reaches the Delivery stage</p>
                </div>
              )}
              
              {/* Task-based deliverables */}
              {project.tasks.filter(t => t.status === "done" && t.stage).length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-slate-900 mb-4">Completed Task Outputs</h4>
                  <div className="space-y-2">
                    {project.tasks.filter(t => t.status === "done" && t.stage).map((task) => (
                      <div key={task.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                          <div>
                            <p className="font-medium text-slate-900">{task.stage || "Task"}</p>
                            <p className="text-sm text-slate-500">{task.stage}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-100 text-emerald-700">Done</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Invoices Tab */}
        <TabsContent value="invoices" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-4 h-4" /> Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              {project.invoices.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">No invoices yet</h3>
                  <p className="text-slate-500">Invoices will appear here once generated</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {project.invoices.map((invoice) => (
                    <div key={invoice.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-4">
                        <FileText className="w-10 h-10 text-slate-400" />
                        <div>
                          <p className="font-medium text-slate-900">{invoice.number}</p>
                          <p className="text-sm text-slate-500">
                            {format(new Date(invoice.createdAt), "MMM d, yyyy")} • 
                            {invoice.dueDate ? `Due: ${format(new Date(invoice.dueDate), "MMM d, yyyy")}` : "No due date"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium text-slate-900">${invoice.amount.toLocaleString()}</span>
                        <Badge variant="outline" className={invoiceStatusColors[invoice.status]}>
                          {invoiceStatusLabels[invoice.status] || invoice.status}
                        </Badge>
                        <InvoiceDownload invoiceId={invoice.id} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Project Chat
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Project Conversation</h3>
                <p className="text-slate-500 mb-6">
                  Click the Chat button in the header to open the real-time chat drawer
                </p>
                <Button onClick={() => setChatOpen(true)}>
                  <MessageSquare className="w-4 h-4 mr-2" /> Open Chat
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Chat Drawer */}
      <ChatDrawer 
        projectId={projectId} 
        isOpen={chatOpen} 
        onClose={() => setChatOpen(false)} 
      />
    </div>
  );
}