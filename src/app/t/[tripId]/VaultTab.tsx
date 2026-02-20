"use client";

import { useState, useEffect, useCallback } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { VaultItem, LockIcon, type VaultItemLocationCard } from "@/components/ui/VaultItem";
import { PinInput } from "@/components/ui/PinInput";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { validatePhone, formatPhoneInput } from "@/lib/phone";

// ── Types ─────────────────────────────────────────────────────────────

type Phase =
  | "initial"       // Default: shows "[ownerName] shared secure info" CTA — NO vault data exposed
  | "gate"          // Phone input — enter number to request PIN
  | "sending"       // Waiting for sendSmsPin action
  | "pin_entry"     // PIN input — enter 6-digit code
  | "verifying"     // Waiting for verifyPin action
  | "loading_items" // PIN verified — loading decrypted vault items
  | "revealed"      // Vault items visible
  | "access_denied"; // Trip inactive or sitter not registered

type AccessDeniedReason = "TRIP_INACTIVE" | "NOT_REGISTERED" | "VAULT_ACCESS_REVOKED";

interface DecryptedVaultItem {
  id: string;
  label: string;
  itemType: string;
  instructions?: string;
  value: string;
  locationCard?: VaultItemLocationCard;
}

interface VaultTabProps {
  tripId: Id<"trips">;
  propertyId: Id<"properties">;
  /** Property name shown in the unregistered-viewer prompt */
  ownerName: string;
}

// ── Lock icon for the header ───────────────────────────────────────────

function VaultLockIcon() {
  return (
    <div className="flex items-center justify-center w-14 h-14 rounded-round bg-vault text-text-on-vault shadow-sm">
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    </div>
  );
}

// ── Vault item type → icon mapping ────────────────────────────────────

function ItemTypeIcon() {
  // All vault item types use the same LockIcon (consistent with VaultItem component)
  return <LockIcon />;
}

// ── Loading skeleton ──────────────────────────────────────────────────

function VaultSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-bg-raised rounded-lg border border-border-default" />
      ))}
    </div>
  );
}

// ── Access denied empty state ──────────────────────────────────────────

function AccessDeniedState({ reason }: { reason: AccessDeniedReason }) {
  const message =
    reason === "TRIP_INACTIVE"
      ? "This handoff is not currently active"
      : reason === "VAULT_ACCESS_REVOKED"
        ? "Your access has been revoked"
        : "You don't have access to secure items";
  const detail =
    reason === "TRIP_INACTIVE"
      ? "The trip has ended or hasn't started yet. Vault access is only available during active trips."
      : reason === "VAULT_ACCESS_REVOKED"
        ? "The homeowner has revoked your vault access. Contact them if you believe this is a mistake."
        : "Your phone number isn't registered for vault access on this trip. Check with your homeowner.";

  return (
    <div className="bg-bg-raised rounded-xl p-8 flex flex-col items-center text-center gap-4">
      <VaultLockIcon />
      <div className="flex flex-col gap-2">
        <p className="font-body text-base font-semibold text-text-primary">{message}</p>
        <p className="font-body text-sm text-text-muted max-w-[280px]">{detail}</p>
      </div>
    </div>
  );
}

// ── Main VaultTab component ────────────────────────────────────────────

