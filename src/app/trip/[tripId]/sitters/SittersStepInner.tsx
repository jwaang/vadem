"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";

// ── Constants ──────────────────────────────────────────────────────────────────

const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

const US_PHONE_RE = /^\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;

const STEPS = [
  { label: "Overlay Items", active: false },
  { label: "Sitters", active: true },
  { label: "Proof Settings", active: false },
  { label: "Share", active: false },
];

function validatePhone(phone: string): string {
  if (!phone.trim()) return "Phone number is required.";
  if (!US_PHONE_RE.test(phone.trim()))
    return "Please enter a valid US phone number (e.g. (555) 867-5309).";
  return "";
}

// ── Icons ──────────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg
      width="14"
      height="14"
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
  );
}

function LockOpenIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

// ── Shared sub-components ──────────────────────────────────────────────────────

function VaultToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={[
        "relative inline-flex h-6 w-11 shrink-0 rounded-pill border-2 border-transparent transition-colors duration-250",
        checked ? "bg-secondary" : "bg-border-strong",
      ].join(" ")}
    >
      <span
        className={[
          "inline-block h-5 w-5 rounded-round bg-white shadow transition-[translate] duration-250",
          checked ? "translate-x-5" : "translate-x-0",
        ].join(" ")}
      />
      <span className="sr-only">
        {checked ? "Vault access on" : "Vault access off"}
      </span>
    </button>
  );
}

