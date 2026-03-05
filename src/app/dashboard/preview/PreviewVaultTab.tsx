"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { VaultItem, LockIcon } from "@/components/ui/VaultItem";

interface PreviewVaultTabProps {
  propertyId: Id<"properties">;
}

function VaultSkeleton() {
  return (
    <div className="flex flex-col gap-3 animate-pulse" aria-hidden="true">
      {[1, 2, 3].map((i) => (
        <div key={i} className="h-16 bg-bg-raised rounded-lg border border-border-default" />
      ))}
    </div>
  );
}

export function PreviewVaultTab({ propertyId }: PreviewVaultTabProps) {
  const items = useQuery(api.vaultItems.listByPropertyId, { propertyId });

  if (items === undefined) {
    return <VaultSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <span className="text-3xl" aria-hidden="true">🔐</span>
        <p className="font-body text-sm font-semibold text-text-primary">No vault items</p>
        <p className="font-body text-xs text-text-muted max-w-[220px]">
          Add vault items to your property to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Info banner */}
      <div className="flex items-start gap-2.5 bg-vault-subtle text-vault rounded-lg px-4 py-3">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="shrink-0 mt-0.5"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <p className="font-body text-sm">
          This is how sitters see vault items after verifying their identity via SMS.
        </p>
      </div>

      {/* Verified header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-round bg-secondary text-text-on-primary shrink-0">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </div>
        <p className="font-body text-sm font-semibold text-secondary">
          Identity verified — vault unlocked
        </p>
      </div>

      {/* Revealed vault items */}
      <div className="flex flex-col gap-2">
        {items.map((item) => (
          <VaultItem
            key={item._id}
            state="revealed"
            icon={<LockIcon />}
            label={item.label}
            hint={item.instructions}
            networkName={item.networkName}
            value="••••••"
          />
        ))}
      </div>
    </div>
  );
}
