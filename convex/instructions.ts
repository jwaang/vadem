import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

const timeSlotValidator = v.union(
  v.literal("morning"),
  v.literal("afternoon"),
  v.literal("evening"),
  v.literal("anytime"),
);

/** Map an HH:mm time string to a slot bucket for grouping. */
function timeToSlot(time: string): "morning" | "afternoon" | "evening" {
  const [h] = time.split(":").map(Number);
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

export const create = mutation({
  args: {
    sectionId: v.id("manualSections"),
    text: v.string(),
    sortOrder: v.number(),
    timeSlot: timeSlotValidator,
    specificTime: v.optional(v.string()),
    isRecurring: v.boolean(),
    proofRequired: v.boolean(),
  },
  returns: v.id("instructions"),
  handler: async (ctx, args) => {
    // Auto-derive timeSlot from specificTime if provided
    const timeSlot = args.specificTime ? timeToSlot(args.specificTime) : args.timeSlot;
    const id = await ctx.db.insert("instructions", {
      sectionId: args.sectionId,
      text: args.text,
      sortOrder: args.sortOrder,
      timeSlot,
      specificTime: args.specificTime,
      isRecurring: args.isRecurring,
      proofRequired: args.proofRequired,
    });
    const section = await ctx.db.get(args.sectionId);
    if (section) {
      await ctx.scheduler.runAfter(0, internal.properties.bumpManualVersion, {
        propertyId: section.propertyId,
      });
    }
    return id;
  },
});

export const listBySection = query({
  args: { sectionId: v.id("manualSections") },
  returns: v.array(
    v.object({
      _id: v.id("instructions"),
      _creationTime: v.number(),
      sectionId: v.id("manualSections"),
      text: v.string(),
      sortOrder: v.number(),
      timeSlot: timeSlotValidator,
      specificTime: v.optional(v.string()),
      isRecurring: v.boolean(),
      proofRequired: v.boolean(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("instructions")
      .withIndex("by_section_sort", (q) => q.eq("sectionId", args.sectionId))
      .order("asc")
      .collect();
  },
});

export const update = mutation({
  args: {
    instructionId: v.id("instructions"),
    text: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    timeSlot: v.optional(timeSlotValidator),
    specificTime: v.optional(v.string()),
    isRecurring: v.optional(v.boolean()),
    proofRequired: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { instructionId, ...fields } = args;
    // Auto-derive timeSlot from specificTime if provided
    if (fields.specificTime) {
      fields.timeSlot = timeToSlot(fields.specificTime);
    }
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(instructionId, updates);
      const instruction = await ctx.db.get(instructionId);
      if (instruction) {
        const section = await ctx.db.get(instruction.sectionId);
        if (section) {
          await ctx.scheduler.runAfter(0, internal.properties.bumpManualVersion, {
            propertyId: section.propertyId,
          });
        }
      }
    }
    return null;
  },
});

export const remove = mutation({
  args: { instructionId: v.id("instructions") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const instruction = await ctx.db.get(args.instructionId);
    if (!instruction) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Instruction not found" });
    }
    await ctx.db.delete(args.instructionId);
    const section = await ctx.db.get(instruction.sectionId);
    if (section) {
      await ctx.scheduler.runAfter(0, internal.properties.bumpManualVersion, {
        propertyId: section.propertyId,
      });
    }
    return null;
  },
});

export const reorderInstructions = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("instructions"),
        sortOrder: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, { updates }) => {
    for (const { id, sortOrder } of updates) {
      await ctx.db.patch(id, { sortOrder });
    }
    return null;
  },
});
