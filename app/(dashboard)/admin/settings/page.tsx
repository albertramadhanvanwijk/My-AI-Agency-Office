import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getSettings, initializeDefaultSettings } from "@/modules/admin/service";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

async function getOwnerSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if (session.user.role !== "OWNER") {
    throw new Error("Unauthorized: OWNER role required");
  }
  return session;
}

export default async function AdminSettingsPage() {
  const session = await getOwnerSession();
  
  // Ensure default settings exist
  await initializeDefaultSettings();
  
  const settings = await getSettings();

  return (
    <div className="container mx-auto py-6">
      <SettingsForm initialSettings={settings} />
    </div>
  );
}