import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

const statusValidator = v.optional(
  v.union(v.literal("draft"), v.literal("published")),
);

const propertyObject = v.object({
  _id: v.id("properties"),
  _creationTime: v.number(),
  name: v.string(),
  address: v.optional(v.string()),
  photo: v.optional(v.id("_storage")),
  ownerId: v.id("users"),
  status: statusValidator,
  manualVersion: v.optional(v.number()),
});

export const create = mutation({
  args: {
    name: v.string(),
    address: v.optional(v.string()),
    photo: v.optional(v.id("_storage")),
    ownerId: v.id("users"),
  },
  returns: v.id("properties"),
  handler: async (ctx, args) => {
    const propertyId = await ctx.db.insert("properties", {
      name: args.name,
      address: args.address,
      photo: args.photo,
      ownerId: args.ownerId,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.emergencyContacts.createDefaultContacts,
      { propertyId },
    );
    return propertyId;
  },
});

export const get = query({
  args: { propertyId: v.id("properties") },
  returns: v.union(propertyObject, v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.propertyId);
  },
});

// Internal: look up a property by ID — used by sitterActions for owner notification.
export const _getById = internalQuery({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.propertyId);
  },
});

export const listByOwner = query({
  args: { ownerId: v.id("users") },
  returns: v.array(propertyObject),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .collect();
  },
});

export const update = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.optional(v.string()),
    address: v.optional(v.string()),
    photo: v.optional(v.id("_storage")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { propertyId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(propertyId, updates);
    }
    return null;
  },
});

// Upsert: create or update the first property owned by this user.
// Used by the wizard's "Save & finish later" and "Next" flows.
export const createOrUpdate = mutation({
  args: {
    ownerId: v.id("users"),
    name: v.string(),
    address: v.optional(v.string()),
    photo: v.optional(v.id("_storage")),
  },
  returns: v.id("properties"),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", args.ownerId))
      .first();

    if (existing) {
      const updates = Object.fromEntries(
        Object.entries({
          name: args.name,
          address: args.address,
          photo: args.photo,
        }).filter(([, val]) => val !== undefined),
      );
      if (Object.keys(updates).length > 0) {
        await ctx.db.patch(existing._id, updates);
      }
      return existing._id;
    }

    const propertyId = await ctx.db.insert("properties", {
      name: args.name,
      address: args.address,
      photo: args.photo,
      ownerId: args.ownerId,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.emergencyContacts.createDefaultContacts,
      { propertyId },
    );
    return propertyId;
  },
});

export const remove = mutation({
  args: { propertyId: v.id("properties") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const property = await ctx.db.get(args.propertyId);
    if (!property) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });
    }
    await ctx.db.delete(args.propertyId);
    return null;
  },
});

// Returns aggregated counts + completeness flags for the wizard review step.
export const getManualSummary = query({
  args: { propertyId: v.id("properties") },
  returns: v.object({
    propertyName: v.optional(v.string()),
    propertyAddress: v.optional(v.string()),
    status: statusValidator,
    petCount: v.number(),
    vaultItemCount: v.number(),
    contactCount: v.number(),
    sectionCount: v.number(),
    instructionCount: v.number(),
    hasPropertyName: v.boolean(),
    hasAtLeastOnePet: v.boolean(),
    hasAtLeastOneVaultItem: v.boolean(),
    hasAtLeastOneContact: v.boolean(),
    hasAtLeastOneSection: v.boolean(),
    hasAtLeastOneInstruction: v.boolean(),
  }),
  handler: async (ctx, { propertyId }) => {
    const property = await ctx.db.get(propertyId);

    const pets = await ctx.db
      .query("pets")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
      .collect();

    const vaultItems = await ctx.db
      .query("vaultItems")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
      .collect();

    const contacts = await ctx.db
      .query("emergencyContacts")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
      .collect();

    const sections = await ctx.db
      .query("manualSections")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
      .collect();

    let instructionCount = 0;
    for (const section of sections) {
      const instructions = await ctx.db
        .query("instructions")
        .withIndex("by_section_sort", (q) => q.eq("sectionId", section._id))
        .collect();
      instructionCount += instructions.length;
    }

    return {
      propertyName: property?.name,
      propertyAddress: property?.address,
      status: property?.status,
      petCount: pets.length,
      vaultItemCount: vaultItems.length,
      contactCount: contacts.length,
      sectionCount: sections.length,
      instructionCount,
      hasPropertyName: Boolean(property?.name && property.name.trim().length > 0),
      hasAtLeastOnePet: pets.length > 0,
      hasAtLeastOneVaultItem: vaultItems.length > 0,
      hasAtLeastOneContact: contacts.length > 0,
      hasAtLeastOneSection: sections.length > 0,
      hasAtLeastOneInstruction: instructionCount > 0,
    };
  },
});

// Sets property status to 'published', finalizing the manual.
export const publishManual = mutation({
  args: { propertyId: v.id("properties") },
  returns: v.null(),
  handler: async (ctx, { propertyId }) => {
    const property = await ctx.db.get(propertyId);
    if (!property) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Property not found" });
    }
    await ctx.db.patch(propertyId, { status: "published" });
    return null;
  },
});

// Internal: atomically increment manualVersion.
// Called by instruction/section/pet/contact/locationCard mutations to signal
// that the sitter's cached content is stale and should be re-fetched.
export const bumpManualVersion = internalMutation({
  args: { propertyId: v.id("properties") },
  returns: v.null(),
  handler: async (ctx, { propertyId }) => {
    const property = await ctx.db.get(propertyId);
    if (!property) return null;
    const next = (property.manualVersion ?? 0) + 1;
    await ctx.db.patch(propertyId, { manualVersion: next });
    return null;
  },
});
