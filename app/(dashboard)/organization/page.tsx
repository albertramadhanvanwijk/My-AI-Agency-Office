import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Building2, FilePlus, HeartHandshake, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

const cards = [
  {
    href: "/organization/roles",
    title: "Roles",
    desc: "Manage 30-role hierarchy — add Tier-1 roles without deploy",
    icon: Users,
  },
  {
    href: "/organization/divisions",
    title: "Divisions",
    desc: "6 divisions + provisional — create & promote from proposals",
    icon: Building2,
  },
  {
    href: "/organization/proposals",
    title: "Proposals",
    desc: "Inbox for division / role / room proposals — 1-click approve",
    icon: FilePlus,
  },
  {
    href: "/organization/hr",
    title: "HR & Presence",
    desc: "Roster 30 staff — Active / Standby / Break with desk preview",
    icon: HeartHandshake,
  },
];

export default async function OrganizationPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "OWNER") redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground">
          Tier 1 configuration — roles, divisions, proposals and HR presence.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted">
                  <c.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="flex items-center gap-2 text-base">
                    {c.title}
                    <ArrowRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </CardTitle>
                  <CardDescription className="mt-1">{c.desc}</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <span className="text-xs font-medium text-primary">Open →</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="py-4 text-xs text-muted-foreground">
          Also available: <Link href="/proposals" className="font-medium text-primary underline-offset-4 hover:underline">/proposals</Link> (legacy inbox) mirrors{" "}
          <Link href="/organization/proposals" className="font-medium text-primary underline-offset-4 hover:underline">/organization/proposals</Link>.
        </CardContent>
      </Card>
    </div>
  );
}
