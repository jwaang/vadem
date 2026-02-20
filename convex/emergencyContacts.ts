import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const emergencyContactObject = v.object({
  _id: v.id("emergencyContacts"),
  _creationTime: v.number(),
  propertyId: v.id("properties"),
  name: v.string(),
  role: v.string(),
  phone: v.string(),
  notes: v.optional(v.string()),
  sortOrder: v.number(),
  isLocked: v.boolean(),
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    role: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
    sortOrder: v.number(),
    isLocked: v.boolean(),
  },
  returns: v.id("emergencyContacts"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("emergencyContacts", args);
  },
});

export const listByPropertyId = query({
  args: { propertyId: v.id("properties") },
  returns: v.array(emergencyContactObject),
  handler: async (ctx, { propertyId }) => {
    return await ctx.db
      .query("emergencyContacts")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
      .order("asc")
      .collect();
  },
});

export const update = mutation({
  args: {
    contactId: v.id("emergencyContacts"),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    phone: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, { contactId, ...fields }) => {
    const contact = await ctx.db.get(contactId);
    if (!contact) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
    }
    const patch = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(contactId, patch);
    }
    return null;
  },
});

export const remove = mutation({
  args: { contactId: v.id("emergencyContacts") },
  returns: v.null(),
  handler: async (ctx, { contactId }) => {
    const contact = await ctx.db.get(contactId);
    if (!contact) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Contact not found" });
    }
    if (contact.isLocked) {
      throw new ConvexError({
        code: "FORBIDDEN",
        message: "Cannot delete a locked contact",
      });
    }
    await ctx.db.delete(contactId);
    return null;
  },
});

export const reorderContacts = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("emergencyContacts"),
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

// Internal mutation called during property creation to pre-seed ASPCA Poison Control.
export const createDefaultContacts = internalMutation({
  args: { propertyId: v.id("properties") },
  returns: v.null(),
  handler: async (ctx, { propertyId }) => {
    const locked = await ctx.db
      .query("emergencyContacts")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
      .filter((q) => q.eq(q.field("isLocked"), true))
      .first();

    if (locked) return null;

    await ctx.db.insert("emergencyContacts", {
      propertyId,
      name: "ASPCA Animal Poison Control",
      role: "Animal Poison Control",
      phone: "888-426-4435",
      isLocked: true,
      sortOrder: 0,
    });

    return null;
  },
});

export const seedDefaults = mutation({
  args: { propertyId: v.id("properties") },
  returns: v.null(),
  handler: async (ctx, { propertyId }) => {
    // Only seed if ASPCA (the locked slot) is not yet present
    const locked = await ctx.db
      .query("emergencyContacts")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
      .filter((q) => q.eq(q.field("isLocked"), true))
      .first();

    if (locked) return null;

    const defaults = [
      {
        name: "ASPCA Animal Poison Control",
        role: "Animal Poison Control",
        phone: "888-426-4435",
        isLocked: true,
        sortOrder: 0,
      },
      {
        name: "",
        role: "Owner (primary)",
        phone: "",
        isLocked: false,
        sortOrder: 1,
      },
      {
        name: "",
        role: "Owner (secondary / partner)",
        phone: "",
        isLocked: false,
        sortOrder: 2,
      },
      {
        name: "",
        role: "Veterinarian",
        phone: "",
        isLocked: false,
        sortOrder: 3,
      },
      {
        name: "",
        role: "Emergency neighbor",
        phone: "",
        isLocked: false,
        sortOrder: 4,
      },
    ];

    for (const d of defaults) {
      await ctx.db.insert("emergencyContacts", { propertyId, ...d });
    }

    return null;
  },
});
