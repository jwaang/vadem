"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";

// ── Types ──────────────────────────────────────────────────────────────────────

type TaskCompletionPref = "all" | "proof-only" | "digest" | "off";

interface NotificationPreferences {
  taskCompletions: TaskCompletionPref;
  linkOpened: boolean;
  tripEnding: boolean;
}

const DEFAULT_PREFS: NotificationPreferences = {
  taskCompletions: "proof-only",
  linkOpened: true,
  tripEnding: true,
};

// ── Icons ──────────────────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────────────

interface ToggleProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function Toggle({ checked, onChange, disabled = false }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={[
        "relative w-10 h-6 rounded-pill transition-colors duration-250 ease-spring focus:outline-none shrink-0",
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        checked
          ? "bg-secondary"
          : "bg-bg-sunken border border-border-strong",
      ].join(" ")}
    >
      <span
        className={[
          "absolute top-0.5 w-5 h-5 rounded-round bg-white transition-[translate] duration-250 ease-spring",
          checked ? "translate-x-4" : "translate-x-0.5",
        ].join(" ")}
        style={{ boxShadow: "var(--shadow-xs)" }}
      />
    </button>
  );
}

// ── Toggle Row ─────────────────────────────────────────────────────────────────

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  disabledNote?: string;
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  disabledNote,
}: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-4 px-5">
      <div className="flex flex-col gap-0.5 min-w-0">
        <p className="font-body text-sm font-semibold text-text-primary">
          {label}
        </p>
        {description && (
          <p className="font-body text-xs text-text-secondary">{description}</p>
        )}
        {disabledNote && (
          <p className="font-body text-xs text-text-muted">{disabledNote}</p>
        )}
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

// ── Task Completions Segmented Control ─────────────────────────────────────────

const TASK_OPTIONS: {
  value: TaskCompletionPref;
  label: string;
  description: string;
}[] = [
  {
    value: "all",
    label: "All",
    description: "Get notified for every task completion",
  },
  {
    value: "proof-only",
    label: "Proof-only",
    description: "Only when a proof photo is attached",
  },
  {
    value: "digest",
    label: "Digest",
    description: "One hourly summary when tasks are completed",
  },
  {
    value: "off",
    label: "Off",
    description: "No task completion notifications",
  },
];

interface SegmentedControlProps {
  value: TaskCompletionPref;
  onChange: (value: TaskCompletionPref) => void;
}