function FieldInput({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  type = "text",
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-body text-xs font-semibold text-text-secondary"
      >
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full font-body text-sm text-text-primary bg-bg rounded-md px-3 py-2.5 outline-none transition-[border-color,box-shadow] duration-150"
        style={{ border: "1.5px solid var(--border-default)" }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "var(--primary)";
          e.currentTarget.style.boxShadow = "0 0 0 3px var(--primary-subtle)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = error
            ? "var(--danger)"
            : "var(--border-default)";
          e.currentTarget.style.boxShadow = "none";
        }}
      />
      {error && (
        <p role="alert" className="font-body text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

// ── Sitter card ────────────────────────────────────────────────────────────────

interface SitterCardProps {
  sitter: {
    _id: Id<"sitters">;
    name: string;
    phone?: string;
    vaultAccess: boolean;
  };
  onEdit: (id: Id<"sitters">) => void;
  onRemove: (id: Id<"sitters">) => void;
}

function SitterCard({ sitter, onEdit, onRemove }: SitterCardProps) {
  const [confirmRemove, setConfirmRemove] = useState(false);

  return (
    <div className="bg-bg-raised rounded-lg border border-border-default p-4 flex items-center gap-4">
      {/* Vault icon */}
      <div className={sitter.vaultAccess ? "text-vault" : "text-text-muted"}>
        {sitter.vaultAccess ? <LockIcon /> : <LockOpenIcon />}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-text-primary truncate">
          {sitter.name}
        </p>
        <p className="font-body text-xs text-text-secondary">
          {sitter.phone ?? "No phone"}&nbsp;·&nbsp;
          {sitter.vaultAccess ? (
            <span className="text-vault font-semibold">Vault access on</span>
          ) : (
            <span className="text-text-muted">No vault access</span>
          )}
        </p>
      </div>

      {/* Actions */}
      {confirmRemove ? (
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-body text-xs text-text-muted">Remove?</span>
          <button
            onClick={() => onRemove(sitter._id)}
            className="font-body text-xs font-semibold text-danger hover:underline"
          >
            Yes
          </button>
          <button
            onClick={() => setConfirmRemove(false)}
            className="font-body text-xs font-semibold text-text-muted hover:underline"
          >
            No
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(sitter._id)}
            className="text-text-muted hover:text-primary transition-colors duration-150"
            aria-label="Edit sitter"
          >
            <PencilIcon />
          </button>
          <button
            onClick={() => setConfirmRemove(true)}
            className="text-text-muted hover:text-danger transition-colors duration-150"
            aria-label="Remove sitter"
          >
            <TrashIcon />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Edit sitter form ───────────────────────────────────────────────────────────

interface EditSitterFormProps {
  sitter: {
    _id: Id<"sitters">;
    name: string;
    phone?: string;
    vaultAccess: boolean;
  };
  onDone: () => void;
}

function EditSitterForm({ sitter, onDone }: EditSitterFormProps) {
  const updateSitter = useMutation(api.sitters.update);

  const [name, setName] = useState(sitter.name);
  const [phone, setPhone] = useState(sitter.phone ?? "");
  const [vaultAccess, setVaultAccess] = useState(sitter.vaultAccess);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;

    if (!name.trim()) {
      setNameError("Name is required.");
      valid = false;
    } else {
      setNameError("");
    }

    const pErr = validatePhone(phone);
    if (pErr) {
      setPhoneError(pErr);
      valid = false;
    } else {
      setPhoneError("");
    }

    if (!valid) return;

    setIsSaving(true);
    try {
      await updateSitter({
        sitterId: sitter._id,
        name: name.trim(),
        phone: phone.trim() || undefined,
        vaultAccess,
      });
      onDone();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to save. Please try again.";
      setPhoneError(msg);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="bg-bg-raised rounded-lg border-2 border-primary p-4 flex flex-col gap-4">
      <h3 className="font-body text-sm font-semibold text-text-primary">
        Edit sitter
      </h3>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <FieldInput
          id={`edit-name-${sitter._id}`}
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Jordan Smith"
          error={nameError}
        />
        <FieldInput
          id={`edit-phone-${sitter._id}`}
          label="Phone number"
          value={phone}
          onChange={setPhone}
          placeholder="(555) 867-5309"
          type="tel"
          error={phoneError}
        />
        <div className="flex items-center gap-3">
          <VaultToggle checked={vaultAccess} onChange={setVaultAccess} />
          <div>
            <p className="font-body text-sm font-medium text-text-primary">
              Vault access
            </p>
            <p className="font-body text-xs text-text-muted">
              Allow this sitter to view alarm codes and passwords
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Add sitter form ────────────────────────────────────────────────────────────

function AddSitterForm({
  tripId,
  onAdded,
}: {
  tripId: Id<"trips">;
  onAdded: () => void;
}) {
  const createSitter = useMutation(api.sitters.create);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vaultAccess, setVaultAccess] = useState(true);
  const [nameError, setNameError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    let valid = true;

    if (!name.trim()) {
      setNameError("Name is required.");
      valid = false;
    } else {
      setNameError("");
    }

    const pErr = validatePhone(phone);
    if (pErr) {
      setPhoneError(pErr);
      valid = false;
    } else {
      setPhoneError("");
    }

    if (!valid) return;

    setIsAdding(true);
    try {
      await createSitter({
        tripId,
        name: name.trim(),
        phone: phone.trim() || undefined,
        vaultAccess,
      });
      setName("");
      setPhone("");
      setVaultAccess(true);
      onAdded();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to add sitter. Please try again.";
      setPhoneError(msg);
    } finally {
      setIsAdding(false);
    }
  }

  return (
    <div className="bg-bg-raised rounded-xl border border-border-default p-5 flex flex-col gap-4">
      <div>
        <h3 className="font-body text-sm font-semibold text-text-primary">
          Add a sitter
        </h3>
        <p className="font-body text-xs text-text-muted mt-0.5">
          They&apos;ll get the share link and optionally vault access.
        </p>
      </div>

      <form onSubmit={handleAdd} className="flex flex-col gap-4">
        <FieldInput
          id="sitter-name"
          label="Name"
          value={name}
          onChange={setName}
          placeholder="Jordan Smith"
          error={nameError}
        />
        <FieldInput
          id="sitter-phone"
          label="Phone number"
          value={phone}
          onChange={setPhone}
          placeholder="(555) 867-5309"
          type="tel"
          error={phoneError}
        />

        {/* Vault access toggle */}
        <div className="flex items-center gap-3">
          <VaultToggle checked={vaultAccess} onChange={setVaultAccess} />
          <div>
            <p className="font-body text-sm font-medium text-text-primary">
              Vault access
            </p>
            <p className="font-body text-xs text-text-muted">
              Allow this sitter to view alarm codes and passwords
            </p>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isAdding || !name.trim()}
        >
          {isAdding ? "Adding…" : "Add sitter"}
        </Button>
      </form>
    </div>
  );
}

// ── Main step component ────────────────────────────────────────────────────────

function SittersStep({ tripId }: { tripId: Id<"trips"> }) {
  const router = useRouter();
  const sitters = useQuery(api.sitters.listByTrip, { tripId });
  const removeSitter = useMutation(api.sitters.remove);

  const [editingId, setEditingId] = useState<Id<"sitters"> | null>(null);

  async function handleRemove(id: Id<"sitters">) {
    await removeSitter({ sitterId: id });
    if (editingId === id) setEditingId(null);
  }

  function handleContinue() {
    router.push(`/trip/${tripId}/proof`);
  }

  const hasSitters = sitters && sitters.length > 0;

  return (
    <div className="min-h-dvh bg-bg flex flex-col">
      {/* Header */}
      <header className="bg-bg-raised border-b border-border-default px-4 py-4 flex items-center gap-3">
        <a
          href={`/trip/${tripId}/overlay`}
          className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
        >
          ← Back
        </a>
        <span className="text-border-strong">|</span>
        <h1 className="font-body text-sm font-semibold text-text-primary">
          Trip Setup
        </h1>
      </header>

      {/* Step indicator */}
      <div className="bg-bg-raised border-b border-border-default px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-2 overflow-x-auto">
          {STEPS.map(({ label, active }, i) => (
            <div key={label} className="flex items-center gap-2 shrink-0">
              {i > 0 && (
                <span className="text-border-strong font-body text-xs">→</span>
              )}
              <span
                className={[
                  "font-body text-xs font-semibold px-3 py-1 rounded-pill",
                  active
                    ? "bg-accent text-text-on-primary"
                    : "text-text-muted bg-bg-sunken",
                ].join(" ")}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 px-4 py-8">
        <div className="max-w-lg mx-auto flex flex-col gap-6">
          {/* Heading */}
          <div>
            <h2 className="font-display text-3xl text-text-primary leading-tight">
              Who&apos;s watching the place?
            </h2>
            <p className="font-body text-sm text-text-secondary mt-2">
              Add your sitter(s) by name and phone number. You can control vault
              access per sitter.
            </p>
          </div>

          {/* Saved sitters list */}
          {hasSitters && (
            <div className="flex flex-col gap-3">
              <h3 className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
                Sitters ({sitters.length})
              </h3>
              {sitters.map((s) =>
                editingId === s._id ? (
                  <EditSitterForm
                    key={s._id}
                    sitter={s}
                    onDone={() => setEditingId(null)}
                  />
                ) : (
                  <SitterCard
                    key={s._id}
                    sitter={s}
                    onEdit={(id) => setEditingId(id)}
                    onRemove={handleRemove}
                  />
                ),
              )}
            </div>
          )}

          {/* Add sitter form */}
          <AddSitterForm tripId={tripId} onAdded={() => {}} />

          {/* Skip / Continue */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleContinue}
              className="font-body text-sm font-semibold text-text-muted hover:text-text-secondary transition-colors duration-150"
            >
              {hasSitters ? "Skip for now" : "Skip →"}
            </button>

            {hasSitters && (
              <Button variant="primary" onClick={handleContinue}>
                Continue →
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Default export (env guard) ─────────────────────────────────────────────────

export default function SittersStepInner({ tripId }: { tripId: string }) {
  if (!CONVEX_URL) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center">
        <p className="font-body text-sm text-text-muted">
          Configuration error: Convex URL not set.
        </p>
      </div>
    );
  }
  return <SittersStep tripId={tripId as Id<"trips">} />;
}
