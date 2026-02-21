"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/authContext";
import { Button } from "@/components/ui/Button";
import { LocationCardUploader } from "@/components/ui/LocationCardUploader";
import { LocationCardVideoUploader } from "@/components/ui/LocationCardVideoUploader";
import { ChevronUpIcon, ChevronDownIcon, ChevronRightIcon, TrashIcon, PlusIcon, CheckIcon } from "@/components/ui/icons";

// ── Constants ──────────────────────────────────────────────────────────────────

type TimeSlot = "morning" | "afternoon" | "evening" | "anytime";

const PREBUILT_SECTIONS: { title: string; icon: string }[] = [
  { title: "Access & Arrival", icon: "🗝️" },
  { title: "Appliances", icon: "🔌" },
  { title: "Kitchen", icon: "🍳" },
  { title: "Trash & Mail", icon: "🗑️" },
  { title: "Plants & Garden", icon: "🌿" },
  { title: "Where Things Are", icon: "📍" },
  { title: "House Rules", icon: "📋" },
  { title: "Departure / Lockup", icon: "🚪" },
];

const CUSTOM_SECTION_ICONS = [
  "🏠", "🛁", "🛏️", "🐾", "🧹", "🔧",
  "🌡️", "💡", "🎵", "🌻", "🧺", "📦",
];

