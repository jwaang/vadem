/**
 * DEV ONLY — clears every row from every table and deletes all storage files.
 *
 * Run via: pnpm nuke-db
 */
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const TABLES = [
  "users",
  "sessions",
  "properties",
  "manualSections",
  "instructions",
  "locationCards",
  "vaultItems",
  "pets",
  "emergencyContacts",
  "trips",
  "sitters",
  "overlayItems",
  "taskCompletions",
  "tripSessions",
  "activityLog",
  "vaultAccessLog",
  "conversions",
  "vaultPins",
] as const;

export const clearAllData = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    // Delete all rows from every table
    for (const table of TABLES) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const rows = await (ctx.db.query(table) as any).collect();
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
      if (rows.length > 0) {
        console.log(`[nuke] cleared ${rows.length} rows from ${table}`);
      }
    }

    // Delete all files from Convex storage
    const storageFiles = await ctx.db.system.query("_storage").collect();
    for (const file of storageFiles) {
      await ctx.storage.delete(file._id);
    }
    if (storageFiles.length > 0) {
      console.log(`[nuke] deleted ${storageFiles.length} files from storage`);
    }

    console.log("[nuke] done");
    return null;
  },
});

/**
 * Delete all data owned by a specific user (by email), cascading through the
 * full ownership chain and cleaning up storage files.
 *
 * Run via: pnpm nuke-db dev --email user@example.com
 */
