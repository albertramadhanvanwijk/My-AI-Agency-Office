import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Connect to the realtime presence server
 * Returns the socket instance
 */
export function connectPresence(): Socket {
  if (socket?.connected) {
    return socket;
  }

  const serverUrl = process.env.NEXT_PUBLIC_REALTIME_URL || "http://localhost:3001";

  socket = io(`${serverUrl}/presence`, {
    transports: ["websocket", "polling"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on("connect", () => {
    console.log("[Presence] Connected to realtime server");
  });

  socket.on("disconnect", (reason) => {
    console.log("[Presence] Disconnected:", reason);
  });

  socket.on("connect_error", (error) => {
    console.error("[Presence] Connection error:", error);
  });

  return socket;
}

/**
 * Get the current socket instance
 */
export function getPresenceSocket(): Socket | null {
  return socket;
}

/**
 * Disconnect from the realtime server
 */
export function disconnectPresence(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Subscribe to staff status changes
 * Callback receives: { staffId, status, deskId, name, role, division }
 */
export function onStaffStatus(
  callback: (data: { staffId: string; status: string; deskId: string | null; name?: string; role?: string; division?: string }) => void
): () => void {
  const s = connectPresence();
  s.on("staff:status", callback);
  return () => s.off("staff:status", callback);
}

/**
 * Subscribe to project activity
 * Callback receives: { projectId, timestamp }
 */
export function onProjectActivity(
  callback: (data: { projectId: string; timestamp: number }) => void
): () => void {
  const s = connectPresence();
  s.on("project:activity", callback);
  return () => s.off("project:activity", callback);
}

/**
 * Request staff activation via API (fallback for non-WS environments)
 */
export async function requestActivateStaff(staffId: string): Promise<{
  success: boolean;
  staffId: string;
  status: string;
  deskId: string | null;
  error?: string;
}> {
  const res = await fetch("/api/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId, status: "active" }),
  });
  return res.json();
}

/**
 * Request staff deactivation via API
 */
export async function requestDeactivateStaff(staffId: string): Promise<{
  success: boolean;
  staffId: string;
  status: string;
  deskId: string | null;
}> {
  const res = await fetch("/api/presence", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ staffId, status: "standby" }),
  });
  return res.json();
}

// ── Chat per-conversation helpers (Task 4) ──

export function joinConversation(id: string): void {
  connectPresence().emit("conversation:join", id);
}

export function leaveConversation(id: string): void {
  connectPresence().emit("conversation:leave", id);
}

export function onMessageNew(cb: (msg: unknown) => void): () => void {
  const s = connectPresence();
  const handler = (d: unknown) => cb(d);
  s.on("message:new", handler);
  return () => s.off("message:new", handler);
}

export function emitTyping(conversationId: string, isTyping: boolean): void {
  connectPresence().emit("user:typing", { conversationId, isTyping, userId: "self" });
}

export function onTyping(cb: (data: { conversationId: string; userId: string; isTyping: boolean }) => void): () => void {
  const s = connectPresence();
  s.on("user:typing", cb as (data: unknown) => void);
  return () => s.off("user:typing", cb as (data: unknown) => void);
}