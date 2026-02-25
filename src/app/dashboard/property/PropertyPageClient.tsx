"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { ChevronLeftIcon, ChevronRightIcon, HomeIcon, LockIcon } from "@/components/ui/icons";

// ── Hub card ──────────────────────────────────────────────────────────

interface HubCardProps {
  href: string;
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  count: number;
  noun: string;
}

function HubCard({ href, icon, iconBg, label, count, noun }: HubCardProps) {
  const countLabel = count > 0 ? `${count} ${noun}${count === 1 ? "" : "s"}` : "None yet";
  return (
    <Link
      href={href}
      className="bg-bg-raised rounded-xl border border-border-default p-4 flex flex-col gap-3 hover:border-border-strong transition-colors duration-150"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconBg}`}>
          {icon}
        </div>
        <ChevronRightIcon size={16} className="text-text-muted" />
      </div>
      <div>
        <p className="font-body text-sm font-semibold text-text-primary">{label}</p>
        <p className="font-body text-xs text-text-muted mt-0.5">{countLabel}</p>
      </div>
    </Link>
  );
}

// ── Property Hub ──────────────────────────────────────────────────────

function PropertyHubInner({ propertyId }: { propertyId: Id<"properties"> }) {
  const summary = useQuery(
    api.properties.getManualSummary,
    { propertyId },
  );

  if (!summary) {
    return (
      <div className="grid grid-cols-2 gap-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="bg-bg-raised rounded-xl border border-border-default p-4 animate-pulse">
            <div className="w-9 h-9 bg-bg-sunken rounded-lg mb-3" />
            <div className="h-4 bg-bg-sunken rounded-md w-2/3 mb-1" />
            <div className="h-3 bg-bg-sunken rounded-md w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <h1 className="font-display text-3xl text-text-primary leading-tight">
        {summary.propertyName ?? "My Property"}
      </h1>
      {summary.propertyAddress && (
        <p className="font-body text-xs text-text-muted -mt-4">{summary.propertyAddress}</p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <HubCard
          href="/dashboard/property/pets"
          icon={<span className="text-base" aria-hidden>🐾</span>}
          iconBg="bg-primary-subtle"
          label="Pets"
          count={summary.petCount}
          noun="pet"
        />
        <HubCard
          href="/dashboard/property/sections"
          icon={<span className="text-base" aria-hidden>📋</span>}
          iconBg="bg-accent-subtle"
          label="Sections"
          count={summary.sectionCount}
          noun="section"
        />
        <HubCard
          href="/dashboard/property/contacts"
          icon={<span className="text-base" aria-hidden>📞</span>}
          iconBg="bg-secondary-subtle"
          label="Contacts"
          count={summary.contactCount}
          noun="contact"
        />
        <HubCard
          href="/dashboard/property/vault"
          icon={<LockIcon size={18} className="text-vault" />}
          iconBg="bg-vault-subtle"
          label="Vault"
          count={summary.vaultItemCount}
          noun="item"
        />
      </div>
    </>
  );
}

export default function PropertyPageClient() {
  const { user } = useAuth();

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

  return (
    <CreatorLayout activeNav="property">
      <div className="flex flex-col gap-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-body text-xs text-text-muted hover:text-text-secondary transition-colors duration-150 self-start"
        >
          <ChevronLeftIcon />
          Dashboard
        </Link>

        {properties === undefined ? (
          <div className="animate-pulse">
            <div className="h-8 bg-bg-sunken rounded-md w-1/3 mb-6" />
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-bg-raised rounded-xl border border-border-default p-4">
                  <div className="w-9 h-9 bg-bg-sunken rounded-lg mb-3" />
                  <div className="h-4 bg-bg-sunken rounded-md w-2/3 mb-1" />
                  <div className="h-3 bg-bg-sunken rounded-md w-1/2" />
                </div>
              ))}
            </div>
          </div>
        ) : !property ? (
          <div className="flex flex-col gap-4 items-center text-center py-8">
            <div className="w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center">
              <HomeIcon size={22} className="text-primary" />
            </div>
            <p className="font-body text-sm text-text-secondary">
              No property found. Set up your home first.
            </p>
            <Link
              href="/setup/home"
              className="font-body text-sm font-semibold text-primary hover:text-primary-hover transition-colors duration-150"
            >
              Get started →
            </Link>
          </div>
        ) : (
          <>
            <PropertyHubInner propertyId={property._id} />
            <Link
              href="/setup/home"
              className="flex items-center gap-3 bg-bg-raised rounded-xl border border-border-default p-4 hover:border-border-strong transition-colors duration-150"
              style={{ boxShadow: "var(--shadow-xs)" }}
            >
              <div className="w-9 h-9 rounded-lg bg-accent-subtle flex items-center justify-center text-lg">
                🔄
              </div>
              <div className="flex-1">
                <p className="font-body text-sm font-semibold text-text-primary">Re-run setup wizard</p>
                <p className="font-body text-xs text-text-muted">Walk through all steps again to update your manual</p>
              </div>
              <ChevronRightIcon size={16} className="text-text-muted" />
            </Link>
          </>
        )}
      </div>
    </CreatorLayout>
  );
}