export const clearByEmail = internalMutation({
  args: { email: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const counts: Record<string, number> = {};
    const track = (table: string) => {
      counts[table] = (counts[table] ?? 0) + 1;
    };

    // Helper: delete a location card and its storage files
    const deleteLocationCard = async (cardId: Id<"locationCards">) => {
      const card = await ctx.db.get(cardId);
      if (!card) return;
      if (card.storageId) {
        try { await ctx.storage.delete(card.storageId); track("_storage"); } catch { /* best-effort */ }
      }
      if (card.videoStorageId) {
        try { await ctx.storage.delete(card.videoStorageId); track("_storage"); } catch { /* best-effort */ }
      }
      await ctx.db.delete(cardId);
      track("locationCards");
    };

    // Helper: delete all location cards for a given parent
    const deleteLocationCardsForParent = async (
      parentId: string,
      parentType: "instruction" | "pet" | "vault" | "overlayItem",
    ) => {
      const cards = await ctx.db
        .query("locationCards")
        .withIndex("by_parent", (q) => q.eq("parentId", parentId).eq("parentType", parentType))
        .collect();
      for (const card of cards) {
        await deleteLocationCard(card._id);
      }
    };

    // Helper: delete proof photo storage from a URL
    const deleteProofPhotoStorage = async (proofPhotoUrl: string) => {
      const rawSegment = proofPhotoUrl.split("/").pop();
      const storageId = rawSegment?.split("?")[0];
      if (storageId) {
        try {
          await ctx.storage.delete(storageId as Id<"_storage">);
          track("_storage");
        } catch { /* best-effort */ }
      }
    };

    // 1. Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    if (!user) {
      throw new Error(`No user found with email: ${args.email}`);
    }
    const userId = user._id;

    // 2. Find all properties owned by this user
    const properties = await ctx.db
      .query("properties")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .collect();

    // 3. For each property, cascade-delete children
    for (const property of properties) {
      const propertyId = property._id;

      // 3a. Manual sections → instructions → location cards
      const sections = await ctx.db
        .query("manualSections")
        .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
        .collect();
      for (const section of sections) {
        const instructions = await ctx.db
          .query("instructions")
          .withIndex("by_section_sort", (q) => q.eq("sectionId", section._id))
          .collect();
        for (const instr of instructions) {
          await deleteLocationCardsForParent(instr._id as string, "instruction");
          await ctx.db.delete(instr._id);
          track("instructions");
        }
        await ctx.db.delete(section._id);
        track("manualSections");
      }

      // 3b. Pets → photos storage + location cards
      const pets = await ctx.db
        .query("pets")
        .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
        .collect();
      for (const pet of pets) {
        for (const photoId of pet.photos) {
          try { await ctx.storage.delete(photoId); track("_storage"); } catch { /* best-effort */ }
        }
        await deleteLocationCardsForParent(pet._id as string, "pet");
        await ctx.db.delete(pet._id);
        track("pets");
      }

      // 3c. Vault items → location cards
      const vaultItems = await ctx.db
        .query("vaultItems")
        .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
        .collect();
      for (const vi of vaultItems) {
        await deleteLocationCardsForParent(vi._id as string, "vault");
        await ctx.db.delete(vi._id);
        track("vaultItems");
      }

      // 3d. Emergency contacts
      const contacts = await ctx.db
        .query("emergencyContacts")
        .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
        .collect();
      for (const c of contacts) {
        await ctx.db.delete(c._id);
        track("emergencyContacts");
      }

      // 3e. Trips → full cascade (mirrors trips.remove)
      // Query all statuses by using the index prefix on propertyId only
      const trips = await ctx.db
        .query("trips")
        .withIndex("by_property_status", (q) => q.eq("propertyId", propertyId))
        .collect();
      for (const trip of trips) {
        // Cancel scheduled function
        if (trip.tripEndingScheduledId) {
          try { await ctx.scheduler.cancel(trip.tripEndingScheduledId); } catch { /* best-effort */ }
        }

        // Overlay items + location cards + storage
        const overlayItems = await ctx.db
          .query("overlayItems")
          .withIndex("by_trip_date", (q) => q.eq("tripId", trip._id))
          .collect();
        for (const oi of overlayItems) {
          await deleteLocationCardsForParent(oi._id as string, "overlayItem");
          await ctx.db.delete(oi._id);
          track("overlayItems");
        }

        // Task completions + proof photo storage
        const completions = await ctx.db
          .query("taskCompletions")
          .withIndex("by_trip_date", (q) => q.eq("tripId", trip._id))
          .collect();
        for (const tc of completions) {
          if (tc.proofPhotoUrl) {
            await deleteProofPhotoStorage(tc.proofPhotoUrl);
          }
          await ctx.db.delete(tc._id);
          track("taskCompletions");
        }

        // Trip sessions
        const tripSessions = await ctx.db
          .query("tripSessions")
          .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
          .collect();
        for (const ts of tripSessions) {
          await ctx.db.delete(ts._id);
          track("tripSessions");
        }

        // Sitters
        const sitters = await ctx.db
          .query("sitters")
          .withIndex("by_trip", (q) => q.eq("tripId", trip._id))
          .collect();
        for (const s of sitters) {
          await ctx.db.delete(s._id);
          track("sitters");
        }

        // Vault pins
        const vaultPins = await ctx.db
          .query("vaultPins")
          .withIndex("by_trip_phone", (q) => q.eq("tripId", trip._id))
          .collect();
        for (const vp of vaultPins) {
          await ctx.db.delete(vp._id);
          track("vaultPins");
        }

        // Activity log
        const activityLogs = await ctx.db
          .query("activityLog")
          .withIndex("by_trip_time", (q) => q.eq("tripId", trip._id))
          .collect();
        for (const al of activityLogs) {
          await ctx.db.delete(al._id);
          track("activityLog");
        }

        // Vault access log
        const vaultAccessLogs = await ctx.db
          .query("vaultAccessLog")
          .withIndex("by_trip_accessed", (q) => q.eq("tripId", trip._id))
          .collect();
        for (const val of vaultAccessLogs) {
          await ctx.db.delete(val._id);
          track("vaultAccessLog");
        }

        // Delete trip
        await ctx.db.delete(trip._id);
        track("trips");
      }

      // 3f. Delete property photo from storage
      if (property.photo) {
        try { await ctx.storage.delete(property.photo); track("_storage"); } catch { /* best-effort */ }
      }

      // 3g. Delete property
      await ctx.db.delete(propertyId);
      track("properties");
    }

    // 4. Delete user-level rows
    // Sessions (no userId index — scan by_token and filter)
    const allSessions = await ctx.db.query("sessions").collect();
    for (const s of allSessions) {
      if (s.userId === userId) {
        await ctx.db.delete(s._id);
        track("sessions");
      }
    }

    // Email verification tokens
    const evTokens = await ctx.db
      .query("emailVerificationTokens")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const t of evTokens) {
      await ctx.db.delete(t._id);
      track("emailVerificationTokens");
    }

    // Conversions
    const conversions = await ctx.db
      .query("conversions")
      .withIndex("by_user", (q) => q.eq("sitterUserId", userId))
      .collect();
    for (const c of conversions) {
      await ctx.db.delete(c._id);
      track("conversions");
    }

    // 5. Delete user
    await ctx.db.delete(userId);
    track("users");

    // 6. Log summary
    console.log(`[nuke] cleared data for ${args.email}:`);
    for (const [table, count] of Object.entries(counts)) {
      console.log(`  ${table}: ${count}`);
    }
    console.log("[nuke] done");
    return null;
  },
});
