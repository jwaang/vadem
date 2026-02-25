"use client";

import { useRef, useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface LocationCardVideoUploaderProps {
  /** Parent record ID (polymorphic string) */
  parentId: string;
  /** Parent type for the card */
  parentType: "instruction" | "pet" | "vault" | "overlayItem";
  /** Called after successful save */
  onSuccess: () => void;
  /** Called to dismiss the modal */
  onClose: () => void;
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

const MAX_VIDEO_DURATION = 30; // seconds

// ── Video processing ──────────────────────────────────────────────────────────

interface ProcessedVideo {
  videoBlob: Blob;
  thumbnailBlob: Blob;
  thumbnailPreview: string;
  videoMimeType: string;
  duration: number;
}

/**
 * Loads a video file, checks duration (max 30s), and generates a JPEG
 * thumbnail by drawing the first decodable frame to a canvas.
 */
function processVideoFile(file: File): Promise<ProcessedVideo> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";

    const objectUrl = URL.createObjectURL(file);
    let settled = false;

    function cleanup() {
      URL.revokeObjectURL(objectUrl);
    }

    video.onerror = () => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error("Video failed to load. Please try another file."));
    };

    video.onloadedmetadata = () => {
      if (settled) return;
      if (video.duration > MAX_VIDEO_DURATION) {
        settled = true;
        cleanup();
        reject(
          new Error(
            `Video is too long (${Math.round(video.duration)}s). Maximum is ${MAX_VIDEO_DURATION} seconds.`,
          ),
        );
      }
    };

    video.onloadeddata = () => {
      if (settled) return;
      // Draw the first available frame to canvas for thumbnail
      const maxW = 1920;
      const vw = video.videoWidth || 1280;
      const vh = video.videoHeight || 720;
      const w = Math.min(vw, maxW);
      const h = Math.round(vh * (w / vw));

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx2d = canvas.getContext("2d");
      if (!ctx2d) {
        settled = true;
        cleanup();
        reject(new Error("Canvas 2D context unavailable"));
        return;
      }
      ctx2d.drawImage(video, 0, 0, w, h);
      canvas.toBlob(
        (thumbBlob) => {
          if (settled) return;
          settled = true;
          cleanup();
          if (!thumbBlob) {
            reject(new Error("Failed to generate thumbnail"));
            return;
          }
          const thumbnailPreview = URL.createObjectURL(thumbBlob);
          resolve({
            videoBlob: file,
            thumbnailBlob: thumbBlob,
            thumbnailPreview,
            videoMimeType: file.type || "video/mp4",
            duration: video.duration,
          });
        },
        "image/jpeg",
        0.85,
      );
    };

    video.src = objectUrl;
    video.load();
  });
}

// ── SVG Icons ─────────────────────────────────────────────────────────────────