export function VaultTab({ tripId, propertyId, ownerName }: VaultTabProps) {
  const sessionKey = `vault_verified_${tripId}`;
  const phoneKey = `vault_phone_${tripId}`;

  // Online/offline detection — vault is online-only for security.
  const [isOnline, setIsOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const handleOnline = useCallback(() => setIsOnline(true), []);
  const handleOffline = useCallback(() => setIsOnline(false), []);
  useEffect(() => {
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [handleOnline, handleOffline]);

  // Derive initial state from sessionStorage (SSR-safe).
  // Default to "initial" — no vault data is fetched until the sitter identifies themselves.
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window === "undefined") return "initial";
    return sessionStorage.getItem(sessionKey) === "1" ? "loading_items" : "initial";
  });
  const [phone, setPhone] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(phoneKey) ?? "";
  });
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notRegisteredNote, setNotRegisteredNote] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [pinSent, setPinSent] = useState(false); // tracks if we've ever sent a PIN this session
  const [decryptedItems, setDecryptedItems] = useState<DecryptedVaultItem[]>([]);
  const [accessDeniedReason, setAccessDeniedReason] = useState<AccessDeniedReason | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Upfront trip status check — if the trip is not active we show access denied
  // immediately without requiring the user to attempt verification.
  const tripStatus = useQuery(api.trips.getTripStatus, { tripId });

  // Actions — NOTE: we do NOT query vaultItems.listByPropertyId here.
  // Item labels and counts must never be sent to unregistered viewers.
  const sendPinAction = useAction(api.vaultActions.sendSmsPin);
  const verifyPinAction = useAction(api.vaultActions.verifyPin);
  const getDecryptedItemsAction = useAction(api.vaultActions.getDecryptedVaultItems);

  // Auto-load decrypted items when phase is loading_items.
  // setState is called inside .then() callbacks, which is the allowed ESLint pattern.
  useEffect(() => {
    if (phase !== "loading_items") return;

    let cancelled = false;
    const currentPhone = phone;

    const fetchPromise = getDecryptedItemsAction({
      propertyId,
      tripId,
      sitterPhone: currentPhone,
    });

    fetchPromise.then((result) => {
      if (cancelled) return;
      if (result.success) {
        setDecryptedItems(result.items);
        setPhase("revealed");
      } else {
        // Access denied — show typed empty state
        if (result.error === "VAULT_ACCESS_DENIED") {
          sessionStorage.removeItem(sessionKey);
          setAccessDeniedReason("VAULT_ACCESS_REVOKED");
          setPhase("access_denied");
        } else if (result.error === "TRIP_INACTIVE") {
          setAccessDeniedReason("TRIP_INACTIVE");
          setPhase("access_denied");
        } else if (result.error === "NOT_REGISTERED") {
          // Unregistered phone (e.g. forwarded link) — send back to initial state
          sessionStorage.removeItem(sessionKey);
          setNotRegisteredNote(
            "This phone number isn't registered for vault access on this trip. Contact your homeowner.",
          );
          setPhase("initial");
        } else {
          // NOT_VERIFIED — session expired; send back to gate
          sessionStorage.removeItem(sessionKey);
          setPhase("gate");
          setError("Your verification session has expired. Please verify again.");
        }
      }
    });

    return () => {
      cancelled = true;
    };
  }, [phase, tripId, propertyId, phone, getDecryptedItemsAction, sessionKey]);

  async function handleSendPin() {
    const phoneErr = validatePhone(phone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    setError(null);
    setPhase("sending");
    try {
      const result = await sendPinAction({ tripId, sitterPhone: phone.trim() });
      if (result.success) {
        sessionStorage.setItem(phoneKey, phone.trim());
        setPin("");
        setAttemptsLeft(3);
        setPinSent(true);
        setPhase("pin_entry");
      } else {
        if (result.error === "NOT_REGISTERED") {
          // Phone not in sitter list — go back to initial state with a note
          setNotRegisteredNote(
            "This phone number isn't registered for vault access. Check with your homeowner.",
          );
          setPhase("initial");
        } else if (result.error === "VAULT_ACCESS_DENIED") {
          setAccessDeniedReason("VAULT_ACCESS_REVOKED");
          setPhase("access_denied");
        } else {
          // TRIP_INACTIVE
          setAccessDeniedReason("TRIP_INACTIVE");
          setPhase("access_denied");
        }
      }
    } catch {
      setPhase("gate");
      setError("Something went wrong. Please try again.");
    }
  }

  async function handleVerify() {
    if (pin.length < 6) {
      setError("Please enter all 6 digits.");
      return;
    }
    setError(null);
    setPhase("verifying");
    try {
      const result = await verifyPinAction({ tripId, sitterPhone: phone.trim(), pin });
      if (result.success) {
        sessionStorage.setItem(sessionKey, "1");
        setPhase("loading_items");
      } else if (result.error === "INVALID_PIN") {
        const remaining = attemptsLeft - 1;
        setAttemptsLeft(remaining);
        setPin("");
        if (remaining <= 0) {
          setError("Too many incorrect attempts. Please request a new code.");
          setPhase("gate");
          setPinSent(false);
        } else {
          setError(
            `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`,
          );
          setPhase("pin_entry");
        }
      } else if (result.error === "MAX_ATTEMPTS") {
        setError("Too many incorrect attempts. Please request a new code.");
        setPhase("gate");
        setPinSent(false);
      } else if (result.error === "EXPIRED") {
        setError("Code expired. Please request a new code.");
        setPhase("gate");
        setPinSent(false);
      } else {
        setError("Code not found. Please request a new code.");
        setPhase("gate");
        setPinSent(false);
      }
    } catch {
      setPhase("pin_entry");
      setError("Something went wrong. Please try again.");
    }
  }

  async function handleResend() {
    setError(null);
    setPin("");
    setPhase("sending");
    try {
      const result = await sendPinAction({ tripId, sitterPhone: phone.trim() });
      if (result.success) {
        setAttemptsLeft(3);
        setPhase("pin_entry");
      } else {
        setPhase("gate");
        setError("Failed to resend code. Please try again.");
      }
    } catch {
      setPhase("pin_entry");
      setError("Failed to resend code. Please try again.");
    }
  }

  function handleCopy(itemId: string, value: string) {
    void navigator.clipboard.writeText(value).then(() => {
      setCopiedId(itemId);
      setTimeout(() => setCopiedId(null), 1500);
    });
  }

  const isSending = phase === "sending";
  const isVerifying = phase === "verifying";
  const isLoadingItems = phase === "loading_items";

  // ── Offline state: vault is online-only ───────────────────────────
  // Never show cached or stale vault data — credentials must not be stored.

  if (!isOnline) {
    return (
      <div className="bg-bg-raised rounded-xl p-8 flex flex-col items-center text-center gap-4">
        <div className="flex items-center justify-center w-14 h-14 rounded-round bg-vault text-text-on-vault shadow-sm">
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div className="flex flex-col gap-2">
          <p className="font-body text-base font-semibold text-text-primary">
            Connect to the internet to access secure items
          </p>
          <p className="font-body text-sm text-text-muted max-w-[280px]">
            Vault items are never stored offline to keep your codes safe.
          </p>
        </div>
      </div>
    );
  }

  // ── Upfront trip inactive check ────────────────────────────────────
  // Show before any user interaction so the sitter sees the right state
  // immediately without having to attempt phone verification first.

  if (tripStatus !== undefined && tripStatus !== null && !tripStatus.active && phase !== "revealed") {
    return (
      <div className="flex flex-col gap-4">
        <AccessDeniedState reason="TRIP_INACTIVE" />
      </div>
    );
  }

  // ── Access denied state ────────────────────────────────────────────

  if (phase === "access_denied" && accessDeniedReason) {
    return (
      <div className="flex flex-col gap-4">
        <AccessDeniedState reason={accessDeniedReason} />
      </div>
    );
  }

  // ── Revealed state ─────────────────────────────────────────────────

  if (phase === "revealed") {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-round bg-secondary text-text-on-primary shrink-0">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <p className="font-body text-sm font-semibold text-secondary">
            Identity verified — vault unlocked
          </p>
        </div>

        {decryptedItems.length === 0 ? (
          <div className="bg-bg-raised rounded-xl border border-dashed border-border-strong p-8 flex flex-col items-center text-center gap-3">
            <span className="text-3xl" aria-hidden="true">
              🔐
            </span>
            <p className="font-body text-sm font-semibold text-text-primary">No vault items</p>
            <p className="font-body text-xs text-text-muted">
              Your homeowner hasn&rsquo;t added any secure items yet.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {decryptedItems.map((item) => (
              <VaultItem
                key={item.id}
                state="revealed"
                icon={<ItemTypeIcon />}
                label={item.label}
                hint={item.instructions}
                value={item.value}
                onCopy={() => handleCopy(item.id, item.value)}
                copied={copiedId === item.id}
                locationCard={item.locationCard}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Loading state ──────────────────────────────────────────────────

  if (isLoadingItems) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-vault border-t-transparent rounded-round animate-spin" aria-hidden="true" />
          <p className="font-body text-sm text-text-secondary">Unlocking vault…</p>
        </div>
        <VaultSkeleton />
      </div>
    );
  }

  // ── Initial state: unregistered-viewer gate ────────────────────────
  // Shown to ALL viewers who haven't verified their phone yet.
  // No vault item labels, counts, or blurred content is ever shown here.

  if (phase === "initial") {
    return (
      <div className="bg-bg-raised rounded-xl p-8 flex flex-col items-center text-center gap-6 shadow-sm">
        <VaultLockIcon />
        <div className="flex flex-col gap-2">
          <p className="font-body text-base font-semibold text-text-primary">
            {ownerName} shared secure info with you
          </p>
          {notRegisteredNote ? (
            <div
              role="alert"
              className="mt-1 flex items-start gap-2.5 bg-warning-light text-warning rounded-lg px-4 py-3 text-left"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="shrink-0 mt-0.5"
                aria-hidden="true"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <p className="font-body text-sm">{notRegisteredNote}</p>
            </div>
          ) : (
            <p className="font-body text-sm text-text-muted max-w-[280px]">
              Verify your phone number to view
            </p>
          )}
        </div>
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            setNotRegisteredNote(null);
            setError(null);
            setPhone("");
            setPhase("gate");
          }}
          className="w-full"
        >
          {notRegisteredNote ? "Try a different number" : "Verify Phone Number"}
        </Button>
      </div>
    );
  }

  // ── Verification gate (phone input / PIN entry) ────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col items-center text-center gap-3 pt-2">
        <VaultLockIcon />
        <div className="flex flex-col gap-1">
          <h2 className="font-display text-2xl text-text-primary">Vault</h2>
          <p className="font-body text-sm text-text-secondary max-w-[280px]">
            {phase === "pin_entry"
              ? `Code sent. Enter the 6-digit code we texted you.`
              : "Enter your phone number to receive a verification code."}
          </p>
        </div>
      </div>

      {/* Form card */}
      <div className="bg-bg-raised rounded-xl border border-border-default shadow-md p-5 flex flex-col gap-4">
        {phase === "gate" || isSending ? (
          /* Phone number input */
          <>
            <Input
              label="Phone number"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 867-5309"
              value={phone}
              onChange={(e) => {
                setPhone(formatPhoneInput(e.target.value));
                setError(null);
              }}
              disabled={isSending}
              error={error ?? undefined}
            />
            <Button
              variant="vault"
              size="lg"
              disabled={isSending || !phone.trim()}
              onClick={handleSendPin}
              className="w-full"
            >
              {isSending ? "Sending…" : "Send verification code"}
            </Button>
            <button
              type="button"
              className="font-body text-xs text-text-muted underline cursor-pointer bg-transparent border-none p-0 text-center"
              onClick={() => {
                setPhone("");
                setError(null);
                setPhase("initial");
              }}
            >
              Cancel
            </button>
          </>
        ) : (
          /* PIN input */
          <>
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <p className="font-body text-sm font-semibold text-text-primary text-center">
                  Enter 6-digit code
                </p>
                <p className="font-body text-xs text-text-muted text-center">
                  Expires in 10 minutes
                </p>
              </div>
              <PinInput
                value={pin}
                onChange={setPin}
                disabled={isVerifying}
                error={!!error}
                autoFocus
              />
              {error && (
                <p
                  className={`font-body text-sm text-center ${attemptsLeft <= 1 ? "text-danger" : "text-warning"
                    }`}
                  role="alert"
                >
                  {error}
                </p>
              )}
              {!error && attemptsLeft < 3 && (
                <p className="font-body text-xs text-text-muted text-center">
                  {attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining
                </p>
              )}
            </div>

            <Button
              variant="vault"
              size="lg"
              disabled={isVerifying || pin.length < 6}
              onClick={handleVerify}
              className="w-full"
            >
              {isVerifying ? "Verifying…" : "Verify code"}
            </Button>

            {/* Resend link */}
            {pinSent && !isVerifying && (
              <div className="flex items-center justify-center gap-1">
                <span className="font-body text-xs text-text-muted">
                  Didn&rsquo;t receive it?
                </span>
                <button
                  type="button"
                  className="font-body text-xs font-semibold text-vault underline cursor-pointer bg-transparent border-none p-0"
                  onClick={handleResend}
                  disabled={isSending}
                >
                  Resend code
                </button>
              </div>
            )}

            {/* Back to phone entry */}
            <button
              type="button"
              className="font-body text-xs text-text-muted underline cursor-pointer bg-transparent border-none p-0 text-center"
              onClick={() => {
                setPhase("gate");
                setPin("");
                setError(null);
              }}
            >
              Change phone number
            </button>
          </>
        )}
      </div>

      {/* Security note */}
      <p className="font-body text-xs text-text-muted text-center max-w-[280px] mx-auto">
        Your codes are encrypted. Vault access expires automatically when the trip ends.
      </p>
    </div>
  );
}
