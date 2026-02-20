import { internalMutation, mutation, query } from "./_generated/server";
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
  date: v.string(),
  proofPhotoUrl: v.optional(v.string()),
});

export const create = mutation({
  args: {
    tripId: v.id("trips"),
    taskRef: v.string(),
    taskType: taskTypeValidator,
    sitterName: v.string(),
    completedAt: v.number(),
    date: v.string(), // YYYY-MM-DD
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

/**
 * Convenience mutation for sitter task check-off.
 * Computes completedAt and date server-side so callers don't need to pass them.
 * No auth check — sitters are anonymous and access via trip link only.
 */
export const completeTask = mutation({
  args: {
    tripId: v.id("trips"),
    taskRef: v.string(),
    taskType: taskTypeValidator,
    sitterName: v.string(), // empty string for anonymous sitters
  },
  returns: v.id("taskCompletions"),
  handler: async (ctx, args) => {
    const completedAt = Date.now();
    // YYYY-MM-DD in UTC — close enough for daily task grouping
    const date = new Date(completedAt).toISOString().split("T")[0];
    return await ctx.db.insert("taskCompletions", {
      ...args,
      completedAt,
      date,
    });
  },
});

/**
 * Complete a task and attach a proof photo in one step.
 * Resolves the storageId to a public URL before storing.
 * Also logs a proof_uploaded event to the activity feed.
 */
export const completeTaskWithProof = mutation({
  args: {
    tripId: v.id("trips"),
    taskRef: v.string(),
    taskType: taskTypeValidator,
    sitterName: v.string(),
    storageId: v.id("_storage"),
  },
  returns: v.id("taskCompletions"),
  handler: async (ctx, args) => {
    const proofPhotoUrl = await ctx.storage.getUrl(args.storageId);
    if (!proofPhotoUrl) {
      throw new ConvexError({ code: "STORAGE_ERROR", message: "Failed to resolve proof photo URL" });
    }
    const completedAt = Date.now();
    const date = new Date(completedAt).toISOString().split("T")[0];
    const completionId = await ctx.db.insert("taskCompletions", {
      tripId: args.tripId,
      taskRef: args.taskRef,
      taskType: args.taskType,
      sitterName: args.sitterName,
      completedAt,
      date,
      proofPhotoUrl,
    });
    // Log proof_uploaded activity event
    const trip = await ctx.db.get(args.tripId);
    if (trip) {
      await ctx.db.insert("activityLog", {
        tripId: args.tripId,
        propertyId: trip.propertyId,
        event: "proof_uploaded",
        sitterName: args.sitterName || undefined,
        createdAt: completedAt,
      });
    }
    return completionId;
  },
});

/**
 * Attach a proof photo to an already-completed task.
 * Used when the sitter uploads proof after checking off the task.
 * Internal mutation — called by the uploadProofPhoto action.
 */
export const _attachProof = internalMutation({
  args: {
    taskCompletionId: v.id("taskCompletions"),
    storageId: v.id("_storage"),
    tripId: v.id("trips"),
    sitterName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const proofPhotoUrl = await ctx.storage.getUrl(args.storageId);
    if (!proofPhotoUrl) {
      throw new ConvexError({ code: "STORAGE_ERROR", message: "Failed to resolve proof photo URL" });
    }
    await ctx.db.patch(args.taskCompletionId, { proofPhotoUrl });
    // Log proof_uploaded activity event
    const trip = await ctx.db.get(args.tripId);
    if (trip) {
      await ctx.db.insert("activityLog", {
        tripId: args.tripId,
        propertyId: trip.propertyId,
        event: "proof_uploaded",
        sitterName: args.sitterName,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});
