import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
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

// Public: returns whether a trip is currently active (for the sitter vault gate).
// Only exposes status — no sensitive trip details.
export const getTripStatus = query({
  args: { tripId: v.id("trips") },
  returns: v.union(
    v.object({ active: v.literal(true) }),
    v.object({ active: v.literal(false) }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) return null;
    const today = new Date().toISOString().split("T")[0];
    const active = trip.status === "active" && trip.endDate >= today;
    return { active: active as true | false };
  },
});

export const getActiveTripForProperty = query({
  args: { propertyId: v.id("properties") },
  returns: v.union(tripObject, v.null()),
  handler: async (ctx, args) => {
    const trip = await ctx.db
      .query("trips")
      .withIndex("by_property_status", (q) =>
        q.eq("propertyId", args.propertyId).eq("status", "active"),
      )
      .first();
    if (!trip) return null;
    // Lazy expiration check: treat trip as expired if endDate has passed.
    // The cron handles the actual DB status update; this makes the query
    // return null immediately without waiting for the next cron run.
    const today = new Date().toISOString().split("T")[0];
    if (trip.endDate < today) return null;
    return trip;
  },
});

// Look up a trip by its shareLink slug (used by the sitter view).
export const getByShareLink = query({
  args: { shareLink: v.string() },
  returns: v.union(tripObject, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("trips")
      .withIndex("by_share_link", (q) => q.eq("shareLink", args.shareLink))
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

// Internal: expire a single trip — update status, revoke vault access, log event.
export const expireTripInternal = internalMutation({
  args: { tripId: v.id("trips") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip || trip.status !== "active") return null;
    await ctx.db.patch(args.tripId, { status: "expired" });
    const sitters = await ctx.db
      .query("sitters")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    for (const sitter of sitters) {
      await ctx.db.patch(sitter._id, { vaultAccess: false });
    }
    await ctx.db.insert("activityLog", {
      tripId: args.tripId,
      propertyId: trip.propertyId,
      event: "trip_expired",
      createdAt: Date.now(),
    });
    return null;
  },
});

// Internal: fetch a trip by ID — used by vaultActions and shareActions for access control checks.
export const _getById = internalQuery({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tripId);
  },
});

// Internal: clear the linkPassword field on a trip.
export const _clearLinkPassword = internalMutation({
  args: { tripId: v.id("trips") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tripId, { linkPassword: undefined });
    return null;
  },
});

// Internal: daily batch job — find all active trips whose endDate is in the past
// and expire each one. Called by the cron in convex/crons.ts.
export const expireTripsDaily = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const today = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
    const expiredTrips = await ctx.db
      .query("trips")
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "active"),
          q.lt(q.field("endDate"), today),
        ),
      )
      .collect();
    for (const trip of expiredTrips) {
      await ctx.db.patch(trip._id, { status: "expired" });
      const sitters = await ctx.db
        .query("sitters")
        .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
        .collect();
      for (const sitter of sitters) {
        await ctx.db.patch(sitter._id, { vaultAccess: false });
      }
      await ctx.db.insert("activityLog", {
        tripId: trip._id,
        propertyId: trip.propertyId,
        event: "trip_expired",
        createdAt: Date.now(),
      });
    }
    return null;
  },
});
