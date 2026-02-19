// Today View composed query — returns everything needed for the sitter's landing page
import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Returns all data required to render the Today View for a given trip and date.
 * Merges recurring instructions (from manual sections) with trip overlay items.
 * Includes task completions so the UI can drive checked state.
 *
 * Overlay item inclusion logic:
 *   - `date === today`  → one-time task, show only today
 *   - `date === undefined` → daily task, show every day of the trip
 */
export const getTodayTasks = query({
  args: {
    tripId: v.id("trips"),
    today: v.string(), // "YYYY-MM-DD"
  },
  returns: v.any(),
  handler: async (ctx, { tripId, today }) => {
    const trip = await ctx.db.get(tripId);
    if (!trip) return null;

    // Fetch top-level data in parallel
    const [property, sitters, emergencyContacts, allSections, allOverlayItems, allCompletions] =
      await Promise.all([
        ctx.db.get(trip.propertyId),
        ctx.db
          .query("sitters")
          .withIndex("by_trip", (q) => q.eq("tripId", tripId))
          .collect(),
        ctx.db
          .query("emergencyContacts")
          .withIndex("by_property_sort", (q) => q.eq("propertyId", trip.propertyId))
          .order("asc")
          .collect(),
        ctx.db
          .query("manualSections")
          .withIndex("by_property_sort", (q) => q.eq("propertyId", trip.propertyId))
          .order("asc")
          .collect(),
        // Fetch all overlay items for the trip; filter by date in JS
        // (index on tripId alone avoids querying per-date twice)
        ctx.db
          .query("overlayItems")
          .withIndex("by_trip_date", (q) => q.eq("tripId", tripId))
          .collect(),
        // Fetch only today's completions — new day = implicit reset (no deletes needed)
        ctx.db
          .query("taskCompletions")
          .withIndex("by_trip_date", (q) => q.eq("tripId", tripId).eq("date", today))
          .collect(),
      ]);

    // Fetch instructions for every section in parallel (avoids N+1)
    const instructionsPerSection = await Promise.all(
      allSections.map((section) =>
        ctx.db
          .query("instructions")
          .withIndex("by_section_sort", (q) => q.eq("sectionId", section._id))
          .order("asc")
          .collect(),
      ),
    );

    // Only recurring instructions appear in the daily task list
    const recurringInstructions = instructionsPerSection.flat().filter((i) => i.isRecurring);

    // Overlay items visible today: explicit date match OR undated (everyday)
    const todayOverlayItems = allOverlayItems.filter(
      (item) => item.date === today || item.date === undefined,
    );

    // Tomorrow's date for the preview section
    const [year, month, day] = today.split("-").map(Number);
    const tomorrowObj = new Date(Date.UTC(year, month - 1, day + 1));
    const tomorrow = tomorrowObj.toISOString().split("T")[0];

    const tomorrowOverlayItems = allOverlayItems.filter(
      (item) => item.date === tomorrow || item.date === undefined,
    );

    return {
      trip,
      property,
      sitters,
      emergencyContacts,
      recurringInstructions,
      todayOverlayItems,
      tomorrow,
      tomorrowRecurringInstructions: recurringInstructions,
      tomorrowOverlayItems,
      completions: allCompletions,
    };
  },
});
