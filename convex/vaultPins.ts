import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours — verified session validity

/**
 * Insert or replace a verified session record for a trip + normalized sitter phone.
 * Deletes any existing record before inserting so resends start fresh.
 */
export const _upsert = internalMutation({
  args: {
    tripId: v.id("trips"),
    sitterPhone: v.string(), // normalized 10-digit US number
    verified: v.optional(v.boolean()),
    expiresAt: v.number(),
  },
  returns: v.id("vaultPins"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("vaultPins")
      .withIndex("by_trip_phone", (q) =>
        q.eq("tripId", args.tripId).eq("sitterPhone", args.sitterPhone),
      )
      .first();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
    return await ctx.db.insert("vaultPins", {
      tripId: args.tripId,
      sitterPhone: args.sitterPhone,
      verified: args.verified,
      expiresAt: args.expiresAt,
    });
  },
});

/** Get a vaultPin record by trip + normalized sitter phone. */
export const _getByTripAndPhone = internalQuery({
  args: { tripId: v.id("trips"), sitterPhone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vaultPins")
      .withIndex("by_trip_phone", (q) =>
        q.eq("tripId", args.tripId).eq("sitterPhone", args.sitterPhone),
      )
      .first();
  },
});

/** Delete a vaultPin record. */
export const _delete = internalMutation({
  args: { pinId: v.id("vaultPins") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.delete(args.pinId);
    return null;
  },
});

export { SESSION_TTL_MS };
