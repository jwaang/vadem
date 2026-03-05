"use client";

import Link from "next/link";
import { ChevronLeftIcon, EyeIcon } from "@/components/ui/icons";

export function PreviewBanner() {
  return (
    <div className="sticky top-0 z-50 bg-accent-subtle border-b border-accent px-4 py-3 flex items-center gap-3">
      <Link
        href="/dashboard/property"
        className="flex items-center gap-1 font-body text-xs text-text-muted hover:text-text-secondary transition-colors duration-150 shrink-0"
      >
        <ChevronLeftIcon size={14} />
        <span className="hidden sm:inline">Back to property</span>
      </Link>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <EyeIcon size={16} className="text-accent-hover shrink-0" />
        <div className="min-w-0">
          <p className="font-body text-sm font-semibold text-accent-hover leading-tight">
            Preview Mode
          </p>
          <p className="font-body text-xs text-text-secondary leading-tight">
            This is how your sitter will see your manual
          </p>
        </div>
      </div>
    </div>
  );
}
