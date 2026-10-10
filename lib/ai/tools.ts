/**
 * Tool schemas per division — exported as TOOLS_BY_DIVISION.
 * Each tool is a JSON Schema-like descriptor; real execution is wired later.
 */
export type ToolDef = {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, { type: string; description?: string; enum?: string[] }>;
    required?: string[];
  };
};

export const TOOLS_BY_DIVISION: Record<string, ToolDef[]> = {
  "Creative & Content": [
    {
      name: "imageGen",
      description: "Generate an image from a text prompt (Creative division).",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Text prompt for image generation" },
          style: { type: "string", description: "Visual style", enum: ["realistic", "illustration", "minimal"] },
          count: { type: "number", description: "Number of images" },
        },
        required: ["prompt"],
      },
    },
    {
      name: "videoGen",
      description: "Generate or edit video.",
      parameters: {
        type: "object",
        properties: {
          prompt: { type: "string", description: "Video prompt" },
          durationSec: { type: "number", description: "Duration in seconds" },
        },
        required: ["prompt"],
      },
    },
  ],
  "Technology & Product": [
    {
      name: "codeSandbox",
      description: "Execute code in a sandbox and return output (Tech division).",
      parameters: {
        type: "object",
        properties: {
          language: { type: "string", enum: ["javascript", "typescript", "python"] },
          code: { type: "string", description: "Source code to execute" },
        },
        required: ["language", "code"],
      },
    },
    {
      name: "deploy",
      description: "Trigger a deployment preview.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          env: { type: "string", enum: ["preview", "production"] },
        },
        required: ["projectId"],
      },
    },
  ],
  "Marketing & Growth": [
    {
      name: "analytics",
      description: "Fetch analytics metrics (Marketing division).",
      parameters: {
        type: "object",
        properties: {
          metric: { type: "string", enum: ["traffic", "conversion", "roas", "engagement"] },
          range: { type: "string", description: "Date range, e.g. 7d, 30d" },
        },
        required: ["metric"],
      },
    },
    {
      name: "ads",
      description: "Manage paid ads campaigns.",
      parameters: {
        type: "object",
        properties: {
          platform: { type: "string", enum: ["google", "meta", "tiktok"] },
          action: { type: "string", enum: ["create", "pause", "optimize"] },
          budget: { type: "number" },
        },
        required: ["platform", "action"],
      },
    },
  ],
  "Finance, Legal & Admin": [
    {
      name: "invoiceGen",
      description: "Generate an invoice draft (Finance division).",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          items: { type: "string", description: "JSON array of line items" },
          dueDate: { type: "string", description: "ISO date" },
        },
        required: ["projectId", "items"],
      },
    },
    {
      name: "legalReview",
      description: "Review a legal document.",
      parameters: {
        type: "object",
        properties: {
          documentUrl: { type: "string" },
          type: { type: "string", enum: ["contract", "nda", "terms"] },
        },
        required: ["documentUrl"],
      },
    },
  ],
  "Strategy & Planning": [
    {
      name: "research",
      description: "Research market, competitors, or domain (Strategy division).",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          depth: { type: "string", enum: ["quick", "deep"] },
        },
        required: ["query"],
      },
    },
    {
      name: "dispatch",
      description: "Dispatch a task to a role (PM/MD).",
      parameters: {
        type: "object",
        properties: {
          roleId: { type: "string" },
          task: { type: "string" },
        },
        required: ["roleId", "task"],
      },
    },
  ],
  "Client Relations": [
    {
      name: "crm",
      description: "CRM action for client relations.",
      parameters: {
        type: "object",
        properties: {
          action: { type: "string", enum: ["createLead", "updateLead", "sendMessage"] },
          clientId: { type: "string" },
          payload: { type: "string" },
        },
        required: ["action"],
      },
    },
  ],
};

// Flat list for convenience
export const ALL_TOOLS: ToolDef[] = Object.values(TOOLS_BY_DIVISION).flat();

// Helper: get tools for a division name (fallback empty)
export function getToolsForDivision(divisionName: string): ToolDef[] {
  return TOOLS_BY_DIVISION[divisionName] ?? [];
}
