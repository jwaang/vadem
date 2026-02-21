"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

// ── Settings Section ──────────────────────────────────────────────────

interface SettingsSectionProps {
  email: string;
  onSignOut: () => void;
}

function SettingsSection({ email, onSignOut }: SettingsSectionProps) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl text-text-primary leading-tight">Settings</h1>
        <p className="font-body text-sm text-text-secondary mt-1.5">
          Manage your account and preferences
        </p>
      </div>

      {/* Account group */}
      <div
        className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="px-5 py-3 border-b border-border-default">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Account
          </p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5 min-w-0">
            <p className="font-body text-sm font-semibold text-text-primary">Email address</p>
            <p className="font-body text-sm text-text-muted truncate">{email}</p>
          </div>
          <Badge variant="success">Active</Badge>
        </div>
      </div>

      {/* Notifications */}
      <div
        className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="px-5 py-3 border-b border-border-default">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Notifications
          </p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="font-body text-sm font-semibold text-text-primary">
              Notification preferences
            </p>
            <p className="font-body text-xs text-text-muted">
              Configure which events send you push notifications
            </p>
          </div>
          <Link
            href="/dashboard/settings/notifications"
            className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150 shrink-0"
          >
            Manage →
          </Link>
        </div>
      </div>

      {/* Session */}
      <div
        className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        <div className="px-5 py-3 border-b border-border-default">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Session
          </p>
        </div>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex flex-col gap-0.5">
            <p className="font-body text-sm font-semibold text-text-primary">Sign out</p>
            <p className="font-body text-xs text-text-muted">
              You&rsquo;ll need to sign in again to access your dashboard.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Loading Screen ────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="font-body text-text-muted">Loading…</p>
    </div>
  );
}

// ── Settings Page ─────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isLoading && !user) {
      router.replace("/login");
    }
  }, [mounted, user, isLoading, router]);

  if (!mounted || isLoading || !user) {
    return <LoadingScreen />;
  }

  function handleSignOut() {
    signOut();
    router.push("/login");
  }

  return (
    <CreatorLayout>
      <SettingsSection email={user.email} onSignOut={handleSignOut} />
    </CreatorLayout>
  );
}
