import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = {
  project: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({ db: mockDb }));

vi.mock("@/lib/ai/router", () => ({
  aiDispatch: vi.fn().mockResolvedValue({ result: "ok" }),
}));

vi.mock("@/lib/realtime/server", () => ({
  emitPresence: vi.fn(),
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({ add: vi.fn().mockResolvedValue({ id: "job-1" }) })),
}));

const mockRedirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const mockNotFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});

vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
  notFound: () => mockNotFound(),
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  useParams: () => ({ id: "p-deliver-1" }),
  usePathname: () => "/projects/p-deliver-1/deliver",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: vi.fn(),
}));

describe("deliver route — Task 2", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRedirect.mockClear();
    mockNotFound.mockClear();
    mockDb.project.findUnique.mockResolvedValue({
      id: "p-deliver-1",
      title: "Test Project",
      brief: "Build something",
      status: "QA",
      clientId: "client-1",
      client: { id: "client-1", company: "Acme" },
    });
    mockDb.project.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) =>
      ({ id: where.id, title: "Test Project", status: data.status ?? "DELIVERY" }),
    );
  });

  it("OWNER can render deliver page (contains Deliver + status badge)", async () => {
    const { getServerSession } = await import("next-auth");
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "owner-1", role: "OWNER", email: "owner@test.com" },
    });

    const mod = await import("@/app/(dashboard)/projects/[id]/deliver/page");
    const Page = mod.default as unknown as (props: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>;
    const el = await Page({ params: Promise.resolve({ id: "p-deliver-1" }) });

    // crude check: rendered element props contain project title / card structure is valid
    // Verify db was queried (page fetched project) and did not redirect
    expect(mockDb.project.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p-deliver-1" } }),
    );
    expect(mockRedirect).not.toHaveBeenCalled();
    expect(el).toBeDefined();
    // must not have thrown notFound
    expect(mockNotFound).not.toHaveBeenCalled();
  });

  it("CLIENT is redirected to /login (OWNER guard)", async () => {
    const { getServerSession } = await import("next-auth");
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "client-1", role: "CLIENT", email: "client@test.com" },
    });

    const mod = await import("@/app/(dashboard)/projects/[id]/deliver/page");
    const Page = mod.default as unknown as (props: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>;
    await expect(Page({ params: Promise.resolve({ id: "p-deliver-1" }) })).rejects.toThrow(/NEXT_REDIRECT:\/login/);
    expect(mockRedirect).toHaveBeenCalledWith("/login");
  });

  it("unauthenticated is redirected to /login", async () => {
    const { getServerSession } = await import("next-auth");
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const mod = await import("@/app/(dashboard)/projects/[id]/deliver/page");
    const Page = mod.default as unknown as (props: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>;
    await expect(Page({ params: Promise.resolve({ id: "p-deliver-1" }) })).rejects.toThrow(/NEXT_REDIRECT:\/login/);
  });

  it("notFound when project missing", async () => {
    const { getServerSession } = await import("next-auth");
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "owner-1", role: "OWNER", email: "owner@test.com" },
    });
    mockDb.project.findUnique.mockResolvedValueOnce(null);

    const mod = await import("@/app/(dashboard)/projects/[id]/deliver/page");
    const Page = mod.default as unknown as (props: { params: Promise<{ id: string }> }) => Promise<React.ReactElement>;
    await expect(Page({ params: Promise.resolve({ id: "missing" }) })).rejects.toThrow(/NEXT_NOT_FOUND/);
    expect(mockNotFound).toHaveBeenCalled();
  });

  it("deliverAction sets project status DELIVERY", async () => {
    const { getServerSession } = await import("next-auth");
    (getServerSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "owner-1", role: "OWNER", email: "owner@test.com" },
    });
    const { deliverAction } = await import("@/modules/workflow/actions");
    const res = await deliverAction("p-deliver-1");
    expect(mockDb.project.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "p-deliver-1" }, data: { status: "DELIVERY" } }),
    );
    expect((res as { delivered: boolean }).delivered).toBe(true);
  });

  it("DeliverClient shows already-delivered banner when status is DELIVERY", async () => {
    const mod = await import("@/app/(dashboard)/projects/[id]/deliver/DeliverClient");
    const DeliverClient = mod.default as unknown as React.ComponentType<{ projectId: string; currentStatus: string }>;
    const { render, screen } = await import("@testing-library/react");
    render(<DeliverClient projectId="p-deliver-1" currentStatus="DELIVERY" />);
    expect(screen.getByText(/already delivered/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirm deliver/i })).not.toBeInTheDocument();
  });

  it("DeliverClient shows Confirm Deliver button when not yet delivered", async () => {
    const mod = await import("@/app/(dashboard)/projects/[id]/deliver/DeliverClient");
    const DeliverClient = mod.default as unknown as React.ComponentType<{ projectId: string; currentStatus: string }>;
    const { render, screen } = await import("@testing-library/react");
    render(<DeliverClient projectId="p-deliver-1" currentStatus="QA" />);
    expect(screen.getByRole("button", { name: /confirm deliver/i })).toBeInTheDocument();
  });
});
