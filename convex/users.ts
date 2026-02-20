import {
  internalMutation,
  internalQuery,
  mutation,
} from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.optional(v.string()),
    salt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("EMAIL_TAKEN");
    }

    return await ctx.db.insert("users", {
      email: args.email,
      passwordHash: args.passwordHash,
      salt: args.salt,
      createdAt: Date.now(),
    });
  },
});

// Public: store push subscription for the authenticated user
export const storePushSubscription = mutation({
  args: {
    token: v.string(),
    subscription: v.string(), // JSON-serialized PushSubscription
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;
    await ctx.db.patch(session.userId, { pushSubscription: args.subscription });
    return null;
  },
});

// Internal: get push subscription JSON for a user
export const getPushSubscription = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.pushSubscription ?? null;
  },
});

// Internal: clear push subscription (for expired/invalid subscriptions)
export const clearPushSubscription = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { pushSubscription: undefined });
    return null;
  },
});
