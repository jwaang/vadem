"use client";

import { type HTMLAttributes } from "react";

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
  className = "",
  ...props
}: TodayViewHeaderProps) {
  const stats: SummaryStat[] = [
    { value: tasksToday, label: "tasks today" },
    { value: completedTasks, label: "completed" },
    { value: proofNeeded, label: "proof needed" },
  ];

  return (
    <div
      className={["today-header", className].filter(Boolean).join(" ")}
      {...props}
    >
      {/* Decorative circle */}
      <div className="today-header-circle" aria-hidden="true" />

      {/* Content */}
      <div className="today-header-content">
        <h1 className="today-header-greeting">
          Good morning, {sitterName}
        </h1>
        <p className="today-header-date">
          Day {currentDay} of {totalDays}
        </p>

        {/* Summary stat chips */}
        <div className="today-header-stats">
          {stats.map((stat) => (
            <div key={stat.label} className="today-header-chip">
              <span className="today-header-chip-value">{stat.value}</span>
              <span className="today-header-chip-label">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export { TodayViewHeader, type TodayViewHeaderProps, type SummaryStat };
