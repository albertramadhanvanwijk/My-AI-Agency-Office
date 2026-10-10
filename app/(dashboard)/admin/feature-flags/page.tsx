import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getFeatureFlags, initializeDefaultFeatureFlags } from "@/modules/admin/service";
import FeatureFlags from "@/components/admin/FeatureFlags";

export const dynamic = "force-dynamic";

async function getOwnerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER role required");
  }
  return session;
}

export default async function AdminFeatureFlagsPage() {
  const session = await getOwnerSession();
  
  // Ensure default feature flags exist
  await initializeDefaultFeatureFlags();
  
  const flags = await getFeatureFlags();

  return (
    <div className="container mx-auto py-6">
      <FeatureFlags initialFlags={flags} />
    </div>
  );
}