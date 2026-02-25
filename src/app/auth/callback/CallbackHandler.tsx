"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";

interface CallbackHandlerProps {
  provider: "google" | "apple";
}

function CallbackHandlerInner({ provider }: CallbackHandlerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const exchangeCode = useAction(api.authActions.exchangeOAuthCode);

  // Extract params at render time
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  // Compute initial error + CSRF check synchronously on first render (not in effect)
  // This avoids the react-hooks/set-state-in-effect lint rule while keeping logic correct.
  const [error, setError] = useState<string | null>(() => {
    if (oauthError) {
      return oauthError === "access_denied"
        ? "Sign in was cancelled."
        : `OAuth error: ${oauthError}`;
    }
    if (!code) return "No authorization code received. Please try again.";

    // CSRF state check (sessionStorage is client-only; this initializer runs client-side only)
    if (typeof sessionStorage !== "undefined") {
      const storedState = sessionStorage.getItem("oauth_state");
      if (storedState && state !== storedState) {
        return "Security check failed. Please try again.";
      }
      sessionStorage.removeItem("oauth_state");
    }

    return null;
  });

  const hasRun = useRef(false);

  useEffect(() => {
    // Skip if there's a pre-computed error (bad URL params / CSRF) or already ran
    if (error || !code || hasRun.current) return;
    hasRun.current = true;

    const origin =
      provider === "apple" && process.env.NEXT_PUBLIC_APPLE_REDIRECT_ORIGIN
        ? process.env.NEXT_PUBLIC_APPLE_REDIRECT_ORIGIN
        : window.location.origin;
    const redirectUri = `${origin}/auth/callback/${provider}`;

    exchangeCode({ provider, code, redirectUri })
      .then(({ token, email, isNewUser }) => {
        setUser({ token, email, emailVerified: true });
        router.replace(isNewUser ? "/welcome" : "/dashboard");
      })
      .catch((err: unknown) => {
        const raw = err instanceof Error ? err.message : String(err);
        const match = raw.match(/Uncaught Error: ([^\n]+?)(?:\s+at |\s+Called by|$)/);
        setError(match ? match[1].trim() : raw || "Sign in failed. Please try again.");
      });
  }, [error, code, provider, exchangeCode, setUser, router]);

  if (error) {
    return (
      <main className="min-h-dvh bg-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <p className="font-display text-2xl text-primary italic mb-6">Vadem</p>
          <div className="bg-bg-raised rounded-xl shadow-md p-8">
            <div
              role="alert"
              className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm mb-6"
            >
              {error}
            </div>
            <a
              href="/login"
              className="font-body text-sm text-primary hover:text-primary-hover underline underline-offset-2"
            >
              Back to sign in
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-bg flex items-center justify-center p-4">
      <div className="text-center">
        <p className="font-display text-2xl text-primary italic mb-4">Vadem</p>
        <p className="font-body text-sm text-text-muted">Signing you in…</p>
      </div>
    </main>
  );
}

// Outer: guards against missing ConvexProvider
export function CallbackHandler({ provider }: CallbackHandlerProps) {
  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <main className="min-h-dvh bg-bg flex items-center justify-center p-4">
        <div className="text-center">
          <p className="font-body text-sm text-text-muted">
            Backend not configured.
          </p>
        </div>
      </main>
    );
  }
  return <CallbackHandlerInner provider={provider} />;
}
