import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

/**
 * Record the sitter's first open of a trip link.
 *
 * Callable without authentication — designed for the unauthenticated sitter view.
 * Best-effort: errors are swallowed so a failed notification never breaks the page.
 *
 * Deduplication:
 *  - Client-side: caller should gate on sessionStorage before invoking.
 *  - Server-side: checks activityLog for an existing link_opened event for this trip.
 *
 * Side effects (on first open only):
 *  1. Inserts a link_opened entry into the activity log.
 *  2. Schedules a push notification to the property owner.
 */
export const recordFirstOpen = action({
  args: {
    tripId: v.id("trips"),
    sitterName: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try {
      // 1. Server-side dedup: skip if link_opened already logged for this trip
      const alreadyOpened = await ctx.runQuery(
        internal.activityLog._checkFirstOpen,
        { tripId: args.tripId },
      );
      if (alreadyOpened) return null;

      // 2. Fetch trip for propertyId
      const trip = await ctx.runQuery(internal.trips._getById, {
        tripId: args.tripId,
      });
      if (!trip) return null;

      // 3. Resolve sitter name: caller-provided > first registered sitter > fallback
      let sitterName = args.sitterName;
      if (!sitterName) {
        const sitters = await ctx.runQuery(internal.sitters._listByTrip, {
          tripId: args.tripId,
        });
        sitterName = sitters[0]?.name ?? "Someone";
      }

      // 4. Log the link_opened event to the activity feed
      await ctx.runMutation(internal.activityLog.logEvent, {
        tripId: args.tripId,
        propertyId: trip.propertyId,
        eventType: "link_opened",
        sitterName,
      });

      // 5. Fetch property for ownerId
      const property = await ctx.runQuery(internal.properties._getById, {
        propertyId: trip.propertyId,
      });
      if (!property) return null;

      // 6. Schedule push notification to the property owner (if linkOpened enabled)
      const prefs = await ctx.runQuery(
        internal.users.getNotificationPreferences,
        { userId: property.ownerId },
      );
      if (prefs.linkOpened) {
        await ctx.scheduler.runAfter(
          0,
          internal.notifications.sendPushNotification,
          {
            userId: property.ownerId,
            tripId: args.tripId,
            message: `${sitterName} opened your Handoff`,
            deepLinkUrl: "/dashboard",
          },
        );
      }
    } catch (err) {
      console.error("[sitterActions] recordFirstOpen error:", err);
    }
    return null;
  },
});
