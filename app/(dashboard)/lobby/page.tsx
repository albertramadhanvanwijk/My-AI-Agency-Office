import { db } from "@/lib/db";
import OfficeCanvas from "@/components/3d-office/OfficeCanvas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Users, Sparkles } from "lucide-react";

export const dynamic = "force-dynamic";

type LobbyRoom = {
  id: string;
  type: "lobby" | "division" | "meeting" | "amenity";
  divisionId: string | null;
  x: number;
  y: number;
  w: number;
  h: number;
  capacity: number;
  floor: number;
  label?: string;
  color?: string;
  icon?: string;
};

type LobbyDesk = {
  id: string;
  roomId: string | null;
  clusterId: string | null;
  staffId: string | null;
  x: number | null;
  y: number | null;
};

type LobbyStaff = {
  id: string;
  name: string;
  avatar: string | null;
  status: "active" | "standby" | "break";
  deskId: string | null;
  divisionId: string | null;
  roleId: string | null;
  title?: string | null;
  divisionName?: string | null;
};

async function getLobbyData(): Promise<{
  rooms: LobbyRoom[];
  desks: LobbyDesk[];
  staff: LobbyStaff[];
}> {
  try {
    const [roomsRaw, desksRaw, staffRaw] = await Promise.all([
      db.room.findMany({ orderBy: [{ floor: "asc" }, { type: "asc" }, { id: "asc" }] }),
      db.desk.findMany({ orderBy: { id: "asc" } }),
      db.staff.findMany({
        include: {
          role: { select: { title: true } },
          division: { select: { name: true } },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    // Enrich label/color/icon from layout spec if missing — keep DB as source of truth
    const divisionColorFallback: Record<string, string> = {
      "Strategy & Planning": "#dbeafe",
      "Creative & Content": "#fce7f3",
      "Technology & Product": "#dcfce7",
      "Marketing & Growth": "#ffedd5",
      "Client Relations": "#ede9fe",
      "Finance, Legal & Admin": "#fef3c7",
    };

    const rooms: LobbyRoom[] = roomsRaw.map((r) => {
      // Derive label if table has none
      let label: string | undefined;
      if (r.id === "room-lobby") label = "LOBBY";
      else if (r.id === "room-strategy") label = "Strategy";
      else if (r.id === "room-creative") label = "Creative Studio";
      else if (r.id === "room-techlab") label = "Tech Lab";
      else if (r.id === "room-marketing") label = "Marketing";
      else if (r.id === "room-finance") label = "Finance & Admin";
      else if (r.id === "room-pantry") label = "Pantry";
      else if (r.id === "room-musholla") label = "Musholla";
      else if (r.id === "room-break") label = "Break Room";
      else if (r.id === "room-client-lounge") label = "Client Lounge";
      else if (r.id === "room-board") label = "Board Room";
      else if (r.id === "room-war") label = "War Room";
      else if (r.id === "room-executive") label = "Executive";
      else if (r.id === "room-flex-central") label = "Flexible Floor";
      else if (r.id === "room-meeting-small") label = "Meeting Small";
      else if (r.id === "room-meeting-large") label = "Meeting Large";
      else label = r.id.replace("room-", "").replace(/-/g, " ");

      return {
        id: r.id,
        type: r.type as LobbyRoom["type"],
        divisionId: r.divisionId,
        x: r.x,
        y: r.y,
        w: r.w,
        h: r.h,
        capacity: r.capacity,
        floor: r.floor,
        label,
        color: undefined,
        icon: r.type === "amenity" ? (r.id === "room-pantry" ? "☕" : r.id === "room-musholla" ? "🕌" : r.id === "room-break" ? "🎮" : r.id === "room-client-lounge" ? "🛋️" : undefined) : undefined,
      };
    });

    const desks: LobbyDesk[] = desksRaw.map((d) => ({
      id: d.id,
      roomId: d.roomId,
      clusterId: d.clusterId,
      staffId: d.staffId,
      x: d.x,
      y: d.y,
    }));

    const staff: LobbyStaff[] = staffRaw.map((s) => ({
      id: s.id,
      name: s.name,
      avatar: s.avatar,
      status: s.status as LobbyStaff["status"],
      deskId: s.deskId,
      divisionId: s.divisionId,
      roleId: s.roleId,
      title: (s as unknown as { role?: { title?: string } }).role?.title ?? null,
      divisionName: (s as unknown as { division?: { name?: string } | null }).division?.name ?? null,
    }));

    // Attach cozy colors per division for display
    for (const r of rooms) {
      const st = staff.find((s) => s.divisionId === r.divisionId);
      const divName = st?.divisionName;
      if (divName && divisionColorFallback[divName]) r.color = divisionColorFallback[divName];
      if (r.type === "lobby") r.color = "#fef3c7";
      if (r.type === "amenity" && !r.color) r.color = "#fafaf9";
    }

    return { rooms, desks, staff };
  } catch {
    // Fallback to layout.json when DB unavailable (matches OfficeCanvas expectations without crashing)
    try {
      const layout = (await import("@/lib/office/layout.json")).default as {
        rooms: LobbyRoom[];
      };
      return { rooms: layout.rooms as LobbyRoom[], desks: [], staff: [] };
    } catch {
      return { rooms: [], desks: [], staff: [] };
    }
  }
}

export default async function LobbyPage() {
  const { rooms, desks, staff } = await getLobbyData();
  const activeCount = staff.filter((s) => s.status === "active").length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-xl font-semibold tracking-tight">
            <Building2 className="h-5 w-5 text-primary" />
            Lobby — Live Office
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Gedung persegi · Lobby bawah tengah (2 pintu kaca) · Kiri 4 vertical · Kanan 4 vertical · Atas 3 horizontal
            · Tengah 16 clusters x4 (hanya N active) · 3 amenity (Pantry/Musholla/Break). Klik ruangan untuk filter staff, klik avatar untuk chat.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Users className="h-3 w-3" />
            {activeCount} active
          </Badge>
          <Badge variant="outline" className="gap-1.5">
            <Sparkles className="h-3 w-3" />
            {rooms.length} rooms
          </Badge>
        </div>
      </div>

      <OfficeCanvas rooms={rooms as never} desks={desks as never} staff={staff as never} />

      <Card className="border-dashed">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Layout foto — Cozy Creative</CardTitle>
          <CardDescription className="text-xs">
            Kayu hangat + kaca + warm light + tanaman · Isometric fix ~30° · Low-poly rounded · Frustum cull · Hanya active desks yang di-render, sisanya flexible floor.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-xs leading-relaxed text-muted-foreground">
          Amenity sejak hari 1: Pantry/Cafeteria (☕ pojok kanan bawah), Musholla (🕌 tenang dekat lobby), Break/Game Room (🎮 pojok kiri bawah, sofa hijau). Responsive: desktop 3D penuh, mobile fallback list.
        </CardContent>
      </Card>
    </div>
  );
}
