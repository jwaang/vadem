"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { SearchBar } from "@/components/ui/SearchBar";
import { SectionNav } from "@/components/ui/SectionNav";
import { Badge } from "@/components/ui/Badge";
import { PetProfileCard, type PetDetail } from "@/components/ui/PetProfileCard";
import { LocationCard } from "@/components/ui/LocationCard";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/phone";
import { saveManualData, loadManualData } from "@/lib/offlineTripData";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SearchResult {
  type: "instruction" | "section" | "pet" | "location_card" | "contact";
  id: string;
  snippet: string;
  sectionName: string;
  sectionId?: string;
  propertyId: string;
}

interface LocationCardData {
  _id: string;
  photoUrl?: string;
  resolvedVideoUrl?: string | null;
  caption: string;
  roomTag?: string;
}

interface InstructionData {
  _id: string;
  text: string;
  timeSlot?: string;
  locationCards: LocationCardData[];
}

interface SectionData {
  _id: string;
  title: string;
  icon?: string;
  instructions: InstructionData[];
}

interface MedicationData {
  name: string;
  dosage: string;
  frequency: string;
  time: string;
}

interface PetData {
  _id: string;
  name: string;
  species: string;
  breed?: string;
  age?: string;
  feedingInstructions?: string;
  vetName?: string;
  vetPhone?: string;
  personalityNotes?: string;
  medicalConditions?: string;
  medications: MedicationData[];
  behavioralQuirks?: string;
  allergies?: string;
  microchipNumber?: string;
  walkingRoutine?: string;
  groomingNeeds?: string;
  comfortItems?: string;
  resolvedPhotoUrl: string | null;
}

interface ContactData {
  _id: string;
  name: string;
  role: string;
  phone: string;
  notes?: string;
}

