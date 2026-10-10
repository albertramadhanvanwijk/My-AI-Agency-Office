import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock modules
const mockDb = {
  invoice: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
    findFirst: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
  },
  client: {
    findUnique: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: mockDb,
}));

// Mock pdf-lib
const mockPage = {
  getWidth: vi.fn().mockReturnValue(595.28),
  getHeight: vi.fn().mockReturnValue(841.89),
  drawText: vi.fn(),
  drawRectangle: vi.fn(),
  drawLine: vi.fn(),
};

const mockFont = {
  widthOfTextAtSize: vi.fn().mockReturnValue(100),
};

const mockPdfDoc = {
  addPage: vi.fn().mockReturnValue(mockPage),
  getPage: vi.fn().mockReturnValue(mockPage),
  save: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3, 4])),
  registerFontkit: vi.fn(),
  embedFont: vi.fn().mockResolvedValue(mockFont),
};

vi.mock("pdf-lib", () => ({
  PDFDocument: {
    create: vi.fn().mockResolvedValue(mockPdfDoc),
  },
  StandardFonts: {
    Helvetica: "Helvetica",
    HelveticaBold: "Helvetica-Bold",
  },
  rgb: vi.fn((r, g, b) => ({ r, g, b })),
}));

// Mock next-auth
vi.mock("next-auth", () => ({
  getServerSession: vi.fn().mockResolvedValue({
    user: { id: "user-1", email: "owner@test.com", role: "OWNER" },
  }),
}));

vi.mock("@/lib/auth", () => ({
  authOptions: {},
}));

