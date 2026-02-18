import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const create = internalMutation({
  args: {
    email: v.string(),
    passwordHash: v.string(),
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
      createdAt: Date.now(),
    });
  },
});
