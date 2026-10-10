import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getInvoicePDF, getInvoiceById } from "@/modules/finance/service";
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

    const pdfBytes = await getInvoicePDF(id);
    
    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
        "Content-Length": pdfBytes.length.toString(),
      },
    });
  } catch (error) {
    console.error("[GET /api/invoices/[id]/download] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // For client portal - returns signed URL or direct download
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

    // For MVP, return the download URL directly
    // In production, this would generate a signed URL with expiry
    const downloadUrl = `/api/invoices/${id}/download`;
    
    return NextResponse.json({ url: downloadUrl });
  } catch (error) {
    console.error("[POST /api/invoices/[id]/download] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}