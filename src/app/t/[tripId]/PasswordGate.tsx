"use client";

import { useState, type FormEvent } from "react";
import { useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

interface PasswordGateProps {
  tripId: Id<"trips">;
  shareLink: string;
  onSuccess: () => void;
}

export function PasswordGate({ tripId, shareLink, onSuccess }: PasswordGateProps) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyLinkPassword = useAction(api.shareActions.verifyLinkPassword);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!password.trim()) {
      setError("Please enter the password.");
      return;
    }

    setIsVerifying(true);
    setError("");

    try {
      const result = await verifyLinkPassword({ tripId, password });
      if (!result.ok) {
        setError("Incorrect password. Please try again.");
        setPassword("");
        return;
      }
      // Store session token in a cookie (24h TTL)
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toUTCString();
      document.cookie = `hoff_trip_${shareLink}=${result.sessionToken}; path=/; expires=${expires}; SameSite=Lax`;
      onSuccess();
    } catch {
      setError("Something went wrong. Please try again.");
      setPassword("");
    } finally {
      setIsVerifying(false);
    }
  }

  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
      <div
        className="bg-bg-raised rounded-xl border border-border-default w-full max-w-sm flex flex-col gap-6 p-8"
        style={{ boxShadow: "var(--shadow-md)" }}
      >
        {/* Wordmark */}
        <div className="flex flex-col gap-1 text-center">
          <h1 className="font-display text-3xl text-text-primary">Handoff</h1>
          <p className="font-body text-sm text-text-secondary">
            This link is password protected.
          </p>
        </div>

        {/* Password form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            label="Password"
            type="password"
            id="link-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError("");
            }}
            placeholder="Enter password"
            autoFocus
            autoComplete="current-password"
            error={error}
          />

          <Button
            type="submit"
            variant="primary"
            disabled={isVerifying}
            className="w-full"
          >
            {isVerifying ? "Verifying…" : "Enter"}
          </Button>
        </form>
      </div>
    </div>
  );
}
