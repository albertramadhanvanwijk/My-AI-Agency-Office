export type OfficeRoomType = "lobby" | "division" | "meeting" | "amenity";

export type OfficeRoom = {
  id: string;
  type: OfficeRoomType;
  divisionId?: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  capacity: number;
  floor?: number;
  label?: string;
  color?: string;
  icon?: string;
};

export type OfficeDesk = {
  id: string;
  roomId?: string | null;
  clusterId?: string | null;
  staffId?: string | null;
  x?: number | null;
  y?: number | null;
};

export type OfficeStaff = {
  id: string;
  name: string;
  avatar?: string | null;
  status: "active" | "standby" | "break";
  deskId?: string | null;
  divisionId?: string | null;
  roleId?: string | null;
  title?: string | null;
  divisionName?: string | null;
};

export type RoomSelectPayload = {
  id: string;
  type: OfficeRoomType;
  divisionId?: string | null;
  label?: string;
  roomId: string;
};

export type AvatarSelectPayload = {
  staffId: string;
  name: string;
  deskId?: string | null;
  roomId?: string | null;
};

export function isActiveDesk(desk: OfficeDesk, staffById: Map<string, OfficeStaff>): boolean {
  if (!desk.staffId) return false;
  const s = staffById.get(desk.staffId);
  return !!s && s.status === "active";
}

export function activeDesksOnly(
  desks: OfficeDesk[],
  staff: OfficeStaff[]
): OfficeDesk[] {
  if (!desks.length) return [];
  if (!staff.length) return [];
  const byId = new Map(staff.map((s) => [s.id, s] as const));
  return desks.filter((d) => isActiveDesk(d, byId));
}

export function staffForDesk(
  desk: OfficeDesk,
  staff: OfficeStaff[]
): OfficeStaff | undefined {
  if (!desk.staffId) return undefined;
  return staff.find((s) => s.id === desk.staffId);
}
