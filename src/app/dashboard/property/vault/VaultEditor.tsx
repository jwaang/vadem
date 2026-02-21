"use client";

import { useState, type ReactElement } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { ChevronLeftIcon, PlusIcon, EyeIcon, EyeOffIcon, PencilIcon, TrashIcon, LockIcon } from "@/components/ui/icons";

// ── Types ─────────────────────────────────────────────────────────────────────

type VaultItemType =
  | "door_code"
  | "alarm_code"
  | "wifi"
  | "gate_code"
  | "garage_code"
  | "safe_combination"
  | "custom";

interface VaultItemLabel {
  _id: Id<"vaultItems">;
  _creationTime: number;
  propertyId: Id<"properties">;
  itemType: VaultItemType;
  label: string;
  instructions?: string;
  locationCardId?: Id<"locationCards">;
  sortOrder: number;
}

// ── Vault type icon components ─────────────────────────────────────────────────

function DoorIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M3 21V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v16" />
      <path d="M14 21v-6a2 2 0 0 0-2-2H12a2 2 0 0 0-2 2v6" />
      <circle cx="16" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

function AlarmIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function GateIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="12" y1="3" x2="12" y2="17" />
      <line x1="2" y1="10" x2="22" y2="10" />
      <path d="M2 21h20" />
    </svg>
  );
}

function GarageIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <line x1="9" y1="22" x2="9" y2="14" />
      <line x1="15" y1="22" x2="15" y2="14" />
      <line x1="3" y1="14" x2="21" y2="14" />
    </svg>
  );
}

function SafeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 9v-2M12 17v-2M9 12H7M17 12h-2" />
    </svg>
  );
}

function CustomIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

// ── Vault type config ──────────────────────────────────────────────────────────

const VAULT_TYPES: {
  type: VaultItemType;
  label: string;
  defaultLabel: string;
  icon: () => ReactElement;
}[] = [
  { type: "door_code", label: "Door Code", defaultLabel: "Front Door Code", icon: DoorIcon },
  { type: "alarm_code", label: "Alarm Code", defaultLabel: "Alarm Code", icon: AlarmIcon },
  { type: "wifi", label: "WiFi", defaultLabel: "WiFi Password", icon: WifiIcon },
  { type: "gate_code", label: "Gate Code", defaultLabel: "Gate Code", icon: GateIcon },
  { type: "garage_code", label: "Garage", defaultLabel: "Garage Code", icon: GarageIcon },
  { type: "safe_combination", label: "Safe", defaultLabel: "Safe Combination", icon: SafeIcon },
  { type: "custom", label: "Custom", defaultLabel: "", icon: CustomIcon },
];

function getTypeConfig(type: VaultItemType) {
  return VAULT_TYPES.find((t) => t.type === type) ?? VAULT_TYPES[VAULT_TYPES.length - 1]!;
}

function getTypeIcon(type: VaultItemType) {
  const config = getTypeConfig(type);
  return config.icon();
}

// ── Value input with eye toggle ────────────────────────────────────────────────

interface ValueInputProps {
  label: string;
  id: string;
  value: string;
  onChange: (val: string) => void;
  hint?: string;
  error?: string;
  placeholder?: string;
}

function ValueInput({ label, id, value, onChange, hint, error, placeholder }: ValueInputProps) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-body text-sm font-semibold text-text-primary">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={revealed ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={[
            "font-body text-base leading-normal text-text-primary bg-bg-raised border-[1.5px] rounded-md p-3 pr-11 outline-none w-full transition-[border-color,box-shadow,background-color] duration-150 ease-out placeholder:text-text-muted hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]",
            error
              ? "border-danger focus:border-danger focus:shadow-[0_0_0_3px_var(--color-danger-light)]"
              : "border-border-default",
          ].join(" ")}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setRevealed((r) => !r)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary transition-colors duration-150"
          aria-label={revealed ? "Hide value" : "Show value"}
        >
          {revealed ? <EyeOffIcon size={18} /> : <EyeIcon size={18} />}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="font-body text-xs leading-normal text-danger m-0">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="font-body text-xs leading-normal text-text-muted m-0">
          {hint}
        </p>
      )}
    </div>
  );
}

// ── Type selector grid ─────────────────────────────────────────────────────────

