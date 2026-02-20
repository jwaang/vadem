import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    title: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
  },
  returns: v.id("manualSections"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("manualSections", {
      propertyId: args.propertyId,
      title: args.title,
      icon: args.icon,
      sortOrder: args.sortOrder,
    });
    await ctx.scheduler.runAfter(0, internal.properties.bumpManualVersion, {
      propertyId: args.propertyId,
    });
    return id;
  },
});

export const listByProperty = query({
  args: { propertyId: v.id("properties") },
  returns: v.array(
    v.object({
      _id: v.id("manualSections"),
      _creationTime: v.number(),
      propertyId: v.id("properties"),
      title: v.string(),
      icon: v.string(),
      sortOrder: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("manualSections")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", args.propertyId))
      .order("asc")
      .collect();
  },
});

export const update = mutation({
  args: {
    sectionId: v.id("manualSections"),
    title: v.optional(v.string()),
    icon: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { sectionId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(sectionId, updates);
    }
    return null;
  },
});

export const remove = mutation({
  args: { sectionId: v.id("manualSections") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const section = await ctx.db.get(args.sectionId);
    if (!section) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Section not found" });
    }
    // Cascade: delete all instructions belonging to this section
    const instructions = await ctx.db
      .query("instructions")
      .withIndex("by_section_sort", (q) => q.eq("sectionId", args.sectionId))
      .collect();
    for (const instruction of instructions) {
      await ctx.db.delete(instruction._id);
    }
    await ctx.db.delete(args.sectionId);
    await ctx.scheduler.runAfter(0, internal.properties.bumpManualVersion, {
      propertyId: section.propertyId,
    });
    return null;
  },
});

export const reorderSections = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("manualSections"),
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
