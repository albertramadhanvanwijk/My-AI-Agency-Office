import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SessionProvider } from "next-auth/react";

// Mock next-auth
vi.mock("next-auth/react", async () => {
  const actual = await vi.importActual("next-auth/react");
  return {
    ...actual,
    useSession: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
    SessionProvider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock next/navigation
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "test-project-id" }),
  usePathname: () => "/portal/projects/test-project-id",
  useSearchParams: () => new URLSearchParams(),
}));

// Mock socket.io-client
vi.mock("socket.io-client", () => ({
  io: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
    disconnect: vi.fn(),
    connect: vi.fn(),
  })),
}));

// Mock Prisma/db
const createMockFn = () => vi.fn() as ReturnType<typeof vi.fn> & { mockResolvedValue: <T>(value: T) => void };

vi.mock("@/lib/db", () => ({
  db: {
    project: {
      findMany: createMockFn(),
      findUnique: createMockFn(),
      count: createMockFn(),
    },
    conversation: {
      findFirst: createMockFn(),
      findUnique: createMockFn(),
      create: createMockFn(),
    },
    message: {
      findMany: createMockFn(),
      create: createMockFn(),
      count: createMockFn(),
    },
    invoice: {
      findMany: createMockFn(),
      findUnique: createMockFn(),
      count: createMockFn(),
    },
    client: {
      findUnique: createMockFn(),
    },
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

// Mock date-fns format
vi.mock("date-fns", () => ({
  format: vi.fn((date, formatStr) => {
    if (formatStr === "MMM d, yyyy") return "Jan 15, 2026";
    if (formatStr === "MMM d, yyyy HH:mm") return "Jan 15, 2026 10:30";
    if (formatStr === "HH:mm") return "10:30";
    return "formatted-date";
  }),
}));

// Mock the realtime client
vi.mock("@/lib/realtime/client", () => ({
  connectPresence: vi.fn(() => ({
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    connected: true,
    disconnect: vi.fn(),
    connect: vi.fn(),
  })),
  onStaffStatus: vi.fn(),
}));

describe("Portal — Client Portal & Chat (Task 9)", () => {
  const mockClientSession = {
    user: {
      id: "client-user-1",
      email: "client@example.com",
      name: "Test Client",
      role: "CLIENT",
    },
    expires: "2026-12-31",
  };

  const mockOwnerSession = {
    user: {
      id: "owner-user-1",
      email: "owner@example.com",
      name: "Owner",
      role: "OWNER",
    },
    expires: "2026-12-31",
  };

  const mockProjects = [
    {
      id: "project-1",
      title: "Company Profile Website",
      brief: "Build a company profile website",
      status: "DELIVERY",
      clientId: "client-user-1",
      client: { company: "Test Corp", name: "Test Client" },
      createdAt: new Date("2026-01-15").toISOString(),
      updatedAt: new Date("2026-02-01").toISOString(),
      _count: { tasks: 5, messages: 10 },
      invoices: [{ id: "inv-1", number: "INV-001", status: "sent", amount: 5000 }],
    },
    {
      id: "project-2",
      title: "Mobile App Design",
      brief: "Design mobile app UI/UX",
      status: "EXECUTION",
      clientId: "client-user-1",
      client: { company: "Test Corp", name: "Test Client" },
      createdAt: new Date("2026-02-01").toISOString(),
      updatedAt: new Date("2026-02-10").toISOString(),
      _count: { tasks: 8, messages: 15 },
      invoices: [],
    },
  ];

  const mockOtherClientProject = {
    id: "project-3",
    title: "Other Client Project",
    brief: "Should not be visible",
    status: "PLANNING",
    clientId: "other-client-id",
    client: { company: "Other Corp", name: "Other Client" },
    createdAt: new Date("2026-01-20").toISOString(),
    updatedAt: new Date("2026-01-25").toISOString(),
    _count: { tasks: 3, messages: 5 },
    invoices: [],
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    (global.fetch as ReturnType<typeof vi.fn>).mockReset();
    
    // Default mock for db.project.findMany - returns only client's projects
    const { db } = await import("@/lib/db");
    (db.project.findMany as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects);
    (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockProjects[0]);
    (db.project.count as ReturnType<typeof vi.fn>).mockResolvedValue(2);
    (db.client.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "client-user-1", userId: "client-user-1", company: "Test Corp" });
  });

  afterEach(() => {
    vi.resetModules();
  });

  describe("Project Detail Page (Client Component)", () => {
    it("shows project timeline, deliverables, invoices, and chat tabs", async () => {
      const { db } = await import("@/lib/db");
      (db.project.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        ...mockProjects[0],
        tasks: [
          { id: "task-1", title: "Design homepage", status: "done", stage: "CREATIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          { id: "task-2", title: "Develop frontend", status: "progress", stage: "TECH", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
        ],
        invoices: [
          { id: "inv-1", number: "INV-001", status: "sent", amount: 5000, dueDate: new Date().toISOString(), pdfUrl: "/api/invoices/inv-1/pdf" },
        ],
        conversations: [{ id: "conv-1", type: "project", title: "Project Chat", messages: [] }],
        resultAssetUrl: null,
      });

      const { useSession } = await import("next-auth/react");
      (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockClientSession,
        status: "authenticated",
      });

      // Mock fetch for the project detail page
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...mockProjects[0],
          tasks: [
            { id: "task-1", title: "Design homepage", status: "done", stage: "CREATIVE", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
            { id: "task-2", title: "Develop frontend", status: "progress", stage: "TECH", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
          ],
          invoices: [
            { id: "inv-1", number: "INV-001", status: "sent", amount: 5000, dueDate: new Date().toISOString(), pdfUrl: "/api/invoices/inv-1/pdf" },
          ],
          conversations: [{ id: "conv-1", type: "project", title: "Project Chat", messages: [] }],
          resultAssetUrl: null,
        }),
      });

      const { default: ProjectDetailPage } = await import("@/app/portal/projects/[id]/page");
      
      render(
        <SessionProvider>
          <ProjectDetailPage />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Company Profile Website")).toBeInTheDocument();
      });

      // Check tabs exist (use role to be more specific)
      expect(screen.getByRole("tab", { name: "Overview" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Deliverables" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Invoices" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Chat" })).toBeInTheDocument();

      // Check timeline/overview content - task counts are shown
      expect(screen.getByText("2")).toBeInTheDocument(); // total tasks
      expect(screen.getByText("1 completed")).toBeInTheDocument();
      
      // Switch to Invoices tab and check invoice listed
      const invoicesTab = screen.getByRole("tab", { name: "Invoices" });
      await userEvent.click(invoicesTab);
      
      await waitFor(() => {
        expect(screen.getByText(/INV-001/i)).toBeInTheDocument();
      });
    });

    it("shows access denied when project not found", async () => {
      const { useSession } = await import("next-auth/react");
      (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockClientSession,
        status: "authenticated",
      });

      // Mock fetch to return 404
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const { default: ProjectDetailPage } = await import("@/app/portal/projects/[id]/page");
      
      render(
        <SessionProvider>
          <ProjectDetailPage />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText(/access denied|unauthorized|403/i)).toBeInTheDocument();
      });
    });
  });

  describe("Chat Drawer - Real-time via Socket.io", () => {
    it("renders chat drawer when open", async () => {
      const { useSession } = await import("next-auth/react");
      (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockClientSession,
        status: "authenticated",
      });

      // Mock fetch for conversation
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          conversation: {
            id: "conv-1",
            projectId: "project-1",
            type: "project",
            participantIds: ["client-user-1", "owner-user-1"],
            title: "Project Chat",
            messages: [
              { id: "msg-1", content: "Hello", senderType: "human", senderId: "client-user-1", createdAt: new Date().toISOString() },
              { id: "msg-2", content: "Hi there!", senderType: "human", senderId: "owner-user-1", createdAt: new Date().toISOString() },
            ],
          },
          currentUserId: "client-user-1",
        }),
      });

      const { ChatDrawer } = await import("@/components/portal/ChatDrawer");
      
      const mockOnClose = vi.fn();
      
      render(
        <SessionProvider>
          <ChatDrawer 
            projectId="project-1" 
            isOpen={true} 
            onClose={mockOnClose} 
          />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Project Chat")).toBeInTheDocument();
      });

      // Check messages render (after loading)
      await waitFor(() => {
        expect(screen.getByText("Hello")).toBeInTheDocument();
        expect(screen.getByText("Hi there!")).toBeInTheDocument();
      });
    });

    it("sends message via API when form submitted", async () => {
      const { useSession } = await import("next-auth/react");
      (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockClientSession,
        status: "authenticated",
      });

      // Mock fetch for conversation
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            conversation: {
              id: "conv-1",
              projectId: "project-1",
              type: "project",
              participantIds: ["client-user-1", "owner-user-1"],
              title: "Project Chat",
              messages: [],
            },
            currentUserId: "client-user-1",
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ 
            message: { id: "msg-3", content: "New message", senderType: "human", senderId: "client-user-1", createdAt: new Date().toISOString() }
          }),
        });

      const { ChatDrawer } = await import("@/components/portal/ChatDrawer");
      
      render(
        <SessionProvider>
          <ChatDrawer 
            projectId="project-1" 
            isOpen={true} 
            onClose={vi.fn()} 
          />
        </SessionProvider>
      );

      await waitFor(() => {
        expect(screen.getByText("Project Chat")).toBeInTheDocument();
      });

      // Find input and send button
      const input = screen.getByPlaceholderText(/type a message/i);
      const sendButton = screen.getByRole("button", { name: /send message/i });

      // Type and send message
      fireEvent.change(input, { target: { value: "New message" } });
      fireEvent.click(sendButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/portal/messages"),
          expect.objectContaining({
            method: "POST",
            body: expect.stringContaining("New message"),
          })
        );
      });
    });
  });

  describe("Invoice Download via Signed URL", () => {
    it("downloads invoice via signed URL", async () => {
      const { useSession } = await import("next-auth/react");
      (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockClientSession,
        status: "authenticated",
      });

      // Mock fetch for signed URL generation
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ 
          url: "https://storage.example.com/invoices/INV-001.pdf?signed=true&expires=3600" 
        }),
      });

      const { InvoiceDownload } = await import("@/components/portal/InvoiceDownload");
      
      // Mock window.open
      const originalOpen = window.open;
      window.open = vi.fn();
      
      render(
        <SessionProvider>
          <InvoiceDownload invoiceId="inv-1" />
        </SessionProvider>
      );

      const downloadButton = screen.getByRole("button", { name: /download/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/portal/invoices/inv-1/download"),
          expect.objectContaining({ method: "POST" })
        );
      });
      
      window.open = originalOpen;
    });

    it("shows error when download fails (403)", async () => {
      const { useSession } = await import("next-auth/react");
      (useSession as ReturnType<typeof vi.fn>).mockReturnValue({
        data: mockClientSession,
        status: "authenticated",
      });

      // Mock fetch to return 403
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({ error: "Access denied" }),
      });

      const { InvoiceDownload } = await import("@/components/portal/InvoiceDownload");
      
      // Mock window.open
      const originalOpen = window.open;
      window.open = vi.fn();
      
      render(
        <SessionProvider>
          <InvoiceDownload invoiceId="inv-2" />
        </SessionProvider>
      );

      const downloadButton = screen.getByRole("button", { name: /download/i });
      fireEvent.click(downloadButton);

      await waitFor(() => {
        expect(screen.getByText(/access denied|unauthorized|403/i)).toBeInTheDocument();
      });
      
      window.open = originalOpen;
    });
  });
});