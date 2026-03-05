"use client";

import { type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface PreTripHeaderProps extends HTMLAttributes<HTMLDivElement> {
  propertyName: string;
  startDate: string;
  endDate: string;
  petCount: number;
}

function formatDateRange(startDate: string, endDate: string): string {
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const start = new Date(sy!, sm! - 1, sd);
  const end = new Date(ey!, em! - 1, ed);

  const startFmt = start.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const sameYear = sy === ey;
  const endFmt = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (sameYear) {
    return `${startFmt} \u2013 ${endFmt}`;
  }
  const startWithYear = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  return `${startWithYear} \u2013 ${endFmt}`;
}

function PreTripHeader({
  propertyName,
  startDate,
  endDate,
  petCount,
  className,
  ...props
}: PreTripHeaderProps) {
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
        <h1 className="font-display italic text-3xl leading-tight tracking-tight text-text-on-primary m-0">
          {propertyName}
        </h1>
        <p className="font-body text-sm leading-normal text-text-on-primary opacity-80 m-0">
          {formatDateRange(startDate, endDate)}
        </p>

        <div className="flex gap-4 flex-wrap mt-3">
          {petCount > 0 && (
            <div className="inline-flex items-center gap-1 py-1 px-3 bg-[rgba(255,255,255,0.15)] backdrop-blur-[8px] [-webkit-backdrop-filter:blur(8px)] border border-[rgba(255,255,255,0.2)] rounded-md font-body text-xs leading-normal text-text-on-primary">
              <span className="font-bold">{petCount}</span>
              <span className="font-normal opacity-90">
                {petCount === 1 ? "pet" : "pets"}
              </span>
            </div>
          )}
        </div>

        <p className="font-body text-xs leading-normal text-text-on-primary opacity-70 mt-1 m-0">
          Browse the manual to get familiar before your stay
        </p>
      </div>
    </div>
  );
}

export { PreTripHeader, type PreTripHeaderProps };
