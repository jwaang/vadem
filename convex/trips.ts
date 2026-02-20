import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel";

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
  pendingDigestAt: v.optional(v.number()),
  tripEndingScheduledId: v.optional(v.id("_scheduled_functions")),
  reportShareLink: v.optional(v.string()),
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
    // Auto-set linkExpiry to end of endDate day (23:59:59.999 UTC)
    const linkExpiry = new Date(args.endDate + "T23:59:59.999Z").getTime();
    const tripId = await ctx.db.insert("trips", {
      propertyId: args.propertyId,
      startDate: args.startDate,
      endDate: args.endDate,
      status: "draft",
      linkExpiry,
    });

    // Schedule the "trip ending soon" notification 24 hours before the end date
    const notifyAt =
      new Date(args.endDate + "T00:00:00.000Z").getTime() -
      24 * 60 * 60 * 1000;
    if (notifyAt > Date.now()) {
      const scheduledId = await ctx.scheduler.runAt(
        notifyAt,
        internal.notifications.sendTripEndingSoonNotification,
        { tripId },
      );
      await ctx.db.patch(tripId, { tripEndingScheduledId: scheduledId });
    }

    return tripId;
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
// Returns { status: "EXPIRED" } if the link has expired (either by linkExpiry timestamp or
// trip status), null if not found, or the full trip object if valid.
export const getByShareLink = query({
  args: { shareLink: v.string() },
  returns: v.union(tripObject, v.null(), v.object({ status: v.literal("EXPIRED") })),
  handler: async (ctx, args) => {
    const trip = await ctx.db
      .query("trips")
      .withIndex("by_share_link", (q) => q.eq("shareLink", args.shareLink))
      .first();
    if (!trip) return null;
    // Check expiry: explicit linkExpiry timestamp or trip status === expired
    if (
      trip.status === "expired" ||
      (trip.linkExpiry !== undefined && trip.linkExpiry < Date.now())
    ) {
      return { status: "EXPIRED" as const };
    }
    return trip;
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

// Public: get a single trip by ID (used by creator share panel).
export const get = query({
  args: { tripId: v.id("trips") },
  returns: v.union(tripObject, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tripId);
  },
});

// Sets the link expiry timestamp for a trip.
// Validates that the new expiry is not later than the trip's end date.
export const setLinkExpiry = mutation({
  args: {
    tripId: v.id("trips"),
    linkExpiry: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found" });
    }
    const maxExpiry = new Date(trip.endDate + "T23:59:59.999Z").getTime();
    if (args.linkExpiry > maxExpiry) {
      throw new ConvexError({
        code: "INVALID_ARGUMENT",
        message: "Link expiry cannot be later than the trip end date.",
      });
    }
    await ctx.db.patch(args.tripId, { linkExpiry: args.linkExpiry });
    return null;
  },
});

// Updates a trip's start and end dates, cancelling any previously scheduled
// trip-ending-soon notification and rescheduling it for the new end date.
export const updateTripDates = mutation({
  args: {
    tripId: v.id("trips"),
    startDate: v.string(),
    endDate: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found" });
    }

    // Cancel existing scheduled notification if present
    if (trip.tripEndingScheduledId) {
      await ctx.scheduler.cancel(trip.tripEndingScheduledId);
    }

    // Schedule new notification 24h before the updated end date
    const notifyAt =
      new Date(args.endDate + "T00:00:00.000Z").getTime() -
      24 * 60 * 60 * 1000;
    let tripEndingScheduledId:
      | (typeof trip)["tripEndingScheduledId"]
      | undefined;
    if (notifyAt > Date.now()) {
      tripEndingScheduledId = await ctx.scheduler.runAt(
        notifyAt,
        internal.notifications.sendTripEndingSoonNotification,
        { tripId: args.tripId },
      );
    }

    await ctx.db.patch(args.tripId, {
      startDate: args.startDate,
      endDate: args.endDate,
      tripEndingScheduledId,
    });

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
      eventType: "trip_expired",
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

// Public state-machine query for the sitter view router.
// Returns the appropriate state without ever exposing sensitive fields like linkPassword.
export const getTripByShareLink = query({
  args: { shareLink: v.string() },
  returns: v.union(
    v.null(), // Not found / revoked
    v.object({ status: v.literal("EXPIRED"), tripId: v.optional(v.id("trips")) }),
    v.object({ status: v.literal("PASSWORD_REQUIRED"), tripId: v.id("trips") }),
    v.object({
      status: v.literal("NOT_STARTED"),
      startDate: v.string(),
      propertyName: v.string(),
      petNames: v.array(v.string()),
    }),
    v.object({
      status: v.literal("ACTIVE"),
      tripId: v.id("trips"),
      propertyId: v.id("properties"),
    }),
  ),
  handler: async (ctx, args) => {
    const trip = await ctx.db
      .query("trips")
      .withIndex("by_share_link", (q) => q.eq("shareLink", args.shareLink))
      .first();
    if (!trip) return null;

    const today = new Date().toISOString().split("T")[0];

    // Expired: explicit status, completed, past linkExpiry, or endDate passed
    if (
      trip.status === "expired" ||
      trip.status === "completed" ||
      (trip.linkExpiry !== undefined && trip.linkExpiry < Date.now()) ||
      trip.endDate < today
    ) {
      return { status: "EXPIRED" as const, tripId: trip._id };
    }

    // Password-protected: gate before revealing any trip details
    if (trip.linkPassword) {
      return { status: "PASSWORD_REQUIRED" as const, tripId: trip._id };
    }

    // Not yet started
    if (trip.startDate > today) {
      const property = await ctx.db.get(trip.propertyId);
      const pets = await ctx.db
        .query("pets")
        .withIndex("by_property_sort", (q) => q.eq("propertyId", trip.propertyId))
        .collect();
      return {
        status: "NOT_STARTED" as const,
        startDate: trip.startDate,
        propertyName: property?.name ?? "Your stay",
        petNames: pets.map((p) => p.name),
      };
    }

    return {
      status: "ACTIVE" as const,
      tripId: trip._id,
      propertyId: trip.propertyId,
    };
  },
});

// Called after password / session verification to determine trip state.
// Assumes the caller has already authenticated; never checks linkPassword.
export const getSitterTripState = query({
  args: { tripId: v.id("trips") },
  returns: v.union(
    v.null(),
    v.object({ status: v.literal("EXPIRED") }),
    v.object({
      status: v.literal("NOT_STARTED"),
      startDate: v.string(),
      propertyName: v.string(),
      petNames: v.array(v.string()),
    }),
    v.object({
      status: v.literal("ACTIVE"),
      tripId: v.id("trips"),
      propertyId: v.id("properties"),
    }),
  ),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) return null;

    const today = new Date().toISOString().split("T")[0];

    if (
      trip.status === "expired" ||
      trip.status === "completed" ||
      (trip.linkExpiry !== undefined && trip.linkExpiry < Date.now()) ||
      trip.endDate < today
    ) {
      return { status: "EXPIRED" as const };
    }

    if (trip.startDate > today) {
      const property = await ctx.db.get(trip.propertyId);
      const pets = await ctx.db
        .query("pets")
        .withIndex("by_property_sort", (q) => q.eq("propertyId", trip.propertyId))
        .collect();
      return {
        status: "NOT_STARTED" as const,
        startDate: trip.startDate,
        propertyName: property?.name ?? "Your stay",
        petNames: pets.map((p) => p.name),
      };
    }

    return {
      status: "ACTIVE" as const,
      tripId: trip._id,
      propertyId: trip.propertyId,
    };
  },
});

// Internal: atomically set pendingDigestAt on a trip.
// Returns true if newly scheduled (caller should then schedule the action),
// or false if a digest was already pending for the same hour (no-op).
export const _schedulePendingDigest = internalMutation({
  args: {
    tripId: v.id("trips"),
    nextHourStart: v.number(),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) return false;
    if (trip.pendingDigestAt === args.nextHourStart) return false;
    await ctx.db.patch(args.tripId, { pendingDigestAt: args.nextHourStart });
    return true;
  },
});

