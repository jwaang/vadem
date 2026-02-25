/**
 * Internal mutations used by the seed action.
 * Separate file because "use node" files can only export actions.
 */

import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const patchUser = internalMutation({
  args: {
    userId: v.id("users"),
    emailVerified: v.optional(v.boolean()),
    hasCompletedOnboarding: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(userId, updates);
    }
  },
});

export const patchProperty = internalMutation({
  args: {
    propertyId: v.id("properties"),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { propertyId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(propertyId, updates as Record<string, unknown>);
    }
  },
});

export const insertActivity = internalMutation({
  args: {
    tripId: v.id("trips"),
    propertyId: v.id("properties"),
    eventType: v.string(),
    sitterName: v.optional(v.string()),
    taskTitle: v.optional(v.string()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLog", {
      tripId: args.tripId,
      propertyId: args.propertyId,
      eventType: args.eventType as "link_opened" | "task_completed",
      sitterName: args.sitterName,
      taskTitle: args.taskTitle,
      createdAt: args.createdAt,
    });
  },
});
