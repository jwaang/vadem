import { query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const tripSessionObject = v.object({
  _id: v.id("tripSessions"),
  _creationTime: v.number(),
  tripId: v.id("trips"),
  sessionToken: v.string(),
  expiresAt: v.number(),
});

// Public: validates a session token against a trip.
// Returns true only if the token is valid, unexpired, and belongs to the trip.
export const verifySession = query({
  args: { sessionToken: v.string(), tripId: v.id("trips") },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("tripSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();
    if (!session) return false;
    if (session.tripId !== args.tripId) return false;
    if (session.expiresAt < Date.now()) return false;
    return true;
  },
});

// Internal: create a new trip session record.
export const _create = internalMutation({
  args: {
    tripId: v.id("trips"),
    sessionToken: v.string(),
    expiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("tripSessions", {
      tripId: args.tripId,
      sessionToken: args.sessionToken,
      expiresAt: args.expiresAt,
    });
    return null;
  },
});

// Internal: get session by token.
export const _getByToken = internalQuery({
  args: { sessionToken: v.string() },
  returns: v.union(tripSessionObject, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tripSessions")
      .withIndex("by_token", (q) => q.eq("sessionToken", args.sessionToken))
      .first();
  },
});
