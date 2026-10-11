import { z } from "zod";

export const AddRoleInput = z.object({
  divisionId: z.string().min(1, "Division required"),
  title: z.string().min(2, "Title too short").max(100),
  level: z.enum(["HEAD", "MANAGER", "STAFF", "SUPPORT"]),
  systemPrompt: z.string().optional(),
  modelVia9Router: z.string().optional(),
  tools: z.array(z.string()).optional(),
  avatar: z.string().optional(),
});

export const AddDivisionInput = z.object({
  name: z.string().min(2).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Color must be hex #RRGGBB"),
  icon: z.string().min(1).max(50),
  status: z.enum(["active", "provisional"]).default("provisional"),
  description: z.string().optional(),
  triggerProjectId: z.string().optional(),
});

export const ToggleStaffStatusInput = z.object({
  staffId: z.string().min(1),
  status: z.enum(["active", "standby", "break"]),
});

export type AddRoleInputType = z.infer<typeof AddRoleInput>;
export type AddDivisionInputType = z.infer<typeof AddDivisionInput>;
export type ToggleStaffStatusInputType = z.infer<typeof ToggleStaffStatusInput>;
