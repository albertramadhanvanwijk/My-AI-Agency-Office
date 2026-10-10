"use client";

import { useState, useEffect, useCallback } from "react";
import { connectPresence, getPresenceSocket, onStaffStatus, onProjectActivity } from "@/lib/realtime/client";

export type StaffStatus = "active" | "standby" | "break";

export interface StaffPresence {
  staffId: string;
  status: StaffStatus;
  deskId: string | null;
  name?: string;
  role?: string;
  division?: string;
}

export interface UsePresenceReturn {
  /** Current presence state for all staff */
  presence: Map<string, StaffPresence>;
  /** Get presence for a specific staff member */
  getPresence: (staffId: string) => StaffPresence | undefined;
  /** Check if a staff member is active (green dot) */
  isActive: (staffId: string) => boolean;
  /** Check if a staff member is on standby (gray dot) */
  isStandby: (staffId: string) => boolean;
  /** Check if a staff member is on break (yellow dot) */
  isBreak: (staffId: string) => boolean;
  /** Connection status */
  connected: boolean;
}

/**
 * Hook for realtime staff presence in the 3D office
 * Provides green/standby/break dots for avatars
 */
export function usePresence(): UsePresenceReturn {
  const [presence, setPresence] = useState<Map<string, StaffPresence>>(new Map());
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = connectPresence();

    const handleConnect = () => setConnected(true);
    const handleDisconnect = () => setConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Subscribe to staff status changes
    const unsubscribeStaff = onStaffStatus((data) => {
      setPresence((prev) => {
        const next = new Map(prev);
        next.set(data.staffId, {
          staffId: data.staffId,
          status: data.status as StaffStatus,
          deskId: data.deskId,
          name: data.name,
          role: data.role,
          division: data.division,
        });
        return next;
      });
    });

    // Subscribe to project activity (optional, for future use)
    const unsubscribeProject = onProjectActivity((_data) => {
      // Could trigger UI updates for project activity indicators
    });

    // Set initial connection state
    setConnected(socket.connected);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      unsubscribeStaff();
      unsubscribeProject();
    };
  }, []);

  const getPresence = useCallback((staffId: string) => {
    return presence.get(staffId);
  }, [presence]);

  const isActive = useCallback(
    (staffId: string) => {
      const p = presence.get(staffId);
      return p?.status === "active";
    },
    [presence]
  );

  const isStandby = useCallback(
    (staffId: string) => {
      const p = presence.get(staffId);
      return p?.status === "standby";
    },
    [presence]
  );

  const isBreak = useCallback(
    (staffId: string) => {
      const p = presence.get(staffId);
      return p?.status === "break";
    },
    [presence]
  );

  return {
    presence,
    getPresence,
    isActive,
    isStandby,
    isBreak,
    connected,
  };
}

/**
 * Hook for a single staff member's presence
 * More convenient for avatar components
 */
export function useStaffPresence(staffId: string): {
  status: StaffStatus | "unknown";
  deskId: string | null;
  name?: string;
  role?: string;
  division?: string;
  connected: boolean;
} {
  const { getPresence, connected } = usePresence();
  const staffPresence = getPresence(staffId);

  return {
    status: staffPresence?.status || "unknown",
    deskId: staffPresence?.deskId || null,
    name: staffPresence?.name,
    role: staffPresence?.role,
    division: staffPresence?.division,
    connected,
  };
}

/**
 * Get CSS class for status dot color
 * Green = active, Gray = standby, Yellow = break
 */
export function getStatusDotClass(status: StaffStatus | "unknown"): string {
  switch (status) {
    case "active":
      return "bg-green-500";
    case "standby":
      return "bg-gray-400";
    case "break":
      return "bg-yellow-500";
    default:
      return "bg-gray-300";
  }
}

/**
 * Get status label for tooltip
 */
export function getStatusLabel(status: StaffStatus | "unknown"): string {
  switch (status) {
    case "active":
      return "Online";
    case "standby":
      return "Standby";
    case "break":
      return "Break";
    default:
      return "Unknown";
  }
}