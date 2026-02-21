"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/Button";
import { NotificationToast } from "@/components/ui/NotificationToast";

interface VerificationBannerProps {
  onDismiss: () => void;
}

export function VerificationBanner({ onDismiss }: VerificationBannerProps) {
  const { user } = useAuth();
  const [isSending, setIsSending] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastError, setToastError] = useState(false);
  const resend = useAction(api.authActions.resendVerificationEmail);

  async function handleResend() {
    if (!user) return;
    setIsSending(true);
    try {
      await resend({ sessionToken: user.token });
      setToastError(false);
      setShowToast(true);
    } catch {
      setToastError(true);
      setShowToast(true);
    } finally {
      setIsSending(false);
    }
  }

  return (
    <>
      <div className="bg-primary-subtle border border-primary-light rounded-lg px-4 py-3 flex items-center gap-3">
        {/* Envelope icon */}
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="text-primary shrink-0"
          aria-hidden="true"
        >
          <rect
            x="2"
            y="4"
            width="20"
            height="16"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.75"
          />
          <path
            d="M2 7l10 7 10-7"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <p className="font-body text-sm text-text-primary flex-1 min-w-0">
          Check your inbox at{" "}
          <strong className="font-semibold">{user?.email}</strong> to verify
          your email address.
        </p>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onDismiss}
            className="font-body text-xs text-text-muted hover:text-text-secondary transition-colors duration-150 whitespace-nowrap"
          >
            Not now
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleResend}
            disabled={isSending}
          >
            {isSending ? "Sending…" : "Resend email"}
          </Button>
        </div>
      </div>

      <NotificationToast
        title={toastError ? "Failed to send" : "Email sent!"}
        message={
          toastError
            ? "Please try again in a moment."
            : `Verification email sent to ${user?.email}.`
        }
        variant={toastError ? "warning" : "success"}
        visible={showToast}
        autoDismissMs={4000}
        onDismiss={() => setShowToast(false)}
      />
    </>
  );
}
