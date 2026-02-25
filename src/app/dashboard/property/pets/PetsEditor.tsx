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
import { IconButton } from "@/components/ui/IconButton";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { validatePhone, normalizePhone, formatPhone, formatPhoneInput } from "@/lib/phone";
import { ChevronLeftIcon, ChevronUpIcon, ChevronDownIcon, TrashIcon, PlusIcon, PencilIcon, UploadIcon, XIcon } from "@/components/ui/icons";

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
      <IconButton
        icon={<XIcon size={12} />}
        aria-label={`Remove existing photo ${index + 1}`}
        size="sm"
        onClick={onRemove}
        className="absolute top-1 right-1"
      />
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
      <div className="px-4 py-3 border-b border-border-default bg-bg-sunken">
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
                  <IconButton
                    icon={<XIcon size={12} />}
                    aria-label={`Remove new photo ${i + 1}`}
                    size="sm"
                    onClick={() => handleRemoveNewPhoto(i)}
                    className="absolute top-1 right-1"
                  />
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
          <ChevronDownIcon size={16} style={{ transform: showMoreDetails ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 250ms var(--ease-out)" }} />
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
                          <Input
                            key={field}
                            label={label}
                            placeholder={placeholder}
                            value={med[field]}
                            onChange={(e) => updateMedication(i, field, e.target.value)}
                          />
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

  const subtitle = [pet.species, pet.breed].filter(Boolean).join(" · ");
  const hint = pet.feedingInstructions ?? pet.vetName ?? pet.personalityNotes ?? null;

  return (
    <div className="rounded-lg border border-border-default bg-bg-raised overflow-hidden">
      {/* Delete confirmation banner */}
      {confirmDelete && (
        <div className="bg-danger-light px-4 py-3 flex items-center justify-between gap-3 border-b border-[rgba(176,68,68,0.15)]">
          <p className="font-body text-sm text-danger font-semibold">Delete {pet.name}?</p>
          <div className="flex gap-2 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={() => { setConfirmDelete(false); onDelete(); }}>
              Yes, delete
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-start gap-3 py-4 px-4">
        {/* Photo thumbnail */}
        <div className="w-16 h-16 min-w-[64px] rounded-md overflow-hidden shrink-0">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={pet.name} className="w-full h-full object-cover block" />
          ) : (
            <div className="w-full h-full bg-[linear-gradient(135deg,var(--color-primary-light),var(--color-accent-light))]" />
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm font-semibold text-text-primary">{pet.name}</p>
          <p className="font-body text-xs text-text-muted mt-0.5">
            {subtitle}{pet.age ? ` · ${pet.age}` : ""}
          </p>
          {hint && (
            <p className="font-body text-xs text-text-secondary mt-1 line-clamp-1">{hint}</p>
          )}
        </div>

        {/* Actions — edit+delete top, reorder bottom */}
        <div className="flex flex-col items-end justify-between self-stretch shrink-0 py-0.5">
          <div className="flex items-center gap-0.5">
            <IconButton
              icon={<PencilIcon />}
              aria-label={`Edit ${pet.name}`}
              onClick={onEdit}
            />
            <IconButton
              icon={<TrashIcon />}
              aria-label={`Delete ${pet.name}`}
              variant="danger"
              onClick={() => setConfirmDelete(true)}
            />
          </div>
          <div className="flex items-center gap-0.5">
            <IconButton
              icon={<ChevronUpIcon size={14} />}
              aria-label={`Move ${pet.name} up`}
              onClick={onMoveUp}
              disabled={isFirst}
            />
            <IconButton
              icon={<ChevronDownIcon size={14} />}
              aria-label={`Move ${pet.name} down`}
              onClick={onMoveDown}
              disabled={isLast}
            />
          </div>
        </div>
      </div>
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
      // Always send all fields so the mutation can clear empty ones
      await updatePet({
        petId,
        name: data.name.trim(),
        species: data.species.trim(),
        breed: data.breed.trim(),
        age: data.age.trim(),
        photos: allPhotoIds,
        feedingInstructions: data.feedingInstructions.trim(),
        vetName: data.vetName.trim(),
        vetPhone: data.vetPhone.trim() ? normalizePhone(data.vetPhone) : "",
        personalityNotes: data.personalityNotes.trim(),
        medicalConditions: data.medicalConditions.trim(),
        medications: data.medications.filter((m) => m.name.trim()),
        behavioralQuirks: data.behavioralQuirks.trim(),
        allergies: data.allergies.trim(),
        microchipNumber: data.microchipNumber.trim(),
        walkingRoutine: data.walkingRoutine.trim(),
        groomingNeeds: data.groomingNeeds.trim(),
        comfortItems: data.comfortItems.trim(),
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
    <CreatorLayout activeNav="property">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard/property"
            className="inline-flex items-center gap-1 font-body text-xs font-semibold text-text-muted hover:text-text-secondary transition-colors duration-150 mb-1"
          >
            <ChevronLeftIcon />
            Property
          </Link>
          <h1 className="font-display text-4xl text-text-primary leading-tight">
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
          <div className="flex flex-col gap-4">
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
