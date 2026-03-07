/**
 * Sitter SMS reminder queries and mutations — runs in Convex V8 runtime.
 *
 * Separated from sitterSms.ts (which uses "use node" for Twilio) so these
 * can be called as internal queries/mutations from actions and crons.
 */

import {
  query,
  mutation,
  internalQuery,
  internalMutation,
} from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

// ── Auto-suggest algorithm ──────────────────────────────────────────────────

/**
 * Given a sorted list of task times (HH:mm), cluster them and return up to 3
 * suggested reminder times, each 30 min before the earliest task in a cluster.
 *
 * Clustering: tasks within 60 min of each other belong to the same cluster.
 * We pick the top 3 clusters by task count, then set reminder = 30 min before
 * the cluster's earliest task (clamped to 04:30 minimum).
 */
function suggestReminderTimes(taskTimes: string[]): string[] {
  if (taskTimes.length === 0) return [];

  const sorted = [...taskTimes].sort();
  const clusters: { earliest: string; count: number }[] = [];
  let current = { earliest: sorted[0], count: 1 };

  for (let i = 1; i < sorted.length; i++) {
    const prevMin = toMinutes(sorted[i - 1]);
    const currMin = toMinutes(sorted[i]);
    if (currMin - prevMin <= 60) {
      current.count++;
    } else {
      clusters.push(current);
      current = { earliest: sorted[i], count: 1 };
    }
  }
  clusters.push(current);

  // Take up to 3 clusters, prioritized by count then earliest time
  const top = clusters
    .sort((a, b) => b.count - a.count || a.earliest.localeCompare(b.earliest))
    .slice(0, 3);

  // Convert to reminder times (30 min before), sorted chronologically
  return top
    .map((c) => {
      const mins = Math.max(toMinutes(c.earliest) - 30, 4 * 60 + 30); // 4:30 AM minimum
      return fromMinutes(mins);
    })
    .sort();
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number): number extends never ? never : string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// ── Public queries (called from sitter UI) ──────────────────────────────────

/**
 * Get SMS preferences for the current sitter on a trip.
 * Returns null if the sitter hasn't opted in.
 */
export const getPreferences = query({
  args: { tripId: v.id("trips") },
  returns: v.any(),
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("sitterSmsPreferences")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    return all.filter((p) => p.smsConsent);
  },
});

/**
 * Get suggested reminder times for a trip based on today's timed tasks.
 * Returns an object with suggested times and per-task breakdown.
 */
export const getSuggestedTimes = query({
  args: {
    tripId: v.id("trips"),
    today: v.string(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) return null;

    // Get recurring instructions (timed only)
    const sections = await ctx.db
      .query("manualSections")
      .withIndex("by_property_sort", (q) =>
        q.eq("propertyId", trip.propertyId),
      )
      .collect();

    const taskSections = sections.filter(
      (s) => (s.visibility ?? "both") !== "manual",
    );

    const instructionsPerSection = await Promise.all(
      taskSections.map((section) =>
        ctx.db
          .query("instructions")
          .withIndex("by_section_sort", (q) =>
            q.eq("sectionId", section._id),
          )
          .order("asc")
          .collect(),
      ),
    );

    const allInstructions = instructionsPerSection.flat();

    // Get overlay items for today
    const overlayItems = await ctx.db
      .query("overlayItems")
      .withIndex("by_trip_date", (q) => q.eq("tripId", args.tripId))
      .collect();

    const todayOverlays = overlayItems.filter(
      (item) => item.date === args.today || item.date === undefined,
    );

    // Collect all timed tasks
    const timedTasks: { time: string; text: string }[] = [];
    for (const inst of allInstructions) {
      if (inst.specificTime && inst.timeSlot !== "anytime") {
        timedTasks.push({ time: inst.specificTime, text: inst.text });
      }
    }
    for (const item of todayOverlays) {
      if (item.specificTime && item.timeSlot !== "anytime") {
        timedTasks.push({ time: item.specificTime, text: item.text });
      }
    }

    const taskTimes = timedTasks.map((t) => t.time);
    const suggested = suggestReminderTimes(taskTimes);

    return {
      suggested,
      totalTimedTasks: timedTasks.length,
      tasks: timedTasks
        .sort((a, b) => a.time.localeCompare(b.time))
        .map((t) => ({ time: t.time, text: t.text })),
    };
  },
});

