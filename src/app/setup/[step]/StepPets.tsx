"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id, Doc } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/authContext";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { PetProfileCard } from "@/components/ui/PetProfileCard";
import { validatePhone, normalizePhone, formatPhone, formatPhoneInput } from "@/lib/phone";
import { UploadIcon, TrashIcon, PlusIcon, PencilIcon, XIcon } from "@/components/ui/icons";

// ── Types ────────────────────────────────────────────────────────────────────

interface MedicationRow {
  name: string;
  dosage: string;
  frequency: string;
  time: string;
}

const EMPTY_MEDICATION: MedicationRow = {
  name: "",
  dosage: "",
  frequency: "",
  time: "",
};

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

// ── Helpers ──────────────────────────────────────────────────────────────────

function truncate(text: string, max = 60): string {
  return text.length > max ? text.slice(0, max - 3) + "\u2026" : text;
}

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

function buildPetDetails(pet: Doc<"pets">) {
  const details: Array<{ emoji: string; label: string; value: string; phone?: string }> = [];
  if (pet.feedingInstructions) {
    details.push({ emoji: "\uD83C\uDF7D\uFE0F", label: "Feeding", value: truncate(pet.feedingInstructions) });
  }
  if (pet.vetName) {
    details.push({
      emoji: "\uD83C\uDFE5",
      label: "Vet",
      value: pet.vetName,
      ...(pet.vetPhone ? { phone: formatPhone(pet.vetPhone) } : {}),
    });
  }
  if (pet.walkingRoutine) {
    details.push({ emoji: "\uD83D\uDEB6", label: "Walks", value: truncate(pet.walkingRoutine) });
  }
  if (pet.medicalConditions) {
    details.push({ emoji: "\uD83E\uDE7A", label: "Medical", value: truncate(pet.medicalConditions) });
  }
  if (pet.medications.length > 0) {
    const summary = pet.medications
      .map((m) => [m.name, m.dosage].filter(Boolean).join(" "))
      .join(", ");
    details.push({ emoji: "\uD83D\uDC8A", label: "Meds", value: truncate(summary) });
  }
  if (pet.allergies) {
    details.push({ emoji: "\u26A0\uFE0F", label: "Allergies", value: truncate(pet.allergies) });
  }
  if (pet.behavioralQuirks) {
    details.push({ emoji: "\uD83D\uDC3E", label: "Quirks", value: truncate(pet.behavioralQuirks) });
  }
  if (pet.groomingNeeds) {
    details.push({ emoji: "\u2702\uFE0F", label: "Grooming", value: truncate(pet.groomingNeeds) });
  }
  if (pet.comfortItems) {
    details.push({ emoji: "\uD83E\uDDF8", label: "Comfort", value: truncate(pet.comfortItems) });
  }
  if (pet.microchipNumber) {
    details.push({ emoji: "\uD83D\uDCDF", label: "Microchip", value: pet.microchipNumber });
  }
  return details;
}

// ── Existing photo thumbnail (resolves storage ID to URL) ────────────────────

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

// ── Saved pet card (resolves photo URL, shows all details + edit/delete) ─────

