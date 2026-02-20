import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

// Discriminated union of all event types for the activity feed.
const eventTypeValidator = v.union(
  v.literal("link_opened"),
  v.literal("task_completed"),
  v.literal("proof_uploaded"),
  v.literal("vault_accessed"),
  v.literal("trip_started"),
  v.literal("trip_expired"),
  v.literal("task_unchecked"),
);

const activityLogEntryValidator = v.object({
  _id: v.id("activityLog"),
  _creationTime: v.number(),
  tripId: v.id("trips"),
  propertyId: v.id("properties"),
  eventType: eventTypeValidator,
  sitterName: v.optional(v.string()),
  sitterPhone: v.optional(v.string()),
  metadata: v.optional(v.any()),
  vaultItemId: v.optional(v.id("vaultItems")),
  vaultItemLabel: v.optional(v.string()),
  proofPhotoUrl: v.optional(v.string()),
  taskTitle: v.optional(v.string()),
  createdAt: v.number(),
});

/**
 * Internal mutation — log a sitter interaction event to the activity feed.
 * Must be called from other mutations/actions; never directly from the client
 * to prevent injection of fake events.
 */
export const logEvent = internalMutation({
  args: {
    tripId: v.id("trips"),
    propertyId: v.id("properties"),
    eventType: eventTypeValidator,
    sitterName: v.optional(v.string()),
    sitterPhone: v.optional(v.string()),
    metadata: v.optional(v.any()),
    vaultItemId: v.optional(v.id("vaultItems")),
    vaultItemLabel: v.optional(v.string()),
    proofPhotoUrl: v.optional(v.string()),
    taskTitle: v.optional(v.string()),
  },
  returns: v.id("activityLog"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("activityLog", {
      tripId: args.tripId,
      propertyId: args.propertyId,
      eventType: args.eventType,
      sitterName: args.sitterName,
      sitterPhone: args.sitterPhone,
      metadata: args.metadata,
      vaultItemId: args.vaultItemId,
      vaultItemLabel: args.vaultItemLabel,
      proofPhotoUrl: args.proofPhotoUrl,
      taskTitle: args.taskTitle,
      createdAt: Date.now(),
    });
  },
});

/**
 * Get the activity feed for a specific trip — newest events first.
 * Supports optional eventType filtering and cursor-based pagination.
 */
export const getActivityForTrip = query({
  args: {
    tripId: v.id("trips"),
    eventType: v.optional(eventTypeValidator),
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      }),
    ),
  },
  returns: v.object({
    items: v.array(activityLogEntryValidator),
    isDone: v.boolean(),
    continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const numItems = args.paginationOpts?.numItems ?? 20;

    const q = ctx.db
      .query("activityLog")
      .withIndex("by_trip_time", (idx) => idx.eq("tripId", args.tripId))
      .order("desc");

    const page = await q.paginate({ numItems, cursor: args.paginationOpts?.cursor ?? null });

    // Filter out legacy docs missing eventType before applying optional filter
    const validPage = page.page.filter((e) => e.eventType !== undefined);
    const items = (
      args.eventType
        ? validPage.filter((e) => e.eventType === args.eventType)
        : validPage
    ).map((e) => ({
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
      createdAt: e.createdAt,
    }));

    return {
      items,
      isDone: page.isDone,
      continueCursor: page.continueCursor,
    };
  },
});

/**
 * Get the activity feed for a property — newest events first.
 * Returns the most recent events (default 20) across all trips for the property.
 * Optional eventType filter narrows to a specific event type.
 */
export const getActivityFeed = query({
  args: {
    propertyId: v.id("properties"),
    limit: v.optional(v.number()),
    eventType: v.optional(v.string()),
  },
  returns: v.array(activityLogEntryValidator),
  handler: async (ctx, args) => {
    // Fetch more to account for client-side eventType filtering
    const fetchLimit = args.eventType ? (args.limit ?? 20) * 5 : args.limit ?? 20;
    const events = await ctx.db
      .query("activityLog")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .take(Math.min(fetchLimit, 200));

    // Filter out legacy docs missing eventType before applying optional filter
    const validEvents = events.filter((e) => e.eventType !== undefined);
    const filtered = args.eventType
      ? validEvents.filter((e) => e.eventType === args.eventType)
      : validEvents;

    return filtered.slice(0, args.limit ?? 20).map((e) => ({
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
      createdAt: e.createdAt,
    }));
  },
});

/**
 * Internal: check if a link_opened event already exists for this trip.
 * Used by recordFirstOpen to deduplicate notifications.
 */
export const _checkFirstOpen = internalQuery({
  args: { tripId: v.id("trips") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("activityLog")
      .withIndex("by_trip_time", (q) => q.eq("tripId", args.tripId))
      .filter((q) => q.eq(q.field("eventType"), "link_opened"))
      .first();
    return existing !== null;
  },
});

/**
 * Get today's task completion summary for a property's active trip.
 * Returns { completed, total } or null if no active trip.
 */
export const getTodayTaskSummary = query({
  args: {
    propertyId: v.id("properties"),
    date: v.string(), // YYYY-MM-DD
  },
  returns: v.union(
    v.null(),
    v.object({ completed: v.number(), total: v.number() }),
  ),
  handler: async (ctx, args) => {
    // Get active trip for this property
    const trip = await ctx.db
      .query("trips")
      .withIndex("by_property_status", (q) =>
        q.eq("propertyId", args.propertyId).eq("status", "active"),
      )
      .first();

    if (!trip) return null;

    // Count completions for today
    const completions = await ctx.db
      .query("taskCompletions")
      .withIndex("by_trip_date", (q) =>
        q.eq("tripId", trip._id).eq("date", args.date),
      )
      .collect();

    const completed = completions.length;

    // Count total recurring tasks for the property
    const sections = await ctx.db
      .query("manualSections")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", args.propertyId))
      .collect();

    let total = 0;
    for (const section of sections) {
      const instructions = await ctx.db
        .query("instructions")
        .withIndex("by_section_sort", (q) => q.eq("sectionId", section._id))
        .collect();
      total += instructions.filter((i) => i.isRecurring).length;
    }

    // Add today's overlay items (specific date + everyday items with no date)
    const allOverlayItems = await ctx.db
      .query("overlayItems")
      .withIndex("by_trip_date", (q) => q.eq("tripId", trip._id))
      .collect();
    total += allOverlayItems.filter((i) => !i.date || i.date === args.date).length;

    return { completed, total };
  },
});
