"use client";

import { useState, type HTMLAttributes } from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

type ActivityType = "view" | "task" | "vault" | "proof";

interface ActivityFeedItemProps extends HTMLAttributes<HTMLDivElement> {
  /** The type of activity — determines dot color */
  type: ActivityType;
  /** Bold name in the activity text (e.g. "Jamie") */
  name: string;
  /** The action description after the name */
  action: string;
  /** Timestamp string shown in muted xs text */
  timestamp: string;
  /** Whether to hide the bottom border (e.g. last item) */
  hideBorder?: boolean;
  /** Optional proof photo URL — shows 64px thumbnail below event text */
  proofPhotoUrl?: string;
}

const dotVariants = cva(
  "w-2 h-2 min-w-2 rounded-round mt-[6px] shrink-0",
  {
    variants: {
      type: {
        view: "bg-primary",
        task: "bg-secondary",
        vault: "bg-vault",
        proof: "bg-accent",
      },
    },
  },
);

function ActivityFeedItem({
  type,
  name,
  action,
  timestamp,
  hideBorder = false,
  proofPhotoUrl,
  className,
  ...props
}: ActivityFeedItemProps) {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "flex items-start gap-3 py-3",
          !hideBorder && "border-b border-border-default",
          className,
        )}
        {...props}
      >
        <span
          className={dotVariants({ type })}
          aria-hidden="true"
        />
        <div className="flex flex-col gap-1.5 min-w-0">
          <div className="flex flex-col gap-0.5">
            <p className="font-body text-sm leading-normal text-text-secondary m-0">
              <span className="font-semibold text-text-primary">{name}</span> {action}
            </p>
            <span className="font-body text-xs leading-normal text-text-muted">
              {timestamp}
            </span>
          </div>
          {proofPhotoUrl && (
            <button
              type="button"
              onClick={() => setViewerOpen(true)}
              className="w-16 h-16 rounded-md overflow-hidden shrink-0 self-start border border-border-default hover:opacity-90 transition-opacity duration-150"
              aria-label="View proof photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofPhotoUrl}
                alt="Proof photo"
                className="w-full h-full object-cover"
              />
            </button>
          )}
        </div>
      </div>

      {/* Full-screen viewer */}
      {viewerOpen && proofPhotoUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setViewerOpen(false)}
          role="dialog"
          aria-label="Proof photo full view"
          aria-modal="true"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proofPhotoUrl}
            alt="Proof photo full size"
            className="max-w-full max-h-full object-contain"
            style={{ touchAction: "pinch-zoom" }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            className="absolute top-4 right-4 w-9 h-9 rounded-round bg-white/20 text-white flex items-center justify-center hover:bg-white/30 transition-colors duration-150"
            onClick={() => setViewerOpen(false)}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}

export { ActivityFeedItem, type ActivityFeedItemProps, type ActivityType };
