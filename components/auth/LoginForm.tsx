"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const callbackUrl = searchParams.get("callbackUrl") || "/lobby";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(() => {
    if (!errorParam) return null;
    // Map NextAuth error codes to friendly messages (invalid callback should not show 500)
    const map: Record<string, string> = {
      OAuthSignin: "Gagal memulai login Google. Coba lagi.",
      OAuthCallback: "Login Google gagal (callback tidak valid). Periksa NEXTAUTH_URL dan redirect URI di Google Console.",
      OAuthCreateAccount: "Gagal membuat akun dari Google.",
      Callback: "Callback tidak valid.",
      AccessDenied: "Akses ditolak.",
      Verification: "Verifikasi gagal.",
      Default: "Terjadi kesalahan autentikasi. Silakan coba lagi.",
    };
    return map[errorParam] || map.Default;
  });

  async function handleCredentials(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // Use redirect: false to handle redirect manually - more reliable in client components
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      if (result?.error) {
        setError("Email atau password salah.");
      } else {
        // Successful login - redirect to callbackUrl
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Gagal login. Coba lagi.");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError(null);
    // redirect: true so NextAuth handles OAuth dance; on failure it redirects to /login?error=...
    await signIn("google", { callbackUrl });
  }

  return (
    <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
      <h1 className="text-xl font-semibold">Masuk — My AI Agency Office</h1>
      <p className="mt-1 text-sm text-muted-foreground">Gunakan Google atau email & password Anda.</p>

      {error && (
        <div role="alert" className="mt-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleGoogle}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border bg-white px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        {/* Google G — inline SVG */}
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09A6.97 6.97 0 0 1 5.48 12c0-.72.13-1.42.36-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.78.42 3.45 1.18 4.93l3.66-2.84z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Sign in with Google
      </button>

      <div className="my-4 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> atau <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={handleCredentials} className="space-y-3">
        <div>
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            data-testid="email-input"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            autoComplete="email"
          />
        </div>
        <div>
          <label htmlFor="password" className="text-sm font-medium">Password</label>
          <input
            id="password"
            name="password"
            data-testid="password-input"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            autoComplete="current-password"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          data-testid="login-submit"
          className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {loading ? "Memproses..." : "Masuk dengan Email"}
        </button>
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">Gagal callback Google? Periksa NEXTAUTH_URL & redirect URI — bukan 500.</p>
    </div>
  );
}
