import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const taskTypeValidator = v.union(
  v.literal("recurring"),
  v.literal("overlay"),
);

const taskCompletionObject = v.object({
  _id: v.id("taskCompletions"),
  _creationTime: v.number(),
  tripId: v.id("trips"),
  taskRef: v.string(),
  taskType: taskTypeValidator,
  sitterName: v.string(),
  completedAt: v.number(),
  proofPhotoUrl: v.optional(v.string()),
});

export const create = mutation({
  args: {
    tripId: v.id("trips"),
    taskRef: v.string(),
    taskType: taskTypeValidator,
    sitterName: v.string(),
    completedAt: v.number(),
    proofPhotoUrl: v.optional(v.string()),
  },
  returns: v.id("taskCompletions"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("taskCompletions", args);
  },
});

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  returns: v.array(taskCompletionObject),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taskCompletions")
      .withIndex("by_trip_taskref", (q) => q.eq("tripId", args.tripId))
      .collect();
  },
});

export const getByTripAndTaskRef = query({
  args: { tripId: v.id("trips"), taskRef: v.string() },
  returns: v.union(taskCompletionObject, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taskCompletions")
      .withIndex("by_trip_taskref", (q) =>
        q.eq("tripId", args.tripId).eq("taskRef", args.taskRef),
      )
      .first();
  },
});

export const update = mutation({
  args: {
    taskCompletionId: v.id("taskCompletions"),
    sitterName: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    proofPhotoUrl: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { taskCompletionId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(taskCompletionId, updates);
    }
    return null;
  },
});

export const remove = mutation({
  args: { taskCompletionId: v.id("taskCompletions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const completion = await ctx.db.get(args.taskCompletionId);
    if (!completion) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Task completion not found",
      });
    }
    await ctx.db.delete(args.taskCompletionId);
    return null;
  },
});