function SegmentedControl({ value, onChange }: SegmentedControlProps) {
  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      role="group"
      aria-label="Task completion notification frequency"
    >
      {TASK_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={isActive}
            onClick={() => onChange(opt.value)}
            className={[
              "font-body text-xs font-semibold rounded-pill px-3 py-1.5 border transition-colors duration-150",
              isActive
                ? "bg-secondary text-text-on-primary border-secondary"
                : "bg-bg text-text-secondary border-border-default hover:border-border-strong hover:text-text-primary",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Saved Indicator ────────────────────────────────────────────────────────────

function SavedIndicator({ visible }: { visible: boolean }) {
  return (
    <span
      className={[
        "flex items-center gap-1 font-body text-xs font-semibold text-secondary transition-[opacity] duration-250",
        visible ? "opacity-100" : "opacity-0",
      ].join(" ")}
      aria-live="polite"
      aria-label={visible ? "Preferences saved" : ""}
    >
      <CheckIcon />
      Saved
    </span>
  );
}

// ── Loading Screen ─────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="font-body text-text-muted">Loading…</p>
    </div>
  );
}

// ── Main Component (with Convex hooks) ─────────────────────────────────────────

function NotificationsSettingsInner() {
  const { user } = useAuth();
  // localPrefs: immediate optimistic overlay set by user interactions (null = not yet touched)
  // savedPrefs: Convex real-time data from server
  // displayed prefs = localPrefs ?? savedPrefs ?? DEFAULT_PREFS
  const [localPrefs, setLocalPrefs] = useState<NotificationPreferences | null>(
    null,
  );
  const [savedVisible, setSavedVisible] = useState(false);
  const [saveTimer, setSaveTimer] = useState<ReturnType<
    typeof setTimeout
  > | null>(null);

  const savedPrefs = useQuery(
    api.users.getMyNotificationPreferences,
    user?.token ? { token: user.token } : "skip",
  );

  const updatePreferences = useMutation(api.users.updateNotificationPreferences);

  // Derive displayed prefs: local optimistic → server → defaults
  const prefs = localPrefs ?? savedPrefs ?? DEFAULT_PREFS;

  async function handleUpdate(next: NotificationPreferences) {
    setLocalPrefs(next); // immediate feedback before round-trip

    if (saveTimer) clearTimeout(saveTimer);
    if (!user?.token) return;

    try {
      await updatePreferences({ token: user.token, preferences: next });
      setSavedVisible(true);
      const t = setTimeout(() => setSavedVisible(false), 2000);
      setSaveTimer(t);
    } catch (err) {
      console.error("[NotificationsSettings] Save failed:", err);
    }
  }

  const currentTaskOption = TASK_OPTIONS.find(
    (o) => o.value === prefs.taskCompletions,
  );

  return (
    <CreatorLayout activeNav="settings">
      <div className="flex flex-col gap-6 max-w-[560px]">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="flex items-center gap-1 font-body text-sm text-text-muted hover:text-text-primary transition-colors duration-150 self-start mb-1"
          >
            <ChevronLeftIcon />
            Settings
          </Link>
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display text-3xl text-text-primary leading-tight">
              Notifications
            </h1>
            <SavedIndicator visible={savedVisible} />
          </div>
          <p className="font-body text-sm text-text-secondary">
            Choose which updates you receive as push notifications.
          </p>
        </div>

        {/* Task completions section */}
        <div
          className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="px-5 py-3 border-b border-border-default">
            <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
              Task completions
            </p>
          </div>
          <div className="px-5 py-4 flex flex-col gap-3">
            <p className="font-body text-xs text-text-secondary">
              When your sitter checks off a task
            </p>
            <SegmentedControl
              value={prefs.taskCompletions}
              onChange={(v) => handleUpdate({ ...prefs, taskCompletions: v })}
            />
            {currentTaskOption && (
              <p className="font-body text-xs text-text-muted">
                {currentTaskOption.description}
              </p>
            )}
          </div>
        </div>

        {/* Security & access section */}
        <div
          className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="px-5 py-3 border-b border-border-default">
            <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
              Security &amp; access
            </p>
          </div>

          {/* Vault access — always on, non-configurable */}
          <ToggleRow
            label="Vault access"
            description="When your sitter views a vault item"
            disabledNote="Security events cannot be disabled"
            checked={true}
            onChange={() => {}}
            disabled={true}
          />

          <div className="border-t border-border-default" />

          {/* Link opened */}
          <ToggleRow
            label="Link opened"
            description="When your sitter first opens the sitter link"
            checked={prefs.linkOpened}
            onChange={(v) => handleUpdate({ ...prefs, linkOpened: v })}
          />
        </div>

        {/* Trip section */}
        <div
          className="bg-bg-raised rounded-xl border border-border-default overflow-hidden"
          style={{ boxShadow: "var(--shadow-sm)" }}
        >
          <div className="px-5 py-3 border-b border-border-default">
            <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
              Trip
            </p>
          </div>

          {/* Trip ending */}
          <ToggleRow
            label="Trip ending soon"
            description="24 hours before your trip ends"
            checked={prefs.tripEnding}
            onChange={(v) => handleUpdate({ ...prefs, tripEnding: v })}
          />
        </div>

        {/* Note */}
        <p className="font-body text-xs text-text-muted px-1">
          Push notifications require browser permission. You can enable them
          from your dashboard.
        </p>
      </div>
    </CreatorLayout>
  );
}

// ── Outer wrapper (auth guard + env check) ─────────────────────────────────────
// This component is loaded via dynamic(ssr:false) so it's always client-side.
// No mounted state needed — SSR is disabled by the dynamic import wrapper.

export default function NotificationsSettings() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return <LoadingScreen />;
  }

  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return (
      <CreatorLayout activeNav="settings">
        <p className="font-body text-xs text-text-muted">
          Convex not configured.
        </p>
      </CreatorLayout>
    );
  }

  return <NotificationsSettingsInner />;
}
