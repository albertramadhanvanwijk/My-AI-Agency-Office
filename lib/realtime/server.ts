import { createServer } from "http";
import { Server, Socket } from "socket.io";
import { db } from "@/lib/db";

// Grace period in hours from env (default 48h)
export const GRACE_HOURS = parseInt(process.env.GRACE_HOURS || "48", 10);

// Socket.io server instance
let io: Server | null = null;
let httpServerRef: ReturnType<typeof createServer> | null = null;
const HTTP_PORT = parseInt(process.env.REALTIME_PORT || "3001", 10);

/**
 * Start the Socket.io server for realtime presence
 * Runs on separate port (default 3001) alongside Next.js
 */
export function startRealtimeServer(port = HTTP_PORT): Server {
  // Check if we should skip actual listening (tests)
  const skipListen = process.env.SKIP_LISTEN === "true";
  
  if (io && !skipListen) {
    console.log("[Realtime] Server already running");
    return io;
  }

  // If in test mode and server already created, reuse it
  if (skipListen && io && httpServerRef) {
    return io;
  }

  const httpServer = createServer();
  httpServerRef = httpServer;
  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
  });

  io.of("/presence").on("connection", (socket: Socket) => {
    console.log(`[Realtime] Client connected: ${socket.id}`);

    // Join office room for presence updates
    socket.join("office");

    socket.on("disconnect", () => {
      console.log(`[Realtime] Client disconnected: ${socket.id}`);
    });
  });

  // Allow test to skip actual listening by setting SKIP_LISTEN env var
  if (process.env.SKIP_LISTEN === "true") {
    const originalListen = httpServer.listen;
    httpServer.listen = function (this: typeof httpServer, _port: number, callback?: () => void) {
      callback?.();
      return this;
    } as typeof originalListen;
  }

  httpServer.listen(port, () => {
    console.log(`[Realtime] Socket.io server running on port ${port}`);
  });

  return io;
}

/**
 * Get the Socket.io server instance
 */
export function getIO(): Server | null {
  return io;
}

/**
 * Emit presence event to all clients in office room
 */
export function emitPresence(event: string, data: unknown): void {
  if (io) {
    io.of("/presence").to("office").emit(event, data);
  }
}

/**
 * Activate a staff member - idempotent operation
 * Creates desk if not exists, updates staff status to active
 * Emits staff:status event via Socket.io
 */
export async function activateStaff(staffId: string): Promise<{
  success: boolean;
  staffId: string;
  status: "active" | "standby" | "break";
  deskId: string | null;
  error?: string;
}> {
  try {
    // Check current staff status
    const staff = await db.staff.findUnique({
      where: { id: staffId },
      include: { role: true, division: true },
    });

    if (!staff) {
      return { success: false, staffId, status: "standby", deskId: null, error: "Staff not found" };
    }

    // If already active with a desk, return existing (idempotent)
    if (staff.status === "active" && staff.deskId) {
      const existingDesk = await db.desk.findUnique({ where: { id: staff.deskId } });
      if (existingDesk) {
        return {
          success: true,
          staffId,
          status: "active",
          deskId: staff.deskId,
        };
      }
    }

    // Find or create a desk for this staff
    let desk = null;

    // First check if staff already has a desk assigned (desk.staffId = staffId)
    const existingDeskByStaff = await db.desk.findFirst({
      where: { staffId },
    });

    if (existingDeskByStaff) {
      desk = existingDeskByStaff;
    } else {
      // Find an available desk in flexible area (room type = division with flexible capacity)
      // For MVP, use first available desk in flexible cluster room
      const flexRoom = await db.room.findFirst({
        where: { type: "division", divisionId: null }, // flexible room
        include: { desks: true },
      });

      if (flexRoom) {
        const availableDesk = flexRoom.desks.find((d) => d.staffId === null);
        if (availableDesk) {
          desk = await db.desk.update({
            where: { id: availableDesk.id },
            data: { staffId },
          });
        }
      }

      // If no flexible desk available, create new desk in flexible room
      if (!desk && flexRoom) {
        desk = await db.desk.create({
          data: {
            roomId: flexRoom.id,
            staffId,
            clusterId: "flex-cluster",
          },
        });
      }
    }

    if (!desk) {
      return { success: false, staffId, status: "standby", deskId: null, error: "No available desk" };
    }

    // Update staff status and deskId atomically
    const updatedStaff = await db.staff.update({
      where: { id: staffId },
      data: {
        status: "active",
        deskId: desk.id,
        updatedAt: new Date(),
      },
    });

    // Emit presence event - use staff (which has role/division) for relations
    emitPresence("staff:status", {
      staffId: updatedStaff.id,
      status: updatedStaff.status,
      deskId: updatedStaff.deskId,
      name: updatedStaff.name,
      role: staff.role?.title,
      division: staff.division?.name,
    });

    return {
      success: true,
      staffId: updatedStaff.id,
      status: updatedStaff.status,
      deskId: updatedStaff.deskId,
    };
  } catch (error) {
    console.error("[Realtime] Error activating staff:", error);
    // Handle unique constraint violation (race condition) - check for various error messages
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes("Unique constraint") || errorMessage.includes("unique constraint")) {
      // Retry once - fetch current state
      const staff = await db.staff.findUnique({ 
        where: { id: staffId },
        include: { role: true, division: true },
      });
      if (staff?.status === "active" && staff.deskId) {
        return { success: true, staffId, status: "active", deskId: staff.deskId };
      }
    }
    return {
      success: false,
      staffId,
      status: "standby",
      deskId: null,
      error: errorMessage,
    };
  }
}

