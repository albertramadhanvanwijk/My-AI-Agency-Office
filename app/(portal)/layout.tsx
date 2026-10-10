import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Link from "next/link";
import { LogOut, Menu, X, Building2, MessageSquare, FileText, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: "OWNER" | "CLIENT";
}

async function getClientInfo(userId: string) {
  const { db } = await import("@/lib/db");
  return db.client.findUnique({ where: { userId } });
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  const user = session.user as SessionUser;
  const isOwner = user.role === "OWNER";

  // For CLIENT, fetch their client info
  let clientInfo = null;
  if (!isOwner) {
    clientInfo = await getClientInfo(user.id);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Logo + Project Picker (for mobile) */}
            <div className="flex items-center gap-4">
              <Link href="/portal" className="flex items-center gap-2">
                <Building2 className="w-8 h-8 text-primary" />
                <span className="text-xl font-bold text-slate-900">Client Portal</span>
              </Link>
            </div>

            {/* Right: User Menu + Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.image || undefined} alt={user.name || "User"} />
                  <AvatarFallback>{user.name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium text-slate-700">{user.name || user.email}</span>
                <span className={cn(
                  "px-2 py-0.5 text-xs font-medium rounded-full",
                  isOwner ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                )}>
                  {user.role}
                </span>
              </div>
              
              <form action="/api/auth/signout" method="POST">
                <Button type="submit" variant="ghost" size="icon" className="text-slate-500 hover:text-slate-700">
                  <LogOut className="w-4 h-4" />
                  <span className="sr-only">Log out</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
    </div>
  );
}