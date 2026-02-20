"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import webpush from "web-push";

function configureVapid() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:hello@handoff.app";
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

/**
 * Send a web push notification to a property owner.
 *
 * Looks up the stored PushSubscription for the user and dispatches a push
 * via the Web Push Protocol using VAPID auth. If no subscription is found
 * (permission denied or not yet requested) the notification is silently
 * skipped — it will still appear in the in-app activity feed.
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
  handler: async (ctx, args): Promise<null> => {
    const subscriptionJson = await ctx.runQuery(
      internal.users.getPushSubscription,
      { userId: args.userId },
    );

    if (!subscriptionJson) {
      // No push subscription — notification only appears in-app activity feed
      return null;
    }

    if (!configureVapid()) {
      console.warn("[Push] VAPID keys not configured — skipping push");
      return null;
    }

    const subscription = JSON.parse(
      subscriptionJson,
    ) as webpush.PushSubscription;
    const payload = JSON.stringify({
      title: "Handoff",
      body: args.message,
      url: args.deepLinkUrl,
    });

    try {
      await webpush.sendNotification(subscription, payload);
    } catch (err: unknown) {
      const statusCode =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode: number }).statusCode
          : 0;
      if (statusCode === 410 || statusCode === 404) {
        // Subscription expired or unsubscribed — remove it
        await ctx.runMutation(internal.users.clearPushSubscription, {
          userId: args.userId,
        });
      } else {
        console.error("[Push] Failed to send notification:", err);
      }
    }

    return null;
  },
});
