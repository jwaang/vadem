import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";

const tripStatusValidator = v.union(
  v.literal("draft"),
  v.literal("active"),
  v.literal("completed"),
  v.literal("expired"),
);

const tripObject = v.object({
  _id: v.id("trips"),
  _creationTime: v.number(),
  propertyId: v.id("properties"),
  startDate: v.string(),
  endDate: v.string(),
  status: tripStatusValidator,
  shareLink: v.optional(v.string()),
  linkPassword: v.optional(v.string()),
  linkExpiry: v.optional(v.number()),
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    startDate: v.string(),
    endDate: v.string(),
    status: tripStatusValidator,
    shareLink: v.optional(v.string()),
    linkPassword: v.optional(v.string()),
    linkExpiry: v.optional(v.number()),
  },
  returns: v.id("trips"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("trips", args);
  },
});

// Returns the first active or draft trip for a property (for client-side conflict check).
export const getExistingTrip = query({
  args: { propertyId: v.id("properties") },
  returns: v.union(tripObject, v.null()),
  handler: async (ctx, args) => {
    const draft = await ctx.db
      .query("trips")
      .withIndex("by_property_status", (q) =>
        q.eq("propertyId", args.propertyId).eq("status", "draft"),
      )
      .first();
    if (draft) return draft;
    return await ctx.db
      .query("trips")
      .withIndex("by_property_status", (q) =>
        q.eq("propertyId", args.propertyId).eq("status", "active"),
      )
      .first();
  },
});

// Creates a new draft trip, enforcing the one-active-trip rule.
export const createTrip = mutation({
  args: {
    propertyId: v.id("properties"),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.id("trips"),
  handler: async (ctx, args) => {
    const existingDraft = await ctx.db
      .query("trips")
      .withIndex("by_property_status", (q) =>
        q.eq("propertyId", args.propertyId).eq("status", "draft"),
      )
      .first();
    const existingActive = await ctx.db
      .query("trips")
      .withIndex("by_property_status", (q) =>
        q.eq("propertyId", args.propertyId).eq("status", "active"),
      )
      .first();
    if (existingDraft || existingActive) {
      throw new ConvexError({
        code: "CONFLICT",
        message: "A trip is already in progress for this property.",
      });
    }
    return await ctx.db.insert("trips", {
      propertyId: args.propertyId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "draft",
    });
  },
});

export const listByProperty = query({
  args: { propertyId: v.id("properties") },
  returns: v.array(tripObject),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trips")
      .withIndex("by_property_status", (q) =>
        q.eq("propertyId", args.propertyId),
      )
      .collect();
  },
});

export const getActiveTripForProperty = query({
  args: { propertyId: v.id("properties") },
  returns: v.union(tripObject, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trips")
      .withIndex("by_property_status", (q) =>
        q.eq("propertyId", args.propertyId).eq("status", "active"),
      )
      .first();
  },
});

export const update = mutation({
  args: {
    tripId: v.id("trips"),
    startDate: v.optional(v.string()),
    endDate: v.optional(v.string()),
    status: v.optional(tripStatusValidator),
    shareLink: v.optional(v.string()),
    linkPassword: v.optional(v.string()),
    linkExpiry: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { tripId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(tripId, updates);
    }
    return null;
  },
});

export const remove = mutation({
  args: { tripId: v.id("trips") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found" });
    }
    await ctx.db.delete(args.tripId);
    return null;
  },
});
