import { Suspense } from "react";
import LoginForm from "@/components/auth/LoginForm";

export const metadata = { title: "Login — My AI Agency Office" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
