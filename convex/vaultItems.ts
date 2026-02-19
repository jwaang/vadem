import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const vaultItemType = v.union(
  v.literal("door_code"),
  v.literal("alarm_code"),
  v.literal("wifi"),
  v.literal("gate_code"),
  v.literal("garage_code"),
  v.literal("safe_combination"),
  v.literal("custom"),
);

const vaultItemObject = v.object({
  _id: v.id("vaultItems"),
  _creationTime: v.number(),
  propertyId: v.id("properties"),
  type: vaultItemType,
  label: v.string(),
  value: v.string(),
  instructions: v.optional(v.string()),
  sortOrder: v.number(),
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    type: vaultItemType,
    label: v.string(),
    value: v.string(),
    instructions: v.optional(v.string()),
    sortOrder: v.number(),
  },
  returns: v.id("vaultItems"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("vaultItems", {
      propertyId: args.propertyId,
      type: args.type,
      label: args.label,
      value: args.value,
      instructions: args.instructions,
      sortOrder: args.sortOrder,
    });
  },
});

export const listByPropertyId = query({
  args: { propertyId: v.id("properties") },
  returns: v.array(vaultItemObject),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vaultItems")
      .withIndex("by_property_sort", (q) =>
        q.eq("propertyId", args.propertyId),
      )
      .order("asc")
      .collect();
  },
});

export const update = mutation({
  args: {
    vaultItemId: v.id("vaultItems"),
    type: v.optional(vaultItemType),
    label: v.optional(v.string()),
    value: v.optional(v.string()),
    instructions: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { vaultItemId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(vaultItemId, updates);
    }
    return null;
  },
});

export const remove = mutation({
  args: { vaultItemId: v.id("vaultItems") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.vaultItemId);
    if (!item) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "Vault item not found",
      });
    }
    await ctx.db.delete(args.vaultItemId);
    return null;
  },
});