// ── Public mutations (called from sitter UI) ─────────────────────────────────

/**
 * Update reminder times (up to 3 HH:mm strings).
 */
export const updatePreferences = mutation({
  args: {
    prefsId: v.id("sitterSmsPreferences"),
    reminderTimes: v.optional(v.array(v.string())),
    timezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const updates: Record<string, unknown> = {};
    if (args.reminderTimes !== undefined) {
      updates.reminderTimes = args.reminderTimes.slice(0, 3).sort();
    }
    if (args.timezone !== undefined) {
      updates.timezone = args.timezone;
    }
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(args.prefsId, updates);
    }
    return null;
  },
});

/**
 * Opt out of SMS reminders (in-app toggle).
 */
export const optOut = mutation({
  args: { prefsId: v.id("sitterSmsPreferences") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.prefsId, { optedOutAt: Date.now(), optOutSource: "app" as const });
    return null;
  },
});

/**
 * Re-opt-in after opting out (clear optedOutAt).
 * Always allows re-enable — if the carrier block is still active,
 * the next send will get 21610 and auto-opt-out again.
 */
export const reOptIn = mutation({
  args: { prefsId: v.id("sitterSmsPreferences") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.prefsId, { optedOutAt: undefined, optOutSource: undefined });
    return null;
  },
});

// ── Internal queries (called from actions/crons) ─────────────────────────────

export const getPrefsById = internalQuery({
  args: { sitterId: v.id("sitters") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("sitterSmsPreferences")
      .withIndex("by_sitter", (q) => q.eq("sitterId", args.sitterId))
      .first();
  },
});

export const getActivePrefsForTrip = internalQuery({
  args: { tripId: v.id("trips") },
  handler: async (ctx, args) => {
    const all = await ctx.db
      .query("sitterSmsPreferences")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    return all.filter((p) => p.smsConsent && !p.optedOutAt);
  },
});

export const findSitterByPhone = internalQuery({
  args: { tripId: v.id("trips"), phone: v.string() },
  handler: async (ctx, args) => {
    const sitters = await ctx.db
      .query("sitters")
      .withIndex("by_trip", (q) => q.eq("tripId", args.tripId))
      .collect();
    const match = sitters.find((s) => s.phone === args.phone);
    return match ? { sitterId: match._id, name: match.name } : null;
  },
});

export const wasReminderSent = internalQuery({
  args: {
    tripId: v.id("trips"),
    sitterId: v.id("sitters"),
    date: v.string(),
    reminderTime: v.string(),
  },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("sitterSmsLog")
      .withIndex("by_trip_sitter_date", (q) =>
        q
          .eq("tripId", args.tripId)
          .eq("sitterId", args.sitterId)
          .eq("date", args.date),
      )
      .collect();
    return logs.some((l) => l.reminderTime === args.reminderTime);
  },
});

/**
 * Get all timed tasks for a trip on a given date, sorted chronologically.
 * Used by sendReminder to build the SMS body.
 */
