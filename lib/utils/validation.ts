import { z } from "zod";
import { formatFileSize } from "./format";

/**
 * Common validation schemas
 */

// Email validation
export const emailSchema = z.string().email("Invalid email address");

// Password validation - at least 8 chars, 1 uppercase, 1 lowercase, 1 number
export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

// Name validation
export const nameSchema = z
  .string()
  .min(2, "Name must be at least 2 characters")
  .max(100, "Name must be less than 100 characters")
  .regex(/^[a-zA-Z\s\-'\.]+$/, "Name contains invalid characters");

// Phone validation (Indonesian format)
export const phoneSchema = z
  .string()
  .regex(/^(\+62|62|0)8[1-9][0-9]{7,9}$/, "Invalid Indonesian phone number");

// URL validation
export const urlSchema = z.string().url("Invalid URL");

// Slug validation
export const slugSchema = z
  .string()
  .min(1, "Slug is required")
  .max(100, "Slug too long")
  .regex(/^[a-z0-9-]+$/, "Slug can only contain lowercase letters, numbers, and hyphens")
  .refine((s) => !s.startsWith("-") && !s.endsWith("-"), "Slug cannot start or end with hyphen");

// UUID validation
export const uuidSchema = z.string().uuid("Invalid ID format");

// Date validation
export const dateSchema = z.coerce.date().refine((d) => !isNaN(d.getTime()), "Invalid date");

// Positive number validation
export const positiveNumberSchema = z.number().positive("Must be a positive number");

// Non-negative number validation
export const nonNegativeNumberSchema = z.number().nonnegative("Must be a non-negative number");

/**
 * Project validation schemas
 */
export const projectCreateSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  brief: z.string().min(10, "Brief must be at least 10 characters").max(10000, "Brief too long"),
  clientId: uuidSchema,
  budget: nonNegativeNumberSchema.optional(),
  timeline: z.string().optional(),
});

export const projectUpdateSchema = projectCreateSchema.partial();

export const projectStatusSchema = z.enum([
  "INQUIRY",
  "BRIEF",
  "PLANNING",
  "EXECUTION",
  "QA",
  "DELIVERY",
  "CLOSING",
]);

/**
 * Task validation schemas
 */
export const taskCreateSchema = z.object({
  projectId: uuidSchema,
  title: z.string().min(3, "Title must be at least 3 characters").max(200, "Title too long"),
  description: z.string().max(5000, "Description too long").optional(),
  assigneeStaffId: uuidSchema.optional(),
  stage: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  dueDate: dateSchema.optional(),
});

export const taskUpdateSchema = taskCreateSchema.partial();

export const taskStatusSchema = z.enum(["todo", "progress", "review", "done"]);

/**
 * Invoice validation schemas
 */
export const invoiceCreateSchema = z.object({
  projectId: uuidSchema,
  clientId: uuidSchema,
  items: z
    .array(
      z.object({
        description: z.string().min(1, "Description required").max(500),
        quantity: z.number().positive("Quantity must be positive"),
        unitPrice: z.number().nonnegative("Unit price must be non-negative"),
        taxRate: z.number().min(0).max(1).default(0.11),
      })
    )
    .min(1, "At least one item required"),
  dueDate: dateSchema,
  notes: z.string().max(2000).optional(),
});

export const invoiceStatusSchema = z.enum(["draft", "sent", "paid", "overdue", "cancelled"]);

/**
 * Staff validation schemas
 */
export const staffCreateSchema = z.object({
  roleId: uuidSchema,
  name: nameSchema,
  avatar: urlSchema.optional(),
  status: z.enum(["active", "standby", "break"]).default("standby"),
});

export const staffUpdateSchema = staffCreateSchema.partial();

/**
 * Role validation schemas
 */
export const roleCreateSchema = z.object({
  divisionId: uuidSchema,
  level: z.number().int().min(1).max(5),
  title: z.string().min(2).max(100),
  systemPrompt: z.string().min(10, "System prompt too short").max(10000),
  modelVia9Router: z.string().min(1, "Model required"),
  tools: z.array(z.string()).default([]),
  avatar: urlSchema.optional(),
  roomAssignment: z.string().optional(),
});

export const roleUpdateSchema = roleCreateSchema.partial();

/**
 * Division validation schemas
 */
export const divisionCreateSchema = z.object({
  name: z.string().min(2).max(100),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
  icon: z.string().min(1).max(50),
  status: z.enum(["active", "provisional", "archived"]).default("active"),
});

export const divisionUpdateSchema = divisionCreateSchema.partial();

/**
 * Proposal validation schemas
 */
export const proposalCreateSchema = z.object({
  type: z.enum(["division", "role", "room"]),
  triggerProjectId: uuidSchema.optional(),
  payload: z.record(z.string(), z.unknown()),
});

export const proposalStatusSchema = z.enum(["pending", "approved", "rejected"]);

/**
 * Client validation schemas
 */
export const clientCreateSchema = z.object({
  userId: uuidSchema.optional(),
  company: z.string().min(2).max(200),
  contact: z.string().max(500).optional(),
});

export const clientUpdateSchema = clientCreateSchema.partial();

/**
 * Conversation validation schemas
 */
export const conversationCreateSchema = z.object({
  type: z.enum(["project", "direct"]),
  projectId: uuidSchema.optional(),
  participantIds: z.array(uuidSchema).min(1, "At least one participant required"),
  title: z.string().max(200).optional(),
});

/**
 * Message validation schemas
 */
export const messageCreateSchema = z.object({
  conversationId: uuidSchema,
  content: z.string().min(1, "Message cannot be empty").max(10000),
  attachments: z.array(z.object({
    name: z.string(),
    url: urlSchema,
    type: z.string(),
    size: positiveNumberSchema,
  })).default([]),
});

/**
 * Validation helper functions
 */

export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: z.ZodIssue[] } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: result.error.issues };
}

export function getFieldError(errors: z.ZodIssue[], fieldName: string): string | undefined {
  const error = errors.find((e) => e.path.includes(fieldName));
  return error?.message;
}

export function formatZodErrors(errors: z.ZodIssue[], prefix?: string): Record<string, string> {
  const formatted: Record<string, string> = {};
  for (const error of errors) {
    const path = prefix ? `${prefix}.${error.path.join(".")}` : error.path.join(".");
    if (!formatted[path]) {
      formatted[path] = error.message;
    }
  }
  return formatted;
}

/**
 * Sanitize input to prevent XSS
 */
export function sanitizeHtml(input: string): string {
  return input
    .replace(/&/g, "&")
    .replace(/</g, "<")
    .replace(/>/g, ">")
    .replace(/"/g, '"')
    .replace(/'/g, "&#039;");
}

/**
 * Validate file upload
 */
export function validateFileUpload(
  file: File,
  options: {
    maxSize?: number; // in bytes
    allowedTypes?: string[];
    allowedExtensions?: string[];
  } = {}
): { valid: boolean; error?: string } {
  const { maxSize = 10 * 1024 * 1024, allowedTypes, allowedExtensions } = options;

  if (file.size > maxSize) {
    return { valid: false, error: `File size exceeds ${formatFileSize(maxSize)}` };
  }

  if (allowedTypes && !allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} not allowed` };
  }

  if (allowedExtensions) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!ext || !allowedExtensions.includes(ext)) {
      return { valid: false, error: `File extension not allowed` };
    }
  }

  return { valid: true };
}

// Re-export formatFileSize from format.ts for convenience
export { formatFileSize } from "./format";