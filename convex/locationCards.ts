import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";

const parentTypeValidator = v.union(
  v.literal("instruction"),
  v.literal("pet"),
  v.literal("vault"),
  v.literal("overlayItem"),
);

/** Returns a one-time URL the client can POST an image blob to. */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const create = mutation({
  args: {
    parentId: v.string(),
    parentType: parentTypeValidator,
    storageId: v.optional(v.id("_storage")),
    videoStorageId: v.optional(v.id("_storage")),
    photoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    roomTag: v.optional(v.string()),
  },
  returns: v.id("locationCards"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("locationCards", {
      parentId: args.parentId,
      parentType: args.parentType,
      storageId: args.storageId,
      videoStorageId: args.videoStorageId,
      photoUrl: args.photoUrl,
      videoUrl: args.videoUrl,
      caption: args.caption,
      roomTag: args.roomTag,
    });
  },
});

export const listByParent = query({
  args: {
    parentId: v.string(),
    parentType: parentTypeValidator,
  },
  returns: v.array(
    v.object({
      _id: v.id("locationCards"),
      _creationTime: v.number(),
      parentId: v.string(),
      parentType: parentTypeValidator,
      storageId: v.optional(v.id("_storage")),
      videoStorageId: v.optional(v.id("_storage")),
      photoUrl: v.optional(v.string()),
      videoUrl: v.optional(v.string()),
      caption: v.optional(v.string()),
      roomTag: v.optional(v.string()),
    }),
  ),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("locationCards")
      .withIndex("by_parent", (q) =>
        q.eq("parentId", args.parentId).eq("parentType", args.parentType),
      )
      .collect();
  },
});

export const update = mutation({
  args: {
    cardId: v.id("locationCards"),
    storageId: v.optional(v.id("_storage")),
    videoStorageId: v.optional(v.id("_storage")),
    photoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    roomTag: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { cardId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(cardId, updates);
    }
    return null;
  },
});

export const remove = mutation({
  args: { cardId: v.id("locationCards") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const card = await ctx.db.get(args.cardId);
    if (!card) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Location card not found" });
    }
    await ctx.db.delete(args.cardId);
    return null;
  },
});