export const getTimedTasksForDate = internalQuery({
  args: {
    tripId: v.id("trips"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) return [];

    const sections = await ctx.db
      .query("manualSections")
      .withIndex("by_property_sort", (q) =>
        q.eq("propertyId", trip.propertyId),
      )
      .collect();

    const taskSections = sections.filter(
      (s) => (s.visibility ?? "both") !== "manual",
    );

    const instructionsPerSection = await Promise.all(
      taskSections.map((section) =>
        ctx.db
          .query("instructions")
          .withIndex("by_section_sort", (q) =>
            q.eq("sectionId", section._id),
          )
          .order("asc")
          .collect(),
      ),
    );

    const allInstructions = instructionsPerSection.flat();

    const overlayItems = await ctx.db
      .query("overlayItems")
      .withIndex("by_trip_date", (q) => q.eq("tripId", args.tripId))
      .collect();

    const todayOverlays = overlayItems.filter(
      (item) => item.date === args.date || item.date === undefined,
    );

    type TaskInfo = {
      text: string;
      specificTime: string;
      specificTimeEnd?: string;
      taskRef: string;
    };
    const tasks: TaskInfo[] = [];

    for (const inst of allInstructions) {
      if (inst.specificTime && inst.timeSlot !== "anytime") {
        tasks.push({
          text: inst.text,
          specificTime: inst.specificTime,
          specificTimeEnd: inst.specificTimeEnd,
          taskRef: `recurring:${inst._id}:${args.date}`,
        });
      }
    }
    for (const item of todayOverlays) {
      if (item.specificTime && item.timeSlot !== "anytime") {
        tasks.push({
          text: item.text,
          specificTime: item.specificTime,
          specificTimeEnd: item.specificTimeEnd,
          taskRef: `overlay:${item._id}`,
        });
      }
    }

    return tasks.sort((a, b) =>
      a.specificTime.localeCompare(b.specificTime),
    );
  },
});

/**
 * Get anytime tasks for a trip on a given date (no specific time).
 * Used by sendReminder to mention incomplete anytime tasks in SMS.
 */
export const getAnytimeTasksForDate = internalQuery({
  args: {
    tripId: v.id("trips"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) return [];

    const sections = await ctx.db
      .query("manualSections")
      .withIndex("by_property_sort", (q) =>
        q.eq("propertyId", trip.propertyId),
      )
      .collect();

    const taskSections = sections.filter(
      (s) => (s.visibility ?? "both") !== "manual",
    );

    const instructionsPerSection = await Promise.all(
      taskSections.map((section) =>
        ctx.db
          .query("instructions")
          .withIndex("by_section_sort", (q) =>
            q.eq("sectionId", section._id),
          )
          .order("asc")
          .collect(),
      ),
    );

    const allInstructions = instructionsPerSection.flat();

    const overlayItems = await ctx.db
      .query("overlayItems")
      .withIndex("by_trip_date", (q) => q.eq("tripId", args.tripId))
      .collect();

    const todayOverlays = overlayItems.filter(
      (item) => item.date === args.date || item.date === undefined,
    );

    type AnytimeTask = { text: string; taskRef: string };
    const tasks: AnytimeTask[] = [];

    for (const inst of allInstructions) {
      if (inst.timeSlot === "anytime" || !inst.specificTime) {
        tasks.push({
          text: inst.text,
          taskRef: `recurring:${inst._id}:${args.date}`,
        });
      }
    }
    for (const item of todayOverlays) {
      if (item.timeSlot === "anytime" || !item.specificTime) {
        tasks.push({
          text: item.text,
          taskRef: `overlay:${item._id}`,
        });
      }
    }

    return tasks;
  },
});

/**
 * Get today's task completions for a trip (used by sendReminder to skip done tasks).
 */