// Internal: clear pendingDigestAt after a digest notification has been sent.
export const _clearPendingDigestAt = internalMutation({
  args: { tripId: v.id("trips") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.tripId, { pendingDigestAt: undefined });
    return null;
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

// Generates a unique read-only report share link slug for a trip.
// If a link already exists, returns the existing slug (idempotent).
// The slug is stored as `reportShareLink` on the trip document.
export const generateReportLink = mutation({
  args: { tripId: v.id("trips") },
  returns: v.string(),
  handler: async (ctx, { tripId }) => {
    const trip = await ctx.db.get(tripId);
    if (!trip) throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found" });
    if (trip.reportShareLink) return trip.reportShareLink;
    const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let slug = "";
    for (let i = 0; i < 16; i++) {
      slug += chars[Math.floor(Math.random() * chars.length)];
    }
    await ctx.db.patch(tripId, { reportShareLink: slug });
    return slug;
  },
});

// Revokes the report share link by clearing the reportShareLink field.
export const revokeReportLink = mutation({
  args: { tripId: v.id("trips") },
  returns: v.null(),
  handler: async (ctx, { tripId }) => {
    const trip = await ctx.db.get(tripId);
    if (!trip) throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found" });
    await ctx.db.patch(tripId, { reportShareLink: undefined });
    return null;
  },
});

// Public: returns only the owner's first name (derived from email) for conversion prompts.
// Accepts a string so invalid IDs don't throw — returns null gracefully.
export const getPropertyOwnerName = query({
  args: { tripId: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    let trip;
    try {
      trip = await ctx.db.get(args.tripId as Id<"trips">);
    } catch {
      return null;
    }
    if (!trip) return null;
    const property = await ctx.db.get(trip.propertyId);
    if (!property) return null;
    const owner = await ctx.db.get(property.ownerId);
    if (!owner) return null;
    // Derive a display name from the email prefix
    const prefix = owner.email.split("@")[0] ?? "";
    const firstName = prefix.split(".")[0] ?? prefix;
    return firstName.charAt(0).toUpperCase() + firstName.slice(1) || null;
  },
});

// Internal: record a sitter-to-creator conversion (called from signUp action).
export const recordConversionInternal = internalMutation({
  args: {
    sitterUserId: v.id("users"),
    originTripId: v.id("trips"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // Idempotent: skip if already recorded for this user
    const existing = await ctx.db
      .query("conversions")
      .withIndex("by_user", (q) => q.eq("sitterUserId", args.sitterUserId))
      .first();
    if (existing) return null;
    await ctx.db.insert("conversions", {
      sitterUserId: args.sitterUserId,
      originTripId: args.originTripId,
      convertedAt: Date.now(),
    });
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
        eventType: "trip_expired",
        createdAt: Date.now(),
      });
    }
    return null;
  },
});