/**
 * Deactivate a staff member (move to standby)
 */
export async function deactivateStaff(staffId: string): Promise<{
  success: boolean;
  staffId: string;
  status: "active" | "standby" | "break";
  deskId: string | null;
  error?: string;
}> {
  try {
    const staff = await db.staff.findUnique({ 
      where: { id: staffId },
      include: { role: true, division: true },
    });
    if (!staff) {
      return { success: false, staffId, status: "standby", deskId: null, error: "Staff not found" };
    }

    // Clear desk assignment
    if (staff.deskId) {
      await db.desk.update({
        where: { id: staff.deskId },
        data: { staffId: null },
      });
    }

    const updatedStaff = await db.staff.update({
      where: { id: staffId },
      data: {
        status: "standby",
        deskId: null,
        updatedAt: new Date(),
      },
    });

    emitPresence("staff:status", {
      staffId: updatedStaff.id,
      status: updatedStaff.status,
      deskId: updatedStaff.deskId,
      name: updatedStaff.name,
      role: staff.role?.title,
      division: staff.division?.name,
    });

    return {
      success: true,
      staffId: updatedStaff.id,
      status: updatedStaff.status,
      deskId: updatedStaff.deskId,
    };
  } catch (error) {
    console.error("[Realtime] Error deactivating staff:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      staffId,
      status: "standby",
      deskId: null,
      error: errorMessage,
    };
  }
}

/**
 * Set staff break status
 */
export async function setStaffBreak(staffId: string, onBreak: boolean): Promise<{
  success: boolean;
  staffId: string;
  status: "active" | "standby" | "break";
  deskId: string | null;
  error?: string;
}> {
  try {
    const staff = await db.staff.findUnique({ 
      where: { id: staffId },
      include: { role: true, division: true },
    });
    if (!staff) {
      return { success: false, staffId, status: "standby", deskId: null, error: "Staff not found" };
    }

    const newStatus = onBreak ? "break" : "active";
    const updatedStaff = await db.staff.update({
      where: { id: staffId },
      data: {
        status: newStatus,
        updatedAt: new Date(),
      },
    });

    emitPresence("staff:status", {
      staffId: updatedStaff.id,
      status: updatedStaff.status,
      deskId: updatedStaff.deskId,
      name: updatedStaff.name,
      role: staff.role?.title,
      division: staff.division?.name,
    });

    return {
      success: true,
      staffId: updatedStaff.id,
      status: updatedStaff.status,
      deskId: updatedStaff.deskId,
    };
  } catch (error) {
    console.error("[Realtime] Error setting staff break:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      staffId,
      status: "standby",
      deskId: null,
      error: errorMessage,
    };
  }
}

/**
 * Emit project activity event
 */
export function emitProjectActivity(projectId: string, timestamp: number = Date.now()): void {
  emitPresence("project:activity", { projectId, timestamp });
}