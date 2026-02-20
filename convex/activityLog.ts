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
  createdAt: v.number(),
});

// Get the activity feed for a property — newest events first.
// Returns the most recent events (default 20) across all trips for the property.
export const getActivityFeed = query({
  args: {
    propertyId: v.id("properties"),
    limit: v.optional(v.number()),
  },
  returns: v.array(activityLogEntryValidator),
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query("activityLog")
      .withIndex("by_property", (q) => q.eq("propertyId", args.propertyId))
      .order("desc")
      .take(args.limit ?? 20);
    return events.map((e) => ({
      _id: e._id,
      _creationTime: e._creationTime,
      tripId: e.tripId,
      propertyId: e.propertyId,
      event: e.event,
      sitterName: e.sitterName,
      vaultItemId: e.vaultItemId,
      vaultItemLabel: e.vaultItemLabel,
      createdAt: e.createdAt,
    }));
  },
});
