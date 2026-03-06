"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAction, useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { resetAnalytics } from "@/lib/analytics";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { NotificationToast } from "@/components/ui/NotificationToast";
import { ChevronRightIcon, CheckIcon, PencilIcon } from "@/components/ui/icons";

// ── Shared row wrapper ───────────────────────────────────────────────

function SettingsRow({ children, last }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? "px-5 py-4" : "px-5 py-4 border-b border-border-default"}>
      {children}
    </div>
  );
}

// ── Settings Content ─────────────────────────────────────────────────

interface SettingsContentProps {
  email: string;
  emailVerified: boolean;
  sessionToken: string;
  onSignOut: () => void;
}

function SettingsContent({ email, emailVerified, sessionToken, onSignOut }: SettingsContentProps) {
  const resend = useAction(api.authActions.resendVerificationEmail);
  const profile = useQuery(api.auth.getProfile, { token: sessionToken });
  const updateProfile = useMutation(api.auth.updateProfile);
  const { user, setUser } = useAuth();

  const [isSending, setIsSending] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastError, setToastError] = useState(false);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);
  const [nameInitialized, setNameInitialized] = useState(false);

  useEffect(() => {
    if (profile && !nameInitialized) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
      setNameInitialized(true);
    }
  }, [profile, nameInitialized]);

  const displayName = nameInitialized
    ? [firstName.trim(), lastName.trim()].filter(Boolean).join(" ") || "Not set"
    : profile
      ? [profile.firstName, profile.lastName].filter(Boolean).join(" ") || "Not set"
      : "\u2026";

  async function handleResend() {
    setIsSending(true);
    try {
      await resend({ sessionToken });
      setToastError(false);
      setShowToast(true);
    } catch {
      setToastError(true);
      setShowToast(true);
    } finally {
      setIsSending(false);
    }
  }

  async function handleSaveName() {
    setSavingName(true);
    setNameSaved(false);
    try {
      await updateProfile({
        token: sessionToken,
        firstName: firstName.trim(),
        lastName: lastName.trim() || undefined,
      });
      if (user) {
        setUser({ ...user, firstName: firstName.trim(), lastName: lastName.trim() || undefined });
      }
      setNameSaved(true);
      setEditingName(false);
      setTimeout(() => setNameSaved(false), 2500);
    } finally {
      setSavingName(false);
    }
  }

  function handleCancelEdit() {
    if (profile) {
      setFirstName(profile.firstName);
      setLastName(profile.lastName);
    }
    setEditingName(false);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl text-text-primary leading-tight">Settings</h1>
        <p className="font-body text-sm text-text-secondary mt-1.5">
          Manage your account and preferences
        </p>
      </div>

      <div
        className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
        style={{ boxShadow: "var(--shadow-sm)" }}
      >
        {/* Name */}
        <SettingsRow>
          {editingName ? (
            <div className="flex flex-col gap-3">
              <p className="font-body text-sm font-semibold text-text-primary">Your name</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name"
                  label="First name"
                />
                <Input
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name"
                  label="Last name"
                />
              </div>
              <div className="flex items-center gap-2 pt-0.5">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleSaveName}
                  disabled={savingName || !firstName.trim()}
                >
                  {savingName ? "Saving\u2026" : "Save"}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCancelEdit} disabled={savingName}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <div className="flex flex-col gap-0.5 min-w-0">
                <p className="font-body text-sm font-semibold text-text-primary">Your name</p>
                <p className="font-body text-sm text-text-muted truncate flex items-center gap-1.5">
                  {displayName}
                  {nameSaved && (
                    <span className="inline-flex items-center gap-0.5 text-success text-xs font-semibold">
                      <CheckIcon size={12} />
                      Saved
                    </span>
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="flex items-center gap-1 font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150 shrink-0"
              >
                <PencilIcon size={14} />
                Edit
              </button>
            </div>
          )}
        </SettingsRow>

        {/* Email */}
        <SettingsRow>
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-0.5 min-w-0">
              <p className="font-body text-sm font-semibold text-text-primary">Email</p>
              <p className="font-body text-sm text-text-muted truncate">{email}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              {emailVerified ? (
                <Badge variant="success">Verified</Badge>
              ) : (
                <>
                  <Badge variant="warning">Unverified</Badge>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={isSending}
                    className="font-body text-xs font-semibold text-primary hover:text-primary-hover transition-colors duration-150 disabled:opacity-50"
                  >
                    {isSending ? "Sending\u2026" : "Resend verification"}
                  </button>
                </>
              )}
            </div>
          </div>
        </SettingsRow>

        {/* Notifications */}
        <SettingsRow>
          <Link
            href="/dashboard/settings/notifications"
            className="flex items-center justify-between gap-4 group"
          >
            <div className="flex flex-col gap-0.5">
              <p className="font-body text-sm font-semibold text-text-primary">Notifications</p>
              <p className="font-body text-xs text-text-muted">
                Push notification preferences
              </p>
            </div>
            <ChevronRightIcon
              size={16}
              className="text-text-muted group-hover:text-primary transition-colors duration-150 shrink-0"
            />
          </Link>
        </SettingsRow>

        {/* Sign out */}
        <SettingsRow last>
          <div className="flex items-center justify-between gap-4">
            <p className="font-body text-sm font-semibold text-text-primary">Sign out</p>
            <Button variant="ghost" size="sm" onClick={onSignOut}>
              Sign out
            </Button>
          </div>
        </SettingsRow>
      </div>

      <NotificationToast
        title={toastError ? "Failed to send" : "Email sent!"}
        message={
          toastError
            ? "Please try again in a moment."
            : `Verification email sent to ${email}.`
        }
        variant={toastError ? "warning" : "success"}
        visible={showToast}
        autoDismissMs={4000}
        onDismiss={() => setShowToast(false)}
      />
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

export default function SettingsPageClient() {
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
    resetAnalytics();
    signOut();
    router.push("/login");
  }

  return (
    <CreatorLayout>
      <SettingsContent
        email={user.email}
        emailVerified={user.emailVerified}
        sessionToken={user.token}
        onSignOut={handleSignOut}
      />
    </CreatorLayout>
  );
}