interface FullManualData {
  property: { _id: string; name: string; address?: string; manualVersion?: number };
  sections: SectionData[];
  pets: PetData[];
  emergencyContacts: ContactData[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function truncate(text: string, max = 60): string {
  return text.length > max ? text.slice(0, max - 3) + "…" : text;
}

function buildPetDetails(pet: PetData): PetDetail[] {
  const details: PetDetail[] = [];
  if (pet.feedingInstructions) {
    details.push({ emoji: "📝", label: "Care notes", value: truncate(pet.feedingInstructions) });
  }
  if (pet.vetName) {
    details.push({
      emoji: "🏥",
      label: "Vet",
      value: pet.vetName,
      ...(pet.vetPhone ? { phone: formatPhone(pet.vetPhone) } : {}),
    });
  }
  if (pet.walkingRoutine) {
    details.push({ emoji: "🚶", label: "Walks", value: truncate(pet.walkingRoutine) });
  }
  if (pet.medicalConditions) {
    details.push({ emoji: "🩺", label: "Medical", value: truncate(pet.medicalConditions) });
  }
  if (pet.medications.length > 0) {
    const summary = pet.medications
      .map((m) => [m.name, m.dosage].filter(Boolean).join(" "))
      .join(", ");
    details.push({ emoji: "💊", label: "Meds", value: truncate(summary) });
  }
  if (pet.allergies) {
    details.push({ emoji: "⚠️", label: "Allergies", value: truncate(pet.allergies) });
  }
  if (pet.behavioralQuirks) {
    details.push({ emoji: "🐾", label: "Quirks", value: truncate(pet.behavioralQuirks) });
  }
  if (pet.groomingNeeds) {
    details.push({ emoji: "✂️", label: "Grooming", value: truncate(pet.groomingNeeds) });
  }
  if (pet.comfortItems) {
    details.push({ emoji: "🧸", label: "Comfort", value: truncate(pet.comfortItems) });
  }
  if (pet.microchipNumber) {
    details.push({ emoji: "📟", label: "Microchip", value: pet.microchipNumber });
  }
  return details;
}

// ── Search result row ─────────────────────────────────────────────────────────

interface ResultRowProps {
  result: SearchResult;
  query: string;
  onClick: () => void;
}

function ResultRow({ result, query, onClick }: ResultRowProps) {
  function highlightSnippet(text: string): React.ReactNode {
    if (!query.trim()) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="font-medium text-text-primary">
          {text.slice(idx, idx + query.trim().length)}
        </span>
        {text.slice(idx + query.trim().length)}
      </>
    );
  }

  const typeLabel: Record<SearchResult["type"], string> = {
    instruction: "Instruction",
    section: "Section",
    pet: "Pet",
    location_card: "Photo",
    contact: "Contact",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left bg-bg-raised border border-border-default rounded-lg p-4 hover:bg-bg-sunken transition-[background-color,box-shadow] duration-150 ease-out active:shadow-inner cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-body text-sm text-text-muted mb-1">
            {result.sectionName}
            <span className="mx-1.5 text-border-default">·</span>
            <span className="capitalize">{typeLabel[result.type]}</span>
          </p>
          <p className="font-body text-sm text-text-secondary leading-relaxed">
            {highlightSnippet(result.snippet)}
          </p>
        </div>
        <svg
          className="shrink-0 text-text-muted mt-0.5"
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M6 3l5 5-5 5" />
        </svg>
      </div>
    </button>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-12 h-12 rounded-full bg-bg-sunken flex items-center justify-center mb-4">
        <svg
          className="text-text-muted"
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="10" cy="10" r="7" />
          <line x1="15" y1="15" x2="20" y2="20" />
        </svg>
      </div>
      <p className="font-body text-base text-text-secondary">
        No results for{" "}
        <span className="font-medium text-text-primary">
          &ldquo;{query}&rdquo;
        </span>
      </p>
      <p className="font-body text-sm text-text-muted mt-1">
        Try a different word or phrase
      </p>
    </div>
  );
}

// ── ManualTab ─────────────────────────────────────────────────────────────────

export interface ManualTabProps {
  propertyId: Id<"properties">;
  isOnline?: boolean;
}

export function ManualTab({ propertyId, isOnline }: ManualTabProps) {
  // ── Data ─────────────────────────────────────────────────────────────────
  const fullManual = useQuery(
    api.manualView.getFullManual,
    { propertyId },
  ) as FullManualData | null | undefined;

  // ── Offline cache ───────────────────────────────────────────────────────
  const [cachedManual] = useState<FullManualData | null>(
    () => loadManualData<FullManualData>(propertyId),
  );

  useEffect(() => {
    if (!fullManual) return;
    const version = fullManual.property.manualVersion ?? 0;
    saveManualData(propertyId, version, fullManual);
  }, [fullManual, propertyId]);

  const manual = fullManual ?? cachedManual;
  const isShowingCached = !fullManual && !!cachedManual;

  // ── Search state ──────────────────────────────────────────────────────────
  const [query, setQuery] = useState<string>(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("q") ?? "";
  });
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const [highlightedInstruction, setHighlightedInstruction] = useState<
    string | null
  >(null);

  // ── Debounce query ────────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Sync query to URL (replaceState — no history entry)
  const prevQueryRef = useRef(query);
  useEffect(() => {
    if (query === prevQueryRef.current) return;
    prevQueryRef.current = query;
    const params = new URLSearchParams(window.location.search);
    if (query) {
      params.set("q", query);
    } else {
      params.delete("q");
    }
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
  }, [query]);

