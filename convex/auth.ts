import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Internal: create a new user record (password or OAuth)
export const _createUser = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.optional(v.string()),
    salt: v.optional(v.string()),
    googleId: v.optional(v.string()),
    appleId: v.optional(v.string()),
    emailVerified: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("users", {
      email: args.email,
      passwordHash: args.passwordHash,
      salt: args.salt,
      googleId: args.googleId,
      appleId: args.appleId,
      emailVerified: args.emailVerified,
      createdAt: Date.now(),
    });
  },
});

// Internal: create a session for a user
export const _createSession = internalMutation({
  args: {
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return ctx.db.insert("sessions", args);
  },
});

// Internal: look up user by email
export const _getUserByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

// Internal: look up user by Google ID
export const _getUserByGoogleId = internalQuery({
  args: { googleId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_google_id", (q) => q.eq("googleId", args.googleId))
      .unique();
  },
});

// Internal: look up user by Apple ID
export const _getUserByAppleId = internalQuery({
  args: { appleId: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("users")
      .withIndex("by_apple_id", (q) => q.eq("appleId", args.appleId))
      .unique();
  },
});

// Internal: email verification token lifecycle
export const _createEmailVerificationToken = internalMutation({
  args: { userId: v.id("users"), token: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.insert("emailVerificationTokens", {
      userId: args.userId,
      token: args.token,
      expiresAt: Date.now() + 24 * 60 * 60 * 1000,
    });
  },
});

export const _getVerificationToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
  },
});

export const _deleteVerificationToken = internalMutation({
  args: { tokenId: v.id("emailVerificationTokens") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.tokenId);
  },
});

export const _deleteUserVerificationTokens = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const tokens = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    await Promise.all(tokens.map((t) => ctx.db.delete(t._id)));
  },
});

export const _markEmailVerified = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { emailVerified: true });
  },
});

export const _getSessionByToken = internalQuery({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
  },
});

export const _getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => ctx.db.get(args.userId),
});

// Internal: link an OAuth provider ID to an existing user
export const _linkOAuthProvider = internalMutation({
  args: {
    userId: v.id("users"),
    googleId: v.optional(v.string()),
    appleId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const patch: Record<string, string> = {};
    if (args.googleId) patch.googleId = args.googleId;
    if (args.appleId) patch.appleId = args.appleId;
    await ctx.db.patch(args.userId, patch);
  },
});

// Public: verify an email verification token and mark user as verified
// This is a mutation (not action) so Convex buffers it until connected,
// avoiding the "offline" error when the page loads before the WS is ready.
export const verifyEmail = mutation({
  args: { token: v.string() },
  handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
    const record = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!record) return { success: false, error: "invalid" };
    if (record.expiresAt < Date.now()) return { success: false, error: "expired" };
    await ctx.db.patch(record.userId, { emailVerified: true });
    await ctx.db.delete(record._id);
    return { success: true };
  },
});

// Public: validate a session token, returns user info or null
export const validateSession = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    if (!args.token) return null;
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (!session || session.expiresAt < Date.now()) return null;
    const user = await ctx.db.get(session.userId);
    if (!user) return null;
    return { userId: user._id, email: user.email, emailVerified: user.emailVerified ?? false };
  },
});

// Public: sign out by deleting the session
export const signOut = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
    if (session) await ctx.db.delete(session._id);
  },
});
