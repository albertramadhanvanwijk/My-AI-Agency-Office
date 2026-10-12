import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as { id: string; role: "OWNER" | "CLIENT" };
    const isOwner = user.role === "OWNER";
    const { id } = await params;

    const invoice = await db.invoice.findUnique({
      where: { id },
      include: { project: { select: { clientId: true } } },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Check access — resolve Client.id via User.id
    if (!isOwner) {
      const c = await db.client.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!c || invoice.clientId !== c.id) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // For MVP, return the pdfUrl directly (in production, generate signed URL)
    // In a real implementation, you would generate a signed URL for S3/Supabase Storage
    // with expiration (e.g., 1 hour)
    
    if (!invoice.pdfUrl) {
      return NextResponse.json({ error: "Invoice PDF not available" }, { status: 404 });
    }

    // For MVP, just return the URL directly
    // In production: const signedUrl = await storage.createSignedUrl(invoice.pdfUrl, 3600);
    const signedUrl = invoice.pdfUrl;

    return NextResponse.json({ url: signedUrl });
  } catch (e) {
    console.error("Failed to generate download URL:", e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}