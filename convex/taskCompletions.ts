import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";
import type { Id, DataModel } from "./_generated/dataModel";
import type { DatabaseReader } from "./_generated/server";

const taskTypeValidator = v.union(
  v.literal("recurring"),
  v.literal("overlay"),
);

/**
 * Resolve a human-readable task title from a taskRef + taskType pair.
 * Returns null if the referenced document no longer exists.
 */
async function resolveTaskTitle(
  db: DatabaseReader,
  taskRef: string,
  taskType: DataModel["taskCompletions"]["document"]["taskType"],
): Promise<string | null> {
  // taskRef is a compound string: "recurring:{id}:{date}" or "overlay:{id}"
  // Extract the bare Convex document ID (always the second colon-delimited segment)
  const rawId = taskRef.split(":")[1];
  if (!rawId) return null;

  if (taskType === "recurring") {
    const instruction = await db.get(rawId as Id<"instructions">);
    return instruction?.text ?? null;
  }
  const overlayItem = await db.get(rawId as Id<"overlayItems">);
  return overlayItem?.text ?? null;
}

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
    // Delete proof photo from Convex storage if present.
    // getUrl() may return a signed URL with query params — strip them to get the bare storageId.
    // Storage URL format: .../api/storage/{storageId}[?token=...]
    if (completion.proofPhotoUrl) {
      const rawSegment = completion.proofPhotoUrl.split("/").pop();
      const storageId = rawSegment?.split("?")[0];
      if (storageId) {
        try {
          await ctx.storage.delete(storageId as Id<"_storage">);
        } catch (err) {
          console.error("[taskCompletions.remove] Storage delete failed:", err);
          // Non-fatal: DB record is already gone; storage cleanup is best-effort.
        }
      }
    }
    // Log task_unchecked activity event
    const trip = await ctx.db.get(completion.tripId);
    if (trip) {
      const taskTitle =
        (await resolveTaskTitle(ctx.db, completion.taskRef, completion.taskType)) ?? "a task";
      await ctx.db.insert("activityLog", {
        tripId: completion.tripId,
        propertyId: trip.propertyId,
        eventType: "task_unchecked",
        sitterName: completion.sitterName || undefined,
        taskTitle,
        createdAt: Date.now(),
      });
      await ctx.scheduler.runAfter(0, internal.notifications.sendTaskUncheckedNotification, {
        tripId: completion.tripId,
        taskTitle,
        sitterName: completion.sitterName ?? "",
        uncheckedAt: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Convenience mutation for sitter task check-off.
 * Computes completedAt and date server-side unless completedAt is provided
 * (offline sync case: preserves the original timestamp from the local queue).
 * Deduplicates: if a completion for this tripId+taskRef already exists, returns
 * the existing ID without inserting a duplicate.
 * No auth check — sitters are anonymous and access via trip link only.
 */
export const completeTask = mutation({
  args: {
    tripId: v.id("trips"),
    taskRef: v.string(),
    taskType: taskTypeValidator,
    sitterName: v.string(), // empty string for anonymous sitters
    // Optional: supply the original client-side timestamp when syncing an
    // offline-queued completion so the owner sees when the task was actually
    // checked, not when the sync happened.
    completedAt: v.optional(v.number()),
    // Optional: client's local YYYY-MM-DD date so the stored date matches the
    // client's todayView query filter (avoids UTC timezone mismatch).
    date: v.optional(v.string()),
  },
  returns: v.id("taskCompletions"),
  handler: async (ctx, args) => {
    // Dedup: if already completed (same trip + taskRef) return existing ID
    const existing = await ctx.db
      .query("taskCompletions")
      .withIndex("by_trip_taskref", (q) =>
        q.eq("tripId", args.tripId).eq("taskRef", args.taskRef),
      )
      .first();
    if (existing) {
      // Patch date if the caller provided one that differs (fixes UTC→local mismatch
      // for completions created before the client started sending local dates).
      if (args.date && existing.date !== args.date) {
        await ctx.db.patch(existing._id, { date: args.date });
      }
      return existing._id;
    }

    // Destructure out the optional completedAt/date so we can compute clean values
    const { completedAt: providedCompletedAt, date: providedDate, ...taskFields } = args;
    const completedAt = providedCompletedAt ?? Date.now();
    const date = providedDate ?? new Date(completedAt).toISOString().split("T")[0];
    const completionId = await ctx.db.insert("taskCompletions", {
      ...taskFields,
      completedAt,
      date,
    });
    // Log task_completed activity event
    const trip = await ctx.db.get(args.tripId);
    if (trip) {
      // Resolve task title for both the activity log and push notification
      const taskTitle =
        (await resolveTaskTitle(ctx.db, args.taskRef, args.taskType)) ??
        "a task";
      await ctx.db.insert("activityLog", {
        tripId: args.tripId,
        propertyId: trip.propertyId,
        eventType: "task_completed",
        sitterName: args.sitterName || undefined,
        taskTitle,
        createdAt: completedAt,
      });
      await ctx.scheduler.runAfter(0, internal.notifications.sendTaskNotification, {
        tripId: args.tripId,
        taskTitle,
        sitterName: args.sitterName,
        completedAt,
      });
    }
    return completionId;
  },
});

/**
 * Complete a task and attach a proof photo in one step.
 * Resolves the storageId to a public URL before storing.
 * Also logs a proof_uploaded event to the activity feed.
 * Accepts optional completedAt for offline sync: preserves the original timestamp
 * from when the sitter took the photo, not when the upload synced.
 * Deduplicates: if a completion for this tripId+taskRef already exists, returns
 * the existing ID (idempotent for offline retry safety).
 */
export const completeTaskWithProof = mutation({
  args: {
    tripId: v.id("trips"),
    taskRef: v.string(),
    taskType: taskTypeValidator,
    sitterName: v.string(),
    storageId: v.id("_storage"),
    // Optional: supply the original client-side timestamp when syncing an
    // offline-queued photo upload.
    completedAt: v.optional(v.number()),
    // Optional: client's local YYYY-MM-DD date (avoids UTC timezone mismatch).
    date: v.optional(v.string()),
  },
  returns: v.id("taskCompletions"),
  handler: async (ctx, args) => {
    // Dedup: if already completed (offline retry case) return existing ID
    const existingCompletion = await ctx.db
      .query("taskCompletions")
      .withIndex("by_trip_taskref", (q) =>
        q.eq("tripId", args.tripId).eq("taskRef", args.taskRef),
      )
      .first();
    if (existingCompletion) {
      if (args.date && existingCompletion.date !== args.date) {
        await ctx.db.patch(existingCompletion._id, { date: args.date });
      }
      return existingCompletion._id;
    }

    const proofPhotoUrl = await ctx.storage.getUrl(args.storageId);
    if (!proofPhotoUrl) {
      throw new ConvexError({ code: "STORAGE_ERROR", message: "Failed to resolve proof photo URL" });
    }
    const completedAt = args.completedAt ?? Date.now();
    const date = args.date ?? new Date(completedAt).toISOString().split("T")[0];
    const completionId = await ctx.db.insert("taskCompletions", {
      tripId: args.tripId,
      taskRef: args.taskRef,
      taskType: args.taskType,
      sitterName: args.sitterName,
      completedAt,
      date,
      proofPhotoUrl,
    });
    // Log proof_uploaded activity event (with proof URL for feed thumbnail)
    const trip = await ctx.db.get(args.tripId);
    if (trip) {
      // Resolve task title for both the activity log and push notification
      const taskTitle =
        (await resolveTaskTitle(ctx.db, args.taskRef, args.taskType)) ??
        "a task";
      await ctx.db.insert("activityLog", {
        tripId: args.tripId,
        propertyId: trip.propertyId,
        eventType: "proof_uploaded",
        sitterName: args.sitterName || undefined,
        proofPhotoUrl,
        taskTitle,
        createdAt: completedAt,
      });
      await ctx.scheduler.runAfter(0, internal.notifications.sendTaskNotification, {
        tripId: args.tripId,
        taskTitle,
        sitterName: args.sitterName,
        proofPhotoUrl,
        completedAt,
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
      // Resolve task title from completion record for activity log + notification
      const completion = await ctx.db.get(args.taskCompletionId);
      const taskTitle = completion
        ? ((await resolveTaskTitle(ctx.db, completion.taskRef, completion.taskType)) ?? "a task")
        : "a task";

      await ctx.db.insert("activityLog", {
        tripId: args.tripId,
        propertyId: trip.propertyId,
        eventType: "proof_uploaded",
        sitterName: args.sitterName,
        proofPhotoUrl,
        taskTitle,
        createdAt: Date.now(),
      });

      // Schedule task-completion notification with proof
      await ctx.scheduler.runAfter(0, internal.notifications.sendTaskNotification, {
        tripId: args.tripId,
        taskTitle,
        sitterName: args.sitterName ?? "",
        proofPhotoUrl,
        completedAt: Date.now(),
      });
    }
    return null;
  },
});

/**
 * Count task completions for a trip within the given time window [windowStart, windowEnd).
 * Used by the digest notification scheduler.
 */
export const _countInWindow = internalQuery({
  args: {
    tripId: v.id("trips"),
    windowStart: v.number(),
    windowEnd: v.number(),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    const completions = await ctx.db
      .query("taskCompletions")
      .withIndex("by_trip_taskref", (q) => q.eq("tripId", args.tripId))
      .collect();
    return completions.filter(
      (c) => c.completedAt >= args.windowStart && c.completedAt < args.windowEnd,
    ).length;
  },
});
