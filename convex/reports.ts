import { query, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

const timeSlotValidator = v.union(
  v.literal("morning"),
  v.literal("afternoon"),
  v.literal("evening"),
  v.literal("anytime"),
);

const tripStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("expired"),
);

const completionEntryValidator = v.object({
  sitterName: v.string(),
  completedAt: v.number(),
  proofPhotoUrl: v.optional(v.string()),
  date: v.string(),
});

const activityLogEntryValidator = v.object({
  _id: v.id("activityLog"),
  _creationTime: v.number(),
  tripId: v.id("trips"),
  propertyId: v.id("properties"),
  eventType: v.union(
    v.literal("link_opened"),
    v.literal("task_completed"),
    v.literal("proof_uploaded"),
    v.literal("vault_accessed"),
    v.literal("trip_started"),
    v.literal("trip_expired"),
    v.literal("task_unchecked"),
  ),
  sitterName: v.optional(v.string()),
  sitterPhone: v.optional(v.string()),
  metadata: v.optional(v.any()),
  vaultItemId: v.optional(v.id("vaultItems")),
  vaultItemLabel: v.optional(v.string()),
  proofPhotoUrl: v.optional(v.string()),
  taskTitle: v.optional(v.string()),
  sectionName: v.optional(v.string()),
  createdAt: v.number(),
});

const tripReportValidator = v.object({
  trip: v.object({
    startDate: v.string(),
    endDate: v.string(),
    status: tripStatusValidator,
    reportShareLink: v.optional(v.string()),
    sitters: v.array(
      v.object({
        _id: v.id("sitters"),
        name: v.string(),
        phone: v.optional(v.string()),
        vaultAccess: v.boolean(),
      }),
    ),
  }),
  tasks: v.array(
    v.object({
      id: v.string(),
      text: v.string(),
      section: v.string(),
      timeSlot: timeSlotValidator,
      completions: v.array(completionEntryValidator),
    }),
  ),
  overlayItems: v.array(
    v.object({
      id: v.string(),
      text: v.string(),
      date: v.optional(v.string()),
      timeSlot: timeSlotValidator,
      completions: v.array(completionEntryValidator),
    }),
  ),
  vaultAccessLog: v.array(
    v.object({
      sitterName: v.optional(v.string()),
      itemLabel: v.string(),
      accessedAt: v.number(),
    }),
  ),
  activityTimeline: v.array(activityLogEntryValidator),
});

