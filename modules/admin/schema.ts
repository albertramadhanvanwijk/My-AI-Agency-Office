import { z } from "zod";

/**
 * Settings categories for organization
 */
export const SettingCategory = z.enum([
  "General",
  "AI",
  "Email",
  "Storage",
]);

export type SettingCategoryType = z.infer<typeof SettingCategory>;

/**
 * Setting value can be string, number, boolean, or object
 */
export const SettingValue = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.record(z.string(), z.unknown()),
  z.array(z.unknown()),
]);

export type SettingValueType = z.infer<typeof SettingValue>;

/**
 * Setting schema
 */
export const SettingSchema = z.object({
  id: z.string(),
  key: z.string(),
  value: SettingValue,
  description: z.string().nullable(),
  category: SettingCategory.nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type Setting = z.infer<typeof SettingSchema>;

/**
 * Input for creating/updating a setting
 */
export const SettingInput = z.object({
  key: z.string().min(1).max(100),
  value: SettingValue,
  description: z.string().max(500).optional(),
  category: SettingCategory.optional(),
});

export type SettingInputType = z.infer<typeof SettingInput>;

/**
 * Feature Flag schema
 */
export const FeatureFlagSchema = z.object({
  id: z.string(),
  key: z.string(),
  enabled: z.boolean(),
  description: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type FeatureFlag = z.infer<typeof FeatureFlagSchema>;

/**
 * Input for creating/updating a feature flag
 */
export const FeatureFlagInput = z.object({
  key: z.string().min(1).max(100).regex(/^[A-Z_][A-Z0-9_]*$/),
  enabled: z.boolean().optional(),
  description: z.string().max(500).optional(),
});

export type FeatureFlagInputType = z.infer<typeof FeatureFlagInput>;

/**
 * Audit Log query parameters
 */
export const AuditLogQuerySchema = z.object({
  who: z.string().optional(),
  action: z.string().optional(),
  targetId: z.string().optional(),
  from: z.date().optional(),
  to: z.date().optional(),
  projectId: z.string().optional(),
  modelUsed: z.string().optional(),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type AuditLogQuery = z.infer<typeof AuditLogQuerySchema>;

/**
 * Audit Log entry schema
 */
export const AuditLogEntrySchema = z.object({
  id: z.string(),
  who: z.string(),
  action: z.string(),
  targetId: z.string().nullable(),
  modelUsed: z.string().nullable(),
  tokens: z.number().int().nullable(),
  projectId: z.string().nullable(),
  createdAt: z.date(),
});

export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;

/**
 * Paginated audit log response
 */
export const AuditLogResponseSchema = z.object({
  logs: z.array(AuditLogEntrySchema),
  pagination: z.object({
    page: z.number().int().positive(),
    limit: z.number().int().positive(),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }),
});

export type AuditLogResponse = z.infer<typeof AuditLogResponseSchema>;

/**
 * Predefined feature flag keys
 */
export const FEATURE_FLAG_KEYS = [
  "NEW_DIVISION_ENABLED",
  "AI_DISPATCH_ENABLED",
  "CHAT_WS_ENABLED",
  "INVOICE_PDF_ENABLED",
] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

/**
 * Default feature flags with descriptions
 */
export const DEFAULT_FEATURE_FLAGS: Record<FeatureFlagKey, { enabled: boolean; description: string }> = {
  NEW_DIVISION_ENABLED: { enabled: true, description: "Allow creating new divisions via Organization panel" },
  AI_DISPATCH_ENABLED: { enabled: true, description: "Enable AI task dispatch via 9Router" },
  CHAT_WS_ENABLED: { enabled: false, description: "Enable WebSocket real-time chat" },
  INVOICE_PDF_ENABLED: { enabled: true, description: "Enable PDF invoice generation and download" },
};

/**
 * Default settings with categories and descriptions
 */
export const DEFAULT_SETTINGS: Array<{
  key: string;
  value: SettingValueType;
  description: string;
  category: SettingCategoryType;
}> = [
  // General
  { key: "appName", value: "My AI Agency Office", description: "Application name displayed in UI", category: "General" },
  { key: "timezone", value: "Asia/Jakarta", description: "Default timezone for dates and scheduling", category: "General" },
  { key: "appUrl", value: "http://localhost:3000", description: "Base URL for generating absolute links", category: "General" },
  
  // AI
  { key: "defaultModel", value: "gpt-4o", description: "Default AI model for 9Router", category: "AI" },
  { key: "rateLimit", value: 30, description: "Default rate limit (requests per minute) per user", category: "AI" },
  { key: "maxTokens", value: 4096, description: "Maximum tokens per AI request", category: "AI" },
  { key: "temperature", value: 0.7, description: "Default temperature for AI responses", category: "AI" },
  
  // Email
  { key: "smtpHost", value: "smtp.example.com", description: "SMTP server hostname", category: "Email" },
  { key: "smtpPort", value: 587, description: "SMTP server port", category: "Email" },
  { key: "smtpUser", value: "", description: "SMTP authentication username", category: "Email" },
  { key: "smtpPassword", value: "", description: "SMTP authentication password", category: "Email" },
  { key: "fromEmail", value: "noreply@example.com", description: "Default from email address", category: "Email" },
  { key: "fromName", value: "My AI Agency Office", description: "Default from name for emails", category: "Email" },
  
  // Storage
  { key: "s3Bucket", value: "my-bucket", description: "S3 bucket name for file storage", category: "Storage" },
  { key: "s3Region", value: "us-east-1", description: "S3 region", category: "Storage" },
  { key: "s3AccessKey", value: "", description: "S3 access key ID", category: "Storage" },
  { key: "s3SecretKey", value: "", description: "S3 secret access key", category: "Storage" },
  { key: "cdnUrl", value: "https://cdn.example.com", description: "CDN base URL for asset delivery", category: "Storage" },
];