interface TypeSelectorProps {
  selected: VaultItemType;
  onChange: (type: VaultItemType) => void;
}

function TypeSelector({ selected, onChange }: TypeSelectorProps) {
  return (
    <div className="flex flex-col gap-2">
      <span className="font-body text-sm font-semibold text-text-primary">Type</span>
      <div className="grid grid-cols-4 gap-2">
        {VAULT_TYPES.map(({ type, label, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => onChange(type)}
            className={[
              "flex flex-col items-center gap-1.5 py-3 px-2 rounded-lg border transition-[border-color,background-color,box-shadow] duration-150",
              selected === type
                ? "border-vault bg-vault-subtle text-vault"
                : "border-border-default bg-bg-raised text-text-muted hover:border-vault-light hover:bg-vault-subtle hover:text-vault",
            ].join(" ")}
            aria-pressed={selected === type}
          >
            <Icon />
            <span className="font-body text-[11px] leading-tight text-center">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Vault item card (list view) ────────────────────────────────────────────────

interface VaultItemCardProps {
  item: VaultItemLabel;
  onEdit: () => void;
  onDelete: () => void;
  deleteConfirm: boolean;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
  isDeleting: boolean;
}

function VaultItemCard({
  item,
  onEdit,
  onDelete,
  deleteConfirm,
  onConfirmDelete,
  onCancelDelete,
  isDeleting,
}: VaultItemCardProps) {
  const config = getTypeConfig(item.itemType);

  return (
    <div className="bg-bg-raised rounded-lg border border-border-default overflow-hidden" style={{ boxShadow: "var(--shadow-xs)" }}>
      <div className="flex items-center gap-4 py-4 px-5">
        {/* Type icon */}
        <div className="flex items-center justify-center w-11 h-11 min-w-[44px] rounded-md bg-vault text-text-on-vault shrink-0">
          {getTypeIcon(item.itemType)}
        </div>

        {/* Label + masked value */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <span className="font-body text-sm font-semibold leading-snug text-text-primary truncate">
            {item.label}
          </span>
          <span className="font-body text-xs leading-normal text-text-muted">
            {config.label}
          </span>
          <span className="font-mono text-sm tracking-[0.2em] text-text-muted mt-0.5">
            ••••••••
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <IconButton
            icon={<PencilIcon />}
            aria-label={`Edit ${item.label}`}
            size="sm"
            onClick={onEdit}
          />
          <IconButton
            icon={<TrashIcon />}
            aria-label={`Delete ${item.label}`}
            variant="danger"
            size="sm"
            onClick={onDelete}
          />
        </div>
      </div>

      {/* Inline delete confirmation */}
      {deleteConfirm && (
        <div className="px-5 py-4 bg-danger-light border-t border-[color:var(--color-danger-light)] flex items-center justify-between gap-4">
          <p className="font-body text-sm text-danger font-semibold">
            Delete &ldquo;{item.label}&rdquo;?
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={onCancelDelete} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={onConfirmDelete} disabled={isDeleting}>
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add / Edit form ────────────────────────────────────────────────────────────

interface VaultFormProps {
  propertyId: Id<"properties">;
  editItem?: VaultItemLabel;
  existingCount: number;
  onDone: () => void;
}

function VaultForm({ propertyId, editItem, existingCount, onDone }: VaultFormProps) {
  const isEdit = !!editItem;

  const [itemType, setItemType] = useState<VaultItemType>(editItem?.itemType ?? "door_code");
  const [label, setLabel] = useState(editItem?.label ?? "Front Door Code");
  const [value, setValue] = useState("");
  const [instructions, setInstructions] = useState(editItem?.instructions ?? "");
  const [labelError, setLabelError] = useState("");
  const [valueError, setValueError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createVaultItem = useAction(api.vaultActions.createVaultItem);
  const updateMeta = useMutation(api.vaultItems.update);
  const updateValue = useAction(api.vaultActions.updateVaultItemValue);

  function handleTypeChange(type: VaultItemType) {
    setItemType(type);
    // Only auto-fill label if it's still the default for the previous type or empty
    const prevDefault = getTypeConfig(itemType).defaultLabel;
    if (!isEdit && (label === prevDefault || label === "")) {
      setLabel(getTypeConfig(type).defaultLabel);
    }
  }

  function validate(): boolean {
    let ok = true;
    if (!label.trim()) {
      setLabelError("Label is required.");
      ok = false;
    } else {
      setLabelError("");
    }
    if (!isEdit && !value.trim()) {
      setValueError("Value is required.");
      ok = false;
    } else {
      setValueError("");
    }
    return ok;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      if (isEdit) {
        // Update metadata
        await updateMeta({
          vaultItemId: editItem._id,
          itemType,
          label: label.trim(),
          instructions: instructions.trim() || undefined,
        });
        // Re-encrypt value only if user typed something
        if (value.trim()) {
          await updateValue({ vaultItemId: editItem._id, value: value.trim() });
        }
      } else {
        await createVaultItem({
          propertyId,
          itemType,
          label: label.trim(),
          value: value.trim(),
          instructions: instructions.trim() || undefined,
          sortOrder: existingCount,
        });
      }
      onDone();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      setSubmitError(msg);
      setIsSubmitting(false);
    }
  }

  return (
    <div
      className="bg-bg-raised rounded-xl border border-border-default p-6 flex flex-col gap-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div>
        <h2 className="font-body text-base font-semibold text-text-primary">
          {isEdit ? "Edit Vault Item" : "Add Vault Item"}
        </h2>
        <p className="font-body text-xs text-text-secondary mt-0.5">
          {isEdit
            ? "Update the label, type, or instructions. Leave value blank to keep the current code."
            : "Values are encrypted before being saved. They never leave your device in plain text."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <TypeSelector selected={itemType} onChange={handleTypeChange} />

        <Input
          label="Label"
          id="vault-label"
          value={label}
          onChange={(e) => {
            setLabel(e.target.value);
            setLabelError("");
          }}
          placeholder="e.g. Front Door Code"
          error={labelError}
        />

        <ValueInput
          label={isEdit ? "Value (leave blank to keep current)" : "Value"}
          id="vault-value"
          value={value}
          onChange={(val) => {
            setValue(val);
            setValueError("");
          }}
          placeholder={isEdit ? "••••••••" : "Enter code or password"}
          hint={isEdit ? undefined : undefined}
          error={valueError}
        />

        <Textarea
          label="Instructions (optional)"
          id="vault-instructions"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="e.g. Press * before entering the code"
          rows={3}
        />

        {submitError && (
          <p className="font-body text-xs text-danger" role="alert">
            {submitError}
          </p>
        )}

        <div className="flex items-center gap-3">
          <Button type="submit" variant="vault" disabled={isSubmitting} className="flex-1">
            {isSubmitting ? "Saving…" : isEdit ? "Save Changes" : "Add to Vault"}
          </Button>
          <Button type="button" variant="ghost" onClick={onDone} disabled={isSubmitting}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Empty state ────────────────────────────────────────────────────────────────

function EmptyVault({ onAdd }: { onAdd: () => void }) {
  return (
    <div
      className="bg-bg-raised rounded-xl p-6 flex flex-col items-center text-center gap-4 border border-dashed border-border-strong"
    >
      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-vault-subtle">
        <LockIcon size={22} />
      </div>
      <div className="flex flex-col gap-1">
        <p className="font-body text-sm font-semibold text-text-primary">No vault items yet</p>
        <p className="font-body text-xs text-text-muted max-w-[260px]">
          Store your alarm codes, WiFi passwords, and other sensitive info securely.
        </p>
      </div>
      <Button variant="soft" size="sm" onClick={onAdd}>
        Add your first item
      </Button>
    </div>
  );
}

// ── Main editor (inner — uses Convex hooks) ────────────────────────────────────

function VaultEditorInner({ propertyId }: { propertyId: Id<"properties"> }) {
  const [mode, setMode] = useState<"list" | "add" | "edit">("list");
  const [editItem, setEditItem] = useState<VaultItemLabel | undefined>(undefined);
  const [deleteConfirmId, setDeleteConfirmId] = useState<Id<"vaultItems"> | null>(null);
  const [deletingId, setDeletingId] = useState<Id<"vaultItems"> | null>(null);

  const items = useQuery(api.vaultItems.listByPropertyId, { propertyId });
  const removeItem = useMutation(api.vaultItems.remove);

  async function handleDelete(itemId: Id<"vaultItems">) {
    setDeletingId(itemId);
    try {
      await removeItem({ vaultItemId: itemId });
    } finally {
      setDeletingId(null);
      setDeleteConfirmId(null);
    }
  }

  if (mode === "add") {
    return (
      <VaultForm
        propertyId={propertyId}
        existingCount={items?.length ?? 0}
        onDone={() => setMode("list")}
      />
    );
  }

  if (mode === "edit" && editItem) {
    return (
      <VaultForm
        propertyId={propertyId}
        editItem={editItem}
        existingCount={items?.length ?? 0}
        onDone={() => {
          setMode("list");
          setEditItem(undefined);
        }}
      />
    );
  }

  // List view
  if (!items) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="font-body text-sm text-text-muted">Loading vault…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {items.length === 0 ? (
        <EmptyVault onAdd={() => setMode("add")} />
      ) : (
        <>
          {items.map((item) => (
            <VaultItemCard
              key={item._id}
              item={item as VaultItemLabel}
              onEdit={() => {
                setEditItem(item as VaultItemLabel);
                setMode("edit");
                setDeleteConfirmId(null);
              }}
              onDelete={() => {
                setDeleteConfirmId(item._id);
              }}
              deleteConfirm={deleteConfirmId === item._id}
              onConfirmDelete={() => handleDelete(item._id)}
              onCancelDelete={() => setDeleteConfirmId(null)}
              isDeleting={deletingId === item._id}
            />
          ))}
          <Button
            variant="soft"
            size="sm"
            icon={<PlusIcon />}
            onClick={() => {
              setMode("add");
              setDeleteConfirmId(null);
            }}
            className="self-start"
          >
            Add item
          </Button>
        </>
      )}
    </div>
  );
}

// ── Outer shell (auth chain + env guard) ──────────────────────────────────────

function VaultEditorWithAuth() {
  const { user } = useAuth();
  const router = useRouter();

  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );
  const userId = sessionData?.userId;

  const properties = useQuery(
    api.properties.listByOwner,
    userId ? { ownerId: userId } : "skip",
  );
  const propertyId = properties?.[0]?._id;

  if (!user) {
    router.replace("/login");
    return null;
  }

  if (!propertyId) {
    if (properties !== undefined) {
      // Loaded but no property
      return (
        <div className="flex flex-col gap-6 items-start">
          <p className="font-body text-sm text-text-secondary">
            No property found. Set up your home first.
          </p>
          <Link href="/dashboard" className="font-body text-sm text-primary hover:text-primary-hover">
            ← Back to dashboard
          </Link>
        </div>
      );
    }
    return (
      <div className="flex items-center justify-center py-16">
        <p className="font-body text-sm text-text-muted">Loading…</p>
      </div>
    );
  }

  return <VaultEditorInner propertyId={propertyId} />;
}

// ── Page root ─────────────────────────────────────────────────────────────────

export default function VaultEditor() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

  return (
    <CreatorLayout activeNav="property">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 font-body text-xs text-text-muted hover:text-text-secondary transition-colors duration-150 mb-2"
          >
            <ChevronLeftIcon />
            Dashboard
          </Link>
          <h1 className="font-display text-4xl text-text-primary leading-tight">Vault</h1>
          <p className="font-body text-sm text-text-secondary">
            Encrypted codes and credentials for your sitter.
          </p>
        </div>

        {/* Security note */}
        <div className="flex items-start gap-3 bg-vault-subtle rounded-lg border border-vault-light px-4 py-3">
          <div className="w-8 h-8 rounded-md flex items-center justify-center bg-vault text-text-on-vault shrink-0 mt-0.5">
            <LockIcon size={18} />
          </div>
          <p className="font-body text-xs text-vault leading-relaxed">
            All values are encrypted with AES-256 before being saved. Your codes are never stored in plain text.
          </p>
        </div>

        {/* Editor content */}
        {!convexUrl ? (
          <p className="font-body text-xs text-text-muted">
            Convex not configured. Set NEXT_PUBLIC_CONVEX_URL to manage vault items.
          </p>
        ) : (
          <VaultEditorWithAuth />
        )}
      </div>
    </CreatorLayout>
  );
}
