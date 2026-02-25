"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/authContext";
import { Input } from "@/components/ui/Input";
import { AddressAutocomplete } from "@/components/ui/AddressAutocomplete";
import { Button } from "@/components/ui/Button";

// ── Upload icon ──────────────────────────────────────────────────────

function UploadIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

// ── Step 1 form ──────────────────────────────────────────────────────

export default function Step1Home() {
  const router = useRouter();
  const { user } = useAuth();

  // Resolve user → Convex userId via session token
  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );

  // Existing property (for prefilling)
  const properties = useQuery(
    api.properties.listByOwner,
    sessionData?.userId ? { ownerId: sessionData.userId } : "skip",
  );
  const existingProperty = properties?.[0];

  // Resolve existing photo URL
  const existingPhotoUrl = useQuery(
    api.storage.getUrl,
    existingProperty?.photo ? { storageId: existingProperty.photo } : "skip",
  );

  const createOrUpdate = useMutation(api.properties.createOrUpdate);
  const generateUploadUrl = useAction(api.storage.generateUploadUrl);

  // Form state
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefilledRef = useRef(false);

  // Prefill form from existing property (once)
  if (existingProperty && !prefilledRef.current) {
    prefilledRef.current = true;
    setName(existingProperty.name);
    setAddress(existingProperty.address ?? "");
  }

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setSelectedFile(file);
      // Generate local preview URL
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
    },
    [],
  );

  const handleRemovePhoto = useCallback(() => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [previewUrl]);

  // Upload photo to Convex storage and return storageId
  const uploadPhoto = useCallback(
    async (file: File): Promise<Id<"_storage">> => {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!response.ok) {
        throw new Error("Photo upload failed");
      }
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      return storageId;
    },
    [generateUploadUrl],
  );

  // Shared save logic — used by both Next and Save & finish later
  const saveProperty = useCallback(
    async (userId: Id<"users">): Promise<void> => {
      let photoId: Id<"_storage"> | undefined;
      if (selectedFile) {
        photoId = await uploadPhoto(selectedFile);
      }

      await createOrUpdate({
        ownerId: userId,
        name: name.trim(),
        address: address.trim() || undefined,
        photo: photoId,
      });
    },
    [selectedFile, uploadPhoto, createOrUpdate, name, address],
  );

  const validate = (): boolean => {
    if (!name.trim()) {
      setNameError("Property name is required");
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleNext = async () => {
    if (!validate()) return;
    if (!sessionData?.userId) {
      setGeneralError("You must be signed in to continue.");
      return;
    }

    setIsSaving(true);
    setGeneralError(null);
    try {
      await saveProperty(sessionData.userId);
      router.push("/setup/pets");
    } catch {
      setGeneralError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveLater = async () => {
    if (!sessionData?.userId) {
      setGeneralError("You must be signed in to save.");
      return;
    }

    // Auto-name if blank so user can exit without filling in anything
    if (!name.trim()) {
      setName("My Home");
    }

    setIsSaving(true);
    setGeneralError(null);
    try {
      let photoId: Id<"_storage"> | undefined;
      if (selectedFile) {
        photoId = await uploadPhoto(selectedFile);
      }
      await createOrUpdate({
        ownerId: sessionData.userId,
        name: name.trim() || "My Home",
        address: address.trim() || undefined,
        photo: photoId,
      });
      router.push("/dashboard");
    } catch {
      setGeneralError("Something went wrong. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const isLoadingSession = user && sessionData === undefined;

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Step heading */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-text-primary leading-tight">
          Add your home
        </h1>
        <p className="font-body text-sm text-text-secondary">
          Name your home — it appears at the top of your sitter&rsquo;s care manual.
        </p>
      </div>

      {/* Error banner */}
      {generalError && (
        <div
          role="alert"
          className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
        >
          {generalError}
        </div>
      )}

      {/* Form fields */}
      <div className="flex flex-col gap-4">
        <Input
          label="Property name"
          placeholder="e.g. The Johnson Home"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            if (nameError) setNameError(null);
          }}
          error={nameError ?? undefined}
          hint={!nameError ? "Required — shown at the top of the manual" : undefined}
          required
          autoFocus
        />

        <AddressAutocomplete
          label="Address"
          placeholder="e.g. 123 Maple Street, Austin TX"
          value={address}
          onChange={setAddress}
          hint="Optional — helps sitters confirm the right location"
        />

        {/* Photo upload */}
        <div className="flex flex-col gap-2">
          <p className="font-body text-sm font-semibold text-text-primary">
            Property photo{" "}
            <span className="font-normal text-text-muted">(optional)</span>
          </p>

          {previewUrl || existingPhotoUrl ? (
            /* Photo preview */
            <div className="relative rounded-md overflow-hidden border border-border-default bg-bg-sunken">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={(previewUrl ?? existingPhotoUrl)!}
                alt="Property preview"
                className="w-full object-cover"
                style={{ maxHeight: "200px" }}
              />
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute top-2 right-2 bg-bg-raised border border-border-default rounded-md p-1.5 text-text-secondary hover:text-danger hover:border-danger transition-colors duration-150"
                aria-label="Remove photo"
              >
                <TrashIcon />
              </button>
            </div>
          ) : (
            /* Upload zone */
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-3 py-8 px-4 rounded-md border-[1.5px] border-dashed border-border-strong bg-bg-sunken hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 text-center cursor-pointer"
            >
              <span className="text-text-muted">
                <UploadIcon />
              </span>
              <span className="flex flex-col gap-0.5">
                <span className="font-body text-sm font-semibold text-text-primary">
                  Upload a photo
                </span>
                <span className="font-body text-xs text-text-muted">
                  JPG, PNG or HEIC — shown on the manual cover
                </span>
              </span>
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            aria-label="Upload property photo"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 pt-2">
        <Button
          size="lg"
          className="w-full"
          onClick={handleNext}
          disabled={isSaving || !!isLoadingSession}
        >
          {isSaving ? "Saving…" : "Next"}
        </Button>
        <Button
          variant="ghost"
          size="default"
          className="w-full"
          onClick={handleSaveLater}
          disabled={isSaving || !!isLoadingSession}
        >
          Save &amp; finish later
        </Button>
      </div>
    </div>
  );
}
