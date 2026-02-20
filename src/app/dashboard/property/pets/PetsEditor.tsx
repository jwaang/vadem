"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id, Doc } from "../../../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { PetProfileCard } from "@/components/ui/PetProfileCard";
import { validatePhone, normalizePhone, formatPhone, formatPhoneInput } from "@/lib/phone";

// ── Icons ────────────────────────────────────────────────────────────────────

function ChevronLeftIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
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

function ChevronDownIcon({ open }: { open: boolean }) {
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
      style={{
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 250ms var(--ease-out)",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────────────────────────

interface MedicationRow {
  name: string;
  dosage: string;
  frequency: string;
  time: string;
}

const EMPTY_MEDICATION: MedicationRow = { name: "", dosage: "", frequency: "", time: "" };

interface PetFormValues {
  name: string;
  species: string;
  breed: string;
  age: string;
  feedingInstructions: string;
  vetName: string;
  vetPhone: string;
  personalityNotes: string;
  medicalConditions: string;
  medications: MedicationRow[];
  behavioralQuirks: string;
  allergies: string;
  microchipNumber: string;
  walkingRoutine: string;
  groomingNeeds: string;
  comfortItems: string;
}

const EMPTY_FORM: PetFormValues = {
  name: "",
  species: "",
  breed: "",
  age: "",
  feedingInstructions: "",
  vetName: "",
  vetPhone: "",
  personalityNotes: "",
  medicalConditions: "",
  medications: [],
  behavioralQuirks: "",
  allergies: "",
  microchipNumber: "",
  walkingRoutine: "",
  groomingNeeds: "",
  comfortItems: "",
};

function petToFormValues(pet: Doc<"pets">): PetFormValues {
  return {
    name: pet.name,
    species: pet.species,
    breed: pet.breed ?? "",
    age: pet.age ?? "",
    feedingInstructions: pet.feedingInstructions ?? "",
    vetName: pet.vetName ?? "",
    vetPhone: formatPhone(pet.vetPhone ?? ""),
    personalityNotes: pet.personalityNotes ?? "",
    medicalConditions: pet.medicalConditions ?? "",
    medications: pet.medications,
    behavioralQuirks: pet.behavioralQuirks ?? "",
    allergies: pet.allergies ?? "",
    microchipNumber: pet.microchipNumber ?? "",
    walkingRoutine: pet.walkingRoutine ?? "",
    groomingNeeds: pet.groomingNeeds ?? "",
    comfortItems: pet.comfortItems ?? "",
  };
}

// ── Shared input field class ──────────────────────────────────────────────────

const inputFieldClass =
  "w-full font-body text-sm leading-normal text-text-primary bg-bg-raised border-[1.5px] border-border-default rounded-md px-3 py-2 outline-none transition-[border-color,box-shadow] duration-150 ease-out placeholder:text-text-muted hover:border-border-strong focus:border-primary focus:shadow-[0_0_0_3px_var(--color-primary-subtle)]";

// ── Existing photo thumbnail (resolves storage ID to URL) ─────────────────────

function ExistingPhotoThumb({
  photoId,
  index,
  onRemove,
}: {
  photoId: Id<"_storage">;
  index: number;
  onRemove: () => void;
}) {
  const url = useQuery(api.storage.getUrl, { storageId: photoId });
  return (
    <div className="relative aspect-square rounded-md overflow-hidden border border-border-default bg-bg-sunken">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Photo ${index + 1}`} className="w-full h-full object-cover block" />
      ) : (
        <div className="w-full h-full bg-primary-light" />
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-bg-raised border border-border-default rounded p-1 text-text-secondary hover:text-danger hover:border-danger transition-colors duration-150"
        aria-label={`Remove existing photo ${index + 1}`}
      >
        <TrashIcon />
      </button>
    </div>
  );
}

// ── Pet form (handles both add and edit modes) ────────────────────────────────

interface PetFormProps {
  initialValues?: PetFormValues;
  existingPhotoIds?: Id<"_storage">[];
  onSave: (
    data: PetFormValues,
    newPhotos: File[],
    keptPhotoIds: Id<"_storage">[],
  ) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  generalError: string | null;
  saveLabel?: string;
  title?: string;
}

function PetForm({
  initialValues,
  existingPhotoIds = [],
  onSave,
  onCancel,
  isSaving,
  generalError,
  saveLabel = "Save pet",
  title = "Pet details",
}: PetFormProps) {
  const [formData, setFormData] = useState<PetFormValues>(
    initialValues ?? EMPTY_FORM,
  );
  const [keptPhotoIds, setKeptPhotoIds] = useState<Id<"_storage">[]>(existingPhotoIds);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviews, setNewPhotoPreviews] = useState<string[]>([]);
  const [showMoreDetails, setShowMoreDetails] = useState(() => {
    if (!initialValues) return false;
    // Auto-expand if any optional fields are filled
    return !!(
      initialValues.personalityNotes ||
      initialValues.medicalConditions ||
      initialValues.medications.length > 0 ||
      initialValues.behavioralQuirks ||
      initialValues.allergies ||
      initialValues.microchipNumber ||
      initialValues.walkingRoutine ||
      initialValues.groomingNeeds ||
      initialValues.comfortItems
    );
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set =
    (field: keyof PetFormValues) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = field === "vetPhone" ? formatPhoneInput(e.target.value) : e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
    };

  const handleAddPhotos = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      const previews = files.map((f) => URL.createObjectURL(f));
      setNewPhotoFiles((prev) => [...prev, ...files]);
      setNewPhotoPreviews((prev) => [...prev, ...previews]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [],
  );

  const handleRemoveNewPhoto = useCallback((index: number) => {
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPhotoPreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleRemoveExistingPhoto = useCallback((photoId: Id<"_storage">) => {
    setKeptPhotoIds((prev) => prev.filter((id) => id !== photoId));
  }, []);

  const addMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [...prev.medications, { ...EMPTY_MEDICATION }],
    }));
  };

  const removeMedication = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
  };

  const updateMedication = (
    index: number,
    field: keyof MedicationRow,
    value: string,
  ) => {
    setFormData((prev) => {
      const meds = [...prev.medications];
      meds[index] = { ...meds[index], [field]: value };
      return { ...prev, medications: meds };
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Pet name is required";
    if (!formData.species.trim()) newErrors.species = "Species is required";
    const vetPhoneErr = validatePhone(formData.vetPhone, false);
    if (vetPhoneErr) newErrors.vetPhone = vetPhoneErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave(formData, newPhotoFiles, keptPhotoIds);
  };

  const totalPhotos = keptPhotoIds.length + newPhotoPreviews.length;

  return (
    <div className="border border-border-default rounded-xl bg-bg-raised overflow-hidden">
      <div className="px-5 py-4 border-b border-border-default bg-bg-sunken">
        <h3 className="font-body text-base font-semibold text-text-primary">
          {title}
        </h3>
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

        {/* Photos */}
        <div className="flex flex-col gap-2">
          <p className="font-body text-sm font-semibold text-text-primary">
            Photos{" "}
            <span className="font-normal text-text-muted">(optional)</span>
          </p>

          {totalPhotos > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {/* Existing photos */}
              {keptPhotoIds.map((id, i) => (
                <ExistingPhotoThumb
                  key={id}
                  photoId={id}
                  index={i}
                  onRemove={() => handleRemoveExistingPhoto(id)}
                />
              ))}
              {/* New photo previews */}
              {newPhotoPreviews.map((url, i) => (
                <div
                  key={`new-${i}`}
                  className="relative aspect-square rounded-md overflow-hidden border border-border-default bg-bg-sunken"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`New photo ${i + 1}`}
                    className="w-full h-full object-cover block"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveNewPhoto(i)}
                    className="absolute top-1 right-1 bg-bg-raised border border-border-default rounded p-1 text-text-secondary hover:text-danger hover:border-danger transition-colors duration-150"
                    aria-label={`Remove new photo ${i + 1}`}
                  >
                    <TrashIcon />
                  </button>
                </div>
              ))}
              {/* Add more */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-md border-[1.5px] border-dashed border-border-strong bg-bg-sunken hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 flex flex-col items-center justify-center gap-1 text-text-muted"
                aria-label="Add more photos"
              >
                <PlusIcon />
                <span className="font-body text-xs">Add</span>
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 py-6 px-4 rounded-md border-[1.5px] border-dashed border-border-strong bg-bg-sunken hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 text-center cursor-pointer"
            >
              <span className="text-text-muted">
                <UploadIcon />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-body text-sm font-semibold text-text-primary">
                  Tap to upload photos
                </span>
                <span className="font-body text-xs text-text-muted">
                  JPG, PNG or HEIC — you can add multiple
                </span>
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="sr-only"
            aria-label="Upload pet photos"
            onChange={handleAddPhotos}
          />
        </div>

        {/* Required fields */}
        <Input
          label="Pet name"
          placeholder="e.g. Biscuit"
          value={formData.name}
          onChange={set("name")}
          error={errors.name}
          required
          autoFocus={!initialValues}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Species"
            placeholder="e.g. Dog"
            value={formData.species}
            onChange={set("species")}
            error={errors.species}
            hint={!errors.species ? "Dog, cat, bird…" : undefined}
            required
          />
          <Input
            label="Breed"
            placeholder="e.g. Corgi"
            value={formData.breed}
            onChange={set("breed")}
            hint="Optional"
          />
        </div>

        <Input
          label="Age"
          placeholder="e.g. 3 years old"
          value={formData.age}
          onChange={set("age")}
        />

        <Textarea
          label="Feeding instructions"
          placeholder="e.g. 1 cup dry food twice daily — 7am and 6pm. Fresh water always."
          value={formData.feedingInstructions}
          onChange={set("feedingInstructions")}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Vet name"
            placeholder="e.g. Dr. Kim"
            value={formData.vetName}
            onChange={set("vetName")}
          />
          <Input
            label="Vet phone"
            placeholder="e.g. (512) 555-0100"
            value={formData.vetPhone}
            onChange={set("vetPhone")}
            type="tel"
            error={errors.vetPhone}
          />
        </div>

        {/* More details toggle */}
        <button
          type="button"
          onClick={() => setShowMoreDetails((v) => !v)}
          className="flex items-center gap-2 font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150 py-1 -mx-1 px-1 rounded"
          aria-expanded={showMoreDetails}
        >
          <ChevronDownIcon open={showMoreDetails} />
          {showMoreDetails ? "Hide additional details" : "Add more details"}
        </button>

        {showMoreDetails && (
          <div className="flex flex-col gap-4">
            <Textarea
              label="Personality notes"
              placeholder="e.g. Very gentle, loves cuddles. Nervous around strangers at first but warms up quickly."
              value={formData.personalityNotes}
              onChange={set("personalityNotes")}
            />

            <Textarea
              label="Medical conditions"
              placeholder="e.g. Mild hip dysplasia — avoid long runs. Seasonal allergies in spring."
              value={formData.medicalConditions}
              onChange={set("medicalConditions")}
            />

            {/* Medications */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <p className="font-body text-sm font-semibold text-text-primary">
                  Medications
                </p>
                <button
                  type="button"
                  onClick={addMedication}
                  className="flex items-center gap-1.5 font-body text-xs font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
                >
                  <PlusIcon />
                  Add medication
                </button>
              </div>

              {formData.medications.length === 0 ? (
                <p className="font-body text-sm text-text-muted italic">
                  No medications added.
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {formData.medications.map((med, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border-default bg-bg-sunken p-4 flex flex-col gap-3 relative"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
                          Medication {i + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeMedication(i)}
                          className="text-text-muted hover:text-danger transition-colors duration-150"
                          aria-label={`Remove medication ${i + 1}`}
                        >
                          <TrashIcon />
                        </button>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        {(
                          [
                            { field: "name" as const, label: "Name", placeholder: "e.g. Apoquel" },
                            { field: "dosage" as const, label: "Dosage", placeholder: "e.g. 16mg" },
                            { field: "frequency" as const, label: "Frequency", placeholder: "e.g. Once daily" },
                            { field: "time" as const, label: "Time", placeholder: "e.g. With breakfast" },
                          ] as const
                        ).map(({ field, label, placeholder }) => (
                          <div key={field} className="flex flex-col gap-1.5">
                            <label className="font-body text-xs font-semibold text-text-primary">
                              {label}
                            </label>
                            <input
                              type="text"
                              className={inputFieldClass}
                              placeholder={placeholder}
                              value={med[field]}
                              onChange={(e) =>
                                updateMedication(i, field, e.target.value)
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Textarea
              label="Behavioral quirks"
              placeholder="e.g. Barks at the mailman. Hides under the bed during thunderstorms."
              value={formData.behavioralQuirks}
              onChange={set("behavioralQuirks")}
            />

            <Input
              label="Allergies"
              placeholder="e.g. Chicken, certain grass pollens"
              value={formData.allergies}
              onChange={set("allergies")}
            />

            <Input
              label="Microchip number"
              placeholder="e.g. 985121012345678"
              value={formData.microchipNumber}
              onChange={set("microchipNumber")}
            />

            <Textarea
              label="Walking routine"
              placeholder="e.g. 3 walks daily — 7am, 12pm, 7pm. 20 min each. Loves the park on Oak St."
              value={formData.walkingRoutine}
              onChange={set("walkingRoutine")}
            />

            <Input
              label="Grooming needs"
              placeholder="e.g. Brush daily. Bathed every 2 weeks."
              value={formData.groomingNeeds}
              onChange={set("groomingNeeds")}
            />

            <Input
              label="Comfort items"
              placeholder="e.g. Blue stuffed elephant toy, fleece blanket on couch"
              value={formData.comfortItems}
              onChange={set("comfortItems")}
            />
          </div>
        )}

        {/* Form actions */}
        <div className="flex flex-col gap-3 pt-1">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Saving…" : saveLabel}
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

// ── Pet card view with actions ────────────────────────────────────────────────

interface PetCardViewProps {
  pet: Doc<"pets">;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
}

function PetCardView({
  pet,
  isFirst,
  isLast,
  onEdit,
  onMoveUp,
  onMoveDown,
  onDelete,
}: PetCardViewProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const photoUrl = useQuery(
    api.storage.getUrl,
    pet.photos.length > 0 ? { storageId: pet.photos[0] } : "skip",
  );

  const details = [];
  if (pet.feedingInstructions) {
    details.push({ emoji: "🍽️", label: "Feeding", value: pet.feedingInstructions });
  }
  if (pet.vetName) {
    details.push({
      emoji: "🏥",
      label: "Vet",
      value: pet.vetName,
      phone: pet.vetPhone,
    });
  }
  if (pet.medications.length > 0) {
    details.push({
      emoji: "💊",
      label: "Medications",
      value: pet.medications.map((m) => m.name).join(", "),
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <PetProfileCard
        src={photoUrl ?? undefined}
        name={pet.name}
        breed={[pet.species, pet.breed].filter(Boolean).join(" · ")}
        age={pet.age ?? ""}
        details={details}
        personalityNote={pet.personalityNotes}
        className="max-w-full"
      />

      {/* Action row */}
      <div className="flex items-center gap-2">
        <Button variant="soft" size="sm" onClick={onEdit}>
          Edit
        </Button>
        <div className="flex items-center gap-1 ml-auto">
          <button
            type="button"
            disabled={isFirst}
            onClick={onMoveUp}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary border border-border-default bg-bg-raised hover:bg-bg-sunken hover:border-border-strong transition-[background-color,border-color] duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={`Move ${pet.name} up`}
          >
            <ArrowUpIcon />
          </button>
          <button
            type="button"
            disabled={isLast}
            onClick={onMoveDown}
            className="w-8 h-8 flex items-center justify-center rounded-md text-text-secondary border border-border-default bg-bg-raised hover:bg-bg-sunken hover:border-border-strong transition-[background-color,border-color] duration-150 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label={`Move ${pet.name} down`}
          >
            <ArrowDownIcon />
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-danger border border-danger bg-danger-light hover:bg-danger hover:text-text-on-primary transition-[background-color,color] duration-150"
            aria-label={`Delete ${pet.name}`}
          >
            <TrashIcon />
          </button>
        </div>
      </div>

      {/* Inline delete confirmation */}
      {confirmDelete && (
        <div className="bg-danger-light rounded-lg px-4 py-3 flex flex-col gap-3 border border-[rgba(176,68,68,0.2)]">
          <p className="font-body text-sm text-danger font-semibold">
            Delete {pet.name}?
          </p>
          <p className="font-body text-xs text-danger opacity-80">
            This will permanently remove {pet.name}&rsquo;s profile. This action cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                setConfirmDelete(false);
                onDelete();
              }}
            >
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="font-body text-text-muted">Loading…</p>
    </div>
  );
}

// ── PetsEditor ────────────────────────────────────────────────────────────────

export default function PetsEditor() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [editingId, setEditingId] = useState<Id<"pets"> | "new" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.replace("/login");
    }
  }, [mounted, authLoading, user, router]);

  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );

  const properties = useQuery(
    api.properties.listByOwner,
    sessionData?.userId ? { ownerId: sessionData.userId } : "skip",
  );

  const propertyId = properties?.[0]?._id;

  const pets = useQuery(
    api.pets.getPetsByPropertyId,
    propertyId ? { propertyId } : "skip",
  );

  const createPet = useMutation(api.pets.create);
  const updatePet = useMutation(api.pets.update);
  const removePet = useMutation(api.pets.remove);
  const reorderPets = useMutation(api.pets.reorderPets);
  const generateUploadUrl = useAction(api.storage.generateUploadUrl);

  const uploadPhotos = useCallback(
    async (files: File[]): Promise<Array<Id<"_storage">>> => {
      return Promise.all(
        files.map(async (file) => {
          const uploadUrl = await generateUploadUrl();
          const response = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": file.type },
            body: file,
          });
          if (!response.ok) throw new Error("Photo upload failed");
          const { storageId } = (await response.json()) as {
            storageId: Id<"_storage">;
          };
          return storageId;
        }),
      );
    },
    [generateUploadUrl],
  );

  const handleAddPet = async (
    data: PetFormValues,
    newPhotos: File[],
  ) => {
    if (!propertyId) return;
    setIsSaving(true);
    setGeneralError(null);
    try {
      const photoIds = newPhotos.length > 0 ? await uploadPhotos(newPhotos) : [];
      await createPet({
        propertyId,
        name: data.name.trim(),
        species: data.species.trim(),
        breed: data.breed.trim() || undefined,
        age: data.age.trim() || undefined,
        photos: photoIds,
        feedingInstructions: data.feedingInstructions.trim() || undefined,
        vetName: data.vetName.trim() || undefined,
        vetPhone: data.vetPhone.trim() ? normalizePhone(data.vetPhone) : undefined,
        personalityNotes: data.personalityNotes.trim() || undefined,
        medicalConditions: data.medicalConditions.trim() || undefined,
        medications: data.medications.filter((m) => m.name.trim()),
        behavioralQuirks: data.behavioralQuirks.trim() || undefined,
        allergies: data.allergies.trim() || undefined,
        microchipNumber: data.microchipNumber.trim() || undefined,
        walkingRoutine: data.walkingRoutine.trim() || undefined,
        groomingNeeds: data.groomingNeeds.trim() || undefined,
        comfortItems: data.comfortItems.trim() || undefined,
        sortOrder: pets?.length ?? 0,
      });
      setEditingId(null);
    } catch {
      setGeneralError("Something went wrong saving the pet. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdatePet = async (
    petId: Id<"pets">,
    data: PetFormValues,
    newPhotos: File[],
    keptPhotoIds: Id<"_storage">[],
  ) => {
    setIsSaving(true);
    setGeneralError(null);
    try {
      const newPhotoIds =
        newPhotos.length > 0 ? await uploadPhotos(newPhotos) : [];
      const allPhotoIds = [...keptPhotoIds, ...newPhotoIds];
      await updatePet({
        petId,
        name: data.name.trim(),
        species: data.species.trim(),
        breed: data.breed.trim() || undefined,
        age: data.age.trim() || undefined,
        photos: allPhotoIds,
        feedingInstructions: data.feedingInstructions.trim() || undefined,
        vetName: data.vetName.trim() || undefined,
        vetPhone: data.vetPhone.trim() ? normalizePhone(data.vetPhone) : undefined,
        personalityNotes: data.personalityNotes.trim() || undefined,
        medicalConditions: data.medicalConditions.trim() || undefined,
        medications: data.medications.filter((m) => m.name.trim()),
        behavioralQuirks: data.behavioralQuirks.trim() || undefined,
        allergies: data.allergies.trim() || undefined,
        microchipNumber: data.microchipNumber.trim() || undefined,
        walkingRoutine: data.walkingRoutine.trim() || undefined,
        groomingNeeds: data.groomingNeeds.trim() || undefined,
        comfortItems: data.comfortItems.trim() || undefined,
      });
      setEditingId(null);
    } catch {
      setGeneralError(
        "Something went wrong updating the pet. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePet = async (petId: Id<"pets">) => {
    try {
      await removePet({ petId });
    } catch {
      setGeneralError("Failed to delete pet. Please try again.");
    }
  };

  const handleMoveUp = async (index: number) => {
    if (!pets || index === 0) return;
    const current = pets[index];
    const previous = pets[index - 1];
    await reorderPets({
      updates: [
        { petId: current._id, sortOrder: previous.sortOrder },
        { petId: previous._id, sortOrder: current.sortOrder },
      ],
    });
  };

  const handleMoveDown = async (index: number) => {
    if (!pets || index === pets.length - 1) return;
    const current = pets[index];
    const next = pets[index + 1];
    await reorderPets({
      updates: [
        { petId: current._id, sortOrder: next.sortOrder },
        { petId: next._id, sortOrder: current.sortOrder },
      ],
    });
  };

  if (!mounted || authLoading) return <LoadingScreen />;
  if (!user) return <LoadingScreen />;

  const isLoadingPets = propertyId !== undefined && pets === undefined;
  const petList = pets ?? [];

  return (
    <CreatorLayout activeNav="property" onNavChange={() => {}}>
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 font-body text-xs font-semibold text-text-muted hover:text-text-secondary transition-colors duration-150 mb-1"
          >
            <ChevronLeftIcon />
            Dashboard
          </Link>
          <h1 className="font-display text-3xl text-text-primary leading-tight">
            Pets
          </h1>
          <p className="font-body text-sm text-text-secondary">
            Add, edit, or reorder your pet profiles.
          </p>
        </div>

        {/* Global error */}
        {generalError && editingId === null && (
          <div
            role="alert"
            className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
          >
            {generalError}
          </div>
        )}

        {/* Loading state */}
        {isLoadingPets && (
          <p className="font-body text-sm text-text-muted">Loading pets…</p>
        )}

        {/* Pet list */}
        {petList.length > 0 && (
          <div className="flex flex-col gap-6">
            {petList.map((pet, index) =>
              editingId === pet._id ? (
                <PetForm
                  key={pet._id}
                  initialValues={petToFormValues(pet)}
                  existingPhotoIds={pet.photos}
                  onSave={(data, newPhotos, keptPhotoIds) =>
                    handleUpdatePet(pet._id, data, newPhotos, keptPhotoIds)
                  }
                  onCancel={() => {
                    setEditingId(null);
                    setGeneralError(null);
                  }}
                  isSaving={isSaving}
                  generalError={editingId === pet._id ? generalError : null}
                  saveLabel="Save changes"
                  title={`Edit ${pet.name}`}
                />
              ) : (
                <PetCardView
                  key={pet._id}
                  pet={pet}
                  isFirst={index === 0}
                  isLast={index === petList.length - 1}
                  onEdit={() => {
                    setEditingId(pet._id);
                    setGeneralError(null);
                  }}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onDelete={() => handleDeletePet(pet._id)}
                />
              ),
            )}
          </div>
        )}

        {/* Add new pet */}
        {editingId === "new" ? (
          <PetForm
            onSave={handleAddPet}
            onCancel={() => {
              setEditingId(null);
              setGeneralError(null);
            }}
            isSaving={isSaving}
            generalError={editingId === "new" ? generalError : null}
            saveLabel="Add pet"
            title="New pet"
          />
        ) : (
          editingId === null && (
            <button
              type="button"
              onClick={() => {
                setGeneralError(null);
                setEditingId("new");
              }}
              className="flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-[1.5px] border-dashed border-border-strong bg-bg-sunken hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 font-body text-sm font-semibold text-text-primary"
            >
              <PlusIcon />
              {petList.length > 0 ? "Add another pet" : "Add a pet"}
            </button>
          )
        )}
      </div>
    </CreatorLayout>
  );
}
