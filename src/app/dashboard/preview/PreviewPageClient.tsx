"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useAuth } from "@/lib/authContext";
import { HomeIcon, ChevronLeftIcon } from "@/components/ui/icons";
import { PreviewPageInner } from "./PreviewPageInner";

function LoadingSkeleton() {
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

export default function PreviewPageClient() {
  const { user, isLoading } = useAuth();

  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );
  const userId = sessionData?.userId;

  const properties = useQuery(
    api.properties.listByOwner,
    userId ? { ownerId: userId } : "skip",
  );
  const property = properties?.[0] ?? null;

  const today = new Date().toLocaleDateString("en-CA");

  const previewData = useQuery(
    api.todayView.getPreviewTasks,
    property ? { propertyId: property._id, today } : "skip",
  );

  if (isLoading || !user || properties === undefined || (property && previewData === undefined)) {
    return <LoadingSkeleton />;
  }

  if (!property || previewData === null) {
    return (
      <div className="min-h-dvh bg-bg flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center">
          <HomeIcon size={22} className="text-primary" />
        </div>
        <p className="font-body text-sm text-text-secondary">
          No property found. Set up your home to preview the sitter view.
        </p>
        <Link
          href="/dashboard/property"
          className="inline-flex items-center gap-1.5 font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
        >
          <ChevronLeftIcon size={14} />
          Back to property
        </Link>
      </div>
    );
  }

  return <PreviewPageInner data={previewData} />;
}
