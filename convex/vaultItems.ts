import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from "./_generated/server";
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

// Labels-only shape returned to the client (encryptedValue is never sent over the wire)
const vaultItemLabelObject = v.object({
  _id: v.id("vaultItems"),
  _creationTime: v.number(),
  propertyId: v.id("properties"),
  itemType: vaultItemType,
  label: v.string(),
  instructions: v.optional(v.string()),
  locationCardId: v.optional(v.id("locationCards")),
  sortOrder: v.number(),
});

// ── Internal functions (callable from actions only, not directly from clients) ──

// Internal: insert a vault item with a pre-encrypted value.
// Called by vaultActions.createVaultItem after encryption.
export const _insert = internalMutation({
  args: {
    propertyId: v.id("properties"),
    itemType: vaultItemType,
    label: v.string(),
    encryptedValue: v.string(),
    instructions: v.optional(v.string()),
    locationCardId: v.optional(v.id("locationCards")),
    sortOrder: v.number(),
  },
  returns: v.id("vaultItems"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("vaultItems", args);
  },
});

// Internal: read a single vault item including encryptedValue.
// Used by vaultActions.getDecryptedVaultItem for decryption.
export const _getById = internalQuery({
  args: { vaultItemId: v.id("vaultItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.vaultItemId);
  },
});

// Internal: list all vault items for a property including encryptedValue.
// Used by vaultActions.getDecryptedVaultItems for batch decryption.
export const _listByPropertyFull = internalQuery({
  args: { propertyId: v.id("properties") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("vaultItems")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", args.propertyId))
      .order("asc")
      .collect();
  },
});

// Internal: log a vault access event to the activity log.
export const _logVaultAccess = internalMutation({
  args: {
    tripId: v.id("trips"),
    propertyId: v.id("properties"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.insert("activityLog", {
      tripId: args.tripId,
      propertyId: args.propertyId,
      eventType: "vault_accessed",
      createdAt: Date.now(),
    });
    return null;
  },
});

// Internal: replace the encryptedValue for an existing item (re-encrypt on edit).
// Called by vaultActions.updateVaultItemValue after re-encryption.
export const _patchEncrypted = internalMutation({
  args: {
    vaultItemId: v.id("vaultItems"),
    encryptedValue: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.vaultItemId, { encryptedValue: args.encryptedValue });
    return null;
  },
});

// ── Public functions ───────────────────────────────────────────────────────────

// List vault items for a property — returns labels only, never exposes encryptedValue.
export const listByPropertyId = query({
  args: { propertyId: v.id("properties") },
  returns: v.array(vaultItemLabelObject),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("vaultItems")
      .withIndex("by_property_sort", (q) =>
        q.eq("propertyId", args.propertyId),
      )
      .order("asc")
      .collect();
    // Explicitly construct label objects — encryptedValue is never sent to the client
    return items.map((item) => ({
      _id: item._id,
      _creationTime: item._creationTime,
      propertyId: item.propertyId,
      itemType: item.itemType,
      label: item.label,
      instructions: item.instructions,
      locationCardId: item.locationCardId,
      sortOrder: item.sortOrder,
    }));
  },
});

// Update label, instructions, locationCardId, sortOrder, or itemType.
// To change the encrypted value, call vaultActions.updateVaultItemValue instead.
export const update = mutation({
  args: {
    vaultItemId: v.id("vaultItems"),
    itemType: v.optional(vaultItemType),
    label: v.optional(v.string()),
    instructions: v.optional(v.string()),
    locationCardId: v.optional(v.id("locationCards")),
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

// Delete a vault item.
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

// Reorder vault items by updating their sortOrder values.
export const reorderVaultItems = mutation({
  args: {
    updates: v.array(
      v.object({
        id: v.id("vaultItems"),
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