function VideoIcon() {
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
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="white"
      stroke="none"
      aria-hidden="true"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
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

// ── LocationCardVideoUploader ──────────────────────────────────────────────────

export function LocationCardVideoUploader({
  parentId,
  parentType,
  onSuccess,
  onClose,
}: LocationCardVideoUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [processed, setProcessed] = useState<ProcessedVideo | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [customRoom, setCustomRoom] = useState("");
  const [showCustomRoom, setShowCustomRoom] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateUploadUrl = useMutation(api.locationCards.generateUploadUrl);
  const createLocationCard = useMutation(api.locationCards.create);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      // Revoke any existing preview URL to avoid memory leaks
      setProcessed((prev) => {
        if (prev?.thumbnailPreview) URL.revokeObjectURL(prev.thumbnailPreview);
        return null;
      });
      try {
        const result = await processVideoFile(file);
        setProcessed(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process video. Please try another file.");
      }
      // Reset input so the same file can be re-selected
      e.target.value = "";
    },
    [],
  );

  const handleSave = useCallback(async () => {
    if (!processed) return;
    setError(null);
    setUploading(true);
    try {
      // Get two upload URLs: one for thumbnail, one for video
      const [thumbUploadUrl, videoUploadUrl] = await Promise.all([
        generateUploadUrl({}),
        generateUploadUrl({}),
      ]);

      // Upload both in parallel
      const [thumbRes, videoRes] = await Promise.all([
        fetch(thumbUploadUrl, {
          method: "POST",
          headers: { "Content-Type": "image/jpeg" },
          body: processed.thumbnailBlob,
        }),
        fetch(videoUploadUrl, {
          method: "POST",
          headers: { "Content-Type": processed.videoMimeType },
          body: processed.videoBlob,
        }),
      ]);

      if (!thumbRes.ok) throw new Error(`Thumbnail upload failed: ${thumbRes.status}`);
      if (!videoRes.ok) throw new Error(`Video upload failed: ${videoRes.status}`);

      const { storageId: thumbStorageId } = (await thumbRes.json()) as { storageId: string };
      const { storageId: videoStorageId } = (await videoRes.json()) as { storageId: string };

      const effectiveRoom = showCustomRoom
        ? customRoom.trim() || undefined
        : selectedRoom || undefined;

      await createLocationCard({
        parentId,
        parentType,
        storageId: thumbStorageId as Parameters<typeof createLocationCard>[0]["storageId"],
        videoStorageId: videoStorageId as Parameters<typeof createLocationCard>[0]["videoStorageId"],
        caption: caption.trim() || undefined,
        roomTag: effectiveRoom,
      });

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }, [
    processed,
    caption,
    selectedRoom,
    customRoom,
    showCustomRoom,
    parentId,
    parentType,
    generateUploadUrl,
    createLocationCard,
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
        aria-label="Add video card"
        className="fixed inset-x-4 bottom-4 z-[201] rounded-2xl bg-bg-raised shadow-xl flex flex-col overflow-hidden max-w-lg mx-auto sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-full"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-default">
          <h2 className="font-body text-base font-semibold text-text-primary">
            Add video card
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

          {/* Video area */}
          <div>
            {processed?.thumbnailPreview ? (
              <div className="relative rounded-md overflow-hidden aspect-[4/3] bg-bg-sunken">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={processed.thumbnailPreview}
                  alt="Video thumbnail preview"
                  className="w-full h-full object-cover"
                />
                {/* Play icon overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="flex items-center justify-center w-12 h-12 rounded-round bg-black/40">
                    <PlayIcon />
                  </div>
                </div>
                {/* Duration badge */}
                <div className="absolute bottom-2 left-2 font-body text-xs font-semibold bg-[rgba(42,31,26,0.6)] text-white px-2 py-1 rounded-md">
                  {Math.round(processed.duration)}s
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-2 right-2 font-body text-xs font-semibold bg-[rgba(42,31,26,0.6)] text-white px-3 py-1.5 rounded-md hover:bg-[rgba(42,31,26,0.8)] transition-colors duration-150"
                >
                  Change video
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full aspect-[4/3] rounded-md border-[1.5px] border-dashed border-border-strong bg-bg-sunken flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 cursor-pointer"
              >
                <VideoIcon />
                <div className="flex flex-col items-center gap-0.5">
                  <span className="font-body text-sm font-semibold text-text-secondary">
                    Tap to add video
                  </span>
                  <span className="font-body text-xs text-text-muted">
                    Camera or video library · max 30s
                  </span>
                </div>
              </button>
            )}

            {/* Hidden file input — capture="environment" enables camera on mobile */}
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              capture="environment"
              className="sr-only"
              onChange={handleFileChange}
              aria-label="Select video"
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
              placeholder="e.g. Watch how to start the washing machine…"
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
            disabled={!processed || uploading}
            className="flex-1 font-body text-sm font-semibold py-2.5 rounded-lg bg-primary text-text-on-primary hover:bg-primary-hover transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {uploading ? "Saving…" : "Save card"}
          </button>
        </div>
      </div>
    </>
  );
}

export type { LocationCardVideoUploaderProps };
