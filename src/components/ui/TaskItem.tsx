"use client";

import { type HTMLAttributes, type ReactNode, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

interface TaskItemProps extends Omit<HTMLAttributes<HTMLDivElement>, "onClick" | "onToggle"> {
  /** Task description text */
  text: string;
  /** Whether the task starts completed */
  defaultCompleted?: boolean;
  /** Controlled completed state */
  completed?: boolean;
  /** Called when completion state toggles */
  onToggle?: (completed: boolean) => void;
  /** Time badge text (e.g. "7:00 AM") */
  time?: string;
  /** Room badge text (e.g. "Kitchen") */
  room?: string;
  /** Whether this is an overlay/trip-specific task */
  overlay?: boolean;
  /** Show proof button */
  showProof?: boolean;
  /** Called when proof button is clicked */
  onProof?: () => void;
  /** Proof photo URL — shows 48px thumbnail on completed task row */
  proofPhotoUrl?: string;
  /** Called when the proof thumbnail is tapped — opens full-screen viewer */
  onPhotoClick?: () => void;
  /** Whether a proof upload is in progress for this task */
  uploading?: boolean;
  /** Additional meta content */
  meta?: ReactNode;
}

function CameraIcon() {
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
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className="animate-spin"
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

function CheckmarkIcon({ visible }: { visible: boolean }) {
  return (
    <svg
      className={cn(
        "transition-[opacity,scale] duration-150 ease-spring",
        visible ? "opacity-100 scale-100" : "opacity-0 scale-0",
      )}
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3.5 8.5 6.5 11.5 12.5 5" />
    </svg>
  );
}

function TaskItem({
  text,
  defaultCompleted = false,
  completed: controlledCompleted,
  onToggle,
  time,
  room,
  overlay = false,
  showProof = false,
  onProof,
  proofPhotoUrl,
  onPhotoClick,
  uploading = false,
  meta,
  className,
  ...props
}: TaskItemProps) {
  const [internalCompleted, setInternalCompleted] = useState(defaultCompleted);
  const isControlled = controlledCompleted !== undefined;
  const completed = isControlled ? controlledCompleted : internalCompleted;

  const handleToggle = useCallback(() => {
    // Don't allow toggling while uploading
    if (uploading) return;
    const next = !completed;
    if (!isControlled) {
      setInternalCompleted(next);
    }
    onToggle?.(next);
  }, [completed, isControlled, onToggle, uploading]);

  const handleProofClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onProof?.();
    },
    [onProof],
  );

  const hasMeta = time || room || overlay || meta;

  return (
    <div
      className={cn(
        "flex items-start gap-4 py-4 px-5 rounded-lg border border-border-default bg-bg-raised cursor-pointer select-none transition-[border-color,box-shadow,background-color] duration-150 ease-out hover:border-border-strong hover:shadow-sm",
        completed && "bg-secondary-subtle",
        overlay && "border-l-[3px] border-l-accent",
        uploading && "opacity-70 cursor-wait",
        className,
      )}
      onClick={handleToggle}
      role="checkbox"
      aria-checked={completed}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          handleToggle();
        }
      }}
      {...props}
    >
      {/* Checkbox */}
      <div
        className={cn(
          "relative w-[26px] h-[26px] min-w-[26px] rounded-sm border-[1.5px] border-border-strong bg-bg-raised cursor-pointer transition-[background-color,border-color] duration-150 ease-spring flex items-center justify-center shrink-0 mt-px",
          completed && "bg-secondary border-secondary animate-check-pop",
        )}
      >
        <CheckmarkIcon visible={completed} />
      </div>

      {/* Body */}
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        <span
          className={cn(
            "font-body text-sm font-medium leading-snug text-text-primary transition-[color,text-decoration-color] duration-150 ease-out",
            completed && "line-through text-text-muted",
          )}
        >
          {text}
        </span>

        {hasMeta && (
          <div className="flex flex-wrap gap-2 items-center">
            {time && <Badge variant="time">{time}</Badge>}
            {room && <Badge variant="room">{room}</Badge>}
            {overlay && <Badge variant="overlay">This Trip Only</Badge>}
            {meta}
          </div>
        )}
      </div>

      {/* Proof photo thumbnail — shown when completed with proof */}
      {completed && proofPhotoUrl && (
        <button
          type="button"
          className="shrink-0 mt-px cursor-pointer"
          onClick={(e) => { e.stopPropagation(); onPhotoClick?.(); }}
          aria-label="View proof photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={proofPhotoUrl}
            alt="Proof"
            className="w-12 h-12 rounded-md object-cover border border-border-default shadow-xs"
          />
        </button>
      )}

      {/* Uploading spinner */}
      {uploading && (
        <div
          className="shrink-0 flex items-center justify-center w-8 h-8 mt-px text-text-muted"
          aria-label="Uploading proof photo…"
        >
          <SpinnerIcon />
        </div>
      )}

      {/* Proof button — only shown when not completed, not uploading */}
      {!uploading && showProof && (
        <button
          type="button"
          className="inline-flex items-center gap-1 font-body text-xs font-semibold text-text-muted py-1 px-2 border-[1.5px] border-dashed border-border-strong rounded-sm bg-transparent cursor-pointer whitespace-nowrap transition-[color,border-color] duration-150 ease-out hover:text-primary hover:border-primary"
          onClick={handleProofClick}
          aria-label="Add proof photo"
        >
          <CameraIcon />
          Proof
        </button>
      )}
    </div>
  );
}

export { TaskItem, type TaskItemProps };
