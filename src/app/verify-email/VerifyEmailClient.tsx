"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";

type VerifyState = "loading" | "success" | "expired" | "invalid";

export function VerifyEmailClient() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<VerifyState>("loading");
  const verifyEmail = useMutation(api.auth.verifyEmail);
  const { user, setUser } = useAuth();
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!token) {
      setState("invalid");
      return;
    }

    verifyEmail({ token })
      .then(({ success, error }) => {
        if (success) {
          setState("success");
          // Patch localStorage so the banner disappears immediately
          if (user) setUser({ ...user, emailVerified: true });
          setTimeout(() => router.push("/dashboard"), 2000);
        } else {
          setState(error === "expired" ? "expired" : "invalid");
        }
      })
      .catch(() => setState("invalid"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state === "loading") {
    return (
      <p className="font-body text-sm text-text-muted">
        Verifying your email…
      </p>
    );
  }

  if (state === "success") {
    return (
      <div className="bg-bg-raised rounded-xl shadow-md p-8 flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-round bg-secondary-light flex items-center justify-center">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            className="text-secondary"
          >
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="font-display text-2xl text-text-primary">
          Email verified!
        </h2>
        <p className="font-body text-sm text-text-secondary">
          Redirecting you to your dashboard…
        </p>
      </div>
    );
  }

  if (state === "expired") {
    return (
      <div className="bg-bg-raised rounded-xl shadow-md p-8 flex flex-col gap-4 text-left">
        <h2 className="font-display text-2xl text-text-primary">
          Link expired
        </h2>
        <p className="font-body text-sm text-text-secondary">
          This verification link has expired. Sign in to your dashboard and
          request a new one.
        </p>
        <a
          href="/dashboard"
          className="font-body text-sm text-primary hover:text-primary-hover underline underline-offset-2 transition-colors duration-150"
        >
          Go to dashboard →
        </a>
      </div>
    );
  }

  return (
    <div className="bg-bg-raised rounded-xl shadow-md p-8 flex flex-col gap-4 text-left">
      <h2 className="font-display text-2xl text-text-primary">Invalid link</h2>
      <p className="font-body text-sm text-text-secondary">
        This verification link is invalid or has already been used.
      </p>
      <a
        href="/dashboard"
        className="font-body text-sm text-primary hover:text-primary-hover underline underline-offset-2 transition-colors duration-150"
      >
        Go to dashboard →
      </a>
    </div>
  );
}
