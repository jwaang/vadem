"use client";

import { type HTMLAttributes, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

type TiltVariant = "tilted-left" | "neutral" | "tilted-right";

interface LocationCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Photo or thumbnail URL — renders placeholder when absent */
  src?: string;
  /** Alt text for the photo */
  alt?: string;
  /** Handwritten caption below the photo */
  caption: string;
  /** Room name displayed as a badge */
  room?: string;
  /** Tilt angle variant */
  tilt?: TiltVariant;
  /** Called when the card is tapped; receives the src */
  onExpand?: (src: string) => void;
  /** When set, shows a play icon overlay and plays this video on expand */
  videoSrc?: string;
  /**
   * Compact mode — renders as a slim horizontal strip instead of the full
   * polaroid card. Tapping still opens the full-screen viewer.
   */
  compact?: boolean;
}

function PlaceholderIcon() {
  return (
    <svg
      width="48"
      height="48"
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-text-muted"
    >
      <rect x="6" y="10" width="36" height="28" rx="3" />
      <circle cx="18" cy="22" r="4" />
      <path d="M42 32l-10-10-16 16" />
      <path d="M28 28l4-4 10 10" />
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
      stroke="white"
      strokeWidth="1"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function MapPinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

const tiltBase: Record<TiltVariant, string> = {
  "tilted-left": "rotate-[-1.5deg]",
  neutral: "rotate-0",
  "tilted-right": "rotate-[1.2deg]",
};

const tiltHover: Record<TiltVariant, string> = {
  "tilted-left": "hover:-translate-y-1 hover:rotate-[-2deg] hover:shadow-xl",
  neutral: "hover:-translate-y-1 hover:rotate-[-0.5deg] hover:shadow-xl",
  "tilted-right": "hover:-translate-y-1 hover:rotate-[0.7deg] hover:shadow-xl",
};

function LocationCard({
  src,
  alt = "",
  caption,
  room,
  tilt = "neutral",
  onExpand,
  videoSrc,
  compact = false,
  className,
  ...props
}: LocationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const isClickable = !!(src || videoSrc);

  const handleClick = useCallback(() => {
    if (isClickable) {
      setExpanded(true);
      if (src) onExpand?.(src);
    }
  }, [isClickable, src, onExpand]);

  const handleClose = useCallback(() => {
    setExpanded(false);
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick],
  );

  const handleOverlayKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClose();
      }
    },
    [handleClose],
  );

  // ── Compact strip mode ─────────────────────────────────────────────────────
  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={isClickable ? handleClick : undefined}
          onKeyDown={isClickable ? handleKeyDown : undefined}
          disabled={!isClickable}
          className={cn(
            "flex items-center gap-3 w-full rounded-lg border border-border-default bg-bg-raised px-3 py-2.5 text-left transition-colors duration-150",
            isClickable && "hover:bg-bg-sunken active:bg-bg-sunken cursor-pointer",
            !isClickable && "cursor-default",
            className,
          )}
          style={{ borderLeft: "3px solid var(--primary)" }}
          aria-label={caption || "View location photo"}
          {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        >
          {/* Thumbnail */}
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt || caption}
              className="w-11 h-11 rounded-md object-cover shrink-0 border border-border-default"
              draggable={false}
            />
          ) : (
            <div className="w-11 h-11 rounded-md bg-bg-sunken shrink-0 flex items-center justify-center text-text-muted">
              <MapPinIcon />
            </div>
          )}

          {/* Text */}
          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
            {room && (
              <span className="font-body text-[10px] font-semibold text-text-muted uppercase tracking-wide leading-none">
                {room}
              </span>
            )}
            {caption ? (
              <span className="font-handwritten text-base leading-snug text-text-primary truncate">
                {caption}
              </span>
            ) : (
              <span className="font-body text-xs text-text-muted">
                {videoSrc ? "View location video" : "View location photo"}
              </span>
            )}
          </div>

          {/* View affordance */}
          {isClickable && (
            <span className="shrink-0 font-body text-xs font-semibold text-primary">
              View →
            </span>
          )}
        </button>

        {/* Full-screen viewer */}
        {expanded && isClickable && (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(42,31,26,0.85)] animate-location-fade-in"
            onClick={handleClose}
            onKeyDown={handleOverlayKeyDown}
            role="dialog"
            aria-label={alt || caption}
            tabIndex={0}
          >
            <button
              className="absolute top-4 right-4 flex items-center justify-center w-11 h-11 rounded-round border-none bg-[rgba(255,255,255,0.15)] text-white cursor-pointer transition-[background-color] duration-150 ease-out hover:bg-[rgba(255,255,255,0.3)]"
              onClick={handleClose}
              aria-label="Close"
            >
              <CloseIcon />
            </button>
            {videoSrc ? (
              <video
                src={videoSrc}
                controls
                autoPlay
                className="max-w-[90vw] max-h-[90vh] rounded-md"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={src}
                alt={alt || caption}
                className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
                style={{ touchAction: "pinch-zoom" }}
                onClick={(e) => e.stopPropagation()}
              />
            )}
            {/* Caption overlay at bottom */}
            {(caption || room) && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 pointer-events-none">
                {caption && (
                  <p className="font-handwritten text-xl text-white/90 text-center px-4 drop-shadow">
                    {caption}
                  </p>
                )}
                {room && (
                  <span className="font-body text-xs font-semibold text-white/70 bg-black/30 px-3 py-1 rounded-pill">
                    {room}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </>
    );
  }

  // ── Full polaroid mode (default) ───────────────────────────────────────────
  return (
    <>
      <div
        className={cn(
          "w-[280px] bg-bg-raised rounded-lg shadow-polaroid ring-1 ring-inset ring-[rgba(42,31,26,0.06)] transition-[translate,rotate,box-shadow] duration-250 ease-spring",
          tiltBase[tilt],
          isClickable && "cursor-pointer focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
          isClickable && tiltHover[tilt],
          className,
        )}
        role={isClickable ? "button" : undefined}
        tabIndex={isClickable ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={isClickable ? handleKeyDown : undefined}
        {...props}
      >
        <div className="p-2">
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-bg-sunken rounded-md">
            {src ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={src}
                alt={alt}
                className="w-full h-full object-cover block"
                draggable={false}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-2 w-full h-full">
                <PlaceholderIcon />
                <span className="font-body text-sm text-text-muted">
                  No photo yet
                </span>
              </div>
            )}
            {/* Play icon overlay for video cards */}
            {videoSrc && src && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="flex items-center justify-center w-12 h-12 rounded-round bg-black/40">
                  <PlayIcon />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 px-2 pb-2">
          <p className="font-handwritten text-xl leading-snug text-text-primary m-0">
            {caption}
          </p>
          {room && <Badge variant="room">{room}</Badge>}
        </div>
      </div>

      {expanded && isClickable && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(42,31,26,0.85)] animate-location-fade-in"
          onClick={handleClose}
          onKeyDown={handleOverlayKeyDown}
          role="dialog"
          aria-label={alt || caption}
          tabIndex={0}
        >
          <button
            className="absolute top-4 right-4 flex items-center justify-center w-11 h-11 rounded-round border-none bg-[rgba(255,255,255,0.15)] text-white cursor-pointer transition-[background-color] duration-150 ease-out hover:bg-[rgba(255,255,255,0.3)]"
            onClick={handleClose}
            aria-label="Close"
          >
            <CloseIcon />
          </button>
          {videoSrc ? (
            <video
              src={videoSrc}
              controls
              autoPlay
              className="max-w-[90vw] max-h-[90vh] rounded-md"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
              style={{ touchAction: "pinch-zoom" }}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </>
  );
}

export {
  LocationCard,
  type LocationCardProps,
  type TiltVariant,
};
