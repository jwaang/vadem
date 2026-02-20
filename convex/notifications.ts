import { internalAction } from "./_generated/server";
import { v } from "convex/values";

/**
 * Send a push notification to a property owner.
 *
 * Stub implementation for US-053 — logs the notification to console.
 * US-070 will replace this with real Web Push API calls using VAPID keys
 * and stored push subscriptions (Epic 10 notification infrastructure).
 *
 * The deepLinkUrl payload links to the trip activity feed so the owner
 * can tap through to see the full vault access event in context.
 */
export const sendPushNotification = internalAction({
  args: {
    userId: v.id("users"),
    tripId: v.id("trips"),
    message: v.string(),
    deepLinkUrl: v.string(),
  },
  returns: v.null(),
  handler: async (_ctx, args): Promise<null> => {
    // TODO: US-070 — replace with real Web Push API calls
    // e.g., look up push subscription for userId, call web-push.sendNotification()
    console.log(
      `[Push Notification] user=${args.userId} trip=${args.tripId}: "${args.message}" → ${args.deepLinkUrl}`,
    );
    return null;
  },
});
