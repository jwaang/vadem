import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const timeSlotValidator = v.union(
  v.literal("morning"),
  v.literal("afternoon"),
  v.literal("evening"),
  v.literal("anytime"),
);

function timeToSlot(time: string): "morning" | "afternoon" | "evening" {
  const [h] = time.split(":").map(Number);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

const overlayItemObject = v.object({
  _id: v.id("overlayItems"),
  _creationTime: v.number(),
  tripId: v.id("trips"),
  text: v.string(),
  date: v.optional(v.string()),
  timeSlot: timeSlotValidator,
  specificTime: v.optional(v.string()),
  proofRequired: v.boolean(),
  locationCardId: v.optional(v.id("locationCards")),
});

export const create = mutation({
  args: {
    tripId: v.id("trips"),
    text: v.string(),
    date: v.optional(v.string()),
    timeSlot: timeSlotValidator,
    specificTime: v.optional(v.string()),
    proofRequired: v.boolean(),
    locationCardId: v.optional(v.id("locationCards")),
  },
  returns: v.id("overlayItems"),
  handler: async (ctx, args) => {
    const timeSlot = args.specificTime ? timeToSlot(args.specificTime) : args.timeSlot;
    return await ctx.db.insert("overlayItems", {
      ...args,
      timeSlot,
    });
  },
});

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  returns: v.array(overlayItemObject),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("overlayItems")
      .withIndex("by_trip_date", (q) => q.eq("tripId", args.tripId))
      .collect();
  },
});

export const listByTripAndDate = query({
  args: { tripId: v.id("trips"), date: v.string() },
  returns: v.array(overlayItemObject),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("overlayItems")
      .withIndex("by_trip_date", (q) =>
        q.eq("tripId", args.tripId).eq("date", args.date),
      )
      .collect();
  },
});

export const update = mutation({
  args: {
    overlayItemId: v.id("overlayItems"),
    text: v.optional(v.string()),
    date: v.optional(v.string()),
    timeSlot: v.optional(timeSlotValidator),
    specificTime: v.optional(v.string()),
    proofRequired: v.optional(v.boolean()),
    locationCardId: v.optional(v.id("locationCards")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { overlayItemId, ...fields } = args;
    if (fields.specificTime) {
      fields.timeSlot = timeToSlot(fields.specificTime);
    }
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(overlayItemId, updates);
    }
    return null;
  },
});

export const remove = mutation({
  args: { overlayItemId: v.id("overlayItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.overlayItemId);
    if (!item) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Overlay item not found",
      });
    }
    await ctx.db.delete(args.overlayItemId);
    return null;
  },
});
