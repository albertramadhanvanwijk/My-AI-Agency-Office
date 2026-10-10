import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateInvoice, getInvoiceById } from "@/modules/finance/service";
import { db } from "@/lib/db";
import { GenerateInvoiceInput } from "@/modules/finance/schema";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { projectId, dueDate, items } = body;

    // Validate required fields
    if (!projectId) {
      return NextResponse.json({ error: "Project ID is required" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    // Validate items
    for (const item of items) {
      if (!item.description || typeof item.qty !== "number" || item.qty <= 0 || typeof item.unitPrice !== "number" || item.unitPrice < 0) {
        return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
      }
    }

    // Create invoice with custom items
    const invoice = await generateInvoice({
      projectId,
      generatedBy: session.user.id,
      dueDate: dueDate ? new Date(dueDate) : undefined,
      customItems: items.map((item: any) => ({
        description: item.description,
        qty: item.qty,
        unitPrice: item.unitPrice,
        total: item.qty * item.unitPrice,
      })),
    } as GenerateInvoiceInput);

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("[POST /api/invoices] Error:", error);
    if (error instanceof Error && error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, projectId, dueDate, items } = body;

    if (!id) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    const invoice = await getInvoiceById(id);
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Only allow editing draft invoices
    if (invoice.status !== "draft") {
      return NextResponse.json({ error: "Only draft invoices can be edited" }, { status: 400 });
    }

    // Validate items
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "At least one item is required" }, { status: 400 });
    }

    for (const item of items) {
      if (!item.description || typeof item.qty !== "number" || item.qty <= 0 || typeof item.unitPrice !== "number" || item.unitPrice < 0) {
        return NextResponse.json({ error: "Invalid item data" }, { status: 400 });
      }
    }

    const amount = items.reduce((sum: number, item: any) => sum + item.qty * item.unitPrice, 0);

    const updated = await db.invoice.update({
      where: { id },
      data: {
        projectId,
        dueDate: dueDate ? new Date(dueDate) : null,
        items: items.map((item: any) => ({
          description: item.description,
          qty: item.qty,
          unitPrice: item.unitPrice,
          total: item.qty * item.unitPrice,
        })),
        amount,
      },
    });

    await db.auditLog.create({
      data: {
        who: session.user.id,
        action: "invoice_updated",
        targetId: id,
        projectId: invoice.projectId,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("[PUT /api/invoices] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}