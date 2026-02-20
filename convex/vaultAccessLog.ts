import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

const vaultAccessLogEntry = v.object({
  _id: v.id("vaultAccessLog"),
  _creationTime: v.number(),
  tripId: v.id("trips"),
  vaultItemId: v.optional(v.id("vaultItems")),
  sitterPhone: v.string(),
  sitterName: v.optional(v.string()),
  accessedAt: v.number(),
  verified: v.boolean(),
});

// Internal: log a vault access event.
// verified=true → sitter viewed a decrypted vault item.
// verified=false → sitter submitted a wrong PIN (failed verification attempt).
// accessedAt is always Date.now() server-side to prevent timestamp spoofing.
//
// For verified per-item accesses (verified=true + vaultItemId provided):
//   - Inserts an activity log entry with sitter name and item label.
//   - Schedules a push notification to the property owner (US-070 stub).
export const logVaultAccess = internalMutation({
  args: {
    tripId: v.id("trips"),
    vaultItemId: v.optional(v.id("vaultItems")),
    sitterPhone: v.string(),
    sitterName: v.optional(v.string()),
    verified: v.boolean(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const accessedAt = Date.now();

    await ctx.db.insert("vaultAccessLog", {
      tripId: args.tripId,
      vaultItemId: args.vaultItemId,
      sitterPhone: args.sitterPhone,
      sitterName: args.sitterName,
      accessedAt,
      verified: args.verified,
    });

    // Only create activity log entries and notifications for successful per-item accesses.
    // Failed PIN attempts (verified=false) are audit-only — no owner notification.
    if (args.verified && args.vaultItemId) {
      const [vaultItem, trip] = await Promise.all([
        ctx.db.get(args.vaultItemId),
        ctx.db.get(args.tripId),
      ]);

      if (vaultItem && trip) {
        const property = await ctx.db.get(trip.propertyId);
        if (property) {
          const sitterDisplay = args.sitterName ?? args.sitterPhone;
          const timeStr = new Date(accessedAt).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          });
          const message = `${sitterDisplay} accessed your ${vaultItem.label} at ${timeStr}`;

          // Insert activity log entry for the owner's activity feed
          await ctx.db.insert("activityLog", {
            tripId: args.tripId,
            propertyId: trip.propertyId,
            event: "vault_accessed",
            sitterName: args.sitterName,
            vaultItemId: args.vaultItemId,
            vaultItemLabel: vaultItem.label,
            createdAt: accessedAt,
          });

          // Schedule push notification to the property owner.
          // Deep-links to the dashboard activity feed so the owner can review vault access.
          await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
            userId: property.ownerId,
            tripId: args.tripId,
            message,
            deepLinkUrl: "/dashboard",
          });
        }
      }
    }

    return null;
  },
});

// Get the vault access log for a trip — restricted to the property owner.
// Accepts userId for ownership verification (custom auth pattern: client passes userId
// from their session, server verifies it matches property.ownerId).
// Returns entries newest-first (by accessedAt desc) for the audit view.
export const getVaultAccessLog = query({
  args: {
    tripId: v.id("trips"),
    userId: v.id("users"),
  },
  returns: v.array(vaultAccessLogEntry),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Trip not found" });
    }
    const property = await ctx.db.get(trip.propertyId);
    if (!property) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });
    }
    if (property.ownerId !== args.userId) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Not authorized to view vault access log",
      });
    }
    return await ctx.db
      .query("vaultAccessLog")
      .withIndex("by_trip_accessed", (q) => q.eq("tripId", args.tripId))
      .order("desc")
      .collect();
  },
});