const TIME_SLOT_OPTIONS: { value: TimeSlot; label: string }[] = [
  { value: "anytime", label: "Anytime" },
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

const PREBUILT_TITLES = new Set(PREBUILT_SECTIONS.map((p) => p.title));

// ── Types ──────────────────────────────────────────────────────────────────────

type SectionDoc = Doc<"manualSections">;
type InstructionDoc = Doc<"instructions">;

// ── InstructionRow ─────────────────────────────────────────────────────────────

interface InstructionRowProps {
  instruction: InstructionDoc;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

function InstructionRow({
  instruction,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onRemove,
}: InstructionRowProps) {
  const updateInstruction = useMutation(api.instructions.update);
  // key={instruction._id} on the parent causes remount when instruction changes,
  // resetting this state to the new instruction.text automatically.
  const [text, setText] = useState(instruction.text);
  const [showUploader, setShowUploader] = useState(false);
  const [showVideoUploader, setShowVideoUploader] = useState(false);

  const handleTextBlur = () => {
    const trimmed = text.trim();
    if (trimmed === instruction.text) return;
    void updateInstruction({ instructionId: instruction._id, text: trimmed });
  };

  const handleTimeSlotChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    void updateInstruction({
      instructionId: instruction._id,
      timeSlot: e.target.value as TimeSlot,
    });
  };

  const handleProofToggle = () => {
    void updateInstruction({
      instructionId: instruction._id,
      proofRequired: !instruction.proofRequired,
    });
  };

  return (
    <div className="rounded-lg border border-border-default bg-bg-raised overflow-hidden">
      {/* Top row: reorder + text + delete */}
      <div className="flex items-start gap-2 p-3 pb-2">
        {/* Up/down arrows */}
        <div className="flex flex-col gap-0.5 shrink-0 mt-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={!canMoveUp}
            className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors duration-150"
            aria-label="Move instruction up"
          >
            <ChevronUpIcon />
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={!canMoveDown}
            className="p-1 text-text-muted hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors duration-150"
            aria-label="Move instruction down"
          >
            <ChevronDownIcon />
          </button>
        </div>

        {/* Text area */}
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleTextBlur}
          placeholder="Describe this step…"
          rows={2}
          className="flex-1 resize-none font-body text-sm text-text-primary bg-transparent outline-none placeholder:text-text-muted leading-relaxed min-h-[44px]"
        />

        {/* Delete */}
        <button
          type="button"
          onClick={onRemove}
          className="p-1.5 text-text-muted hover:text-danger rounded transition-colors duration-150 shrink-0 mt-0.5"
          aria-label="Remove instruction"
        >
          <TrashIcon />
        </button>
      </div>

      {/* Controls row: time slot + proof toggle + card placeholder */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-1 border-t border-border-default">
        <select
          value={instruction.timeSlot}
          onChange={handleTimeSlotChange}
          className="font-body text-xs font-semibold px-2 py-1 rounded-md bg-accent-light text-accent border-0 outline-none cursor-pointer"
        >
          {TIME_SLOT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleProofToggle}
          aria-pressed={instruction.proofRequired}
          className={`font-body text-xs font-semibold px-2 py-1 rounded-md transition-colors duration-150 ${
            instruction.proofRequired
              ? "bg-secondary-light text-secondary"
              : "bg-bg-sunken text-text-muted hover:text-text-secondary"
          }`}
        >
          📷 {instruction.proofRequired ? "Proof required" : "No proof"}
        </button>

        {/* Location card upload */}
        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            className="font-body text-xs text-text-muted hover:text-primary transition-colors duration-150"
            onClick={() => setShowUploader(true)}
          >
            + Photo card
          </button>
          <button
            type="button"
            className="font-body text-xs text-text-muted hover:text-primary transition-colors duration-150"
            onClick={() => setShowVideoUploader(true)}
          >
            + Video card
          </button>
        </div>
      </div>

      {showUploader && (
        <LocationCardUploader
          parentId={instruction._id as string}
          parentType="instruction"
          onSuccess={() => setShowUploader(false)}
          onClose={() => setShowUploader(false)}
        />
      )}
      {showVideoUploader && (
        <LocationCardVideoUploader
          parentId={instruction._id as string}
          parentType="instruction"
          onSuccess={() => setShowVideoUploader(false)}
          onClose={() => setShowVideoUploader(false)}
        />
      )}
    </div>
  );
}

// ── SectionPanel ───────────────────────────────────────────────────────────────

interface SectionPanelProps {
  section: SectionDoc;
  isPrebuilt: boolean;
  onRemoveSection: () => void;
}

function SectionPanel({ section, isPrebuilt, onRemoveSection }: SectionPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const createInstruction = useMutation(api.instructions.create);
  const removeInstruction = useMutation(api.instructions.remove);
  const reorderInstructions = useMutation(api.instructions.reorderInstructions);

  const instructions = useQuery(api.instructions.listBySection, {
    sectionId: section._id,
  });

  const handleAddInstruction = () => {
    setError(null);
    const maxSortOrder =
      instructions?.reduce((max, i) => Math.max(max, i.sortOrder), -1) ?? -1;
    createInstruction({
      sectionId: section._id,
      text: "",
      sortOrder: maxSortOrder + 1,
      timeSlot: "anytime",
      isRecurring: false,
      proofRequired: false,
    }).catch(() => {
      setError("Failed to add instruction. Please try again.");
    });
  };

  const handleRemoveInstruction = (instructionId: Id<"instructions">) => {
    setError(null);
    removeInstruction({ instructionId }).catch(() => {
      setError("Failed to remove instruction. Please try again.");
    });
  };

  const handleMoveUp = (index: number) => {
    if (!instructions || index <= 0) return;
    const prev = instructions[index - 1];
    const curr = instructions[index];
    reorderInstructions({
      updates: [
        { id: prev._id, sortOrder: curr.sortOrder },
        { id: curr._id, sortOrder: prev.sortOrder },
      ],
    }).catch(() => setError("Failed to reorder. Please try again."));
  };

  const handleMoveDown = (index: number) => {
    if (!instructions || index >= instructions.length - 1) return;
    const curr = instructions[index];
    const next = instructions[index + 1];
    reorderInstructions({
      updates: [
        { id: curr._id, sortOrder: next.sortOrder },
        { id: next._id, sortOrder: curr.sortOrder },
      ],
    }).catch(() => setError("Failed to reorder. Please try again."));
  };

  const instructionCount = instructions?.length ?? 0;

  return (
    <div className="rounded-lg border border-border-default bg-bg-raised overflow-hidden">
      {/* Section header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-bg-sunken border-b border-border-default">
        <span className="text-xl leading-none" aria-hidden="true">
          {section.icon}
        </span>
        <p className="font-body text-sm font-semibold text-text-primary flex-1 min-w-0 truncate">
          {section.title}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          {instructionCount > 0 && (
            <span className="font-body text-xs text-text-muted tabular-nums">
              {instructionCount}
            </span>
          )}
          {!isPrebuilt && (
            <button
              type="button"
              onClick={onRemoveSection}
              className="p-1.5 text-text-muted hover:text-danger rounded transition-colors duration-150"
              aria-label={`Remove ${section.title} section`}
            >
              <TrashIcon />
            </button>
          )}
          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="p-1.5 text-text-muted hover:text-text-primary rounded transition-[rotate] duration-150"
            style={{ rotate: isExpanded ? "90deg" : "0deg" }}
            aria-label={isExpanded ? "Collapse section" : "Expand section"}
            aria-expanded={isExpanded}
          >
            <ChevronRightIcon />
          </button>
        </div>
      </div>

      {/* Instructions body */}
      {isExpanded && (
        <div className="p-4 flex flex-col gap-3">
          {error && (
            <div
              role="alert"
              className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
            >
              {error}
            </div>
          )}

          {instructions === undefined ? (
            <div className="flex flex-col gap-2">
              {[0, 1].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-bg-sunken animate-pulse" />
              ))}
            </div>
          ) : instructions.length === 0 ? (
            <p className="font-body text-sm text-text-muted text-center py-2">
              No instructions yet — add one below.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {instructions.map((instruction, index) => (
                <InstructionRow
                  key={instruction._id}
                  instruction={instruction}
                  canMoveUp={index > 0}
                  canMoveDown={index < instructions.length - 1}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onRemove={() => handleRemoveInstruction(instruction._id)}
                />
              ))}
            </div>
          )}

          {/* Add instruction */}
          <button
            type="button"
            onClick={handleAddInstruction}
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-lg border border-dashed border-border-strong hover:border-secondary hover:bg-secondary-subtle transition-[border-color,background-color] duration-150 font-body text-sm text-text-muted hover:text-secondary"
          >
            <PlusIcon />
            Add instruction
          </button>
        </div>
      )}
    </div>
  );
}

