import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export type HeaderUser = {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "OWNER" | "CLIENT";
  id?: string;
};

// Server-safe helper to convert session to header user
export async function getHeaderUser(): Promise<HeaderUser | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user) return null;
  const role = session.user.role as "OWNER" | "CLIENT" | undefined;
  if (role !== "OWNER" && role !== "CLIENT") return null;
  return {
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    role,
    id: session.user.id,
  };
}

// Client-safe helper (for use in client components)
export function sessionToHeaderUser(
  session: { user?: { name?: string | null; email?: string | null; image?: string | null; role?: string; id?: string } } | null
): HeaderUser | null {
  if (!session?.user) return null;
  const role = session.user.role as "OWNER" | "CLIENT" | undefined;
  if (role !== "OWNER" && role !== "CLIENT") return null;
  return {
    name: session.user.name ?? null,
    email: session.user.email ?? null,
    image: session.user.image ?? null,
    role,
    id: session.user.id,
  };
}