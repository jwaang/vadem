import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const sitterObject = v.object({
  _id: v.id("sitters"),
  _creationTime: v.number(),
  tripId: v.id("trips"),
  name: v.string(),
  phone: v.optional(v.string()),
  vaultAccess: v.boolean(),
});

export const create = mutation({
  args: {
    tripId: v.id("trips"),
    name: v.string(),
    phone: v.optional(v.string()),
    vaultAccess: v.boolean(),
  },
  returns: v.id("sitters"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("sitters", args);
  },
});

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  returns: v.array(sitterObject),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sitters")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
  },
});

export const update = mutation({
  args: {
    sitterId: v.id("sitters"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    vaultAccess: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { sitterId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(sitterId, updates);
    }
    return null;
  },
});

export const remove = mutation({
  args: { sitterId: v.id("sitters") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sitter = await ctx.db.get(args.sitterId);
    if (!sitter) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Sitter not found",
      });
    }
    await ctx.db.delete(args.sitterId);
    return null;
  },
});