  // Restore query on browser back/forward
  useEffect(() => {
    function onPopState() {
      const restored =
        new URLSearchParams(window.location.search).get("q") ?? "";
      setQuery(restored);
      prevQueryRef.current = restored;
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Scroll highlighted instruction into view after search cleared
  useEffect(() => {
    if (!highlightedInstruction) return;
    const t = setTimeout(() => {
      const el = document.getElementById(
        `instruction-${highlightedInstruction}`,
      );
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
      const clear = setTimeout(() => setHighlightedInstruction(null), 2500);
      return () => clearTimeout(clear);
    }, 80);
    return () => clearTimeout(t);
  }, [highlightedInstruction]);

  // ── Convex search ─────────────────────────────────────────────────────────
  const convexResults = useQuery(
    api.search.searchManual,
    debouncedQuery.trim()
      ? { propertyId, query: debouncedQuery.trim(), context: "manual" as const }
      : "skip",
  );

  // ── Client-side fallback search (uses fullManual cache) ───────────────────
  const clientResults = useMemo<SearchResult[]>(() => {
    if (!debouncedQuery.trim() || convexResults !== undefined || !manual)
      return [];
    const q = debouncedQuery.toLowerCase().trim();
    const out: SearchResult[] = [];
    for (const section of manual.sections) {
      if (section.title.toLowerCase().includes(q)) {
        out.push({
          type: "section",
          id: section._id,
          snippet: section.title,
          sectionName: section.title,
          sectionId: section._id,
          propertyId: propertyId as string,
        });
      }
      for (const inst of section.instructions) {
        if (inst.text.toLowerCase().includes(q)) {
          const snippet =
            inst.text.length > 120 ? inst.text.slice(0, 120) + "…" : inst.text;
          out.push({
            type: "instruction",
            id: inst._id,
            snippet,
            sectionName: section.title,
            sectionId: section._id,
            propertyId: propertyId as string,
          });
        }
      }
    }
    for (const pet of manual.pets) {
      // Search across all pet text fields
      const searchable = [
        pet.name,
        pet.breed,
        pet.feedingInstructions,
        pet.personalityNotes,
        pet.medicalConditions,
        pet.behavioralQuirks,
        pet.allergies,
        pet.walkingRoutine,
        pet.groomingNeeds,
        pet.comfortItems,
        pet.vetName,
        ...pet.medications.map((m) => `${m.name} ${m.dosage} ${m.frequency}`),
      ];
      const match = searchable.find((s) => s?.toLowerCase().includes(q));
      if (match) {
        const snippet =
          match === pet.name
            ? pet.name
            : match.length > 120
              ? match.slice(0, 120) + "…"
              : match;
        out.push({
          type: "pet",
          id: pet._id,
          snippet: `${pet.name} — ${snippet}`,
          sectionName: "Pets",
          propertyId: propertyId as string,
        });
      }
    }
    for (const contact of manual.emergencyContacts) {
      const searchable = [contact.name, contact.role, contact.phone, contact.notes];
      const match = searchable.find((s) => s?.toLowerCase().includes(q));
      if (match) {
        const snippet = contact.role
          ? `${contact.name} — ${contact.role}`
          : contact.name;
        out.push({
          type: "contact",
          id: contact._id,
          snippet,
          sectionName: "Emergency Contacts",
          propertyId: propertyId as string,
        });
      }
    }
    return out;
  }, [debouncedQuery, convexResults, manual, propertyId]);

  const results: SearchResult[] | null = debouncedQuery.trim()
    ? (convexResults ?? clientResults)
    : null;
  const isSearchLoading =
    !!debouncedQuery.trim() &&
    convexResults === undefined &&
    clientResults.length === 0;

  // ── Section nav ───────────────────────────────────────────────────────────
  const navSections = useMemo(() => {
    if (!manual) return [];
    const secs = manual.sections.map((s) => ({
      id: s._id,
      emoji: s.icon ?? "📋",
      label: s.title,
    }));
    if (manual.pets.length > 0) {
      secs.push({ id: "pets", emoji: "🐾", label: "Pets" });
    }
    if (manual.emergencyContacts.length > 0) {
      secs.push({ id: "contacts", emoji: "📞", label: "Contacts" });
    }
    return secs;
  }, [manual]);

  const handleSectionScroll = useCallback((id: string) => {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // ── Search result click ───────────────────────────────────────────────────
  function handleResultClick(result: SearchResult) {
    // Clear search (add history entry so browser back works)
    const params = new URLSearchParams(window.location.search);
    params.delete("q");
    const qs = params.toString();
    window.history.pushState(
      null,
      "",
      qs ? `?${qs}` : window.location.pathname,
    );
    setQuery("");
    prevQueryRef.current = "";
    setDebouncedQuery("");

    if (result.type === "instruction") {
      setHighlightedInstruction(result.id);
    } else {
      let targetId: string;
      if (result.type === "pet") {
        targetId = "pets";
      } else if (result.type === "contact") {
        targetId = "contacts";
      } else if (result.type === "section") {
        targetId = result.id;
      } else {
        targetId = result.sectionId ?? result.id;
      }
      setTimeout(() => {
        document
          .getElementById(targetId)
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    }
  }

  // ── Offline state ────────────────────────────────────────────────────────
  if (!isOnline && manual === undefined) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-full bg-bg-sunken flex items-center justify-center mb-4">
          <svg
            className="text-text-muted"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <p className="font-body text-base text-text-secondary">
          Connect to the internet to view the manual
        </p>
        <p className="font-body text-sm text-text-muted mt-1">
          The full manual will load when you&apos;re back online.
        </p>
      </div>
    );
  }

  // ── Not found state ───────────────────────────────────────────────────────
  if (fullManual === null && !cachedManual) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="font-body text-lg text-text-secondary">
          Manual not found
        </p>
        <p className="font-body text-sm text-text-muted mt-2">
          This property may not have a manual yet.
        </p>
      </div>
    );
  }

  return (
    <>
      {/* Offline banner */}
      {isShowingCached && (
        <div className="bg-warning-light text-warning rounded-lg px-4 py-2.5 font-body text-sm mb-4">
          Viewing offline — some images may not load
        </div>
      )}

      {/* Property header */}
      <div className="mb-5">
        <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wider mb-1">
          Home Manual
        </p>
        <h1 className="font-display text-2xl text-text-primary">
          {manual ? manual.property.name : "Loading…"}
        </h1>
      </div>

      {/* Search bar */}
      <SearchBar
        placeholder="Search manual…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search manual"
      />

      {/* Search results */}
      {debouncedQuery.trim() ? (
        <div className="mt-4">
          {isSearchLoading || !results ? (
            <div className="space-y-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-16 bg-bg-sunken rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : results.length === 0 ? (
            <EmptyState query={debouncedQuery} />
          ) : (
            <div className="space-y-2">
              {results.map((result) => (
                <ResultRow
                  key={`${result.type}-${result.id}`}
                  result={result}
                  query={debouncedQuery}
                  onClick={() => handleResultClick(result)}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Section navigation — sticky so pills stay visible while scrolling */}
          {navSections.length > 0 && (
            <div className="sticky top-0 z-10 bg-bg pt-1 pb-2 -mx-4 px-4 md:-mx-6 md:px-6 mt-5">
              <SectionNav
                sections={navSections}
                onSectionChange={handleSectionScroll}
              />
            </div>
          )}

          {/* Loading skeleton */}
          {!manual && (
            <div className="mt-5 space-y-2">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="h-10 bg-bg-sunken rounded-pill animate-pulse"
                />
              ))}
            </div>
          )}

          {/* Full manual browse — all sections visible, scroll-to on nav tap */}
          {manual && (
            <div className="flex flex-col gap-8 mt-4 pb-4">
              {/* Manual sections */}
              {manual.sections.map((section) => (
                <div
                  key={section._id}
                  id={section._id}
                  className="scroll-mt-24"
                >
                  <h2 className="font-body text-base font-semibold text-text-secondary mb-3 flex items-center gap-2">
                    {section.icon && (
                      <span aria-hidden="true">{section.icon}</span>
                    )}
                    {section.title}
                  </h2>

                  {section.instructions.length === 0 ? (
                    <p className="font-body text-sm text-text-muted text-center py-6">
                      No instructions yet.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {section.instructions.map((instruction) => {
                        const isHighlighted =
                          instruction._id === highlightedInstruction;
                        return (
                          <div
                            key={instruction._id}
                            id={`instruction-${instruction._id}`}
                          >
                            {/* Instruction card */}
                            <div
                              className={cn(
                                "bg-bg-raised rounded-lg border p-4 transition-[background-color,box-shadow] duration-250 ease-out",
                                isHighlighted
                                  ? "border-primary shadow-[0_0_0_3px_var(--color-primary-subtle)] bg-primary-subtle"
                                  : "border-border-default",
                              )}
                            >
                              <p className="font-body text-base text-text-primary leading-relaxed whitespace-pre-line">
                                {instruction.text}
                              </p>
                              {instruction.timeSlot &&
                                instruction.timeSlot !== "anytime" && (
                                  <div className="mt-2">
                                    <Badge variant="time">
                                      {instruction.timeSlot
                                        .charAt(0)
                                        .toUpperCase() +
                                        instruction.timeSlot.slice(1)}
                                    </Badge>
                                  </div>
                                )}
                            </div>

                            {/* Inline location cards — compact strips */}
                            {instruction.locationCards.length > 0 && (
                              <div className="flex flex-col gap-2 mt-3">
                                {instruction.locationCards.map((card) => (
                                  <LocationCard
                                    key={card._id}
                                    src={card.photoUrl}
                                    caption={card.caption}
                                    room={card.roomTag}
                                    videoSrc={card.resolvedVideoUrl ?? undefined}
                                    compact
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Pets section */}
              {manual.pets.length > 0 && (
                <div id="pets" className="scroll-mt-24">
                  <h2 className="font-body text-base font-semibold text-text-secondary mb-3 flex items-center gap-2">
                    <span aria-hidden="true">🐾</span>
                    Pets
                  </h2>
                  <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 [scrollbar-width:thin] [-webkit-overflow-scrolling:touch]">
                    {manual.pets.map((pet) => (
                      <PetProfileCard
                        key={pet._id}
                        src={pet.resolvedPhotoUrl ?? undefined}
                        name={pet.name}
                        breed={pet.breed || pet.species || ""}
                        age={pet.age ?? ""}
                        details={buildPetDetails(pet)}
                        personalityNote={pet.personalityNotes}
                        className="shrink-0 w-[280px]"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Emergency contacts section */}
              {manual.emergencyContacts.length > 0 && (
                <div id="contacts" className="scroll-mt-24">
                  <h2 className="font-body text-base font-semibold text-text-secondary mb-3 flex items-center gap-2">
                    <span aria-hidden="true">📞</span>
                    Emergency Contacts
                  </h2>
                  <div className="space-y-2">
                    {manual.emergencyContacts.map((contact) => (
                      <div
                        key={contact._id}
                        className="bg-bg-raised rounded-lg border border-border-default p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="min-w-0">
                            <p className="font-body text-sm font-semibold text-text-primary">
                              {contact.name}
                            </p>
                            <p className="font-body text-xs text-text-muted mt-0.5">
                              {contact.role}
                            </p>
                          </div>
                          <a
                            href={`tel:${contact.phone}`}
                            className="font-body text-sm font-semibold text-secondary no-underline hover:text-secondary-hover transition-colors duration-150 shrink-0"
                          >
                            {formatPhone(contact.phone)}
                          </a>
                        </div>
                        {contact.notes && (
                          <p className="font-body text-sm text-text-secondary mt-2">
                            {contact.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty manual state */}
              {manual.sections.length === 0 &&
                manual.pets.length === 0 &&
                manual.emergencyContacts.length === 0 && (
                  <div className="text-center py-12">
                    <p className="font-body text-base text-text-secondary">
                      This manual is empty.
                    </p>
                    <p className="font-body text-sm text-text-muted mt-1">
                      Ask the homeowner to add content to their manual.
                    </p>
                  </div>
                )}
            </div>
          )}
        </>
      )}
    </>
  );
}
