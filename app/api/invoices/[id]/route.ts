import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInvoiceById, sendInvoice, markPaid } from "@/modules/finance/service";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const invoice = await getInvoiceById(id);
    
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check access
    if (session.user.role === "CLIENT") {
      const client = await db.client.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!client || invoice.clientId !== client.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("[GET /api/invoices/[id]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    const invoice = await getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    let updated;
    switch (action) {
      case "send":
        if (invoice.status !== "draft") {
          return NextResponse.json({ error: "Only draft invoices can be sent" }, { status: 400 });
        }
        updated = await sendInvoice({ invoiceId: id, sentBy: session.user.id });
        break;
      case "mark-paid":
        if (invoice.status === "paid") {
          return NextResponse.json({ error: "Invoice already paid" }, { status: 400 });
        }
        updated = await markPaid({ invoiceId: id, paidBy: session.user.id });
        break;
      case "cancel":
        if (invoice.status === "paid") {
          return NextResponse.json({ error: "Cannot cancel paid invoice" }, { status: 400 });
        }
        updated = await db.invoice.update({
          where: { id },
          data: { status: "cancelled" },
        });
        await db.auditLog.create({
          data: {
            who: session.user.id,
            action: "invoice_cancelled",
            targetId: id,
            projectId: invoice.projectId,
          },
        });
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PATCH /api/invoices/[id]] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}