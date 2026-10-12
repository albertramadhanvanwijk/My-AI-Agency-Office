import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function HomePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/login");
  }

  const role = (session.user as { role?: string }).role;

  if (role === "CLIENT") {
    redirect("/portal");
  }

  // OWNER and any authenticated fallback → lobby
  redirect("/lobby");
}
