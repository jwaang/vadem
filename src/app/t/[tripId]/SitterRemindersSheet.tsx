"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BellIcon } from "@/components/ui/icons";
import { TimePicker } from "@/components/ui/TimePicker";
import { formatTime12h } from "@/lib/todayViewHelpers";
import { formatPhoneInput, validatePhone } from "@/lib/phone";

// ── Types ─────────────────────────────────────────────────────────────

interface SitterRemindersSheetProps {
  tripId: Id<"trips">;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────

function getDefaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/New_York";
  }
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

// ── Component ─────────────────────────────────────────────────────────

function SitterRemindersSheet({ tripId, onClose }: SitterRemindersSheetProps) {
  const today = new Date().toLocaleDateString("en-CA");

  // Fetch suggested times based on today's tasks
  const suggestions = useQuery(api.sitterSmsQueries.getSuggestedTimes, { tripId, today });
  // Fetch any existing preferences for this trip
  const existingPrefs = useQuery(api.sitterSmsQueries.getPreferences, { tripId });

  const optInAction = useAction(api.sitterSms.optIn);
  const updatePrefs = useMutation(api.sitterSmsQueries.updatePreferences);
  const optOutMutation = useMutation(api.sitterSmsQueries.optOut);
  const reOptInMutation = useMutation(api.sitterSmsQueries.reOptIn);
  const devSendTest = useAction(api.sitterSms.devSendTestReminder);

  const isDev = process.env.NODE_ENV === "development";

  // ── State ─────────────────────────────────────────────────────────
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [timezone, setTimezone] = useState(getDefaultTimezone);
  const [reminderTimes, setReminderTimes] = useState<string[]>([]);
  const [step, setStep] = useState<"opt-in" | "settings">("opt-in");
  const [prefsId, setPrefsId] = useState<Id<"sitterSmsPreferences"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [optedOut, setOptedOut] = useState(false);
  const [carrierBlock, setCarrierBlock] = useState(false);
  const [twilioNumber, setTwilioNumber] = useState<string | null>(null);

  const getTwilioNumber = useAction(api.sitterSms.getTwilioNumber);

  // Fetch the Twilio number for carrier-block messaging
  useEffect(() => {
    getTwilioNumber({}).then(setTwilioNumber).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Initialize from existing preferences
  useEffect(() => {
    if (!existingPrefs || existingPrefs.length === 0) return;
    const active = existingPrefs[0];
    if (!active) return;

    setPrefsId(active._id);
    setPhone(active.phone);
    setTimezone(active.timezone);
    setReminderTimes(active.reminderTimes ?? []);
    setStep("settings");
    if (active.optedOutAt) {
      setOptedOut(true);
      setCarrierBlock(active.optOutSource === "carrier");
    }
  }, [existingPrefs]);

  // Initialize from suggestions if no existing prefs
  useEffect(() => {
    if (!suggestions || prefsId) return;
    setReminderTimes(suggestions.suggested);
  }, [suggestions, prefsId]);

  // ── Handlers ──────────────────────────────────────────────────────

  async function handleOptIn() {
    if (!phone.trim() || !consent) return;
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const result = await optInAction({
        tripId,
        phone: phone.trim(),
        timezone,
      });
      if (result.success) {
        setPrefsId(result.prefsId);
        setStep("settings");
      } else {
        if (result.error === "PHONE_NOT_REGISTERED") {
          setError(
            "This phone number doesn't match any sitter on this trip. The homeowner must add your number first.",
          );
        } else {
          setError("This trip is no longer active.");
        }
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveSettings() {
    if (!prefsId) return;
    setSaving(true);
    try {
      await updatePrefs({
        prefsId,
        reminderTimes,
        timezone,
      });
      onClose();
    } catch {
      setError("Failed to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handleOptOut() {
    if (!prefsId) return;
    setSaving(true);
    try {
      await optOutMutation({ prefsId });
      setOptedOut(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleReOptIn() {
    if (!prefsId) return;
    setSaving(true);
    setError(null);
    try {
      await reOptInMutation({ prefsId });
      setOptedOut(false);
      setCarrierBlock(false);
    } finally {
      setSaving(false);
    }
  }

  function updateTime(index: number, newTime: string) {
    setReminderTimes((prev) => {
      const next = [...prev];
      next[index] = newTime;
      return next.sort();
    });
  }

  function removeTime(index: number) {
    setReminderTimes((prev) => prev.filter((_, i) => i !== index));
  }

  function addTime() {
    if (reminderTimes.length >= 3) return;
    // Pick a default that doesn't overlap existing — try 08:00, 12:00, 17:00
    const defaults = ["08:00", "12:00", "17:00"];
    const next = defaults.find((t) => !reminderTimes.includes(t)) ?? "08:00";
    setReminderTimes((prev) => [...prev, next].sort());
  }

  function useSuggested() {
    if (suggestions?.suggested) {
      setReminderTimes(suggestions.suggested);
    }
  }

  /** Check if a reminder time is close to or after the nearest upcoming task */
  function getWarning(time: string): string | null {
    if (!suggestions?.tasks || suggestions.tasks.length === 0) return null;
    const reminderMin = toMinutes(time);
    // Find the nearest task at or after this reminder
    const nextTask = suggestions.tasks.find(
      (t: { time: string }) => toMinutes(t.time) >= reminderMin,
    );
    if (!nextTask) return null;
    const gap = toMinutes(nextTask.time) - reminderMin;
    if (gap < 15) {
      return `This is very close to your ${formatTime12h(nextTask.time)} task. You may not get much advance notice.`;
    }
    return null;
  }

  // ── Render ────────────────────────────────────────────────────────

  const loading = suggestions === undefined || existingPrefs === undefined;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-[rgba(42,31,26,0.4)]"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-bg-raised rounded-t-2xl shadow-xl flex flex-col max-h-[85vh]"
        style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-3">
          <div className="flex items-center gap-2">
            <BellIcon size={20} className="text-primary" />
            <h2 className="font-display text-lg text-text-primary">SMS Reminders</h2>
          </div>
          <button
            type="button"
            className="w-8 h-8 flex items-center justify-center text-text-muted rounded-round hover:bg-bg-sunken transition-colors duration-150"
            onClick={onClose}
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-6 pb-2 flex flex-col gap-4">
          {loading ? (
            <p className="font-body text-sm text-text-muted py-4 text-center">Loading{"\u2026"}</p>
          ) : step === "opt-in" ? (
            /* ── Opt-in form ──────────────────────────────────────────── */
            <>
              <p className="font-body text-sm text-text-secondary">
                Get text message reminders before your scheduled tasks. Enter the phone number the homeowner has on file for you.
              </p>

              <Input
                type="tel"
                placeholder="555-123-4567"
                value={phone}
                onChange={(e) => {
                  setPhone(formatPhoneInput(e.target.value));
                  setError(null);
                }}
                autoComplete="tel"
              />

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 w-5 h-5 rounded-sm border-border-default accent-primary shrink-0"
                />
                <span className="font-body text-xs text-text-secondary leading-relaxed">
                  I agree to receive automated SMS task reminders from Vadem. Message frequency varies by trip. Message and data rates may apply. Reply STOP to unsubscribe at any time.
                </span>
              </label>

              {error && (
                <div role="alert" className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm">
                  {error}
                </div>
              )}

              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleOptIn}
                disabled={!phone.trim() || !consent || saving}
              >
                {saving ? "Verifying\u2026" : "Enable reminders"}
              </Button>
            </>
          ) : optedOut ? (
            /* ── Opted out state ──────────────────────────────────────── */
            <>
              {carrierBlock ? (
                <>
                  <p className="font-body text-sm text-text-secondary">
                    You unsubscribed by replying STOP. To get reminders again, text <strong>START</strong> to{" "}
                    {twilioNumber ? <strong>{twilioNumber}</strong> : "the number that messaged you"}, then tap the button below.
                  </p>
                  {error && (
                    <div role="alert" className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm">
                      {error}
                    </div>
                  )}
                </>
              ) : (
                <p className="font-body text-sm text-text-secondary">
                  SMS reminders are currently off. You can re-enable them at any time.
                </p>
              )}
              <Button
                variant="primary"
                size="lg"
                className="w-full"
                onClick={handleReOptIn}
                disabled={saving}
              >
                Re-enable reminders
              </Button>
            </>
          ) : (
            /* ── Settings (post opt-in) ───────────────────────────────── */
            <>
              <p className="font-body text-sm text-text-secondary">
                Choose up to 3 times to receive daily reminder texts. Each message will list your upcoming tasks.
              </p>

              {suggestions && suggestions.totalTimedTasks === 0 ? (
                <p className="font-body text-sm text-text-muted py-2">
                  No timed tasks are scheduled for today. Reminders will be sent on days with timed tasks.
                </p>
              ) : (
                <>
                  {/* Suggested times button */}
                  {suggestions?.suggested && suggestions.suggested.length > 0 && (
                    <button
                      type="button"
                      className="flex items-center gap-2 text-left rounded-lg bg-accent-light border border-accent/20 px-4 py-3"
                      onClick={useSuggested}
                    >
                      <span className="text-base">&#x2728;</span>
                      <span className="font-body text-sm text-text-primary flex-1">
                        <span className="font-semibold">Use recommended times</span>
                        <span className="text-text-muted">
                          {" \u2014 "}
                          {suggestions.suggested.map((t: string) => formatTime12h(t)).join(", ")}
                        </span>
                      </span>
                    </button>
                  )}

                  {/* Reminder time slots */}
                  <div className="flex flex-col gap-3">
                    {reminderTimes.map((time, index) => {
                      const warning = getWarning(time);
                      return (
                        <div key={index} className="rounded-lg border border-border-default bg-bg">
                          <div className="flex items-center gap-3 px-4 py-3">
                            <span className="font-body text-sm font-semibold text-text-primary shrink-0">
                              Reminder {index + 1}
                            </span>
                            <TimePicker
                              value={time}
                              onChange={(v) => updateTime(index, v)}
                              minuteStep={5}
                              compact
                              className="flex-1"
                            />
                            <button
                              type="button"
                              className="w-8 h-8 flex items-center justify-center text-text-muted rounded-round hover:bg-bg-sunken hover:text-danger transition-colors duration-150"
                              onClick={() => removeTime(index)}
                              aria-label={`Remove reminder ${index + 1}`}
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                              </svg>
                            </button>
                          </div>
                          {warning && (
                            <div className="px-4 pb-3">
                              <p className="font-body text-xs text-warning">{warning}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add reminder button */}
                  {reminderTimes.length < 3 && (
                    <button
                      type="button"
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-dashed border-border-default text-text-muted hover:text-text-secondary hover:border-border-strong transition-colors duration-150"
                      onClick={addTime}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                      <span className="font-body text-sm">Add reminder</span>
                    </button>
                  )}
                  {/* Global missed-tasks warning */}
                  {reminderTimes.length > 0 &&
                    suggestions?.tasks &&
                    suggestions.tasks.length > 0 &&
                    (() => {
                      const earliestTask = Math.min(
                        ...suggestions.tasks.map((t: { time: string }) => toMinutes(t.time)),
                      );
                      const earliestReminder = Math.min(
                        ...reminderTimes.map(toMinutes),
                      );
                      if (earliestTask < earliestReminder) {
                        return (
                          <p className="font-body text-xs text-warning">
                            Your earliest task is at {formatTime12h(suggestions.tasks.find((t: { time: string }) => toMinutes(t.time) === earliestTask)!.time)} but your first reminder isn&apos;t until {formatTime12h(reminderTimes.find((t) => toMinutes(t) === earliestReminder)!)}.
                            You won&apos;t get a heads-up for tasks before then.
                          </p>
                        );
                      }
                      return null;
                    })()}
                </>
              )}

              {/* Timezone */}
              <div className="flex items-center justify-between">
                <span className="font-body text-xs text-text-muted">
                  Timezone: {timezone.replace(/_/g, " ")}
                </span>
              </div>

              {error && (
                <div role="alert" className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm">
                  {error}
                </div>
              )}

              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full"
                  onClick={handleSaveSettings}
                  disabled={saving || reminderTimes.length === 0}
                >
                  {saving ? "Saving\u2026" : "Save settings"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-text-muted"
                  onClick={handleOptOut}
                  disabled={saving}
                >
                  Turn off reminders
                </Button>
                {isDev && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-warning font-semibold"
                    onClick={async () => {
                      await devSendTest({ tripId });
                    }}
                    disabled={saving}
                  >
                    [DEV] Send reminders now
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export { SitterRemindersSheet, type SitterRemindersSheetProps };
