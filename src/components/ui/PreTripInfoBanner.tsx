"use client";

import { LockIcon } from "@/components/ui/icons";

interface PreTripInfoBannerProps {
  startDate: string;
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year!, month! - 1, day);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
  });
}

function PreTripInfoBanner({ startDate }: PreTripInfoBannerProps) {
  return (
    <div className="sticky top-0 z-50 flex items-center gap-3 bg-accent-subtle text-accent-hover border-b border-accent px-4 py-3">
      <LockIcon size={16} className="shrink-0" aria-hidden="true" />
      <p className="font-body text-sm m-0">
        Tasks and vault access unlock on{" "}
        <span className="font-semibold">{formatDate(startDate)}</span>
      </p>
    </div>
  );
}

export { PreTripInfoBanner, type PreTripInfoBannerProps };
