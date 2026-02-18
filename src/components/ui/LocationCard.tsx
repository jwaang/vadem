"use client";

import { type HTMLAttributes, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

type TiltVariant = "tilted-left" | "neutral" | "tilted-right";

interface LocationCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Photo URL — renders placeholder when absent */
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
  className,
  ...props
}: LocationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = useCallback(() => {
    if (src) {
      setExpanded(true);
      onExpand?.(src);
    }
  }, [src, onExpand]);

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

  return (
    <>
      <div
        className={cn(
          "w-[280px] bg-bg-raised rounded-lg shadow-polaroid ring-1 ring-inset ring-[rgba(42,31,26,0.06)] transition-[translate,rotate,box-shadow] duration-250 ease-spring",
          tiltBase[tilt],
          src && "cursor-pointer focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2",
          src && tiltHover[tilt],
          className,
        )}
        role={src ? "button" : undefined}
        tabIndex={src ? 0 : undefined}
        onClick={handleClick}
        onKeyDown={src ? handleKeyDown : undefined}
        {...props}
      >
        <div className="p-2">
          <div className="relative w-full aspect-[4/3] overflow-hidden bg-bg-sunken rounded-md">
            {src ? (
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
          </div>
        </div>

        <div className="flex flex-col gap-2 px-2 pb-2">
          <p className="font-handwritten text-xl leading-snug text-text-primary m-0">
            {caption}
          </p>
          {room && <Badge variant="room">{room}</Badge>}
        </div>
      </div>

      {expanded && src && (
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
          <img
            src={src}
            alt={alt}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-md"
            onClick={(e) => e.stopPropagation()}
          />
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
