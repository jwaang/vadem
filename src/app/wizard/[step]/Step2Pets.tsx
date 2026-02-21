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
import { PetProfileCard } from "@/components/ui/PetProfileCard";
import { validatePhone, normalizePhone, formatPhoneInput } from "@/lib/phone";
import { UploadIcon, TrashIcon, PlusIcon, ChevronDownIcon } from "@/components/ui/icons";

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

// ── Saved pet card (resolves photo URL from storage) ─────────────────────────

function SavedPetCard({ pet }: { pet: Doc<"pets"> }) {
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
      value: pet.vetPhone ? `${pet.vetName}` : pet.vetName,
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
    <PetProfileCard
      src={photoUrl ?? undefined}
      name={pet.name}
      breed={[pet.species, pet.breed].filter(Boolean).join(" · ")}
      age={pet.age ?? ""}
      details={details}
      personalityNote={pet.personalityNotes}
      className="max-w-full"
    />
  );
}

// ── Pet form ─────────────────────────────────────────────────────────────────

interface PetFormProps {
  onSave: (data: PetFormValues, photos: File[]) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  generalError: string | null;
}

function PetForm({ onSave, onCancel, isSaving, generalError }: PetFormProps) {
  const [formData, setFormData] = useState<PetFormValues>(EMPTY_FORM);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
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
      const newPreviews = files.map((f) => URL.createObjectURL(f));
      setPhotoFiles((prev) => [...prev, ...files]);
      setPhotoPreviews((prev) => [...prev, ...newPreviews]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    },
    [],
  );

  const handleRemovePhoto = useCallback(
    (index: number) => {
      setPhotoFiles((prev) => prev.filter((_, i) => i !== index));
      setPhotoPreviews((prev) => {
        URL.revokeObjectURL(prev[index]);
        return prev.filter((_, i) => i !== index);
      });
    },
    [],
  );

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
    if (!formData.age.trim()) newErrors.age = "Age is required";
    if (!formData.feedingInstructions.trim())
      newErrors.feedingInstructions = "Feeding instructions are required";
    if (!formData.vetName.trim()) newErrors.vetName = "Vet name is required";
    const vetPhoneErr = validatePhone(formData.vetPhone);
    if (vetPhoneErr) newErrors.vetPhone = vetPhoneErr;
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    await onSave(formData, photoFiles);
    // Parent resets form visibility on success
  };

  return (
    <div className="border border-border-default rounded-xl bg-bg-raised overflow-hidden">
      <div className="px-5 py-4 border-b border-border-default bg-bg-sunken">
        <h2 className="font-body text-base font-semibold text-text-primary">
          Pet details
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

          {photoPreviews.length > 0 ? (
            <div className="grid grid-cols-3 gap-2">
              {photoPreviews.map((url, i) => (
                <div
                  key={i}
                  className="relative aspect-square rounded-md overflow-hidden border border-border-default bg-bg-sunken"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={`Pet photo ${i + 1}`}
                    className="w-full h-full object-cover block"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(i)}
                    className="absolute top-1 right-1 bg-bg-raised border border-border-default rounded p-1 text-text-secondary hover:text-danger hover:border-danger transition-colors duration-150"
                    aria-label={`Remove photo ${i + 1}`}
                  >
                    <TrashIcon />
                  </button>
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
          autoFocus
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
          error={errors.age}
          required
        />

        <Textarea
          label="Feeding instructions"
          placeholder="e.g. 1 cup dry food twice daily — 7am and 6pm. Fresh water always."
          value={formData.feedingInstructions}
          onChange={set("feedingInstructions")}
          error={errors.feedingInstructions}
          required
        />

        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Vet name"
            placeholder="e.g. Dr. Kim"
            value={formData.vetName}
            onChange={set("vetName")}
            error={errors.vetName}
            required
          />
          <Input
            label="Vet phone"
            placeholder="e.g. (512) 555-0100"
            value={formData.vetPhone}
            onChange={set("vetPhone")}
            error={errors.vetPhone}
            type="tel"
            required
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

        {/* Optional fields */}
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
                        <Input label="Name" placeholder="e.g. Apoquel" value={med.name} onChange={(e) => updateMedication(i, "name", e.target.value)} />
                        <Input label="Dosage" placeholder="e.g. 16mg" value={med.dosage} onChange={(e) => updateMedication(i, "dosage", e.target.value)} />
                        <Input label="Frequency" placeholder="e.g. Once daily" value={med.frequency} onChange={(e) => updateMedication(i, "frequency", e.target.value)} />
                        <Input label="Time" placeholder="e.g. With breakfast" value={med.time} onChange={(e) => updateMedication(i, "time", e.target.value)} />
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
            {isSaving ? "Saving…" : "Save pet"}
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

  // Existing pets (real-time — optimistic updates come free with Convex)
  const pets = useQuery(
    api.pets.getPetsByPropertyId,
    propertyId ? { propertyId } : "skip",
  );

  const createPet = useMutation(api.pets.create);
  const generateUploadUrl = useAction(api.storage.generateUploadUrl);

  const [showForm, setShowForm] = useState(false);
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

  const handleSavePet = async (
    data: PetFormValues,
    photos: File[],
  ): Promise<void> => {
    if (!propertyId) {
      setGeneralError(
        "Property not found. Please complete step 1 first.",
      );
      return;
    }

    setIsSaving(true);
    setGeneralError(null);

    try {
      const photoIds =
        photos.length > 0 ? await uploadPhotos(photos) : [];

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

      setShowForm(false);
    } catch {
      setGeneralError("Something went wrong saving the pet. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = () => router.push("/wizard/3");
  const handleSkip = () => router.push("/wizard/3");

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

      {/* Top-level error (e.g. missing property) */}
      {generalError && !showForm && (
        <div
          role="alert"
          className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
        >
          {generalError}
        </div>
      )}

      {/* Saved pets list */}
      {hasPets && (
        <div className="flex flex-col gap-4">
          {pets!.map((pet) => (
            <SavedPetCard key={pet._id} pet={pet} />
          ))}
        </div>
      )}

      {/* Form or Add button */}
      {showForm ? (
        <PetForm
          onSave={handleSavePet}
          onCancel={() => setShowForm(false)}
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
          className="flex items-center justify-center gap-2 py-4 px-4 rounded-lg border-[1.5px] border-dashed border-border-strong bg-bg-sunken hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 font-body text-sm font-semibold text-text-primary disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <PlusIcon />
          {hasPets ? "Add another pet" : "Add a pet"}
        </button>
      )}

      {/* Navigation */}
      {!showForm && (
        <div className="flex flex-col gap-3 pt-2">
          {hasPets && (
            <Button size="lg" className="w-full" onClick={handleNext}>
              Next
            </Button>
          )}
          <Button
            variant="ghost"
            size="default"
            className="w-full"
            onClick={handleSkip}
          >
            {hasPets ? "Done with pets" : "Skip — no pets"}
          </Button>
        </div>
      )}
    </div>
  );
}
