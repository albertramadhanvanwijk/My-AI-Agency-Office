// Client-side API fetchers for Portal
// These handle auth automatically via NextAuth session cookies

const API_BASE = "/api/portal";

async function fetchWithAuth<T>(url: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    credentials: "include", // Include cookies for NextAuth session
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  return res.json();
}

// Projects API
export const projectsApi = {
  list: () => fetchWithAuth<{ projects: any[] }>("/projects"),
  get: (id: string) => fetchWithAuth<any>(`/projects/${id}`),
};

// Conversations API
export const conversationsApi = {
  getByProject: (projectId: string) => 
    fetchWithAuth<{ conversation: any; currentUserId: string }>(`/conversations?projectId=${projectId}`),
  create: (data: { projectId: string; participantIds?: string[]; title?: string }) =>
    fetchWithAuth<{ conversation: any }>("/conversations", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// Messages API
export const messagesApi = {
  list: (conversationId: string, options?: { limit?: number; cursor?: string }) => {
    const params = new URLSearchParams();
    params.set("conversationId", conversationId);
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.cursor) params.set("cursor", options.cursor);
    return fetchWithAuth<{ messages: any[]; nextCursor?: string }>(`/messages?${params}`);
  },
  send: (conversationId: string, content: string) =>
    fetchWithAuth<{ message: any }>("/messages", {
      method: "POST",
      body: JSON.stringify({ conversationId, content }),
    }),
};

// Invoices API
export const invoicesApi = {
  download: (invoiceId: string) =>
    fetchWithAuth<{ url: string }>(`/invoices/${invoiceId}/download`, {
      method: "POST",
    }),
};

// Typed hooks for React Query / SWR (optional)
export const portalApi = {
  projects: projectsApi,
  conversations: conversationsApi,
  messages: messagesApi,
  invoices: invoicesApi,
};

export default portalApi;