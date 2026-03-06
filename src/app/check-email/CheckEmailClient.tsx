"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";

export function CheckEmailClient() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">(
    "idle",
  );

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );

  const resendEmail = useAction(api.authActions.resendVerificationEmail);

  // Not logged in -> signup
  useEffect(() => {
    if (mounted && user === null) {
      router.replace("/signup");
    }
  }, [mounted, user, router]);

  // Already verified -> welcome
  useEffect(() => {
    if (sessionData?.emailVerified) {
      router.replace("/welcome");
    }
  }, [sessionData, router]);

  const handleResend = async () => {
    if (!user?.token || resendState === "sending") return;
    setResendState("sending");
    try {
      await resendEmail({ sessionToken: user.token });
      setResendState("sent");
      setTimeout(() => setResendState("idle"), 3000);
    } catch {
      setResendState("idle");
    }
  };

  const handleDifferentEmail = () => {
    signOut();
    router.push("/signup");
  };

  // Prevent hydration mismatch — server renders nothing, client fills in after mount
  if (!mounted || !user) {
    return (
      <main className="min-h-dvh bg-bg flex items-center justify-center p-4">
        <p className="font-body text-sm text-text-muted">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header — matches login/signup page pattern */}
        <div className="text-center mb-8">
          <p className="font-display text-2xl text-primary mb-1 italic">
            Vadem
          </p>
          <h1 className="font-display text-4xl text-text-primary mb-3">
            Check your inbox
          </h1>
        </div>

        {/* Card */}
        <div className="bg-bg-raised rounded-xl shadow-md p-8 flex flex-col items-center gap-5">
          <div className="w-12 h-12 rounded-full bg-primary-subtle flex items-center justify-center">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              className="text-primary"
            >
              <rect
                x="2"
                y="4"
                width="20"
                height="16"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path
                d="M2 7l8.165 5.715a3 3 0 003.67 0L22 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          <div className="text-center">
            <p className="font-body text-sm text-text-secondary">
              We sent a verification link to
            </p>
            <p className="font-body text-sm text-text-primary font-semibold mt-1 break-all">
              {user.email}
            </p>
          </div>

          {resendState === "sent" ? (
            <div className="flex items-center gap-2 text-secondary py-2">
              <CheckIcon size={16} />
              <span className="font-body text-sm font-semibold">
                Email sent!
              </span>
            </div>
          ) : (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              onClick={handleResend}
              disabled={resendState === "sending"}
            >
              {resendState === "sending" ? "Sending..." : "Resend email"}
            </Button>
          )}

          <Button
            variant="ghost"
            size="default"
            className="w-full"
            onClick={handleDifferentEmail}
          >
            Use a different email
          </Button>
        </div>
      </div>
    </main>
  );
}