function SavedPetCard({
  pet,
  onEdit,
  onDelete,
}: {
  pet: Doc<"pets">;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const photoUrl = useQuery(
    api.storage.getUrl,
    pet.photos.length > 0 ? { storageId: pet.photos[0] } : "skip",
  );

  const details = buildPetDetails(pet);

  return (
    <div className="flex flex-col rounded-xl overflow-hidden border border-border-default">
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

      <PetProfileCard
        src={photoUrl ?? undefined}
        name={pet.name}
        breed={[pet.species, pet.breed].filter(Boolean).join(" \u00B7 ")}
        age={pet.age ?? ""}
        details={details}
        personalityNote={pet.personalityNotes}
        className="max-w-full rounded-none border-0"
        actions={
          <>
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
          </>
        }
      />
    </div>
  );
}

// ── Pet form (handles both add and edit modes) ───────────────────────────────

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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editingMedIdx, setEditingMedIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof PetFormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
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

  // ── Medication helpers ──

  const addMedication = () => {
    setFormData((prev) => ({
      ...prev,
      medications: [...prev.medications, { ...EMPTY_MEDICATION }],
    }));
    setEditingMedIdx(formData.medications.length);
  };

  const removeMedication = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index),
    }));
    if (editingMedIdx === index) setEditingMedIdx(null);
    else if (editingMedIdx !== null && editingMedIdx > index) {
      setEditingMedIdx(editingMedIdx - 1);
    }
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

  const saveMedication = (index: number) => {
    const med = formData.medications[index];
    if (!med.name.trim()) return;
    setEditingMedIdx(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = "Pet name is required";
    if (!formData.species.trim()) newErrors.species = "Species is required";
    if (formData.vetPhone.trim()) {
      const vetPhoneErr = validatePhone(formData.vetPhone);
      if (vetPhoneErr) newErrors.vetPhone = vetPhoneErr;
    }
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
        <h2 className="font-body text-base font-semibold text-text-primary">
          {title}
        </h2>
      </div>

      <div className="p-5 flex flex-col gap-5">
        {/* General error */}
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
              {/* Add more photos */}
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
            hint={!errors.species ? "Dog, cat, bird\u2026" : undefined}
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
          error={errors.age}
        />

        <Textarea
          label="Feeding instructions"
          placeholder="e.g. 1 cup dry food twice daily — 7am and 6pm. Fresh water always."
          value={formData.feedingInstructions}
          onChange={set("feedingInstructions")}
          error={errors.feedingInstructions}
          hint="Your sitter will need this — add it now or later"
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Vet name"
            placeholder="e.g. Dr. Kim"
            value={formData.vetName}
            onChange={set("vetName")}
            error={errors.vetName}
          />
          <Input
            label="Vet phone"
            placeholder="e.g. (512) 555-0100"
            value={formData.vetPhone}
            onChange={set("vetPhone")}
            error={errors.vetPhone}
            type="tel"
            hint="Your sitter will need this in an emergency"
          />
        </div>

        {/* All optional fields — always visible (no toggle) */}
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

        {/* Medications with collapsed/expanded UX */}
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
            <div className="flex flex-col gap-2">
              {formData.medications.map((med, i) => {
                const isEditing = editingMedIdx === i;

                if (isEditing) {
                  return (
                    <div
                      key={i}
                      className="rounded-lg border border-border-default bg-bg-sunken p-4 flex flex-col gap-3"
                    >
                      <div className="grid grid-cols-2 gap-3">
                        <Input label="Name" placeholder="e.g. Apoquel" value={med.name} onChange={(e) => updateMedication(i, "name", e.target.value)} />
                        <Input label="Dosage" placeholder="e.g. 16mg" value={med.dosage} onChange={(e) => updateMedication(i, "dosage", e.target.value)} />
                        <Input label="Frequency" placeholder="e.g. Once daily" value={med.frequency} onChange={(e) => updateMedication(i, "frequency", e.target.value)} />
                        <Input label="Time" placeholder="e.g. With breakfast" value={med.time} onChange={(e) => updateMedication(i, "time", e.target.value)} />
                      </div>
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          size="sm"
                          onClick={() => saveMedication(i)}
                          disabled={!med.name.trim()}
                        >
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (!med.name.trim()) {
                              removeMedication(i);
                            } else {
                              setEditingMedIdx(null);
                            }
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  );
                }

                // Collapsed summary strip
                const summary = [med.name, med.dosage].filter(Boolean).join(" \u00B7 ");
                return (
                  <div
                    key={i}
                    className="rounded-lg border border-border-default bg-bg-sunken px-4 py-3 flex items-center justify-between gap-2"
                  >
                    <p className="font-body text-sm text-text-primary min-w-0 truncate">
                      {summary || "Untitled medication"}
                    </p>
                    <div className="flex items-center gap-0.5 shrink-0">
                      <IconButton
                        icon={<PencilIcon />}
                        aria-label={`Edit medication ${med.name || i + 1}`}
                        onClick={() => setEditingMedIdx(i)}
                      />
                      <IconButton
                        icon={<TrashIcon />}
                        aria-label={`Remove medication ${med.name || i + 1}`}
                        variant="danger"
                        onClick={() => removeMedication(i)}
                      />
                    </div>
                  </div>
                );
              })}
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

        {/* Form actions */}
        <div className="flex flex-col gap-3 pt-1">
          <Button
            size="lg"
            className="w-full"
            onClick={handleSubmit}
            disabled={isSaving}
          >
            {isSaving ? "Saving\u2026" : saveLabel}
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

// ── Main Step2Pets component ──────────────────────────────────────────────────

export default function Step2Pets() {
  const router = useRouter();
  const { user } = useAuth();

  // Session -> userId
  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );

  // userId -> propertyId
  const properties = useQuery(
    api.properties.listByOwner,
    sessionData?.userId ? { ownerId: sessionData.userId } : "skip",
  );
  const propertyId = properties?.[0]?._id;

  // Existing pets
  const pets = useQuery(
    api.pets.getPetsByPropertyId,
    propertyId ? { propertyId } : "skip",
  );

  const createPet = useMutation(api.pets.create);
  const updatePet = useMutation(api.pets.update);
  const removePet = useMutation(api.pets.remove);
  const generateUploadUrl = useAction(api.storage.generateUploadUrl);

  const [editingId, setEditingId] = useState<Id<"pets"> | "new" | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Upload all photos in parallel and return storage IDs
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
  ): Promise<void> => {
    if (!propertyId) {
      setGeneralError("Property not found. Please complete step 1 first.");
      return;
    }

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
  ): Promise<void> => {
    setIsSaving(true);
    setGeneralError(null);

    try {
      const newPhotoIds = newPhotos.length > 0 ? await uploadPhotos(newPhotos) : [];
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
      setGeneralError("Something went wrong updating the pet. Please try again.");
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

  const handleNext = () => router.push("/setup/access");
  const handleSkip = () => router.push("/setup/access");

  const hasPets = (pets?.length ?? 0) > 0;
  const isLoadingSession = user && sessionData === undefined;

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Step heading */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-text-primary leading-tight">
          Add your pets
        </h1>
        <p className="font-body text-sm text-text-secondary">
          Give your sitter everything they need to care for your furry family.
        </p>
      </div>

      {/* Top-level error */}
      {generalError && editingId === null && (
        <div
          role="alert"
          className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
        >
          {generalError}
        </div>
      )}

      {/* Saved pets list — 2-col grid on desktop */}
      {hasPets && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {pets!.map((pet) =>
            editingId === pet._id ? (
              <PetForm
                key={pet._id}
                initialValues={petToFormValues(pet)}
                existingPhotoIds={pet.photos}
                onSave={(data, newPhotos, keptIds) =>
                  handleUpdatePet(pet._id, data, newPhotos, keptIds)
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
              <SavedPetCard
                key={pet._id}
                pet={pet}
                onEdit={() => {
                  setEditingId(pet._id);
                  setGeneralError(null);
                }}
                onDelete={() => handleDeletePet(pet._id)}
              />
            ),
          )}
        </div>
      )}

      {/* Form or Add button */}
      {editingId === "new" ? (
        <div className="lg:max-w-lg lg:mx-auto w-full">
          <PetForm
            onSave={handleAddPet}
            onCancel={() => {
              setEditingId(null);
              setGeneralError(null);
            }}
            isSaving={isSaving}
            generalError={editingId === "new" ? generalError : null}
          />
        </div>
      ) : (
        editingId === null && (
          <button
            type="button"
            onClick={() => {
              setGeneralError(null);
              setEditingId("new");
            }}
            disabled={!!isLoadingSession}
            className="lg:max-w-lg lg:mx-auto w-full flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-[1.5px] border-dashed border-border-strong bg-bg-sunken hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 font-body text-sm font-semibold text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <PlusIcon />
            {hasPets ? "Add another pet" : "Add a pet"}
          </button>
        )
      )}

      {/* Navigation */}
      {editingId === null && (
        <div className="flex flex-col gap-3 pt-2 lg:max-w-lg lg:mx-auto w-full">
          {hasPets ? (
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
              Skip — no pets
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
