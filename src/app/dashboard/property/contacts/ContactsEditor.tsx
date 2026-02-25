"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { validatePhone, normalizePhone, formatPhone, formatPhoneInput } from "@/lib/phone";
import { ChevronLeftIcon, ChevronUpIcon, ChevronDownIcon, LockIcon, TrashIcon, PlusIcon, PencilIcon, PhoneIcon } from "@/components/ui/icons";

// ── Constants ─────────────────────────────────────────────────────────────────

const CONTACT_ROLES = [
  "Owner",
  "Partner",
  "Veterinarian",
  "Neighbor",
  "Emergency",
  "Custom",
] as const;

const selectBase =
  "w-full font-body text-base leading-normal text-text-primary bg-bg-raised border-[1.5px] border-border-default rounded-md p-3 outline-none transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)] appearance-none";

// ── Types ─────────────────────────────────────────────────────────────────────

type ContactDoc = Doc<"emergencyContacts">;

interface ContactFormState {
  name: string;
  role: string;
  phone: string;
  notes: string;
}

// ── Role Select ───────────────────────────────────────────────────────────────

interface RoleSelectProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
}

function RoleSelect({ id, value, onChange }: RoleSelectProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-body text-sm font-semibold text-text-primary">
        Role
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={selectBase}
      >
        <option value="">Select role…</option>
        {CONTACT_ROLES.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  );
}

// ── Locked contact card (ASPCA) ───────────────────────────────────────────────

