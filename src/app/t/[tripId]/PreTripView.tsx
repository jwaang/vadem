"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PreviewPageInner } from "@/app/dashboard/preview/PreviewPageInner";

interface PreTripViewProps {
  propertyId: Id<"properties">;
  propertyName: string;
  startDate: string;
  endDate: string;
  petNames: string[];
}

function PreTripView({ propertyId, propertyName, startDate, endDate, petNames }: PreTripViewProps) {
  const today = new Date().toLocaleDateString("en-CA");
  const data = useQuery(api.todayView.getPreviewTasks, { propertyId, today });

  if (data === undefined) {
    return (
      <div className="min-h-dvh bg-bg animate-pulse">
        <div className="h-14 bg-accent-subtle" />
        <div className="h-48 bg-primary-light rounded-b-2xl" />
        <div className="p-4 flex flex-col gap-4">
          <div className="h-16 bg-bg-raised rounded-lg" />
          <div className="h-10 bg-bg-raised rounded-lg" />
          <div className="h-10 bg-bg-raised rounded-lg" />
        </div>
      </div>
    );
  }

  if (data === null) {
    return (
      <div className="min-h-dvh bg-bg flex items-center justify-center p-6">
        <p className="font-body text-sm text-text-muted text-center">
          Property not found. The owner may still be setting things up.
        </p>
      </div>
    );
  }

  return (
    <PreviewPageInner
      data={data}
      mode="pre-trip"
      tripMeta={{
        propertyName,
        startDate,
        endDate,
        petCount: petNames.length,
      }}
    />
  );
}

export { PreTripView, type PreTripViewProps };
