"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  getSettings,
  getSetting,
  updateSettings,
  deleteSetting,
  initializeDefaultSettings,
  getFeatureFlags,
  getFeatureFlag,
  toggleFeatureFlag,
  setFeatureFlag,
  initializeDefaultFeatureFlags,
  getAuditLogs,
  exportAuditLogsCSV,
} from "./service";
import {
  AuditLogQuery,
  FeatureFlagKey,
  SettingInputType,
  SettingInput,
} from "./schema";
import { z } from "zod";

/**
 * Get server session with OWNER role check
 */
async function getOwnerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER role required");
  }
  return session;
}

/**
 * Get all settings (server action for dashboard)
 */
export async function getSettingsAction() {
  const session = await getOwnerSession();
  return getSettings();
}

/**
 * Get single setting (server action)
 */
export async function getSettingAction(key: string) {
  const session = await getOwnerSession();
  return getSetting(key);
}

/**
 * Update setting (server action)
 */
export async function updateSettingAction(input: SettingInputType) {
  const session = await getOwnerSession();
  const parsed = SettingInput.parse(input);
  const setting = await updateSettings(parsed.key, parsed.value, parsed.description, parsed.category);
  revalidatePath("/admin/settings");
  return setting;
}

/**
 * Delete setting (server action)
 */
export async function deleteSettingAction(key: string) {
  const session = await getOwnerSession();
  await deleteSetting(key);
  revalidatePath("/admin/settings");
  return { success: true };
}

/**
 * Initialize default settings (server action)
 */
export async function initializeDefaultSettingsAction() {
  const session = await getOwnerSession();
  await initializeDefaultSettings();
  revalidatePath("/admin/settings");
  return { success: true };
}

/**
 * Get all feature flags (server action)
 */
export async function getFeatureFlagsAction() {
  const session = await getOwnerSession();
  return getFeatureFlags();
}

/**
 * Get single feature flag (server action)
 */
export async function getFeatureFlagAction(key: string) {
  const session = await getOwnerSession();
  return getFeatureFlag(key);
}

/**
 * Toggle feature flag (server action)
 */
export async function toggleFeatureFlagAction(key: string) {
  const session = await getOwnerSession();
  const flag = await toggleFeatureFlag(key);
  revalidatePath("/admin/feature-flags");
  return flag;
}

/**
 * Set feature flag to specific value (server action)
 */
export async function setFeatureFlagAction(key: string, enabled: boolean, description?: string) {
  const session = await getOwnerSession();
  const flag = await setFeatureFlag(key, enabled, description);
  revalidatePath("/admin/feature-flags");
  return flag;
}

/**
 * Initialize default feature flags (server action)
 */
export async function initializeDefaultFeatureFlagsAction() {
  const session = await getOwnerSession();
  await initializeDefaultFeatureFlags();
  revalidatePath("/admin/feature-flags");
  return { success: true };
}

/**
 * Get audit logs with filters (server action)
 */
export async function getAuditLogsAction(query: AuditLogQuery) {
  const session = await getOwnerSession();
  return getAuditLogs(query);
}

/**
 * Export audit logs as CSV (server action)
 */
export async function exportAuditLogsCSVAction(query: AuditLogQuery) {
  const session = await getOwnerSession();
  const csv = await exportAuditLogsCSV(query);
  return csv;
}

/**
 * Download audit logs CSV (for API route)
 */
export async function downloadAuditLogsCSV(query: AuditLogQuery) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
  if (session.user.role !== "OWNER") {
    throw new Error("Forbidden: OWNER role required");
  }
  
  const csv = await exportAuditLogsCSV(query);
  return csv;
}

// Re-export types for convenience
export type { AuditLogQuery, AuditLogResponse, FeatureFlagKey, SettingInputType } from "./schema";