"use client";

import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface SummaryStat {
  /** Numeric value displayed in the chip */
  value: number;
  /** Label displayed next to the value */
  label: string;
}

interface TodayViewHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Sitter's first name for greeting */
  sitterName: string;
  /** Current day number within the trip */
  currentDay: number;
  /** Total number of days in the trip */
  totalDays: number;
  /** Number of tasks scheduled for today */
  tasksToday?: number;
  /** Number of tasks completed */
  completedTasks?: number;
  /** Number of tasks needing proof */
  proofNeeded?: number;
  /** Time context for first/last day (e.g. "Starts at 2:00 PM") */
  timeNote?: string;
  /** Callback when the gear (reminders) icon is tapped */
  onGearClick?: () => void;
  /** Show a dot indicator on the gear icon (e.g. not yet opted in) */
  showGearDot?: boolean;
}

function TodayViewHeader({
  sitterName,
  currentDay,
  totalDays,
  tasksToday = 0,
  completedTasks = 0,
  proofNeeded = 0,
  timeNote,
  onGearClick,
  showGearDot,
  className,
  ...props
}: TodayViewHeaderProps) {
  const stats: SummaryStat[] = [
    { value: tasksToday, label: "tasks today" },
    { value: completedTasks, label: "completed" },
    { value: proofNeeded, label: "proof needed" },
  ];

  return (
    <div
      className={cn(
        "relative bg-[linear-gradient(135deg,var(--color-primary),var(--color-primary-hover))] rounded-b-2xl pt-8 px-6 pb-6 overflow-hidden",
        className,
      )}
      {...props}
    >
      {/* Decorative circle */}
      <div
        className="absolute -top-10 -right-10 w-[300px] h-[300px] rounded-round bg-[rgba(255,255,255,0.06)] pointer-events-none"
        aria-hidden="true"
      />

      {/* Gear icon — top right */}
      {onGearClick && (
        <button
          type="button"
          onClick={onGearClick}
          className="absolute top-8 right-6 z-10 flex items-center justify-center w-9 h-9 rounded-round bg-[rgba(255,255,255,0.15)] text-text-on-primary transition-[background-color] duration-150 ease-out hover:bg-[rgba(255,255,255,0.25)]"
          aria-label="SMS reminder settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {showGearDot && (
            <span className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-round bg-accent border-2 border-primary" aria-hidden="true" />
          )}
        </button>
      )}

      {/* Content */}
      <div className="relative flex flex-col gap-2">
        <h1 className="font-display italic text-3xl leading-tight tracking-tight text-text-on-primary m-0 pr-12">
          Good morning, {sitterName}
        </h1>
        <p className="font-body text-sm leading-normal text-text-on-primary opacity-80 m-0">
          Day {currentDay} of {totalDays}
          {timeNote && (
            <span className="ml-2 font-body text-xs text-text-on-primary opacity-70">
              · {timeNote}
            </span>
          )}
        </p>

        {/* Summary stat chips */}
        <div className="flex gap-4 flex-wrap mt-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="inline-flex items-center gap-1 py-1 px-3 bg-[rgba(255,255,255,0.15)] backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)] border border-[rgba(255,255,255,0.2)] rounded-md font-body text-xs leading-normal text-text-on-primary"
            >
              <span className="font-bold">{stat.value}</span>
              <span className="font-normal opacity-90">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { TodayViewHeader, type TodayViewHeaderProps, type SummaryStat };
