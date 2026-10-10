import { db } from "@/lib/db";
import {
  Setting,
  SettingInputType,
  FeatureFlag,
  FeatureFlagInputType,
  AuditLogQuery,
  AuditLogEntry,
  AuditLogResponse,
  DEFAULT_SETTINGS,
  DEFAULT_FEATURE_FLAGS,
  FEATURE_FLAG_KEYS,
  FeatureFlagKey,
  SettingCategoryType,
} from "./schema";
import { SettingCategory } from "./schema";

/**
 * Get all settings grouped by category
 */
export async function getSettings(): Promise<Record<SettingCategoryType, Setting[]>> {
  const settings = await db.setting.findMany({
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  const grouped: Record<string, Setting[]> = {
    General: [],
    AI: [],
    Email: [],
    Storage: [],
  };

  for (const setting of settings) {
    const category = (setting.category as SettingCategoryType) || "General";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(setting as unknown as Setting);
  }

  // Ensure all categories exist even if empty
  return {
    General: grouped.General || [],
    AI: grouped.AI || [],
    Email: grouped.Email || [],
    Storage: grouped.Storage || [],
  };
}

/**
 * Get a single setting by key
 */
export async function getSetting(key: string): Promise<Setting | null> {
  const setting = await db.setting.findUnique({
    where: { key },
  });
  return setting as unknown as Setting | null;
}

/**
 * Create or update a setting
 */
export async function updateSettings(key: string, value: unknown, description?: string, category?: SettingCategoryType): Promise<Setting> {
  // Validate category if provided
  let validatedCategory: SettingCategoryType | null = null;
  if (category) {
    const parsed = SettingCategory.safeParse(category);
    if (parsed.success) {
      validatedCategory = parsed.data;
    }
  }

  // Find existing to preserve description/category if not provided
  const existing = await db.setting.findUnique({ where: { key } });
  
  const setting = await db.setting.upsert({
    where: { key },
    create: {
      key,
      value: value as any,
      description: description ?? existing?.description ?? null,
      category: validatedCategory ?? existing?.category ?? null,
    },
    update: {
      value: value as any,
      description: description ?? existing?.description ?? undefined,
      category: validatedCategory ?? existing?.category ?? undefined,
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      who: "system",
      action: existing ? "setting_updated" : "setting_created",
      targetId: setting.id,
    },
  });

  return setting as unknown as Setting;
}

/**
 * Delete a setting
 */
export async function deleteSetting(key: string): Promise<void> {
  await db.setting.delete({ where: { key } });
  
  await db.auditLog.create({
    data: {
      who: "system",
      action: "setting_deleted",
      targetId: key,
    },
  });
}

/**
 * Initialize default settings if they don't exist
 */
export async function initializeDefaultSettings(): Promise<void> {
  for (const defaultSetting of DEFAULT_SETTINGS) {
    const existing = await db.setting.findUnique({ where: { key: defaultSetting.key } });
    if (!existing) {
      await db.setting.create({
        data: {
          key: defaultSetting.key,
          value: defaultSetting.value as any,
          description: defaultSetting.description,
          category: defaultSetting.category,
        },
      });
    }
  }
}

/**
 * Get all feature flags
 */
export async function getFeatureFlags(): Promise<FeatureFlag[]> {
  const flags = await db.featureFlag.findMany({
    orderBy: { key: "asc" },
  });
  return flags as unknown as FeatureFlag[];
}

/**
 * Get a single feature flag by key
 */
export async function getFeatureFlag(key: string): Promise<FeatureFlag | null> {
  const flag = await db.featureFlag.findUnique({
    where: { key },
  });
  return flag as unknown as FeatureFlag | null;
}

/**
 * Toggle a feature flag (create if not exists, flip if exists)
 */
export async function toggleFeatureFlag(key: string): Promise<FeatureFlag> {
  // Validate key format
  if (!FEATURE_FLAG_KEYS.includes(key as FeatureFlagKey)) {
    throw new Error(`Invalid feature flag key: ${key}. Must be one of: ${FEATURE_FLAG_KEYS.join(", ")}`);
  }

  const existing = await db.featureFlag.findUnique({ where: { key } });

  let newEnabled: boolean;
  let description: string | null = null;

  if (existing) {
    newEnabled = !existing.enabled;
    description = existing.description;
  } else {
    // Default to enabled for new flags
    newEnabled = true;
    const defaultFlag = DEFAULT_FEATURE_FLAGS[key as FeatureFlagKey];
    description = defaultFlag?.description ?? null;
  }

  const flag = await db.featureFlag.upsert({
    where: { key },
    create: {
      key,
      enabled: newEnabled,
      description,
    },
    update: {
      enabled: newEnabled,
    },
  });

  // Audit log
  await db.auditLog.create({
    data: {
      who: "system",
      action: existing ? "feature_flag_toggled" : "feature_flag_created",
      targetId: flag.id,
    },
  });

  return flag as unknown as FeatureFlag;
}

/**
 * Set a feature flag to specific value
 */
export async function setFeatureFlag(key: string, enabled: boolean, description?: string): Promise<FeatureFlag> {
  if (!FEATURE_FLAG_KEYS.includes(key as FeatureFlagKey)) {
    throw new Error(`Invalid feature flag key: ${key}. Must be one of: ${FEATURE_FLAG_KEYS.join(", ")}`);
  }

  const existing = await db.featureFlag.findUnique({ where: { key } });
  const defaultFlag = DEFAULT_FEATURE_FLAGS[key as FeatureFlagKey];

  const flag = await db.featureFlag.upsert({
    where: { key },
    create: {
      key,
      enabled,
      description: description ?? defaultFlag?.description ?? null,
    },
    update: {
      enabled,
      description: description ?? existing?.description ?? undefined,
    },
  });

  await db.auditLog.create({
    data: {
      who: "system",
      action: existing ? "feature_flag_updated" : "feature_flag_created",
      targetId: flag.id,
    },
  });

  return flag as unknown as FeatureFlag;
}

/**
 * Initialize default feature flags if they don't exist
 */
export async function initializeDefaultFeatureFlags(): Promise<void> {
  for (const key of FEATURE_FLAG_KEYS) {
    const existing = await db.featureFlag.findUnique({ where: { key } });
    if (!existing) {
      const defaultFlag = DEFAULT_FEATURE_FLAGS[key];
      await db.featureFlag.create({
        data: {
          key,
          enabled: defaultFlag.enabled,
          description: defaultFlag.description,
        },
      });
    }
  }
}

/**
 * Get audit logs with filters and pagination
 */
export async function getAuditLogs(query: AuditLogQuery): Promise<AuditLogResponse> {
  const { who, action, targetId, from, to, projectId, modelUsed, limit = 50, offset = 0 } = query;

  const page = Math.floor(offset / limit) + 1;

  const where: any = {};

  if (who) where.who = { contains: who, mode: "insensitive" };
  if (action) where.action = { contains: action, mode: "insensitive" };
  if (targetId) where.targetId = targetId;
  if (projectId) where.projectId = projectId;
  if (modelUsed) where.modelUsed = { contains: modelUsed, mode: "insensitive" };
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = from;
    if (to) where.createdAt.lte = to;
  }

  const [logs, total] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    db.auditLog.count({ where }),
  ]);

  return {
    logs: logs as unknown as AuditLogEntry[],
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Export audit logs as CSV string
 */
export async function exportAuditLogsCSV(query: AuditLogQuery): Promise<string> {
  // Remove pagination limits for export (but keep a reasonable max)
  const exportQuery = { ...query, limit: query.limit || 10000, offset: query.offset || 0 };
  const { logs } = await getAuditLogs(exportQuery);

  // CSV header
  const headers = ["id", "who", "action", "targetId", "modelUsed", "tokens", "createdAt", "projectId"];
  const rows = [headers.join(",")];

  for (const log of logs) {
    const row = [
      log.id,
      escapeCsv(log.who),
      escapeCsv(log.action),
      escapeCsv(log.targetId ?? ""),
      escapeCsv(log.modelUsed ?? ""),
      log.tokens?.toString() ?? "",
      log.createdAt.toISOString(),
      escapeCsv(log.projectId ?? ""),
    ];
    rows.push(row.join(","));
  }

  return rows.join("\n") + "\n";
}

/**
 * Escape CSV field value
 */
function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}