function LockedContactCard({ contact }: { contact: ContactDoc }) {
  return (
    <div className="flex items-start gap-3 py-4 px-4 rounded-lg border border-border-default bg-bg-raised">
      <div className="flex items-center justify-center w-9 h-9 min-w-[36px] rounded-md bg-secondary-light text-secondary">
        <LockIcon size={18} className="text-secondary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-body text-sm font-semibold text-text-primary">
          {contact.name}
        </p>
        <p className="font-body text-xs text-text-muted mt-0.5">{contact.role}</p>
        <a
          href={`tel:${contact.phone.replace(/\D/g, "")}`}
          className="inline-flex items-center gap-1 font-body text-sm text-secondary hover:text-secondary-hover transition-colors duration-150 mt-1"
        >
          <PhoneIcon size={13} />
          {formatPhone(contact.phone)}
        </a>
      </div>
      <div className="shrink-0 group relative flex items-center gap-1 text-text-muted cursor-default">
        <LockIcon size={12} />
        <span className="font-body text-xs">Locked</span>
        <div className="absolute right-0 top-full mt-1.5 w-56 rounded-lg bg-text-primary px-3 py-2
                        opacity-0 group-hover:opacity-100 transition-opacity duration-150
                        pointer-events-none z-10 shadow-md">
          <p className="font-body text-xs text-white leading-relaxed">
            Always included — cannot be removed from your contacts.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Editable contact card ─────────────────────────────────────────────────────

interface EditableContactCardProps {
  contact: ContactDoc;
  onUpdate: (data: ContactFormState) => Promise<void>;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

function EditableContactCard({
  contact,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
}: EditableContactCardProps) {
  const hasBeenSaved = contact.name !== "" || contact.phone !== "";
  const [isEditing, setIsEditing] = useState(!hasBeenSaved);
  const [form, setForm] = useState<ContactFormState>({
    name: contact.name,
    role: contact.role,
    phone: formatPhone(contact.phone),
    notes: contact.notes ?? "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState("");
  const [justSaved, setJustSaved] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    setForm({
      name: contact.name,
      role: contact.role,
      phone: formatPhone(contact.phone),
      notes: contact.notes ?? "",
    });
  }, [contact._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isDirty =
    form.name.trim() !== contact.name ||
    form.role.trim() !== contact.role ||
    normalizePhone(form.phone) !== contact.phone ||
    form.notes.trim() !== (contact.notes ?? "");

  const set =
    (field: keyof ContactFormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = field === "phone" ? formatPhoneInput(e.target.value) : e.target.value;
      setForm((prev) => ({ ...prev, [field]: value }));
      if (field === "phone") setPhoneError("");
    };

  const handleSave = async () => {
    const pErr = validatePhone(form.phone, false);
    if (pErr) {
      setPhoneError(pErr);
      return;
    }
    setPhoneError("");
    setIsSaving(true);
    setSaveError(null);
    try {
      await onUpdate({ ...form, phone: normalizePhone(form.phone) });
      setJustSaved(true);
      setIsEditing(false);
      setTimeout(() => setJustSaved(false), 2000);
    } catch {
      setSaveError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const cid = contact._id;

  // Read mode: show compact card for saved contacts
  if (!isEditing && hasBeenSaved) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-raised overflow-hidden">
        {showDeleteConfirm && (
          <div className="bg-danger-light px-4 py-3 flex items-center justify-between gap-3">
            <p className="font-body text-sm text-danger font-semibold">Remove this contact?</p>
            <div className="flex gap-2 shrink-0">
              <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </Button>
              <Button variant="danger" size="sm" onClick={onRemove}>
                Yes, remove
              </Button>
            </div>
          </div>
        )}
        <div className="flex items-start gap-3 py-4 px-4">
          {/* Avatar: first initial */}
          <div className="flex items-center justify-center w-9 h-9 min-w-[36px] rounded-md
                          bg-primary-subtle text-primary font-body text-sm font-semibold">
            {contact.name.charAt(0).toUpperCase()}
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-body text-sm font-semibold text-text-primary">{contact.name}</p>
            <p className="font-body text-xs text-text-muted mt-0.5">{contact.role}</p>
            {contact.phone && (
              <a
                href={`tel:${contact.phone}`}
                className="inline-flex items-center gap-1 font-body text-sm text-secondary
                           hover:text-secondary-hover transition-colors duration-150 mt-1"
              >
                <PhoneIcon size={13} />
                {formatPhone(contact.phone)}
              </a>
            )}
            {contact.notes && (
              <p className="font-body text-xs text-text-muted italic mt-1">{contact.notes}</p>
            )}
          </div>
          {/* Actions */}
          <div className="flex flex-col items-end justify-between self-stretch shrink-0 py-0.5">
            {/* Top: edit + delete */}
            <div className="flex items-center gap-0.5">
              <IconButton
                icon={<PencilIcon />}
                aria-label="Edit contact"
                onClick={() => setIsEditing(true)}
              />
              <IconButton
                icon={<TrashIcon />}
                aria-label="Remove contact"
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
              />
            </div>
            {/* Bottom: reorder */}
            <div className="flex items-center gap-0.5">
              <IconButton
                icon={<ChevronUpIcon />}
                aria-label="Move up"
                onClick={onMoveUp}
                disabled={!canMoveUp}
              />
              <IconButton
                icon={<ChevronDownIcon />}
                aria-label="Move down"
                onClick={onMoveDown}
                disabled={!canMoveDown}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Edit mode
  return (
    <div className="rounded-lg border border-border-default bg-bg-raised overflow-hidden">
      {/* Card header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-bg-sunken border-b border-border-default">
        <p className="font-body text-sm font-semibold text-text-secondary flex-1 truncate">
          {form.role || "Contact"}
        </p>
      </div>

      {/* Form fields */}
      <div className="p-4 flex flex-col gap-3">
        {saveError && (
          <div
            role="alert"
            className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
          >
            {saveError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Input
            id={`${cid}-name`}
            label="Name"
            placeholder="e.g. Jane Smith"
            value={form.name}
            onChange={set("name")}
          />
          <RoleSelect
            id={`${cid}-role`}
            value={form.role}
            onChange={(value) => setForm((prev) => ({ ...prev, role: value }))}
          />
        </div>

        <Input
          id={`${cid}-phone`}
          label="Phone number"
          type="tel"
          placeholder="e.g. (555) 123-4567"
          value={form.phone}
          onChange={set("phone")}
          error={phoneError || undefined}
        />

        <Input
          id={`${cid}-notes`}
          label="Notes"
          placeholder="e.g. Text first, then call"
          value={form.notes}
          onChange={set("notes")}
          hint="Optional"
        />

        <div className="flex justify-end gap-2 pt-1">
          {hasBeenSaved && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setForm({
                  name: contact.name,
                  role: contact.role,
                  phone: formatPhone(contact.phone),
                  notes: contact.notes ?? "",
                });
                setIsEditing(false);
              }}
            >
              Cancel
            </Button>
          )}
          <Button
            size="sm"
            variant={justSaved ? "soft" : "primary"}
            onClick={() => void handleSave()}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? "Saving…" : justSaved ? "Saved ✓" : "Save contact"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Inner (requires Convex) ───────────────────────────────────────────────────

function ContactsEditorInner() {
  const { user } = useAuth();

  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );

  const properties = useQuery(
    api.properties.listByOwner,
    sessionData?.userId ? { ownerId: sessionData.userId } : "skip",
  );
  const propertyId = properties?.[0]?._id;

  const contacts = useQuery(
    api.emergencyContacts.listByPropertyId,
    propertyId ? { propertyId } : "skip",
  );

  const seedDefaults = useMutation(api.emergencyContacts.seedDefaults);
  const createContact = useMutation(api.emergencyContacts.create);
  const updateContact = useMutation(api.emergencyContacts.update);
  const removeContact = useMutation(api.emergencyContacts.remove);
  const reorderContacts = useMutation(api.emergencyContacts.reorderContacts);

  const seededRef = useRef(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    if (
      contacts !== undefined &&
      contacts.length === 0 &&
      propertyId &&
      !seededRef.current
    ) {
      seededRef.current = true;
      void seedDefaults({ propertyId });
    }
  }, [contacts, propertyId, seedDefaults]);

  const handleUpdate = async (
    contactId: Id<"emergencyContacts">,
    data: ContactFormState,
  ) => {
    await updateContact({
      contactId,
      name: data.name.trim(),
      role: data.role.trim(),
      phone: data.phone.trim(),
      notes: data.notes.trim() || undefined,
    });
  };

  const handleRemove = (contactId: Id<"emergencyContacts">) => {
    setGeneralError(null);
    removeContact({ contactId }).catch(() => {
      setGeneralError("Failed to remove contact. Please try again.");
    });
  };

  const handleMoveUp = (index: number) => {
    if (!contacts || index <= 0) return;
    const prev = contacts[index - 1];
    const curr = contacts[index];
    if (prev.isLocked) return;
    reorderContacts({
      updates: [
        { id: prev._id, sortOrder: curr.sortOrder },
        { id: curr._id, sortOrder: prev.sortOrder },
      ],
    }).catch(() => {
      setGeneralError("Failed to reorder contacts. Please try again.");
    });
  };

  const handleMoveDown = (index: number) => {
    if (!contacts || index >= contacts.length - 1) return;
    const curr = contacts[index];
    const next = contacts[index + 1];
    reorderContacts({
      updates: [
        { id: curr._id, sortOrder: next.sortOrder },
        { id: next._id, sortOrder: curr.sortOrder },
      ],
    }).catch(() => {
      setGeneralError("Failed to reorder contacts. Please try again.");
    });
  };

  const handleAddContact = () => {
    if (!propertyId || !contacts) return;
    const maxSortOrder = contacts.reduce(
      (max, c) => Math.max(max, c.sortOrder),
      -1,
    );
    createContact({
      propertyId,
      name: "",
      role: "",
      phone: "",
      sortOrder: maxSortOrder + 1,
      isLocked: false,
    }).catch(() => {
      setGeneralError("Failed to add contact. Please try again.");
    });
  };

  const isLoading = contacts === undefined;

  return (
    <CreatorLayout activeNav="property">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard/property"
            className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-text-muted hover:text-text-secondary transition-colors duration-150 mb-1"
          >
            <ChevronLeftIcon />
            Property
          </Link>
          <h1 className="font-display text-4xl text-text-primary leading-tight">
            Emergency contacts
          </h1>
          <p className="font-body text-sm text-text-secondary">
            Add contacts your sitter can reach quickly in an emergency.
          </p>
        </div>

        {generalError && (
          <div
            role="alert"
            className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
          >
            {generalError}
          </div>
        )}

        {/* Contact list */}
        {isLoading ? (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-lg bg-bg-sunken animate-pulse"
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {contacts.map((contact, index) =>
              contact.isLocked ? (
                <LockedContactCard key={contact._id} contact={contact} />
              ) : (
                <EditableContactCard
                  key={contact._id}
                  contact={contact}
                  onUpdate={(data) => handleUpdate(contact._id, data)}
                  onRemove={() => handleRemove(contact._id)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  canMoveUp={index > 0 && !contacts[index - 1].isLocked}
                  canMoveDown={index < contacts.length - 1}
                />
              ),
            )}
          </div>
        )}

        {/* Add contact */}
        {!isLoading && (
          <button
            type="button"
            onClick={handleAddContact}
            className="flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-[1.5px] border-dashed border-border-strong bg-bg-sunken hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 font-body text-sm font-semibold text-text-primary"
          >
            <PlusIcon />
            Add contact
          </button>
        )}


      </div>
    </CreatorLayout>
  );
}

// ── Outer (env guard) ─────────────────────────────────────────────────────────

export default function ContactsEditor() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) {
    return (
      <CreatorLayout activeNav="property">
        <p className="font-body text-xs text-text-muted">
          Convex not configured. Set up NEXT_PUBLIC_CONVEX_URL to manage contacts.
        </p>
      </CreatorLayout>
    );
  }
  return <ContactsEditorInner />;
}
