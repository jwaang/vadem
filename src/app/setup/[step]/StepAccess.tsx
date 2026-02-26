"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/authContext";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

// ── Types ─────────────────────────────────────────────────────────────────────

type VaultItemType =
  | "door_code"
  | "alarm_code"
  | "wifi"
  | "gate_code"
  | "garage_code"
  | "safe_combination"
  | "custom";

interface VaultFormValues {
  itemType: VaultItemType | null;
  label: string;
  value: string;
  instructions: string;
  networkName: string;
}

const EMPTY_FORM: VaultFormValues = {
  itemType: null,
  label: "",
  value: "",
  instructions: "",
  networkName: "",
};

const TYPE_DEFAULT_LABELS: Record<VaultItemType, string> = {
  door_code: "Door code",
  alarm_code: "Alarm code",
  wifi: "WiFi password",
  gate_code: "Gate code",
  garage_code: "Garage code",
  safe_combination: "Safe combination",
  custom: "",
};

// ── Icons ─────────────────────────────────────────────────────────────────────

function DoorIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M9 21V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v16" />
      <circle cx="15" cy="13" r="1" fill="currentColor" />
    </svg>
  );
}

function AlarmIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22c1.1 0 2-.9 2-2H10c0 1.1.9 2 2 2z" />
      <path d="M18.7 16H5.3A2 2 0 0 1 4 12.6L5 8a7 7 0 0 1 14 0l1 4.6a2 2 0 0 1-1.3 3.4z" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" />
    </svg>
  );
}

function GateIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 4v16" />
      <path d="M20 4v16" />
      <path d="M4 8h16" />
      <path d="M4 12h16" />
      <path d="M4 16h16" />
    </svg>
  );
}

function GarageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <path d="M9 22V12h6v10" />
    </svg>
  );
}

function SafeIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 8v2" />
      <path d="M12 14v2" />
      <path d="M16 12h-2" />
      <path d="M10 12H8" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="M21 2l-9.6 9.6" />
      <path d="M15.5 7.5l3 3L22 7l-3-3" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

// ── Vault type config ─────────────────────────────────────────────────────────

interface VaultTypeConfig {
  value: VaultItemType;
  label: string;
  icon: React.ReactNode;
}

const VAULT_TYPES: VaultTypeConfig[] = [
  { value: "door_code", label: "Door", icon: <DoorIcon /> },
  { value: "alarm_code", label: "Alarm", icon: <AlarmIcon /> },
  { value: "wifi", label: "WiFi", icon: <WifiIcon /> },
  { value: "gate_code", label: "Gate", icon: <GateIcon /> },
  { value: "garage_code", label: "Garage", icon: <GarageIcon /> },
  { value: "safe_combination", label: "Safe", icon: <SafeIcon /> },
  { value: "custom", label: "Custom", icon: <KeyIcon /> },
];

// ── Saved vault item card ─────────────────────────────────────────────────────

// Doc<"vaultItems"> via listByPropertyId omits encryptedValue — labels only.
type VaultItemLabel = Omit<Doc<"vaultItems">, "encryptedValue">;

function SavedVaultItem({
  item,
  onRemove,
}: {
  item: VaultItemLabel;
  onRemove: () => void;
}) {
  const typeConfig = VAULT_TYPES.find((t) => t.value === item.itemType);

  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-lg border border-vault-light bg-vault-subtle">
      <div className="flex items-center justify-center w-9 h-9 min-w-[36px] rounded-md bg-vault text-text-on-vault">
        {typeConfig?.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-text-primary">
          {item.label}
        </p>
        <p className="font-mono text-xs text-vault tracking-[0.1em] mt-0.5" aria-label="Stored securely">
          {"••••••••••"}
        </p>
        {item.instructions && (
          <p className="font-body text-xs text-text-muted mt-0.5 truncate">
            {item.instructions}
          </p>
        )}
      </div>
      <div className="flex items-center gap-0.5 shrink-0">
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-text-muted hover:text-danger transition-colors duration-150 rounded"
          aria-label={`Remove ${item.label}`}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
}

// ── Masked value input ────────────────────────────────────────────────────────

interface MaskedInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
}

