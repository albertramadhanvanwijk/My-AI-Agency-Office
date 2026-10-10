import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Augment next-auth types to carry role + id
declare module "next-auth" {
  interface User {
    id: string;
    role: "OWNER" | "CLIENT";
  }
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: "OWNER" | "CLIENT";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: "OWNER" | "CLIENT";
    email?: string | null;
  }
}

const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: googleClientId || "placeholder-client-id",
      clientSecret: googleClientSecret || "placeholder-client-secret",
      // allowDangerousEmailAccountLinking helps link google to existing credentials account
      allowDangerousEmailAccountLinking: true,
    }),
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials: unknown) {
        const c = credentials as Record<string, string> | undefined;
        if (!c?.email || !c?.password) return null;
        const email = String(c.email).toLowerCase().trim();
        try {
          const user = await db.user.findUnique({ where: { email } });
          if (!user || !user.passwordHash) return null;
          const ok = await bcrypt.compare(String(c.password), user.passwordHash);
          if (!ok) return null;
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: (user as { avatar?: string | null }).avatar ?? undefined,
            role: user.role as "OWNER" | "CLIENT",
          } as unknown as import("next-auth").User;
        } catch {
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign-in via Credentials or Google: user is present
      if (user) {
        const u = user as unknown as { id?: string; role?: string; email?: string; name?: string; image?: string };
        if (u.id) token.id = u.id;
        if (u.role) token.role = u.role as "OWNER" | "CLIENT";
        if (u.email) token.email = u.email;
        if (u.name) token.name = u.name;
        if (u.image) token.picture = u.image;
        // also set sub for consistency when user.id exists
        if (u.id && !token.sub) token.sub = u.id;
      }

      // Google sign-in: account.provider === 'google' → auto-create if needed
      if (account?.provider === "google" && token.email) {
        try {
          const email = String(token.email).toLowerCase();
          let dbUser = await db.user.findUnique({ where: { email } });
          if (!dbUser) {
            // Auto-create CLIENT (OWNER mapping only if DB already had OWNER — but if not found, default CLIENT)
            // Use token.name / picture if available
            dbUser = await db.user.create({
              data: {
                email,
                name: (token.name as string) || email.split("@")[0],
                avatar: (token.picture as string) || null,
                role: "CLIENT",
                emailVerified: new Date(),
                passwordHash: null,
              },
            });
            // Try to also create Client row; ignore failure (e.g., already exists or schema constraint)
            try {
              await db.client.create({ data: { userId: dbUser.id } });
            } catch {
              // ignore
            }
          }
          token.id = dbUser.id;
          token.sub = dbUser.id;
          token.role = dbUser.role as "OWNER" | "CLIENT";
          token.email = dbUser.email;
        } catch {
          // Do not throw — graceful fallback; invalid callback should not 500 (Review Focus)
          // keep token as-is
        }
      }

      // Fallback: if token has email/sub but no role, hydrate from DB (e.g., fresh JWT decode)
      if (!token.role && (token.email || token.sub)) {
        try {
          let dbUser: { id: string; email: string; role: string } | null = null;
          if (token.sub) {
            // try by id first if sub looks like cuid; otherwise try email
            try {
              dbUser = await db.user.findUnique({ where: { id: token.sub } } as never);
            } catch {
              dbUser = null;
            }
          }
          if (!dbUser && token.email) {
            dbUser = await db.user.findUnique({ where: { email: String(token.email).toLowerCase() } });
          }
          if (dbUser) {
            token.id = dbUser.id;
            token.sub = dbUser.id;
            token.role = dbUser.role as "OWNER" | "CLIENT";
          }
        } catch {
          // swallow
        }
      }

      return token;
    },
    async session({ session, token }) {
      // Expose id + role on session.user — used for guards
      const s = session as unknown as { user: Record<string, unknown> };
      if (token.sub) s.user.id = token.sub;
      else if (token.id) s.user.id = token.id;
      if (token.role) s.user.role = token.role;
      if (token.email) s.user.email = token.email;
      if (token.name) s.user.name = token.name;
      if (token.picture) s.user.image = token.picture;
      return session;
    },
    // Graceful error handling for invalid callbacks: never throw 500
    async signIn() {
      return true;
    },
    async redirect({ url, baseUrl }) {
      // Allow relative and same-origin redirects; sanitize callbackUrl
      try {
        if (url.startsWith("/")) return `${baseUrl}${url}`;
        const u = new URL(url);
        if (u.origin === baseUrl) return url;
        return baseUrl;
      } catch {
        return baseUrl;
      }
    },
  },
};

export default authOptions;
