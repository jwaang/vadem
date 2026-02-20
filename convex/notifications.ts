"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import webpush from "web-push";

/** Format a Unix ms timestamp as 12-hour time, e.g. "7:12 AM" */
function formatTime12h(ms: number): string {
  const d = new Date(ms);
  let hours = d.getHours();
  const minutes = d.getMinutes();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  const mm = String(minutes).padStart(2, "0");
  return `${hours}:${mm} ${ampm}`;
}

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

/**
 * Send a push notification when a sitter completes a task.
 *
 * Reads the owner's notificationPreference and acts accordingly:
 *  - 'all': send immediately for every completion
 *  - 'proof-only': send only when a proof photo is attached
 *  - 'digest': schedule one batched summary per hour (deduplicated via pendingDigestAt)
 *  - 'off': skip entirely
 *
 * Message format:
 *  - No proof: "Sarah completed morning feeding"
 *  - With proof: "Sarah completed morning feeding with photo at 7:12 AM"
 */
export const sendTaskNotification = internalAction({
  args: {
    tripId: v.id("trips"),
    taskTitle: v.string(),
    sitterName: v.string(),
    proofPhotoUrl: v.optional(v.string()),
    completedAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    // Resolve trip → property → owner
    const trip = await ctx.runQuery(internal.trips._getById, {
      tripId: args.tripId,
    });
    if (!trip) return null;

    const property = await ctx.runQuery(internal.properties._getById, {
      propertyId: trip.propertyId,
    });
    if (!property) return null;

    const userId = property.ownerId;

    // Read notification preference (defaults to 'all' when unset)
    const pref = await ctx.runQuery(internal.users.getNotificationPreference, {
      userId,
    });

    if (pref === "off") return null;

    // Build notification message
    const displayName = args.sitterName || "Someone";
    const time = formatTime12h(args.completedAt);
    const message = args.proofPhotoUrl
      ? `${displayName} completed ${args.taskTitle} with photo at ${time}`
      : `${displayName} completed ${args.taskTitle}`;
    const deepLinkUrl = "/dashboard";

    if (pref === "all") {
      await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
        userId,
        tripId: args.tripId,
        message,
        deepLinkUrl,
      });
    } else if (pref === "proof-only") {
      if (args.proofPhotoUrl) {
        await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
          userId,
          tripId: args.tripId,
          message,
          deepLinkUrl,
        });
      }
    } else if (pref === "digest") {
      // Schedule a single digest notification at the top of the next hour.
      // _schedulePendingDigest atomically checks whether one is already pending
      // for this hour window so we never double-schedule.
      const hourStart = Math.floor(args.completedAt / 3_600_000) * 3_600_000;
      const nextHourStart = hourStart + 3_600_000;

      const shouldSchedule = await ctx.runMutation(
        internal.trips._schedulePendingDigest,
        { tripId: args.tripId, nextHourStart },
      );

      if (shouldSchedule) {
        await ctx.scheduler.runAt(
          nextHourStart,
          internal.notifications.sendDigestNotification,
          {
            tripId: args.tripId,
            userId,
            windowStart: hourStart,
            windowEnd: nextHourStart,
          },
        );
      }
    }

    return null;
  },
});

/**
 * Scheduled digest: collects all task completions in [windowStart, windowEnd)
 * and sends one batched push notification to the owner.
 *
 * Fires at the top of the hour following the window.
 * Example: "3 tasks completed since 7:00 AM"
 */
/**
 * Scheduled notification fired 24 hours before a trip's end date.
 *
 * Verifies the trip is still active (or draft) before sending.
 * If the trip was cancelled or already expired, the notification is skipped.
 *
 * Message: "Your trip ends tomorrow. Vault access will expire automatically."
 */
export const sendTripEndingSoonNotification = internalAction({
  args: { tripId: v.id("trips") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const trip = await ctx.runQuery(internal.trips._getById, {
      tripId: args.tripId,
    });
    if (!trip || (trip.status !== "active" && trip.status !== "draft")) {
      return null;
    }

    const property = await ctx.runQuery(internal.properties._getById, {
      propertyId: trip.propertyId,
    });
    if (!property) return null;

    const userId = property.ownerId;

    // Check if owner has tripEnding notifications enabled (default: true)
    const prefs = await ctx.runQuery(internal.users.getNotificationPreferences, {
      userId,
    });
    if (!prefs.tripEnding) return null;

    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      userId,
      tripId: args.tripId,
      message:
        "Your trip ends tomorrow. Vault access will expire automatically.",
      deepLinkUrl: "/dashboard",
    });

    return null;
  },
});

export const sendDigestNotification = internalAction({
  args: {
    tripId: v.id("trips"),
    userId: v.id("users"),
    windowStart: v.number(),
    windowEnd: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    // Count completions in the window
    const count = await ctx.runQuery(
      internal.taskCompletions._countInWindow,
      {
        tripId: args.tripId,
        windowStart: args.windowStart,
        windowEnd: args.windowEnd,
      },
    );

    // Clear pending flag regardless of count so new completions can schedule fresh
    await ctx.runMutation(internal.trips._clearPendingDigestAt, {
      tripId: args.tripId,
    });

    if (count === 0) return null;

    const taskWord = count === 1 ? "task" : "tasks";
    const since = formatTime12h(args.windowStart);
    const message = `${count} ${taskWord} completed since ${since}`;

    await ctx.scheduler.runAfter(0, internal.notifications.sendPushNotification, {
      userId: args.userId,
      tripId: args.tripId,
      message,
      deepLinkUrl: "/dashboard",
    });

    return null;
  },
});
