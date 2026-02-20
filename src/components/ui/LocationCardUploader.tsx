"use client";

import { useRef, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocationCardUploaderProps {
  /** Parent record ID (polymorphic string) */
  parentId: string;
  /** Parent type for the card */
  parentType: "instruction" | "pet" | "vault" | "overlayItem";
  /** Called after successful save */
  onSuccess: () => void;
  /** Called to dismiss the modal */
  onClose: () => void;
  // ── Edit mode (pass to update an existing card) ──
  existingCardId?: Id<"locationCards">;
  existingPhotoUrl?: string | null;
  existingCaption?: string;
  existingRoomTag?: string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ROOM_TAGS = [
  "Kitchen",
  "Living Room",
  "Bedroom",
  "Bathroom",
  "Laundry Room",
  "Garage",
  "Backyard",
  "Basement",
  "Office",
  "Outdoor",
];

const MAX_WIDTH = 1920;

// ── Image compression ─────────────────────────────────────────────────────────

async function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else reject(new Error("Canvas toBlob failed"));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Image failed to load"));
    };
    img.src = objectUrl;
  });
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function CameraIcon() {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-muted"
      aria-hidden="true"
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── LocationCardUploader ──────────────────────────────────────────────────────

export function LocationCardUploader({
  parentId,
  parentType,
  onSuccess,
  onClose,
  existingCardId,
  existingPhotoUrl,
  existingCaption,
  existingRoomTag,
}: LocationCardUploaderProps) {
  const isEditMode = !!existingCardId;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine initial room state from existing room tag
  const initialRoomIsPreset = existingRoomTag ? ROOM_TAGS.includes(existingRoomTag) : false;
  const initialRoomIsCustom = !!existingRoomTag && !initialRoomIsPreset;

  const [preview, setPreview] = useState<string | null>(existingPhotoUrl ?? null);
  const [previewIsBlob, setPreviewIsBlob] = useState(false);
  const [compressedBlob, setCompressedBlob] = useState<Blob | null>(null);
  const [caption, setCaption] = useState(existingCaption ?? "");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(
    initialRoomIsPreset ? (existingRoomTag ?? null) : null,
  );
  const [customRoom, setCustomRoom] = useState(initialRoomIsCustom ? (existingRoomTag ?? "") : "");
  const [showCustomRoom, setShowCustomRoom] = useState(initialRoomIsCustom);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.locationCards.generateUploadUrl);
  const createLocationCard = useMutation(api.locationCards.create);
  const updateLocationCard = useMutation(api.locationCards.update);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      try {
        const blob = await compressImage(file);
        setCompressedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreview((prev) => {
          if (previewIsBlob && prev) URL.revokeObjectURL(prev);
          return url;
        });
        setPreviewIsBlob(true);
      } catch {
        setError("Failed to process image. Please try another file.");
      }
      e.target.value = "";
    },
    [previewIsBlob],
  );

  const handleSave = useCallback(async () => {
    setError(null);
    setUploading(true);

    const effectiveRoom = showCustomRoom
      ? customRoom.trim() || undefined
      : selectedRoom || undefined;

    try {
      if (isEditMode && existingCardId) {
        // ── Edit mode ──────────────────────────────────────────
        if (compressedBlob) {
          // New photo selected — upload it and update storageId
          const uploadUrl = await generateUploadUrl({});
          const res = await fetch(uploadUrl, {
            method: "POST",
            headers: { "Content-Type": "image/jpeg" },
            body: compressedBlob,
          });
          if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
          const { storageId } = (await res.json()) as { storageId: string };
          await updateLocationCard({
            cardId: existingCardId,
            storageId: storageId as Parameters<typeof updateLocationCard>[0]["storageId"],
            caption: caption.trim() || undefined,
            roomTag: effectiveRoom,
          });
        } else {
          // No new photo — update metadata only
          await updateLocationCard({
            cardId: existingCardId,
            caption: caption.trim() || undefined,
            roomTag: effectiveRoom,
          });
        }
      } else {
        // ── Create mode ────────────────────────────────────────
        if (!compressedBlob) return;
        const uploadUrl = await generateUploadUrl({});
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: compressedBlob,
        });
        if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
        const { storageId } = (await res.json()) as { storageId: string };
        await createLocationCard({
          parentId,
          parentType,
          storageId: storageId as Parameters<typeof createLocationCard>[0]["storageId"],
          caption: caption.trim() || undefined,
          roomTag: effectiveRoom,
        });
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [
    isEditMode,
    existingCardId,
    compressedBlob,
    caption,
    selectedRoom,
    customRoom,
    showCustomRoom,
    parentId,
    parentType,
    generateUploadUrl,
    createLocationCard,
    updateLocationCard,
    onSuccess,
  ]);

  const handleRoomSelect = (room: string) => {
    setSelectedRoom(room);
    setShowCustomRoom(false);
    setCustomRoom("");
  };

  const handleCustomRoomToggle = () => {
    setShowCustomRoom((v) => !v);
    setSelectedRoom(null);
  };

  // Save is enabled in edit mode even without a new photo (metadata-only update)
  const canSave = isEditMode ? !uploading : !!(compressedBlob && !uploading);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[200] bg-[rgba(42,31,26,0.6)]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditMode ? "Edit photo card" : "Add photo card"}
        className="fixed inset-x-4 bottom-4 z-[201] rounded-2xl bg-bg-raised shadow-xl flex flex-col overflow-hidden max-w-lg mx-auto sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="font-body text-base font-semibold text-text-primary">
            {isEditMode ? "Edit photo card" : "Add photo card"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-bg-sunken transition-colors duration-150"
            aria-label="Close"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 p-5 overflow-y-auto">
          {/* Error */}
          {error && (
            <div
              role="alert"
              className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
            >
              {error}
            </div>
          )}

          {/* Photo area */}
          <div>
            {preview ? (
              <div className="relative rounded-md overflow-hidden aspect-[4/3] bg-bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 font-body text-xs font-semibold bg-[rgba(42,31,26,0.6)] text-white px-3 py-1.5 rounded-md hover:bg-[rgba(42,31,26,0.8)] transition-colors duration-150"
                >
                  Change photo
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/3] rounded-md border-[1.5px] border-dashed border-border-strong bg-bg-sunken flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 cursor-pointer"
              >
                <CameraIcon />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-body text-sm font-semibold text-text-secondary">
                    Tap to add photo
                  </span>
                  <span className="font-body text-xs text-text-muted">
                    Camera or photo library
                  </span>
                </div>
              </button>
            )}

            {/* Hidden file input — capture="environment" enables camera on mobile */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={handleFileChange}
              aria-label="Select photo"
            />
          </div>

          {/* Caption */}
          <div className="flex flex-col gap-1.5">
            <label className="font-body text-xs font-semibold text-text-secondary">
              Caption{" "}
              <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. WiFi router behind the TV…"
              className="w-full font-handwritten text-xl text-text-primary bg-bg-sunken rounded-md border-[1.5px] border-border-default focus:border-primary outline-none px-3 py-2 transition-colors duration-150 placeholder:text-text-muted leading-snug"
            />
          </div>

          {/* Room tag */}
          <div className="flex flex-col gap-2">
            <label className="font-body text-xs font-semibold text-text-secondary">
              Room{" "}
              <span className="font-normal text-text-muted">(optional)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {ROOM_TAGS.map((room) => (
                <button
                  key={room}
                  type="button"
                  onClick={() => handleRoomSelect(room)}
                  aria-pressed={selectedRoom === room && !showCustomRoom}
                  className={`font-body text-xs font-semibold px-3 py-1.5 rounded-pill border transition-[background-color,border-color,color] duration-150 ${
                    selectedRoom === room && !showCustomRoom
                      ? "bg-primary-light border-primary text-primary"
                      : "bg-bg-sunken border-border-default text-text-secondary hover:border-border-strong hover:bg-bg"
                  }`}
                >
                  {room}
                </button>
              ))}
              <button
                type="button"
                onClick={handleCustomRoomToggle}
                aria-pressed={showCustomRoom}
                className={`font-body text-xs font-semibold px-3 py-1.5 rounded-pill border transition-[background-color,border-color,color] duration-150 ${
                  showCustomRoom
                    ? "bg-primary-light border-primary text-primary"
                    : "bg-bg-sunken border-border-default text-text-secondary hover:border-border-strong hover:bg-bg"
                }`}
              >
                Custom…
              </button>
            </div>

            {showCustomRoom && (
              <input
                type="text"
                value={customRoom}
                onChange={(e) => setCustomRoom(e.target.value)}
                placeholder="e.g. Loft, Mudroom…"
                autoFocus
                className="w-full font-body text-sm text-text-primary bg-bg-sunken rounded-md border-[1.5px] border-primary outline-none px-3 py-2 transition-colors duration-150 placeholder:text-text-muted"
              />
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center gap-3 px-5 py-4 border-t border-border-default">
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            className="flex-1 font-body text-sm font-semibold py-2.5 rounded-lg border border-border-default bg-bg-raised text-text-secondary hover:bg-bg-sunken transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="flex-1 font-body text-sm font-semibold py-2.5 rounded-lg bg-primary text-text-on-primary hover:bg-primary-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? "Saving…" : isEditMode ? "Update card" : "Save card"}
          </button>
        </div>
      </div>
    </>
  );
}

export type { LocationCardUploaderProps };
