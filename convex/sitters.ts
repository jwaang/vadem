import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { normalizePhone, isValidPhone } from "./phoneUtils";

const sitterObject = v.object({
  _id: v.id("sitters"),
  _creationTime: v.number(),
  tripId: v.id("trips"),
  name: v.string(),
  phone: v.optional(v.string()),
  vaultAccess: v.boolean(),
});

export const create = mutation({
  args: {
    tripId: v.id("trips"),
    name: v.string(),
    phone: v.optional(v.string()),
    vaultAccess: v.boolean(),
  },
  returns: v.id("sitters"),
  handler: async (ctx, args) => {
    const phone =
      args.phone !== undefined ? normalizePhone(args.phone) : undefined;
    if (phone !== undefined && !isValidPhone(phone)) {
      throw new ConvexError("Enter a valid 10-digit US phone number.");
    }
    return await ctx.db.insert("sitters", { ...args, phone });
  },
});

export const listByTrip = query({
  args: { tripId: v.id("trips") },
  returns: v.array(sitterObject),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sitters")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
  },
});

export const update = mutation({
  args: {
    sitterId: v.id("sitters"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    vaultAccess: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const phone =
      args.phone !== undefined ? normalizePhone(args.phone) : undefined;
    if (phone !== undefined && !isValidPhone(phone)) {
      throw new ConvexError("Enter a valid 10-digit US phone number.");
    }
    const { sitterId, ...fields } = { ...args, phone };
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(sitterId, updates);
    }
    return null;
  },
});

export const remove = mutation({
  args: { sitterId: v.id("sitters") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sitter = await ctx.db.get(args.sitterId);
    if (!sitter) {
      throw new ConvexError("Sitter not found.");
    }
    await ctx.db.delete(args.sitterId);
    return null;
  },
});

/**
 * Revoke vault access for a sitter immediately.
 * Sets vaultAccess = false and deletes any active VaultPin sessions for the sitter,
 * so the revocation takes effect on their next vault request without any caching concern.
 */
export const revokeSitterVaultAccess = mutation({
  args: { sitterId: v.id("sitters") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const sitter = await ctx.db.get(args.sitterId);
    if (!sitter) {
      throw new ConvexError("Sitter not found.");
    }
    // Set vaultAccess to false immediately
    await ctx.db.patch(args.sitterId, { vaultAccess: false });
    // Delete any active vault PIN sessions for this sitter
    if (sitter.phone) {
      const digits = sitter.phone.replace(/\D/g, "");
      const normalizedPhone =
        digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
      const pin = await ctx.db
        .query("vaultPins")
        .withIndex("by_trip_phone", (q) =>
          q.eq("tripId", sitter.tripId).eq("sitterPhone", normalizedPhone),
        )
        .first();
      if (pin) {
        await ctx.db.delete(pin._id);
      }
    }
    return null;
  },
});

// Internal: list all sitters for a trip — used by vaultActions to find sitter by normalized phone.
export const _listByTrip = internalQuery({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sitters")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
  },
});

// Internal: look up a sitter by trip + phone — used by vaultActions for access control.
export const _getByTripAndPhone = internalQuery({
  args: { tripId: v.id("trips"), phone: v.string() },
  handler: async (ctx, args) => {
    const sitters = await ctx.db
      .query("sitters")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    return sitters.find((s) => s.phone === args.phone) ?? null;
  },
});
