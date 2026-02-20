"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";
import crypto from "node:crypto";

// Generates a 12-character URL-safe base64 slug using 9 random bytes.
// base64url encoding uses A-Z, a-z, 0-9, -, _ (no padding chars).
function generateSlug(): string {
  return crypto.randomBytes(9).toString("base64url");
}

// Creates (or regenerates) a cryptographically random share link for a trip.
// Returns the 12-char slug; the caller constructs the full URL.
export const generateShareLink = action({
  args: { tripId: v.id("trips") },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const slug = generateSlug();
    await ctx.runMutation(api.trips.update, {
      tripId: args.tripId,
      shareLink: slug,
    });
    return slug;
  },
});
