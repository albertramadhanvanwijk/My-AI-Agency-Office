import { describe, it, expect, vi, beforeEach } from "vitest";

// Env for lib/env eager validation
process.env.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET || "test-secret-32-chars-long-for-testing-12345";
process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL || "http://localhost:3000";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-google-client-id";
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "test-google-client-secret";
process.env.NINE_ROUTER_API_KEY = process.env.NINE_ROUTER_API_KEY || "test-9router-key";
process.env.SKIP_LISTEN = "true";

const { mockDb, mockEmitPresence, mockEmitToConversation } = vi.hoisted(() => ({
  mockDb: {
    conversation: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
    },
    project: {
      findUnique: vi.fn(),
    },
  },
  mockEmitPresence: vi.fn(),
  mockEmitToConversation: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("@/lib/realtime/server", () => ({
  emitPresence: mockEmitPresence,
  emitToConversation: mockEmitToConversation,
  getIO: vi.fn(() => null),
  startRealtimeServer: vi.fn(),
}));

vi.mock("socket.io", () => ({
  Server: vi.fn().mockImplementation(() => ({
    of: vi.fn(() => ({ to: vi.fn(() => ({ emit: vi.fn() })), emit: vi.fn(), on: vi.fn() })),
    on: vi.fn(),
  })),
}));

const mockConversation = {
  id: "conv-1",
  projectId: "proj-1",
  type: "project" as const,
  participantIds: ["user-1", "user-2"],
  title: "Project Chat",
  status: "open" as const,
  createdAt: new Date("2026-10-10T10:00:00Z"),
  updatedAt: new Date("2026-10-10T10:00:00Z"),
};

const mockDirect = {
  id: "conv-2",
  projectId: null,
  type: "direct" as const,
  participantIds: ["user-1", "user-3"],
  title: null,
  status: "open" as const,
  createdAt: new Date("2026-10-10T10:00:00Z"),
  updatedAt: new Date("2026-10-10T10:00:00Z"),
};

describe("Chat Module — conversations + messages (Task 11)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEmitPresence.mockClear();
    mockEmitToConversation.mockClear();
  });

  it("project chat links to projectId, direct has null", async () => {
    const { getOrCreateConversation } = await import("@/modules/chat/service");

    mockDb.conversation.findFirst.mockResolvedValueOnce(null);
    mockDb.conversation.create.mockResolvedValueOnce(mockConversation as never);

    const projConv = await getOrCreateConversation({
      projectId: "proj-1",
      participantIds: ["user-1", "user-2"],
    });
    expect(projConv.projectId).toBe("proj-1");
    expect(projConv.type).toBe("project");
    expect(mockDb.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ projectId: "proj-1", type: "project" }),
      })
    );

    mockDb.conversation.findMany.mockResolvedValueOnce([] as never);
    mockDb.conversation.findFirst.mockResolvedValueOnce(null);
    mockDb.conversation.create.mockResolvedValueOnce(mockDirect as never);

    const directConv = await getOrCreateConversation({
      participantIds: ["user-1", "user-3"],
      type: "direct",
    });
    expect(directConv.projectId).toBeNull();
    expect(directConv.type).toBe("direct");
  });

  it("user cannot read conversation they are not participant (403 via service filter)", async () => {
    const { listMessages } = await import("@/modules/chat/service");

    mockDb.conversation.findUnique.mockResolvedValueOnce({
      ...mockConversation,
      participantIds: ["user-1", "user-2"],
    } as never);

    await expect(listMessages("conv-1", "user-99")).rejects.toThrow(/403|Forbidden|not participant/i);
    expect(mockDb.message.findMany).not.toHaveBeenCalled();
  });

  it("new message broadcasts via WS scoped to conversation room (emitToConversation)", async () => {
    const { sendMessage } = await import("@/modules/chat/service");

    mockDb.conversation.findUnique.mockResolvedValueOnce({
      ...mockConversation,
      participantIds: ["user-1", "user-2"],
    } as never);

    const createdMsg = {
      id: "msg-1",
      conversationId: "conv-1",
      senderType: "human" as const,
      senderId: "user-1",
      content: "hello",
      createdAt: new Date("2026-10-10T12:00:00Z"),
    };
    mockDb.message.create.mockResolvedValueOnce(createdMsg as never);
    mockDb.conversation.update.mockResolvedValueOnce({ id: "conv-1" } as never);

    const msg = await sendMessage("conv-1", {
      content: "hello",
      senderType: "human",
      senderId: "user-1",
    });

    expect(msg.content).toBe("hello");
    expect(mockDb.message.create).toHaveBeenCalled();
    expect(mockEmitToConversation).toHaveBeenCalledWith("conv-1", "message:new", expect.objectContaining({ content: "hello" }));
    expect(mockEmitPresence).not.toHaveBeenCalled();
  });

  // Task 4 — per-conversation room scoping
  it("message:new is emitted only to conversation room, not office broadcast", async () => {
    const { sendMessage } = await import("@/modules/chat/service");

    mockDb.conversation.findUnique.mockResolvedValueOnce({
      ...mockConversation,
      participantIds: ["user-1", "user-2"],
    } as never);
    mockDb.message.create.mockResolvedValueOnce({
      id: "msg-2",
      conversationId: "conv-1",
      senderType: "human",
      senderId: "user-1",
      content: "hi",
      createdAt: new Date("2026-10-10T12:00:00Z"),
    } as never);
    mockDb.conversation.update.mockResolvedValueOnce({ id: "conv-1" } as never);

    await sendMessage("conv-1", {
      content: "hi",
      senderType: "human",
      senderId: "user-1",
    });

    expect(mockEmitToConversation).toHaveBeenCalledWith("conv-1", "message:new", expect.objectContaining({ content: "hi" }));
    expect(mockEmitToConversation).not.toHaveBeenCalledWith("conv-2", expect.anything(), expect.anything());
  });

  it("realtime client exposes per-conversation and typing helpers", async () => {
    const client = await import("@/lib/realtime/client");
    expect(typeof client.joinConversation).toBe("function");
    expect(typeof client.leaveConversation).toBe("function");
    expect(typeof client.onMessageNew).toBe("function");
    expect(typeof client.emitTyping).toBe("function");
    expect(typeof client.onTyping).toBe("function");
  });
});