function MaskedInput({ value, onChange, placeholder, error }: MaskedInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="font-body text-sm font-semibold text-text-primary">
        Code or password <span className="text-danger">*</span>
      </label>
      <div
        className={[
          "flex border-[1.5px] rounded-md overflow-hidden",
          "transition-[border-color,box-shadow] duration-150",
          "focus-within:border-primary focus-within:shadow-[0_0_0_3px_var(--color-primary-subtle)]",
          "hover:border-border-strong",
          error ? "border-danger" : "border-border-default",
        ].join(" ")}
      >
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "Enter code or password"}
          className="flex-1 min-w-0 font-body text-sm text-text-primary bg-bg-raised px-3 py-2 outline-none placeholder:text-text-muted"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="px-2.5 flex items-center text-text-muted hover:text-text-secondary transition-colors duration-150 border-l border-border-default bg-bg-raised shrink-0"
          aria-label={show ? "Hide value" : "Show value"}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && (
        <span className="font-body text-xs text-danger">{error}</span>
      )}
    </div>
  );
}

// ── Vault item form ───────────────────────────────────────────────────────────

interface VaultFormProps {
  onSave: (data: VaultFormValues) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  generalError: string | null;
}

function VaultForm({ onSave, onCancel, isSaving, generalError }: VaultFormProps) {
  const [formData, setFormData] = useState<VaultFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectType = (type: VaultItemType) => {
    setFormData((prev) => ({
      ...prev,
      itemType: type,
      // Pre-fill label only if it's currently empty or matches another type's default
      label:
        prev.label === "" || Object.values(TYPE_DEFAULT_LABELS).includes(prev.label)
          ? TYPE_DEFAULT_LABELS[type]
          : prev.label,
    }));
    if (errors.itemType) setErrors((prev) => ({ ...prev, itemType: "" }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.itemType) newErrors.itemType = "Please select a type";
    if (!formData.label.trim()) newErrors.label = "Label is required";
    if (!formData.value.trim()) newErrors.value = "Code or password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave(formData);
  };

  return (
    <div className="border border-border-default rounded-xl bg-bg-raised overflow-hidden">
      <div className="px-5 py-4 border-b border-border-default bg-bg-sunken">
        <h2 className="font-body text-base font-semibold text-text-primary">
          Add access info
        </h2>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {generalError && (
          <div
            role="alert"
            className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
          >
            {generalError}
          </div>
        )}

        {/* Type selector */}
        <div className="flex flex-col gap-2">
          <p className="font-body text-sm font-semibold text-text-primary">
            Type <span className="text-danger">*</span>
          </p>
          <div className="grid grid-cols-4 gap-2">
            {VAULT_TYPES.map((t) => {
              const isSelected = formData.itemType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => selectType(t.value)}
                  className={[
                    "flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center",
                    "transition-[border-color,background-color,color] duration-150",
                    isSelected
                      ? "bg-vault-light border-vault text-vault"
                      : "border-border-default bg-bg-raised text-text-secondary hover:border-vault-light hover:bg-vault-subtle hover:text-vault",
                  ].join(" ")}
                  aria-pressed={isSelected}
                >
                  <span className="flex items-center justify-center">{t.icon}</span>
                  <span className="font-body text-xs leading-tight font-medium">
                    {t.label}
                  </span>
                </button>
              );
            })}
          </div>
          {errors.itemType && (
            <span className="font-body text-xs text-danger">{errors.itemType}</span>
          )}
        </div>

        {/* Label */}
        <Input
          label="Label"
          placeholder="e.g. Front door code"
          value={formData.label}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, label: e.target.value }));
            if (errors.label) setErrors((prev) => ({ ...prev, label: "" }));
          }}
          error={errors.label}
          hint={!errors.label ? "Shown to your sitter" : undefined}
          required
        />

        {/* Masked value */}
        <MaskedInput
          value={formData.value}
          onChange={(v) => {
            setFormData((prev) => ({ ...prev, value: v }));
            if (errors.value) setErrors((prev) => ({ ...prev, value: "" }));
          }}
          placeholder={
            formData.itemType === "wifi"
              ? "e.g. MyWifiPassword123"
              : formData.itemType === "safe_combination"
              ? "e.g. 32-16-8"
              : "e.g. 1234"
          }
          error={errors.value}
        />

        {/* Network name (WiFi only) */}
        {formData.itemType === "wifi" && (
          <Input
            label="Network name"
            placeholder="e.g. HomeWiFi_5G"
            value={formData.networkName}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, networkName: e.target.value }))
            }
            hint="Shown to your sitter so they know which network to join"
          />
        )}

        {/* Instructions */}
        <Textarea
          label="Instructions"
          placeholder="e.g. Enter code on the keypad by the front door"
          value={formData.instructions}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, instructions: e.target.value }))
          }
          hint="Optional — helps sitters know where to use this"
        />

        {/* Actions */}
        <div className="flex flex-col gap-3 pt-1">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : "Save item"}
          </Button>
          <Button
            variant="ghost"
            size="default"
            className="w-full"
            onClick={onCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Step3Access component ────────────────────────────────────────────────

export default function Step3Access() {
  const router = useRouter();
  const { user } = useAuth();

  // Session → userId
  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );

  // userId → propertyId
  const properties = useQuery(
    api.properties.listByOwner,
    sessionData?.userId ? { ownerId: sessionData.userId } : "skip",
  );
  const propertyId = properties?.[0]?._id;

  // Existing vault items (real-time)
  const vaultItems = useQuery(
    api.vaultItems.listByPropertyId,
    propertyId ? { propertyId } : "skip",
  );

  const createVaultItem = useAction(api.vaultActions.createVaultItem);
  const removeVaultItem = useMutation(api.vaultItems.remove);

  const [showForm, setShowForm] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const handleSave = async (data: VaultFormValues): Promise<void> => {
    if (!propertyId) {
      setGeneralError("Property not found. Please complete step 1 first.");
      return;
    }
    if (!data.itemType) return;

    setIsSaving(true);
    setGeneralError(null);

    try {
      await createVaultItem({
        propertyId,
        itemType: data.itemType,
        label: data.label.trim(),
        value: data.value.trim(),
        instructions: data.instructions.trim() || undefined,
        networkName: data.itemType === "wifi" ? data.networkName.trim() || undefined : undefined,
        sortOrder: vaultItems?.length ?? 0,
      });
      setShowForm(false);
    } catch {
      setGeneralError("Something went wrong saving the item. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async (vaultItemId: string) => {
    try {
      await removeVaultItem({
        vaultItemId: vaultItemId as Parameters<typeof removeVaultItem>[0]["vaultItemId"],
      });
    } catch {
      setGeneralError("Failed to remove item. Please try again.");
    }
  };

  const handleNext = () => router.push("/setup/contacts");
  const handleSkip = () => router.push("/setup/contacts");

  const hasItems = (vaultItems?.length ?? 0) > 0;
  const isLoadingSession = user && sessionData === undefined;

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Step heading */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-text-primary leading-tight">
          Add access info
        </h1>
        <p className="font-body text-sm text-text-secondary">
          Store door codes, WiFi passwords, and other credentials your sitter will need.
        </p>
      </div>

      {/* Top-level error */}
      {generalError && !showForm && (
        <div
          role="alert"
          className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
        >
          {generalError}
        </div>
      )}

      {/* Saved items */}
      {hasItems && (
        <div className="flex flex-col gap-2">
          {vaultItems!.map((item) => (
            <SavedVaultItem
              key={item._id}
              item={item}
              onRemove={() => void handleRemove(item._id)}
            />
          ))}
        </div>
      )}

      {/* Form or Add button */}
      {showForm ? (
        <VaultForm
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setGeneralError(null);
          }}
          isSaving={isSaving}
          generalError={showForm ? generalError : null}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setGeneralError(null);
            setShowForm(true);
          }}
          disabled={!!isLoadingSession}
          className="flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-[1.5px] border-dashed border-border-strong bg-bg-sunken hover:border-vault hover:bg-vault-subtle transition-[border-color,background-color] duration-150 font-body text-sm font-semibold text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PlusIcon />
          {hasItems ? "Add another item" : "Add an item"}
        </button>
      )}

      {/* Vault note */}
      {!showForm && (
        <p className="font-body text-xs text-text-muted text-center">
          🔒 Values are stored securely and only shown to verified sitters.
        </p>
      )}

      {/* Navigation */}
      {!showForm && (
        <div className="flex flex-col gap-3 pt-2">
          {hasItems ? (
            <Button size="lg" className="w-full" onClick={handleNext}>
              Next
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="default"
              className="w-full"
              onClick={handleSkip}
            >
              Skip — add later
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
