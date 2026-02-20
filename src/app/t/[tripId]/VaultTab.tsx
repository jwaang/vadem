"use client";

import { useState, useEffect } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { VaultItem, LockIcon, type VaultItemLocationCard } from "@/components/ui/VaultItem";
import { PinInput } from "@/components/ui/PinInput";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

// ── Types ─────────────────────────────────────────────────────────────

type Phase =
  | "gate"          // Phone input — enter number to request PIN
  | "sending"       // Waiting for sendSmsPin action
  | "pin_entry"     // PIN input — enter 6-digit code
  | "verifying"     // Waiting for verifyPin action
  | "loading_items" // PIN verified — loading decrypted vault items
  | "revealed"      // Vault items visible
  | "access_denied"; // Trip inactive or sitter not registered

type AccessDeniedReason = "TRIP_INACTIVE" | "NOT_REGISTERED" | "VAULT_ACCESS_DENIED";

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
      : "You don't have access to secure items";
  const detail =
    reason === "TRIP_INACTIVE"
      ? "The trip has ended or hasn't started yet. Vault access is only available during active trips."
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

export function VaultTab({ tripId, propertyId }: VaultTabProps) {
  const sessionKey = `vault_verified_${tripId}`;
  const phoneKey = `vault_phone_${tripId}`;

  // Derive initial state from sessionStorage (SSR-safe)
  const [phase, setPhase] = useState<Phase>(() => {
    if (typeof window === "undefined") return "gate";
    return sessionStorage.getItem(sessionKey) === "1" ? "loading_items" : "gate";
  });
  const [phone, setPhone] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return sessionStorage.getItem(phoneKey) ?? "";
  });
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [pinSent, setPinSent] = useState(false); // tracks if we've ever sent a PIN this session
  const [decryptedItems, setDecryptedItems] = useState<DecryptedVaultItem[]>([]);
  const [accessDeniedReason, setAccessDeniedReason] = useState<AccessDeniedReason | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Vault items list — always loaded (just labels, no sensitive data)
  const vaultItemsList = useQuery(api.vaultItems.listByPropertyId, { propertyId });

  // Actions
  const sendPinAction = useAction(api.vaultActions.sendSmsPin);
  const verifyPinAction = useAction(api.vaultActions.verifyPin);
  const getDecryptedItemsAction = useAction(api.vaultActions.getDecryptedVaultItems);

  // Auto-load decrypted items when phase is loading_items and list is ready.
  // setState is called inside .then() callbacks, which is the allowed ESLint pattern.
  useEffect(() => {
    if (phase !== "loading_items") return;
    if (vaultItemsList === undefined) return; // still loading from Convex

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
        if (
          result.error === "TRIP_INACTIVE" ||
          result.error === "NOT_REGISTERED" ||
          result.error === "VAULT_ACCESS_DENIED"
        ) {
          setAccessDeniedReason(
            result.error === "TRIP_INACTIVE" ? "TRIP_INACTIVE" : "NOT_REGISTERED",
          );
          setPhase("access_denied");
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
  }, [phase, vaultItemsList, tripId, propertyId, phone, getDecryptedItemsAction, sessionKey]);

  async function handleSendPin() {
    if (!phone.trim()) {
      setError("Please enter your phone number.");
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
        setPhase("gate");
        if (result.error === "NOT_REGISTERED") {
          setError("You don't have access to secure items. Check with your homeowner.");
        } else if (result.error === "VAULT_ACCESS_DENIED") {
          setError("You don't have vault access for this trip.");
        } else {
          setError("This handoff is not currently active.");
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

        {vaultItemsList === undefined || isLoadingItems ? (
          <VaultSkeleton />
        ) : decryptedItems.length === 0 ? (
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

  // ── Verification gate ──────────────────────────────────────────────

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
                setPhone(e.target.value);
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
                  className={`font-body text-sm text-center ${
                    attemptsLeft <= 1 ? "text-danger" : "text-warning"
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