export const getCompletionsForDate = internalQuery({
  args: {
    tripId: v.id("trips"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    return ctx.db
      .query("taskCompletions")
      .withIndex("by_trip_date", (q) =>
        q.eq("tripId", args.tripId).eq("date", args.date),
      )
      .collect();
  },
});

/**
 * Get default reminder times for each block (used by optIn action).
 */
export const getDefaultReminderTimes = internalQuery({
  args: { tripId: v.id("trips"), date: v.string() },
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) return { suggested: [] };

    const sections = await ctx.db
      .query("manualSections")
      .withIndex("by_property_sort", (q) =>
        q.eq("propertyId", trip.propertyId),
      )
      .collect();

    const taskSections = sections.filter(
      (s) => (s.visibility ?? "both") !== "manual",
    );

    const instructionsPerSection = await Promise.all(
      taskSections.map((section) =>
        ctx.db
          .query("instructions")
          .withIndex("by_section_sort", (q) =>
            q.eq("sectionId", section._id),
          )
          .collect(),
      ),
    );

    const allInstructions = instructionsPerSection.flat();

    const overlayItems = await ctx.db
      .query("overlayItems")
      .withIndex("by_trip_date", (q) => q.eq("tripId", args.tripId))
      .collect();

    const todayOverlays = overlayItems.filter(
      (item) => item.date === args.date || item.date === undefined,
    );

    const taskTimes: string[] = [];
    for (const task of [...allInstructions, ...todayOverlays]) {
      if (task.specificTime && task.timeSlot !== "anytime") {
        taskTimes.push(task.specificTime);
      }
    }

    return { suggested: suggestReminderTimes(taskTimes) };
  },
});

// ── Internal mutations ───────────────────────────────────────────────────────

export const upsertPreferences = internalMutation({
  args: {
    sitterId: v.id("sitters"),
    tripId: v.id("trips"),
    phone: v.string(),
    timezone: v.string(),
    reminderTimes: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sitterSmsPreferences")
      .withIndex("by_sitter", (q) => q.eq("sitterId", args.sitterId))
      .first();

    const times = args.reminderTimes.slice(0, 3).sort();

    if (existing) {
      await ctx.db.patch(existing._id, {
        phone: args.phone,
        smsConsent: true,
        smsConsentAt: Date.now(),
        timezone: args.timezone,
        reminderTimes: times,
        optedOutAt: undefined,
      });
      return existing._id;
    }

    return await ctx.db.insert("sitterSmsPreferences", {
      sitterId: args.sitterId,
      tripId: args.tripId,
      phone: args.phone,
      smsConsent: true,
      smsConsentAt: Date.now(),
      timezone: args.timezone,
      reminderTimes: times,
    });
  },
});

/**
 * Polling cron — runs every 15 minutes. For each opted-in sitter, checks if any
 * reminder time has passed in the current window and hasn't been sent yet.
 * No pre-scheduling needed — dedup via sitterSmsLog makes this idempotent.
 */