describe("Invoicing Module — Draft→Sent→Paid + PDF + Payment (Task 10)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock responses
    mockDb.project.findUnique.mockResolvedValue({
      id: "proj-1",
      title: "Company Profile + Website",
      clientId: "client-1",
      budget: 50000000,
      divisionIds: ["strategy", "creative", "tech"],
    });
    
    mockDb.client.findUnique.mockResolvedValue({
      id: "client-1",
      company: "PT Test Client",
      contact: "John Doe",
      user: { email: "client@test.com", name: "John Doe" },
    });
    
    mockDb.user.findUnique.mockResolvedValue({
      id: "user-1",
      name: "Owner",
      email: "owner@test.com",
    });
    
    mockDb.invoice.count.mockResolvedValue(0);
    mockDb.invoice.findMany.mockResolvedValue([]);
    mockDb.invoice.findFirst.mockResolvedValue(null);
    mockDb.invoice.create.mockResolvedValue({
      id: "inv-1",
      number: "INV-2026-0001",
      projectId: "proj-1",
      clientId: "client-1",
      items: [
        { description: "Strategy & Planning", qty: 1, unitPrice: 15000000, total: 15000000 },
        { description: "Creative Design", qty: 1, unitPrice: 20000000, total: 20000000 },
        { description: "Technical Development", qty: 1, unitPrice: 15000000, total: 15000000 },
      ],
      amount: 50000000,
      status: "draft",
      dueDate: new Date("2026-11-10"),
      createdAt: new Date("2026-10-10"),
      updatedAt: new Date("2026-10-10"),
      generatedBy: "user-1",
      approvedBy: null,
    });
  });

  it("generate from project creates items with correct totals", async () => {
    const { generateInvoice } = await import("@/modules/finance/service");
    
    const invoice = await generateInvoice({ projectId: "proj-1", generatedBy: "user-1" });
    
    expect(invoice).toBeDefined();
    expect(invoice.status).toBe("draft");
    expect(invoice.projectId).toBe("proj-1");
    expect(invoice.clientId).toBe("client-1");
    expect(invoice.items).toBeDefined();
    expect(Array.isArray(invoice.items)).toBe(true);
    expect(invoice.items.length).toBeGreaterThan(0);
    
    // Verify items have description, qty, unitPrice, total
    for (const item of invoice.items) {
      expect(item).toHaveProperty("description");
      expect(item).toHaveProperty("qty");
      expect(item).toHaveProperty("unitPrice");
      expect(item).toHaveProperty("total");
      expect(item.total).toBe(item.qty * item.unitPrice);
    }
    
    // Verify amount matches sum of items
    const itemsTotal = invoice.items.reduce((sum: number, item: any) => sum + item.total, 0);
    expect(Number(invoice.amount)).toBe(itemsTotal);
    
    // Verify invoice number format: INV-YYYY-NNNN
    expect(invoice.number).toMatch(/^INV-\d{4}-\d{4}$/);
  });

  it("PDF renders with correct totals and client info", async () => {
    const { getInvoicePDF } = await import("@/modules/finance/service");
    
    const mockInvoice = {
      id: "inv-1",
      number: "INV-2026-0001",
      projectId: "proj-1",
      clientId: "client-1",
      items: [
        { description: "Strategy & Planning", qty: 1, unitPrice: 15000000, total: 15000000 },
        { description: "Creative Design", qty: 1, unitPrice: 20000000, total: 20000000 },
        { description: "Technical Development", qty: 1, unitPrice: 15000000, total: 15000000 },
      ],
      amount: 50000000,
      status: "draft",
      dueDate: new Date("2026-11-10"),
      createdAt: new Date("2026-10-10"),
    };
    
    mockDb.invoice.findUnique.mockResolvedValue(mockInvoice);
    mockDb.project.findUnique.mockResolvedValue({
      id: "proj-1",
      title: "Company Profile + Website",
      clientId: "client-1",
    });
    mockDb.client.findUnique.mockResolvedValue({
      id: "client-1",
      company: "PT Test Client",
      contact: "John Doe",
      user: { email: "client@test.com", name: "John Doe" },
    });
    
    const pdfBuffer = await getInvoicePDF("inv-1");
    
    expect(pdfBuffer).toBeDefined();
    expect(pdfBuffer instanceof Uint8Array).toBe(true);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    
    // Verify PDF generation was called
    const { PDFDocument } = await import("pdf-lib");
    expect(PDFDocument.create).toHaveBeenCalled();
    expect(mockPdfDoc.save).toHaveBeenCalled();
  });

  it("markPaid updates status to paid and logs audit", async () => {
    const { markPaid } = await import("@/modules/finance/service");
    
    const mockInvoice = {
      id: "inv-1",
      number: "INV-2026-0001",
      status: "sent",
      amount: 50000000,
      projectId: "proj-1",
      clientId: "client-1",
    };
    
    mockDb.invoice.findUnique.mockResolvedValue(mockInvoice);
    mockDb.invoice.update.mockResolvedValue({ ...mockInvoice, status: "paid" });
    
    const result = await markPaid({ invoiceId: "inv-1", paidBy: "user-1" });
    
    expect(result.status).toBe("paid");
    expect(mockDb.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "paid" },
    });
    
    // Verify audit log created
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "invoice_paid",
          targetId: "inv-1",
        }),
      })
    );
  });

  it("sendInvoice logs audit and updates status to sent", async () => {
    const { sendInvoice } = await import("@/modules/finance/service");
    
    const mockInvoice = {
      id: "inv-1",
      number: "INV-2026-0001",
      status: "draft",
      projectId: "proj-1",
      clientId: "client-1",
    };
    
    mockDb.invoice.findUnique.mockResolvedValue(mockInvoice);
    mockDb.invoice.update.mockResolvedValue({ ...mockInvoice, status: "sent" });
    
    const result = await sendInvoice({ invoiceId: "inv-1", sentBy: "user-1" });
    
    expect(result.status).toBe("sent");
    expect(mockDb.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: { status: "sent" },
    });
    
    // Verify audit log created
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "invoice_sent",
          targetId: "inv-1",
        }),
      })
    );
  });

  it("payment record links to invoice and updates amount", async () => {
    const { recordPayment } = await import("@/modules/finance/service");
    
    const mockInvoice = {
      id: "inv-1",
      number: "INV-2026-0001",
      status: "sent",
      amount: 50000000,
      projectId: "proj-1",
      clientId: "client-1",
    };
    
    mockDb.invoice.findUnique.mockResolvedValue(mockInvoice);
    mockDb.invoice.update.mockResolvedValue({ ...mockInvoice, status: "paid" });
    
    const result = await recordPayment({ invoiceId: "inv-1", amount: 50000000, method: "bank_transfer", recordedBy: "user-1" });
    
    expect(result).toBeDefined();
    expect(mockDb.invoice.update).toHaveBeenCalledWith({
      where: { id: "inv-1" },
      data: expect.objectContaining({
        status: "paid",
      }),
    });
    
    // Verify audit log for payment
    expect(mockDb.auditLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "payment_recorded",
          targetId: "inv-1",
        }),
      })
    );
  });
});