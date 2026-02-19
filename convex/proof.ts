import { query } from "./_generated/server";
import { v } from "convex/values";

const timeSlotValidator = v.union(
  v.literal("morning"),
  v.literal("afternoon"),
  v.literal("evening"),
  v.literal("anytime"),
);

const taskItemValidator = v.object({
  id: v.string(),
  text: v.string(),
  timeSlot: timeSlotValidator,
  proofRequired: v.boolean(),
  type: v.union(v.literal("recurring"), v.literal("overlay")),
  sectionTitle: v.optional(v.string()),
});

export const getTasksForTrip = query({
  args: { tripId: v.id("trips") },
  returns: v.array(taskItemValidator),
  handler: async (ctx, args) => {
    const trip = await ctx.db.get(args.tripId);
    if (!trip) return [];

    // Get all manual sections for this property (sorted)
    const sections = await ctx.db
      .query("manualSections")
      .withIndex("by_property_sort", (q) =>
        q.eq("propertyId", trip.propertyId),
      )
      .order("asc")
      .collect();

    // Collect recurring instructions from each section
    const recurringTasks: Array<{
      id: string;
      text: string;
      timeSlot: "morning" | "afternoon" | "evening" | "anytime";
      proofRequired: boolean;
      type: "recurring";
      sectionTitle: string;
    }> = [];

    for (const section of sections) {
      const instructions = await ctx.db
        .query("instructions")
        .withIndex("by_section_sort", (q) => q.eq("sectionId", section._id))
        .order("asc")
        .collect();

      for (const instr of instructions) {
        if (instr.isRecurring) {
          recurringTasks.push({
            id: instr._id,
            text: instr.text,
            timeSlot: instr.timeSlot,
            proofRequired: instr.proofRequired,
            type: "recurring",
            sectionTitle: section.title,
          });
        }
      }
    }

    // Get overlay items for this trip
    const overlayItems = await ctx.db
      .query("overlayItems")
      .withIndex("by_trip_date", (q) => q.eq("tripId", args.tripId))
      .collect();

    const overlayTasks = overlayItems.map((item) => ({
      id: item._id as string,
      text: item.text,
      timeSlot: item.timeSlot,
      proofRequired: item.proofRequired,
      type: "overlay" as const,
      sectionTitle: undefined,
    }));

    return [...recurringTasks, ...overlayTasks];
  },
});
