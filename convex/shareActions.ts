"use node";

import { action } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { api, internal } from "./_generated/api";
import crypto from "node:crypto";
import { pbkdf2Sync } from "node:crypto";

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

// Regenerates the share link for a trip, invalidating the old slug and all active sessions.
// Returns the new 12-char slug.
export const regenerateShareLink = action({
  args: { tripId: v.id("trips") },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const slug = generateSlug();
    await ctx.runMutation(api.trips.update, {
      tripId: args.tripId,
      shareLink: slug,
    });
    // Invalidate all active TripSessions for this trip so password-verified sitters
    // must re-enter the password with the new link.
    await ctx.runMutation(internal.tripSessions._deleteByTripId, {
      tripId: args.tripId,
    });
    return slug;
  },
});

// Sets or clears a link password for a trip.
// If password is provided: hash with pbkdf2Sync and store as "salt:hash".
// If password is absent or empty string: clear the password.
export const setLinkPassword = action({
  args: { tripId: v.id("trips"), password: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    if (!args.password) {
      await ctx.runMutation(internal.trips._clearLinkPassword, {
        tripId: args.tripId,
      });
    } else {
      const salt = crypto.randomBytes(32).toString("hex");
      const hash = pbkdf2Sync(args.password, salt, 100000, 64, "sha512").toString("hex");
      await ctx.runMutation(api.trips.update, {
        tripId: args.tripId,
        linkPassword: `${salt}:${hash}`,
      });
    }
    return null;
  },
});

const TRIP_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Verifies the link password against the stored hash.
// On success: creates a short-lived session token in TripSessions and returns it.
// On failure: throws an error.
export const verifyLinkPassword = action({
  args: { tripId: v.id("trips"), password: v.string() },
  returns: v.union(
    v.object({ ok: v.literal(true), sessionToken: v.string() }),
    v.object({ ok: v.literal(false), reason: v.string() }),
  ),
  handler: async (ctx, args) => {
    const trip = await ctx.runQuery(internal.trips._getById, {
      tripId: args.tripId,
    });
    if (!trip) return { ok: false as const, reason: "Trip not found" };
    if (!trip.linkPassword) return { ok: false as const, reason: "This trip is not password-protected" };

    const [salt, storedHash] = trip.linkPassword.split(":");
    if (!salt || !storedHash) return { ok: false as const, reason: "Invalid password configuration" };

    const attemptHash = pbkdf2Sync(args.password, salt, 100000, 64, "sha512").toString("hex");
    if (attemptHash !== storedHash) return { ok: false as const, reason: "Incorrect password" };

    const sessionToken = crypto.randomBytes(32).toString("hex");
    await ctx.runMutation(internal.tripSessions._create, {
      tripId: args.tripId,
      sessionToken,
      expiresAt: Date.now() + TRIP_SESSION_TTL_MS,
    });
    return { ok: true as const, sessionToken };
  },
});
