import { query } from "./_generated/server";
import { v } from "convex/values";

const activityLogEntryValidator = v.object({
  _id: v.id("activityLog"),
  _creationTime: v.number(),
  tripId: v.id("trips"),
  propertyId: v.id("properties"),
  event: v.string(),
  sitterName: v.optional(v.string()),
  vaultItemId: v.optional(v.id("vaultItems")),
  vaultItemLabel: v.optional(v.string()),
  proofPhotoUrl: v.optional(v.string()),
  createdAt: v.number(),
});

// Get the activity feed for a property — newest events first.
// Returns the most recent events (default 20) across all trips for the property.
// Optional eventType filter: 'task_completed' | 'proof_uploaded' | undefined (all).
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

    const filtered = args.eventType
      ? events.filter((e) => e.event === args.eventType)
      : events;

    return filtered.slice(0, args.limit ?? 20).map((e) => ({
      _id: e._id,
      _creationTime: e._creationTime,
      tripId: e.tripId,
      propertyId: e.propertyId,
      event: e.event,
      sitterName: e.sitterName,
      vaultItemId: e.vaultItemId,
      vaultItemLabel: e.vaultItemLabel,
      proofPhotoUrl: e.proofPhotoUrl,
      createdAt: e.createdAt,
    }));
  },
});

// Get today's task completion summary for a property's active trip.
// Returns { completed, total } or null if no active trip.
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
