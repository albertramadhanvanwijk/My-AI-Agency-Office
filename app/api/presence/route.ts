import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { activateStaff, deactivateStaff, setStaffBreak } from "@/lib/realtime/server";

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Only OWNER or MD can toggle staff presence
    if (session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { staffId, status } = body;

    if (!staffId || !status) {
      return NextResponse.json(
        { error: "staffId and status are required" },
        { status: 400 }
      );
    }

    if (!["active", "standby", "break"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be 'active', 'standby', or 'break'" },
        { status: 400 }
      );
    }

    let result;

    switch (status) {
      case "active":
        result = await activateStaff(staffId);
        break;
      case "standby":
        result = await deactivateStaff(staffId);
        break;
      case "break":
        result = await setStaffBreak(staffId, true);
        break;
      default:
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to update staff status" },
        { status: 500 }
      );
    }

    // Log audit trail
    await db.auditLog.create({
      data: {
        who: session.user.id,
        action: `staff.${status}`,
        targetId: staffId,
        modelUsed: null,
        tokens: 0,
      },
    });

    return NextResponse.json({
      success: true,
      staffId: result.staffId,
      status: result.status,
      deskId: result.deskId,
    });
  } catch (error) {
    console.error("[API Presence] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");

    if (staffId) {
      const staff = await db.staff.findUnique({
        where: { id: staffId },
        select: { id: true, status: true, deskId: true, name: true },
      });

      if (!staff) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }

      return NextResponse.json(staff);
    }

    // Return all active staff for presence dashboard
    const activeStaff = await db.staff.findMany({
      where: { status: "active" },
      select: { id: true, status: true, deskId: true, name: true, roleId: true },
    });

    return NextResponse.json(activeStaff);
  } catch (error) {
    console.error("[API Presence] GET Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}