"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { pbkdf2Sync, randomBytes } from "crypto";

export const signup = action({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args): Promise<{ userId: Id<"users"> }> => {
    const salt = randomBytes(16).toString("hex");
    const hash = pbkdf2Sync(args.password, salt, 100000, 64, "sha512").toString("hex");
    const passwordHash = `${salt}:${hash}`;

    const userId = (await ctx.runMutation(internal.users.create, {
      email: args.email.toLowerCase().trim(),
      passwordHash,
    })) as Id<"users">;

    return { userId };
  },
});
