"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/Button";
import { TrashIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/authContext";

export interface TripSetupHeaderProps {
  tripId: Id<"trips">;
}

export function TripSetupHeader({ tripId }: TripSetupHeaderProps) {
  const router = useRouter();
  const { user } = useAuth();
  const deleteTrip = useMutation(api.trips.remove);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  return (
    <>
      <header className="bg-bg-raised border-b border-border-default px-4 py-4 flex items-center gap-3">
        <div className="flex items-center gap-3 flex-1">
          <a
            href="/dashboard/trips"
            className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
          >
            ← Trips
          </a>
          <span className="text-border-strong">|</span>
          <h1 className="font-body text-sm font-semibold text-text-primary">
            Trip Setup
          </h1>
        </div>
        {showDeleteConfirm ? (
          <div className="flex items-center gap-2">
            <Button
              variant="danger"
              size="sm"
              disabled={isDeleting}
              onClick={async () => {
                if (!user?.token) return;
                setIsDeleting(true);
                setDeleteError("");
                try {
                  await deleteTrip({ tripId, token: user.token });
                  router.push("/dashboard/trips");
                } catch (err) {
                  const msg = err instanceof Error ? err.message : "Failed to delete trip.";
                  setDeleteError(msg);
                  setIsDeleting(false);
                }
              }}
            >
              {isDeleting ? "Deleting\u2026" : "Confirm delete"}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={isDeleting}
              onClick={() => {
                setShowDeleteConfirm(false);
                setDeleteError("");
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            icon={<TrashIcon size={14} />}
            onClick={() => setShowDeleteConfirm(true)}
            className="text-danger hover:text-danger-hover ml-auto"
          >
            Delete trip
          </Button>
        )}
      </header>
      {deleteError && (
        <div role="alert" className="bg-danger-light text-danger px-4 py-3 font-body text-sm">
          {deleteError}
        </div>
      )}
    </>
  );
}