// ── CustomSectionForm ──────────────────────────────────────────────────────────

interface CustomSectionFormProps {
  onAdd: (title: string, icon: string, sortOrder: number) => void;
  onCancel: () => void;
  nextSortOrder: number;
}

function CustomSectionForm({ onAdd, onCancel, nextSortOrder }: CustomSectionFormProps) {
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState(CUSTOM_SECTION_ICONS[0]);

  return (
    <div className="rounded-lg border border-border-default bg-bg-raised p-4 flex flex-col gap-4">
      <p className="font-body text-sm font-semibold text-text-primary">
        Add custom section
      </p>

      {/* Title input */}
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-xs font-semibold text-text-secondary">
          Section title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Laundry Room"
          autoFocus
          className="w-full font-body text-sm text-text-primary bg-bg rounded-md border-[1.5px] border-border-default focus:border-primary outline-none px-3 py-2 transition-colors duration-150 placeholder:text-text-muted"
        />
      </div>

      {/* Icon picker */}
      <div className="flex flex-col gap-1.5">
        <label className="font-body text-xs font-semibold text-text-secondary">
          Icon
        </label>
        <div className="flex flex-wrap gap-2">
          {CUSTOM_SECTION_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => setIcon(emoji)}
              aria-label={`Select ${emoji} icon`}
              aria-pressed={icon === emoji}
              className={`w-9 h-9 rounded-md text-xl flex items-center justify-center transition-[background-color,box-shadow] duration-150 ${
                icon === emoji
                  ? "bg-primary-light ring-2 ring-primary ring-offset-1"
                  : "bg-bg-sunken hover:bg-primary-subtle"
              }`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 justify-end">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!title.trim()}
          onClick={() => {
            if (title.trim()) {
              onAdd(title.trim(), icon, nextSortOrder);
            }
          }}
        >
          Add section
        </Button>
      </div>
    </div>
  );
}

// ── Step5Sections ──────────────────────────────────────────────────────────────

export default function Step5Sections() {
  const router = useRouter();
  const { user } = useAuth();

  const sessionData = useQuery(
    api.auth.validateSession,
    user?.token ? { token: user.token } : "skip",
  );

  const properties = useQuery(
    api.properties.listByOwner,
    sessionData?.userId ? { ownerId: sessionData.userId } : "skip",
  );
  const propertyId = properties?.[0]?._id;

  const sections = useQuery(
    api.sections.listByProperty,
    propertyId ? { propertyId } : "skip",
  );

  const createSection = useMutation(api.sections.create);
  const removeSection = useMutation(api.sections.remove);

  const [showCustomForm, setShowCustomForm] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const isLoading = sections === undefined;

  // Set of active section titles (from DB)
  const activeSectionTitles = new Set(sections?.map((s) => s.title) ?? []);

  // All sections sorted by sortOrder (from DB)
  const activeSections = sections ?? [];

  // Max sortOrder across all sections (for assigning custom sections after pre-built)
  const maxSortOrder = activeSections.reduce((max, s) => Math.max(max, s.sortOrder), 7);
  const nextCustomSortOrder = Math.max(maxSortOrder + 1, 100);

  const handleTogglePrebuilt = (prebuilt: { title: string; icon: string }, index: number) => {
    if (!propertyId) return;
    setGeneralError(null);

    if (activeSectionTitles.has(prebuilt.title)) {
      // Uncheck: find and remove the section (cascade deletes instructions)
      const section = sections?.find((s) => s.title === prebuilt.title);
      if (section) {
        removeSection({ sectionId: section._id }).catch(() => {
          setGeneralError("Failed to remove section. Please try again.");
        });
      }
    } else {
      // Check: create the section
      createSection({
        propertyId,
        title: prebuilt.title,
        icon: prebuilt.icon,
        sortOrder: index,
      }).catch(() => {
        setGeneralError("Failed to add section. Please try again.");
      });
    }
  };

  const handleAddCustomSection = (title: string, icon: string, sortOrder: number) => {
    if (!propertyId) return;
    setShowCustomForm(false);
    setGeneralError(null);
    createSection({ propertyId, title, icon, sortOrder }).catch(() => {
      setGeneralError("Failed to add section. Please try again.");
    });
  };

  const handleRemoveSection = (sectionId: Id<"manualSections">) => {
    setGeneralError(null);
    removeSection({ sectionId }).catch(() => {
      setGeneralError("Failed to remove section. Please try again.");
    });
  };

  return (
    <div className="p-6 flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="font-display text-3xl text-text-primary leading-tight">
          Home instructions
        </h1>
        <p className="font-body text-sm text-text-secondary">
          Choose which areas to document. Your sitter can browse each section in the manual.
        </p>
      </div>

      {generalError && (
        <div
          role="alert"
          className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
        >
          {generalError}
        </div>
      )}

      {/* Section selection */}
      <div className="flex flex-col gap-3">
        <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
          Select sections to include
        </p>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-12 rounded-lg bg-bg-sunken animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {PREBUILT_SECTIONS.map((prebuilt, index) => {
              const isActive = activeSectionTitles.has(prebuilt.title);
              return (
                <button
                  key={prebuilt.title}
                  type="button"
                  onClick={() => handleTogglePrebuilt(prebuilt, index)}
                  aria-pressed={isActive}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left transition-[border-color,background-color] duration-150 ${
                    isActive
                      ? "border-secondary bg-secondary-subtle"
                      : "border-border-default bg-bg-raised hover:border-border-strong hover:bg-bg-sunken"
                  }`}
                >
                  <span className="text-base shrink-0 leading-none" aria-hidden="true">
                    {prebuilt.icon}
                  </span>
                  <span className="font-body text-xs font-semibold text-text-primary leading-snug flex-1 min-w-0">
                    {prebuilt.title}
                  </span>
                  {isActive && (
                    <span className="shrink-0 text-secondary">
                      <CheckIcon />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom section form or add button */}
        {showCustomForm ? (
          <CustomSectionForm
            onAdd={handleAddCustomSection}
            onCancel={() => setShowCustomForm(false)}
            nextSortOrder={nextCustomSortOrder}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowCustomForm(true)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-lg border-[1.5px] border-dashed border-border-strong hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 font-body text-sm text-text-muted hover:text-primary"
          >
            <PlusIcon />
            Add custom section
          </button>
        )}
      </div>

      {/* Active section panels */}
      {!isLoading && activeSections.length > 0 && (
        <div className="flex flex-col gap-3">
          <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
            Section details
          </p>
          <div className="flex flex-col gap-3">
            {activeSections.map((section) => (
              <SectionPanel
                key={section._id}
                section={section}
                isPrebuilt={PREBUILT_TITLES.has(section.title)}
                onRemoveSection={() => handleRemoveSection(section._id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-3 pt-2">
        <Button size="lg" className="w-full" onClick={() => router.push("/wizard/6")}>
          Next
        </Button>
        <Button
          variant="ghost"
          size="default"
          className="w-full"
          onClick={() => router.push("/wizard/6")}
        >
          Skip — add later
        </Button>
      </div>
    </div>
  );
}
