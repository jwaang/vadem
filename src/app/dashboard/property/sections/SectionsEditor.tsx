"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Doc, Id } from "../../../../../convex/_generated/dataModel";
import { useAuth } from "@/lib/authContext";
import { CreatorLayout } from "@/components/layouts/CreatorLayout";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { LocationCard } from "@/components/ui/LocationCard";
import { LocationCardUploader } from "@/components/ui/LocationCardUploader";
import { LocationCardVideoUploader } from "@/components/ui/LocationCardVideoUploader";
import { ChevronLeftIcon, ChevronUpIcon, ChevronDownIcon, TrashIcon, PlusIcon, PencilIcon, XIcon } from "@/components/ui/icons";

// ── Constants ──────────────────────────────────────────────────────────────────


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

const ALL_SECTION_ICONS = [
  "🗝️", "🔌", "🍳", "🗑️", "🌿", "📍", "📋", "🚪",
  "🏠", "🛁", "🛏️", "🐾", "🧹", "🔧", "🌡️", "💡",
  "🎵", "🌻", "🧺", "📦",
];

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
  const removeLocationCard = useMutation(api.locationCards.remove);
  const [text, setText] = useState(instruction.text);
  const [showUploader, setShowUploader] = useState(false);
  const [showVideoUploader, setShowVideoUploader] = useState(false);

  const locationCards = useQuery(api.locationCards.listByParent, {
    parentId: instruction._id as string,
    parentType: "instruction",
  });

  const handleTextBlur = () => {
    const trimmed = text.trim();
    if (trimmed === instruction.text) return;
    void updateInstruction({ instructionId: instruction._id, text: trimmed });
  };


  return (
    <div className="rounded-lg border border-border-default bg-bg-raised overflow-hidden">
      {/* Top row: reorder + text + delete */}
      <div className="flex items-start gap-2 p-3 pb-2">
        <div className="flex flex-col gap-0.5 shrink-0 mt-0.5">
          <IconButton
            icon={<ChevronUpIcon />}
            aria-label="Move instruction up"
            onClick={onMoveUp}
            disabled={!canMoveUp}
          />
          <IconButton
            icon={<ChevronDownIcon />}
            aria-label="Move instruction down"
            onClick={onMoveDown}
            disabled={!canMoveDown}
          />
        </div>

        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={handleTextBlur}
          placeholder="Add an instruction…"
          rows={2}
          className="flex-1 resize-none font-body text-sm text-text-primary bg-transparent outline-none placeholder:text-text-muted leading-relaxed min-h-[44px]"
        />

        <IconButton
          icon={<TrashIcon />}
          aria-label="Remove instruction"
          variant="danger"
          onClick={onRemove}
          className="shrink-0 mt-0.5"
        />
      </div>

      {/* Controls row: photo/video attach */}
      {(() => {
        const hasPhoto = locationCards?.some(c => c.resolvedPhotoUrl && !c.resolvedVideoUrl);
        const hasVideo = locationCards?.some(c => !!c.resolvedVideoUrl);
        if (hasPhoto && hasVideo) return null;
        return (
          <div className="flex items-center gap-2 px-3 pb-3 pt-1 border-t border-border-default">
            {!hasPhoto && (
              <button
                type="button"
                className="font-body text-xs text-text-muted hover:text-primary transition-colors duration-150"
                onClick={() => setShowUploader(true)}
              >
                + Photo card
              </button>
            )}
            {!hasVideo && (
              <button
                type="button"
                className="font-body text-xs text-text-muted hover:text-primary transition-colors duration-150"
                onClick={() => setShowVideoUploader(true)}
              >
                + Video card
              </button>
            )}
          </div>
        );
      })()}

      {/* Location cards display */}
      {locationCards && locationCards.length > 0 && (
        <div className="flex flex-col gap-2 px-3 pb-3 pt-3">
          {locationCards.map((card) => (
            <div key={card._id} className="relative group">
              <LocationCard
                src={card.resolvedPhotoUrl ?? undefined}
                caption={card.caption ?? ""}
                room={card.roomTag}
                videoSrc={card.resolvedVideoUrl ?? undefined}
                compact
              />
              <IconButton
                icon={<XIcon size={10} />}
                aria-label="Remove location card"
                variant="danger"
                size="sm"
                onClick={() => void removeLocationCard({ cardId: card._id })}
                className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 shadow-sm z-10"
              />
            </div>
          ))}
        </div>
      )}

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

// ── SectionEditPanel ────────────────────────────────────────────────────────────

interface SectionEditPanelProps {
  section: SectionDoc;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function SectionEditPanel({
  section,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
}: SectionEditPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(section.title);
  const [editIcon, setEditIcon] = useState(section.icon);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateSection = useMutation(api.sections.update);
  const removeSection = useMutation(api.sections.remove);
  const createInstruction = useMutation(api.instructions.create);
  const removeInstruction = useMutation(api.instructions.remove);
  const reorderInstructions = useMutation(api.instructions.reorderInstructions);

  const instructions = useQuery(api.instructions.listBySection, {
    sectionId: section._id,
  });

  const handleSaveEdit = () => {
    const trimmed = editTitle.trim();
    if (!trimmed) return;
    updateSection({
      sectionId: section._id,
      title: trimmed,
      icon: editIcon,
    }).catch(() => setError("Failed to update section. Please try again."));
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setEditTitle(section.title);
    setEditIcon(section.icon);
    setIsEditing(false);
  };

  const handleDelete = () => {
    removeSection({ sectionId: section._id }).catch(() =>
      setError("Failed to delete section. Please try again."),
    );
  };

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
    }).catch(() => setError("Failed to add instruction. Please try again."));
  };

  const handleRemoveInstruction = (instructionId: Id<"instructions">) => {
    setError(null);
    removeInstruction({ instructionId }).catch(() =>
      setError("Failed to remove instruction. Please try again."),
    );
  };

  const handleMoveInstructionUp = (index: number) => {
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

  const handleMoveInstructionDown = (index: number) => {
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
      <div className={isExpanded ? "border-b border-border-default" : ""}>
        {isEditing ? (
          /* Inline edit form */
          <div className="flex flex-col gap-3 px-4 py-3">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Section title"
              autoFocus
              className="w-full font-body text-sm text-text-primary bg-bg-raised rounded-md border-[1.5px] border-primary outline-none px-3 py-1.5 placeholder:text-text-muted"
            />
            <div className="flex flex-wrap gap-2">
              {ALL_SECTION_ICONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setEditIcon(emoji)}
                  aria-label={`Select ${emoji} icon`}
                  aria-pressed={editIcon === emoji}
                  className={`size-9 rounded-md text-xl flex items-center justify-center transition-[background-color,box-shadow] duration-150 ${
                    editIcon === emoji
                      ? "bg-primary-light ring-2 ring-primary ring-offset-1"
                      : "bg-bg-sunken hover:bg-primary-subtle"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!editTitle.trim()}
                onClick={handleSaveEdit}
              >
                Save
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Row 1: Title + actions */}
            <div className="flex items-center gap-2 px-4 pt-3 pb-1.5">
              <button
                type="button"
                onClick={() => setIsExpanded((v) => !v)}
                aria-expanded={isExpanded}
                className="group flex items-center gap-2.5 flex-1 min-w-0 text-left"
              >
                <span className="text-xl leading-none shrink-0" aria-hidden="true">
                  {section.icon}
                </span>
                <p className="font-body text-sm font-semibold text-text-primary truncate flex-1 min-w-0">
                  {section.title}
                </p>
              </button>
              <div className="flex items-center gap-0.5 shrink-0">
                <IconButton
                  icon={<PencilIcon />}
                  aria-label={isExpanded ? `Collapse ${section.title}` : `Expand ${section.title}`}
                  size="sm"
                  onClick={() => setIsExpanded((v) => !v)}
                />
                <IconButton
                  icon={<TrashIcon />}
                  aria-label={`Delete ${section.title}`}
                  variant="danger"
                  size="sm"
                  onClick={() => {
                    setShowDeleteConfirm((v) => !v);
                    setIsEditing(false);
                  }}
                />
              </div>
            </div>

            {/* Row 2: Reorder arrows, right-aligned */}
            <div className="flex items-center justify-end gap-0.5 px-3 pb-2">
              <IconButton
                icon={<ChevronUpIcon />}
                aria-label={`Move ${section.title} up`}
                onClick={onMoveUp}
                disabled={!canMoveUp}
                size="sm"
              />
              <IconButton
                icon={<ChevronDownIcon />}
                aria-label={`Move ${section.title} down`}
                onClick={onMoveDown}
                disabled={!canMoveDown}
                size="sm"
              />
            </div>
          </>
        )}
      </div>

      {/* Inline delete confirmation */}
      {showDeleteConfirm && (
        <div className="bg-danger-light px-4 py-3 flex items-center gap-3 border-b border-border-default">
          <p className="font-body text-sm text-danger flex-1 min-w-0">
            Delete &ldquo;{section.title}&rdquo; and all{" "}
            {instructionCount > 0 ? `${instructionCount} ` : ""}
            instruction{instructionCount !== 1 ? "s" : ""}?
          </p>
          <Button variant="ghost" size="sm" onClick={() => setShowDeleteConfirm(false)} className="shrink-0">
            Cancel
          </Button>
          <Button variant="danger" size="sm" onClick={handleDelete} className="shrink-0">
            Delete
          </Button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          role="alert"
          className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
        >
          {error}
        </div>
      )}

      {/* Instructions body */}
      {isExpanded && !isEditing && (
        <div className="p-4 flex flex-col gap-3">
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
                  onMoveUp={() => handleMoveInstructionUp(index)}
                  onMoveDown={() => handleMoveInstructionDown(index)}
                  onRemove={() => handleRemoveInstruction(instruction._id)}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={handleAddInstruction}
            className="flex items-center justify-center gap-1.5 py-3 px-4 rounded-lg border-[1.5px] border-dashed border-border-strong bg-bg-sunken hover:border-primary hover:bg-primary-subtle transition-[border-color,background-color] duration-150 font-body text-sm text-text-muted hover:text-primary"
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
  const [icon, setIcon] = useState(ALL_SECTION_ICONS[8]); // 🏠

  return (
    <div className="rounded-lg border border-border-default bg-bg-raised p-4 flex flex-col gap-4">
      <p className="font-body text-sm font-semibold text-text-primary">Add custom section</p>

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

      <div className="flex flex-col gap-1.5">
        <label className="font-body text-xs font-semibold text-text-secondary">Icon</label>
        <div className="flex flex-wrap gap-2">
          {ALL_SECTION_ICONS.map((emoji) => (
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

// ── Loading Screen ─────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div className="min-h-dvh bg-bg flex items-center justify-center">
      <p className="font-body text-text-muted">Loading…</p>
    </div>
  );
}

// ── SectionsEditor ─────────────────────────────────────────────────────────────

export default function SectionsEditor() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !authLoading && !user) {
      router.replace("/login");
    }
  }, [mounted, authLoading, user, router]);

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
  const reorderSections = useMutation(api.sections.reorderSections);

  if (!mounted || authLoading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoadingScreen />;
  }

  const isLoadingSections = propertyId !== undefined && sections === undefined;
  const activeSections = sections ?? [];
  const activeSectionTitles = new Set(activeSections.map((s) => s.title));
  const maxSortOrder = activeSections.reduce((max, s) => Math.max(max, s.sortOrder), -1);
  const nextCustomSortOrder = Math.max(maxSortOrder + 1, 100);

  // Prebuilt sections not yet added
  const availablePrebuilt = PREBUILT_SECTIONS.filter(
    (p) => !activeSectionTitles.has(p.title),
  );

  const handleAddPrebuilt = (prebuilt: { title: string; icon: string }) => {
    if (!propertyId) return;
    setGeneralError(null);
    createSection({
      propertyId,
      title: prebuilt.title,
      icon: prebuilt.icon,
      sortOrder: maxSortOrder + 1,
    }).catch(() => setGeneralError("Failed to add section. Please try again."));
  };

  const handleAddCustomSection = (title: string, icon: string, sortOrder: number) => {
    if (!propertyId) return;
    setShowCustomForm(false);
    setGeneralError(null);
    createSection({ propertyId, title, icon, sortOrder }).catch(() =>
      setGeneralError("Failed to add section. Please try again."),
    );
  };

  const handleMoveSectionUp = (index: number) => {
    if (index <= 0) return;
    const prev = activeSections[index - 1];
    const curr = activeSections[index];
    reorderSections({
      updates: [
        { id: prev._id, sortOrder: curr.sortOrder },
        { id: curr._id, sortOrder: prev.sortOrder },
      ],
    }).catch(() => setGeneralError("Failed to reorder sections. Please try again."));
  };

  const handleMoveSectionDown = (index: number) => {
    if (index >= activeSections.length - 1) return;
    const curr = activeSections[index];
    const next = activeSections[index + 1];
    reorderSections({
      updates: [
        { id: curr._id, sortOrder: next.sortOrder },
        { id: next._id, sortOrder: curr.sortOrder },
      ],
    }).catch(() => setGeneralError("Failed to reorder sections. Please try again."));
  };

  return (
    <CreatorLayout activeNav="property">
      <div className="flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col gap-1">
          <Link
            href="/dashboard/property"
            className="inline-flex items-center gap-1.5 font-body text-xs font-semibold text-text-muted hover:text-text-secondary transition-colors duration-150 mb-1"
          >
            <ChevronLeftIcon />
            Property
          </Link>
          <h1 className="font-display text-4xl text-text-primary leading-tight">
            Home sections
          </h1>
          <p className="font-body text-sm text-text-secondary">
            Add, edit, reorder, or delete sections and instructions in your manual.
          </p>
        </div>

        {/* General error */}
        {generalError && (
          <div
            role="alert"
            className="bg-danger-light text-danger rounded-lg px-4 py-3 font-body text-sm"
          >
            {generalError}
          </div>
        )}

        {/* No property yet */}
        {properties !== undefined && properties.length === 0 && (
          <div className="bg-bg-raised rounded-xl border border-dashed border-border-strong p-8 flex flex-col items-center text-center gap-4">
            <p className="font-body text-sm text-text-muted max-w-[280px]">
              Complete the setup wizard to create your property first.
            </p>
            <Button variant="soft" size="sm" onClick={() => router.push("/setup/home")}>
              Start setup wizard
            </Button>
          </div>
        )}

        {/* Loading skeleton */}
        {isLoadingSections && (
          <div className="flex flex-col gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-bg-sunken animate-pulse" />
            ))}
          </div>
        )}

        {/* Active sections */}
        {!isLoadingSections && activeSections.length > 0 && (
          <div className="flex flex-col gap-4">
            <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
              Your sections
            </p>
            {activeSections.map((section, index) => (
              <SectionEditPanel
                key={section._id}
                section={section}
                canMoveUp={index > 0}
                canMoveDown={index < activeSections.length - 1}
                onMoveUp={() => handleMoveSectionUp(index)}
                onMoveDown={() => handleMoveSectionDown(index)}
              />
            ))}
          </div>
        )}

        {/* Add sections area */}
        {propertyId && !isLoadingSections && (
          <div className="flex flex-col gap-3">
            <p className="font-body text-xs font-semibold text-text-muted uppercase tracking-wide">
              Add sections
            </p>

            {/* Available prebuilt sections */}
            {availablePrebuilt.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {availablePrebuilt.map((prebuilt) => (
                  <button
                    key={prebuilt.title}
                    type="button"
                    onClick={() => handleAddPrebuilt(prebuilt)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-border-default bg-bg-raised hover:border-secondary hover:bg-secondary-subtle text-left transition-[border-color,background-color] duration-150"
                  >
                    <span className="text-base shrink-0 leading-none" aria-hidden="true">
                      {prebuilt.icon}
                    </span>
                    <span className="font-body text-xs font-semibold text-text-primary leading-snug flex-1 min-w-0">
                      {prebuilt.title}
                    </span>
                    <span className="shrink-0 text-text-muted">
                      <PlusIcon />
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* Custom section */}
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

            {/* All prebuilt sections added */}
            {availablePrebuilt.length === 0 && !showCustomForm && (
              <p className="font-body text-xs text-text-muted text-center py-1">
                All preset sections added. Add a custom section above.
              </p>
            )}
          </div>
        )}
      </div>
    </CreatorLayout>
  );
}