// Shared helper: builds the full trip report data for a given trip document.
async function buildTripReport(ctx: QueryCtx, trip: Doc<"trips">) {
  const tripId = trip._id;

  // Fetch all top-level trip data in parallel
  const [
    sitters,
    allCompletions,
    allOverlayItems,
    manualSections,
    rawVaultLog,
    activityEvents,
  ] = await Promise.all([
    ctx.db
      .query("sitters")
      .withIndex("by_trip", (q) => q.eq("tripId", tripId))
      .collect(),
    ctx.db
      .query("taskCompletions")
      .withIndex("by_trip_taskref", (q) => q.eq("tripId", tripId))
      .collect(),
    ctx.db
      .query("overlayItems")
      .withIndex("by_trip_date", (q) => q.eq("tripId", tripId))
      .collect(),
    ctx.db
      .query("manualSections")
      .withIndex("by_property_sort", (q) =>
        q.eq("propertyId", trip.propertyId),
      )
      .order("asc")
      .collect(),
    ctx.db
      .query("vaultAccessLog")
      .withIndex("by_trip_accessed", (q) => q.eq("tripId", tripId))
      .order("asc")
      .collect(),
    ctx.db
      .query("activityLog")
      .withIndex("by_trip_time", (q) => q.eq("tripId", tripId))
      .order("asc")
      .collect(),
  ]);

  // Fetch instructions for all sections in parallel (avoids N+1)
  const instructionsPerSection = await Promise.all(
    manualSections.map((section) =>
      ctx.db
        .query("instructions")
        .withIndex("by_section_sort", (q) => q.eq("sectionId", section._id))
        .order("asc")
        .collect(),
    ),
  );

  // Build section title lookup: sectionId → title
  const sectionTitleMap = new Map(
    manualSections.map((s) => [s._id as string, s.title]),
  );

  const recurringInstructions = instructionsPerSection.flat();

  // Build completions index: taskRef → completion[]
  // Allows O(1) prefix-based lookups per instruction without re-scanning
  const completionsByRef = new Map<string, typeof allCompletions>();
  for (const c of allCompletions) {
    const existing = completionsByRef.get(c.taskRef) ?? [];
    existing.push(c);
    completionsByRef.set(c.taskRef, existing);
  }

  // Build tasks: one entry per recurring instruction with all completions across trip days.
  // Recurring taskRef format: "recurring:{instructionId}:{date}"
  const tasks = recurringInstructions.map((inst) => {
    const prefix = `recurring:${inst._id}:`;
    const completions: Array<{
      sitterName: string;
      completedAt: number;
      proofPhotoUrl?: string;
      date: string;
    }> = [];

    for (const [taskRef, comps] of completionsByRef.entries()) {
      if (taskRef.startsWith(prefix)) {
        for (const c of comps) {
          completions.push({
            sitterName: c.sitterName,
            completedAt: c.completedAt,
            proofPhotoUrl: c.proofPhotoUrl,
            date: c.date,
          });
        }
      }
    }

    // Sort completions chronologically (oldest first)
    completions.sort((a, b) => a.completedAt - b.completedAt);

    return {
      id: inst._id as string,
      text: inst.text,
      section: sectionTitleMap.get(inst.sectionId as string) ?? "",
      timeSlot: inst.timeSlot,
      completions,
    };
  });

  // Build overlay items: one entry per overlay item with all completions.
  // Overlay taskRef format: "overlay:{overlayItemId}"
  const overlayItems = allOverlayItems.map((item) => {
    const overlayRef = `overlay:${item._id}`;
    const rawCompletions = completionsByRef.get(overlayRef) ?? [];
    const completions = rawCompletions
      .map((c) => ({
        sitterName: c.sitterName,
        completedAt: c.completedAt,
        proofPhotoUrl: c.proofPhotoUrl,
        date: c.date,
      }))
      .sort((a, b) => a.completedAt - b.completedAt);

    return {
      id: item._id as string,
      text: item.text,
      date: item.date,
      timeSlot: item.timeSlot,
      completions,
    };
  });

  // Build vault access log: verified per-item accesses only (no failed PIN attempts).
  // Resolve vault item label for each entry (falls back to "Unknown item" if deleted).
  const verifiedVaultEntries = rawVaultLog.filter(
    (entry) => entry.verified && entry.vaultItemId !== undefined,
  );
  const vaultItemDocs = await Promise.all(
    verifiedVaultEntries.map((entry) =>
      entry.vaultItemId ? ctx.db.get(entry.vaultItemId) : null,
    ),
  );
  const vaultAccessLog = verifiedVaultEntries.map((entry, i) => ({
    sitterName: entry.sitterName,
    itemLabel: vaultItemDocs[i]?.label ?? "Unknown item",
    accessedAt: entry.accessedAt,
  }));

  // Build activity timeline: all events in chronological order.
  // Filter out legacy docs that used 'event' instead of 'eventType'.
  const activityTimeline = activityEvents
    .filter((e) => e.eventType !== undefined)
    .map((e) => ({
      _id: e._id,
      _creationTime: e._creationTime,
      tripId: e.tripId,
      propertyId: e.propertyId,
      eventType: e.eventType!,
      sitterName: e.sitterName,
      sitterPhone: e.sitterPhone,
      metadata: e.metadata,
      vaultItemId: e.vaultItemId,
      vaultItemLabel: e.vaultItemLabel,
      proofPhotoUrl: e.proofPhotoUrl,
      taskTitle: e.taskTitle,
      sectionName: e.sectionName,
      createdAt: e.createdAt,
    }));

  return {
    trip: {
      startDate: trip.startDate,
      endDate: trip.endDate,
      status: trip.status,
      reportShareLink: trip.reportShareLink,
      sitters: sitters.map((s) => ({
        _id: s._id,
        name: s.name,
        phone: s.phone,
        vaultAccess: s.vaultAccess,
      })),
    },
    tasks,
    overlayItems,
    vaultAccessLog,
    activityTimeline,
  };
}

/**
 * Aggregates all trip data into a structured report.
 *
 * Available during active trips (live progress) and after trip expiry/completion.
 * Returns null if the trip does not exist.
 *
 * Completion status logic for the consumer:
 *   - completions.length > 0 for a given date → done (completedAt timestamp is present)
 *   - No completion for a date + trip.status === "active" → not done
 *   - No completion for a date + trip.status === "expired"/"completed" → skipped
 *
 * Recurring tasks are keyed per instruction; completions span all trip days.
 * Overlay items are keyed per item; undated items may have completions on multiple days.
 */
export const getTripReport = query({
  args: { tripId: v.id("trips") },
  returns: v.union(v.null(), tripReportValidator),
  handler: async (ctx, { tripId }) => {
    const trip = await ctx.db.get(tripId);
    if (!trip) return null;
    return buildTripReport(ctx, trip);
  },
});

/**
 * Public query — no authentication required.
 *
 * Looks up a trip by its reportShareLink slug and returns the same report data
 * as getTripReport. This is deliberately public since it represents a static
 * audit report that the owner explicitly chose to share.
 *
 * Returns null if the slug is not found or has been revoked.
 */
export const getTripReportByShareLink = query({
  args: { reportShareLink: v.string() },
  returns: v.union(v.null(), tripReportValidator),
  handler: async (ctx, { reportShareLink }) => {
    const trip = await ctx.db
      .query("trips")
      .withIndex("by_report_share_link", (q) =>
        q.eq("reportShareLink", reportShareLink),
      )
      .first();
    if (!trip) return null;
    return buildTripReport(ctx, trip);
  },
});
