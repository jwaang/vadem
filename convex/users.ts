import {
  internalMutation,
  internalQuery,
  mutation,
  query,
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
      notificationPreferences: DEFAULT_NOTIFICATION_PREFERENCES,
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

const notificationPreferenceValidator = v.union(
  v.literal("all"),
  v.literal("proof-only"),
  v.literal("digest"),
  v.literal("off"),
);

const notificationPreferencesObjectValidator = v.object({
  taskCompletions: v.union(
    v.literal("all"),
    v.literal("proof-only"),
    v.literal("digest"),
    v.literal("off"),
  ),
  linkOpened: v.boolean(),
  tripEnding: v.boolean(),
});

const DEFAULT_NOTIFICATION_PREFERENCES = {
  taskCompletions: "proof-only" as const,
  linkOpened: true,
  tripEnding: true,
};

// Internal: get the user's timezone (IANA string or undefined)
export const getTimezone = internalQuery({
  args: { userId: v.id("users") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.timezone ?? null;
  },
});

// Internal: get task completion notification preference for a user
export const getNotificationPreference = internalQuery({
  args: { userId: v.id("users") },
  returns: notificationPreferenceValidator,
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.notificationPreferences?.taskCompletions ?? "proof-only";
  },
});

// Internal: get all notification preferences for a user (with defaults applied)
export const getNotificationPreferences = internalQuery({
  args: { userId: v.id("users") },
  returns: notificationPreferencesObjectValidator,
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user?.notificationPreferences) {
      return user.notificationPreferences;
    }
    return DEFAULT_NOTIFICATION_PREFERENCES;
  },
});

// Public: update all notification preferences for the authenticated user
export const updateNotificationPreferences = mutation({
  args: {
    token: v.string(),
    preferences: notificationPreferencesObjectValidator,
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;
    await ctx.db.patch(session.userId, {
      notificationPreferences: args.preferences,
    });
    return null;
  },
});

// Public: get all notification preferences for the authenticated user
export const getMyNotificationPreferences = query({
  args: { token: v.string() },
  returns: v.union(notificationPreferencesObjectValidator, v.null()),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (user?.notificationPreferences) {
      return user.notificationPreferences;
    }
    return DEFAULT_NOTIFICATION_PREFERENCES;
  },
});

// Public: save user's IANA timezone (auto-detected on login/app load)
export const updateTimezone = mutation({
  args: {
    token: v.string(),
    timezone: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;
    await ctx.db.patch(session.userId, { timezone: args.timezone });
    return null;
  },
});