export const checkAndSendReminders = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const allPrefs = await ctx.db.query("sitterSmsPreferences").collect();
    const active = allPrefs.filter((p) => p.smsConsent && !p.optedOutAt);

    for (const prefs of active) {
      const trip = await ctx.db.get(prefs.tripId);
      if (!trip || trip.status !== "active") continue;

      // Get today's date in the sitter's timezone
      const sitterToday = getDateInTimezone(now, prefs.timezone);
      if (sitterToday < trip.startDate || sitterToday > trip.endDate) continue;

      // Get current local time in sitter's timezone as HH:mm
      const sitterNow = getTimeInTimezone(now, prefs.timezone);

      // Check each reminder time — if it's at or before now, it's due
      for (const time of prefs.reminderTimes) {
        if (time <= sitterNow) {
          // Due — check dedup log before dispatching
          const logs = await ctx.db
            .query("sitterSmsLog")
            .withIndex("by_trip_sitter_date", (q) =>
              q
                .eq("tripId", prefs.tripId)
                .eq("sitterId", prefs.sitterId)
                .eq("date", sitterToday),
            )
            .collect();
          const alreadySent = logs.some((l) => l.reminderTime === time);
          if (!alreadySent) {
            // Write log FIRST (transactional) to prevent race condition
            await ctx.db.insert("sitterSmsLog", {
              tripId: prefs.tripId,
              sitterId: prefs.sitterId,
              reminderTime: time,
              date: sitterToday,
              sentAt: Date.now(),
              taskCount: 0,
            });
            await ctx.scheduler.runAfter(0, internal.sitterSms.sendReminder, {
              sitterId: prefs.sitterId,
              tripId: prefs.tripId,
              date: sitterToday,
              reminderTime: time,
            });
          }
        }
      }

      // Trip start SMS — due at 8:00 AM sitter local on start date
      if (sitterToday === trip.startDate && sitterNow >= "08:00") {
        const logs = await ctx.db
          .query("sitterSmsLog")
          .withIndex("by_trip_sitter_date", (q) =>
            q
              .eq("tripId", prefs.tripId)
              .eq("sitterId", prefs.sitterId)
              .eq("date", sitterToday),
          )
          .collect();
        if (!logs.some((l) => l.reminderTime === "trip_start")) {
          await ctx.db.insert("sitterSmsLog", {
            tripId: prefs.tripId,
            sitterId: prefs.sitterId,
            reminderTime: "trip_start",
            date: sitterToday,
            sentAt: Date.now(),
            taskCount: 0,
          });
          await ctx.scheduler.runAfter(0, internal.sitterSms.sendTripStartSms, {
            sitterId: prefs.sitterId,
            tripId: prefs.tripId,
            date: sitterToday,
          });
        }
      }

      // Trip ending SMS — due at 9:00 AM sitter local on day before end
      const [ey, em, ed] = trip.endDate.split("-").map(Number);
      const dayBeforeEnd = new Date(Date.UTC(ey, em - 1, ed - 1))
        .toISOString()
        .split("T")[0];
      if (sitterToday === dayBeforeEnd && sitterNow >= "09:00") {
        const logs = await ctx.db
          .query("sitterSmsLog")
          .withIndex("by_trip_sitter_date", (q) =>
            q
              .eq("tripId", prefs.tripId)
              .eq("sitterId", prefs.sitterId)
              .eq("date", sitterToday),
          )
          .collect();
        if (!logs.some((l) => l.reminderTime === "trip_ending")) {
          await ctx.db.insert("sitterSmsLog", {
            tripId: prefs.tripId,
            sitterId: prefs.sitterId,
            reminderTime: "trip_ending",
            date: sitterToday,
            sentAt: Date.now(),
            taskCount: 0,
          });
          await ctx.scheduler.runAfter(0, internal.sitterSms.sendTripEndingSms, {
            sitterId: prefs.sitterId,
            tripId: prefs.tripId,
            date: sitterToday,
          });
        }
      }
    }
  },
});

/** Get the current date (YYYY-MM-DD) in a given timezone. */
function getDateInTimezone(nowMs: number, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(nowMs));
}

/** Get the current time (HH:mm) in a given timezone. */
function getTimeInTimezone(nowMs: number, timezone: string): string {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return formatter.format(new Date(nowMs));
}

/**
 * Opt out by phone number — used by Twilio STOP webhook and 21610 error handling.
 */
export const optOutByPhone = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const allPrefs = await ctx.db.query("sitterSmsPreferences").collect();
    const matching = allPrefs.filter(
      (p) => p.phone === args.phone && p.smsConsent && !p.optedOutAt,
    );
    for (const prefs of matching) {
      await ctx.db.patch(prefs._id, { optedOutAt: Date.now(), optOutSource: "carrier" as const });
    }
    return matching.length;
  },
});

/**
 * Re-opt-in by phone number — used by Twilio START webhook.
 * Clears optedOutAt so the cron resumes sending reminders.
 */
export const optInByPhone = internalMutation({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    const allPrefs = await ctx.db.query("sitterSmsPreferences").collect();
    const matching = allPrefs.filter(
      (p) => p.phone === args.phone && p.smsConsent && !!p.optedOutAt,
    );
    for (const prefs of matching) {
      await ctx.db.patch(prefs._id, { optedOutAt: undefined, optOutSource: undefined });
    }
    return matching.length;
  },
});
