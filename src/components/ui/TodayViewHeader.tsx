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
}

function TodayViewHeader({
  sitterName,
  currentDay,
  totalDays,
  tasksToday = 0,
  completedTasks = 0,
  proofNeeded = 0,
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

      {/* Content */}
      <div className="relative flex flex-col gap-2">
        <h1 className="font-display text-3xl leading-tight tracking-tight text-text-on-primary m-0">
          Good morning, {sitterName}
        </h1>
        <p className="font-body text-sm leading-normal text-text-on-primary opacity-80 m-0">
          Day {currentDay} of {totalDays}
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
