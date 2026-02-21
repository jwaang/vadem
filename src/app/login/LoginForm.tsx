"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { OAuthButtons, hasOAuthProviders } from "@/components/ui/OAuthButtons";

export function LoginForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const doSignIn = useAction(api.authActions.signIn);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await doSignIn({ email: email.trim(), password });
      setUser({ token: result.token, email: result.email, emailVerified: result.emailVerified });
      router.push("/dashboard");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      // Convex wraps server errors: extract the actual message after "Uncaught Error: "
      const match = raw.match(/Uncaught Error: ([^\n]+?)(?:\s+at |\s+Called by|$)/);
      const message = match ? match[1].trim() : raw || "An error occurred. Please try again.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* OAuth sign-in buttons */}
      {hasOAuthProviders && (
        <>
          <OAuthButtons className="flex flex-col gap-3" />
          <div className="oauth-divider">or</div>
        </>
      )}

      {/* Email/password form */}
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
          disabled={isSubmitting}
        />

        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          disabled={isSubmitting}
        />

        {error && (
          <div
            className="rounded-lg px-4 py-3 font-body text-sm text-danger"
            style={{ backgroundColor: "var(--color-danger-light)" }}
            role="alert"
          >
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={isSubmitting || !email || !password}
          className="w-full mt-1"
        >
          {isSubmitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </div>
  );
}
