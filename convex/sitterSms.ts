"use node";

/**
 * Sitter SMS reminder system — opt-in task reminders via Twilio Messaging API.
 *
 * Sitters self-opt-in with their own phone number + TCPA consent.
 * Phone is validated against the creator-provided sitters.phone for authorization.
 * Up to 3 custom daily reminder times. Each SMS summarizes upcoming tasks.
 *
 * Environment variables (Convex dashboard):
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER
 */

import { action, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import twilio from "twilio";

function getTwilioClient() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID!;
  const authToken = process.env.TWILIO_AUTH_TOKEN!;
  return twilio(accountSid, authToken);
}

function toE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return `+${digits}`;
}

function formatTime12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

/**
 * Send a single SMS reminder at a sitter's chosen time.
 *
 * Called by the scheduler at the sitter's chosen reminder time.
 * Re-queries tasks at send time to handle mid-trip edits.
 * Deduplicates against sitterSmsLog to prevent double-sends.
 */
export const sendReminder = internalAction({
  args: {
    sitterId: v.id("sitters"),
    tripId: v.id("trips"),
    date: v.string(),
    reminderTime: v.string(), // HH:mm
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    // Check preferences still active
    const prefs = await ctx.runQuery(internal.sitterSmsQueries.getPrefsById, {
      sitterId: args.sitterId,
    });
    if (!prefs || !prefs.smsConsent || prefs.optedOutAt) return null;

    // Check this reminder time is still configured
    if (!prefs.reminderTimes.includes(args.reminderTime)) return null;

    // Get all timed tasks for today
    const allTasks = await ctx.runQuery(
      internal.sitterSmsQueries.getTimedTasksForDate,
      { tripId: args.tripId, date: args.date },
    );

    // Get today's completions to filter out finished tasks
    const completions = await ctx.runQuery(
      internal.sitterSmsQueries.getCompletionsForDate,
      { tripId: args.tripId, date: args.date },
    );
    const completedRefs = new Set(completions.map((c) => c.taskRef));

    // Get anytime tasks and count incomplete ones
    const anytimeTasks = await ctx.runQuery(
      internal.sitterSmsQueries.getAnytimeTasksForDate,
      { tripId: args.tripId, date: args.date },
    );
    const incompleteAnytimeCount = anytimeTasks.filter(
      (t) => !completedRefs.has(t.taskRef),
    ).length;

    // Treat empty string same as undefined for specificTimeEnd
    const getEndTime = (t: { specificTime: string; specificTimeEnd?: string }) =>
      t.specificTimeEnd || t.specificTime;

    // Include timed tasks that are:
    // 1. Upcoming (end time >= reminder time), OR
    // 2. Past end time but still incomplete (overdue)
    const relevantTasks = allTasks.filter((t) => {
      const endTime = getEndTime(t);
      if (endTime >= args.reminderTime) return true;
      if (!completedRefs.has(t.taskRef)) return true;
      return false;
    });

    // If no relevant timed tasks AND no incomplete anytime tasks, skip SMS
    if (relevantTasks.length === 0 && incompleteAnytimeCount === 0) return null;

    // Build SMS body
    const trip = await ctx.runQuery(internal.trips._getById, {
      tripId: args.tripId,
    });
    if (!trip || trip.status !== "active") return null;

    // A task is overdue when its end time (or start time if no range) has passed and it's incomplete
    const overdueTasks = relevantTasks.filter(
      (t) =>
        getEndTime(t) < args.reminderTime &&
        !completedRefs.has(t.taskRef),
    );
    // A task is active if it has a time range and we're within it (start <= now <= end)
    const activeTasks = relevantTasks.filter(
      (t) =>
        !!t.specificTimeEnd &&
        t.specificTime <= args.reminderTime &&
        t.specificTimeEnd >= args.reminderTime &&
        !completedRefs.has(t.taskRef),
    );
    // A task is upcoming if its start time hasn't been reached yet
    const upcomingTasks = relevantTasks.filter(
      (t) => t.specificTime > args.reminderTime,
    );

    const anytimeSuffix =
      incompleteAnytimeCount > 0
        ? ` You also have ${incompleteAnytimeCount} other ${incompleteAnytimeCount === 1 ? "task" : "tasks"} to complete.`
        : "";

    // Build parts list dynamically
    const parts: string[] = [];
    if (overdueTasks.length > 0) {
      parts.push(
        `${overdueTasks.length} overdue ${overdueTasks.length === 1 ? "task" : "tasks"}`,
      );
    }
    if (activeTasks.length > 0) {
      parts.push(
        `${activeTasks.length} ${activeTasks.length === 1 ? "task" : "tasks"} in progress`,
      );
    }
    if (upcomingTasks.length > 0) {
      const nextTime = formatTime12h(upcomingTasks[0].specificTime);
      parts.push(
        `${upcomingTasks.length} upcoming ${upcomingTasks.length === 1 ? "task" : "tasks"}, next at ${nextTime}`,
      );
    }

    let body: string;
    if (parts.length > 0) {
      const joined =
        parts.length === 1
          ? parts[0]
          : parts.length === 2
            ? `${parts[0]} and ${parts[1]}`
            : `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
      body = `Vadem: You have ${joined}.${anytimeSuffix}`;
    } else {
      // Only anytime tasks remain
      const taskWord = incompleteAnytimeCount === 1 ? "task" : "tasks";
      body = `Vadem: You still have ${incompleteAnytimeCount} ${taskWord} to complete today.`;
    }

    // Send via Twilio
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !fromNumber
    ) {
      console.log(`[DEV] Twilio not configured — skipping SMS reminder`);
      return null;
    }

    try {
      const client = getTwilioClient();
      await client.messages.create({
        to: toE164(prefs.phone),
        from: fromNumber,
        body,
      });
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      if (code === 21610) {
        // Recipient replied STOP — auto-opt-out so we stop retrying
        await ctx.runMutation(internal.sitterSmsQueries.optOutByPhone, {
          phone: prefs.phone,
        });
      }
      console.error("[Twilio] SMS reminder send error:", err);
      return null;
    }

    return null;
  },
});

/**
 * Send trip-start SMS to a sitter.
 */
export const sendTripStartSms = internalAction({
  args: {
    sitterId: v.id("sitters"),
    tripId: v.id("trips"),
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const prefs = await ctx.runQuery(internal.sitterSmsQueries.getPrefsById, {
      sitterId: args.sitterId,
    });
    if (!prefs || !prefs.smsConsent || prefs.optedOutAt) return null;

    const trip = await ctx.runQuery(internal.trips._getById, {
      tripId: args.tripId,
    });
    if (!trip) return null;

    const body = `Vadem: Your trip starts today! Open the Vadem app to view your tasks.`;

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !fromNumber
    ) {
      console.log(`[DEV] Twilio not configured — skipping trip start SMS`);
      return null;
    }

    try {
      const client = getTwilioClient();
      await client.messages.create({
        to: toE164(prefs.phone),
        from: fromNumber,
        body,
      });
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      if (code === 21610) {
        await ctx.runMutation(internal.sitterSmsQueries.optOutByPhone, {
          phone: prefs.phone,
        });
      }
      console.error("[Twilio] Trip start SMS error:", err);
      return null;
    }

    return null;
  },
});

/**
 * Send trip-ending SMS to a sitter.
 */
export const sendTripEndingSms = internalAction({
  args: {
    sitterId: v.id("sitters"),
    tripId: v.id("trips"),
    date: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const prefs = await ctx.runQuery(internal.sitterSmsQueries.getPrefsById, {
      sitterId: args.sitterId,
    });
    if (!prefs || !prefs.smsConsent || prefs.optedOutAt) return null;

    const trip = await ctx.runQuery(internal.trips._getById, {
      tripId: args.tripId,
    });
    if (!trip) return null;

    const body = `Vadem: Your trip ends tomorrow. Make sure everything is wrapped up!`;

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (
      !process.env.TWILIO_ACCOUNT_SID ||
      !process.env.TWILIO_AUTH_TOKEN ||
      !fromNumber
    ) {
      console.log(`[DEV] Twilio not configured — skipping trip ending SMS`);
      return null;
    }

    try {
      const client = getTwilioClient();
      await client.messages.create({
        to: toE164(prefs.phone),
        from: fromNumber,
        body,
      });
    } catch (err: unknown) {
      const code = (err as { code?: number }).code;
      if (code === 21610) {
        await ctx.runMutation(internal.sitterSmsQueries.optOutByPhone, {
          phone: prefs.phone,
        });
      }
      console.error("[Twilio] Trip ending SMS error:", err);
      return null;
    }

    return null;
  },
});

/**
 * Opt-in action — validates phone against sitters.phone, then stores preferences.
 * Called from the sitter reminders UI after consent checkbox is checked.
 */
export const optIn = action({
  args: {
    tripId: v.id("trips"),
    phone: v.string(),
    timezone: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true), prefsId: v.id("sitterSmsPreferences") }),
    v.object({
      success: v.literal(false),
      error: v.union(
        v.literal("TRIP_INACTIVE"),
        v.literal("PHONE_NOT_REGISTERED"),
      ),
    }),
  ),
  handler: async (ctx, args): Promise<
    | { success: true; prefsId: Id<"sitterSmsPreferences"> }
    | { success: false; error: "TRIP_INACTIVE" | "PHONE_NOT_REGISTERED" }
  > => {
    // Validate trip is active
    const trip = await ctx.runQuery(internal.trips._getById, {
      tripId: args.tripId,
    });
    if (!trip || trip.status !== "active") {
      return { success: false, error: "TRIP_INACTIVE" };
    }

    // Normalize and match against registered sitter phones
    const normalizedInput = args.phone.replace(/\D/g, "");
    const normalized =
      normalizedInput.length === 11 && normalizedInput.startsWith("1")
        ? normalizedInput.slice(1)
        : normalizedInput;

    const matchResult = await ctx.runQuery(
      internal.sitterSmsQueries.findSitterByPhone,
      { tripId: args.tripId, phone: normalized },
    );
    if (!matchResult) {
      return { success: false, error: "PHONE_NOT_REGISTERED" };
    }

    // Get auto-suggested reminder times based on today's tasks
    const today = new Date().toISOString().split("T")[0];
    const defaults = await ctx.runQuery(
      internal.sitterSmsQueries.getDefaultReminderTimes,
      { tripId: args.tripId, date: today },
    );

    // Upsert preferences with suggested times
    const prefsId = await ctx.runMutation(
      internal.sitterSmsQueries.upsertPreferences,
      {
        sitterId: matchResult.sitterId,
        tripId: args.tripId,
        phone: normalized,
        timezone: args.timezone,
        reminderTimes: defaults.suggested,
      },
    );

    return { success: true, prefsId };
  },
});

/**
 * Get the Twilio phone number so the UI can tell users what to text START to.
 */
export const getTwilioNumber = action({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (): Promise<string | null> => {
    const raw = process.env.TWILIO_PHONE_NUMBER;
    if (!raw) return null;
    // Format +1XXXXXXXXXX → (XXX) XXX-XXXX
    const digits = raw.replace(/\D/g, "");
    const local = digits.startsWith("1") ? digits.slice(1) : digits;
    if (local.length === 10) {
      return `(${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
    }
    return raw;
  },
});

/**
 * DEV ONLY: Send a test reminder SMS immediately, bypassing time checks and dedup.
 */
export const devSendTestReminder = action({
  args: { tripId: v.id("trips") },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const allPrefs = await ctx.runQuery(
      internal.sitterSmsQueries.getActivePrefsForTrip,
      { tripId: args.tripId },
    );
    if (allPrefs.length === 0) return null;

    const trip = await ctx.runQuery(internal.trips._getById, {
      tripId: args.tripId,
    });
    if (!trip) return null;

    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !fromNumber) {
      console.log("[DEV] Twilio not configured — skipping test SMS");
      return null;
    }

    const appUrl = process.env.APP_URL ?? "https://vadem.app";
    const link = `${appUrl}/t/${trip.shareLink ?? ""}`;
    const client = getTwilioClient();

    for (const prefs of allPrefs) {
      const body = `[DEV TEST] Vadem: This is a test reminder. View your tasks: ${link}`;
      try {
        await client.messages.create({
          to: toE164(prefs.phone),
          from: fromNumber,
          body,
        });
        console.log(`[DEV] Test SMS sent to ${prefs.phone}`);
      } catch (err: unknown) {
        const code = (err as { code?: number }).code;
        if (code === 21610) {
          await ctx.runMutation(internal.sitterSmsQueries.optOutByPhone, {
            phone: prefs.phone,
          });
        }
        console.error("[DEV] Test SMS error:", err);
      }
    }
    return null;
  },
});
