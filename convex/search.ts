import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";

const searchResultObject = v.object({
  type: v.union(
    v.literal("instruction"),
    v.literal("section"),
    v.literal("pet"),
    v.literal("location_card"),
    v.literal("contact"),
  ),
  id: v.string(),
  snippet: v.string(),
  sectionName: v.string(),
  sectionId: v.optional(v.string()),
  propertyId: v.string(),
});

export const searchManual = query({
  args: {
    propertyId: v.id("properties"),
    query: v.string(),
    context: v.optional(v.union(v.literal("manual"), v.literal("tasks"))),
  },
  returns: v.array(searchResultObject),
  handler: async (ctx, args) => {
    if (!args.query.trim()) return [];

    const pid = args.propertyId;
    const viewContext = args.context; // "manual" | "tasks" | undefined

    // Helper: returns true if a section's visibility is compatible with the view context
    function isVisibleIn(
      visibility: "tasks" | "manual" | "both" | undefined,
    ): boolean {
      if (!viewContext) return true; // no context filter = show all
      const vis = visibility ?? "both";
      return vis === "both" || vis === viewContext;
    }

    const results: Array<{
      type: "instruction" | "section" | "pet" | "location_card" | "contact";
      id: string;
      snippet: string;
      sectionName: string;
      sectionId?: string;
      propertyId: string;
    }> = [];

    // ── Instructions (search text, join to section for propertyId) ────────────
    const instructionHits = await ctx.db
      .query("instructions")
      .withSearchIndex("search_text", (q) => q.search("text", args.query))
      .take(10);
    for (const inst of instructionHits) {
      const section = (await ctx.db.get(
        inst.sectionId,
      )) as Doc<"manualSections"> | null;
      if (section?.propertyId === pid && isVisibleIn(section.visibility)) {
        const snippet =
          inst.text.length > 120 ? inst.text.slice(0, 120) + "…" : inst.text;
        results.push({
          type: "instruction",
          id: inst._id,
          snippet,
          sectionName: section.title,
          sectionId: section._id,
          propertyId: pid,
        });
      }
    }

    // ── Section titles ────────────────────────────────────────────────────────
    const sectionHits = await ctx.db
      .query("manualSections")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.query).eq("propertyId", pid),
      )
      .take(5);
    for (const section of sectionHits) {
      if (!isVisibleIn(section.visibility)) continue;
      results.push({
        type: "section",
        id: section._id,
        snippet: section.title,
        sectionName: section.title,
        sectionId: section._id,
        propertyId: pid,
      });
    }

    // ── Pet names ─────────────────────────────────────────────────────────────
    const petNameHits = await ctx.db
      .query("pets")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.query).eq("propertyId", pid),
      )
      .take(5);
    const seenPetIds = new Set<string>();
    for (const pet of petNameHits) {
      seenPetIds.add(pet._id);
      const petDesc = pet.breed
        ? `${pet.name} · ${pet.species} (${pet.breed})`
        : `${pet.name} · ${pet.species}`;
      results.push({
        type: "pet",
        id: pet._id,
        snippet: petDesc,
        sectionName: "Pets",
        propertyId: pid,
      });
    }

    // ── Pet feeding instructions ──────────────────────────────────────────────
    const feedingHits = await ctx.db
      .query("pets")
      .withSearchIndex("search_feeding", (q) =>
        q.search("feedingInstructions", args.query).eq("propertyId", pid),
      )
      .take(5);
    for (const pet of feedingHits) {
      if (!seenPetIds.has(pet._id) && pet.feedingInstructions) {
        const raw = pet.feedingInstructions;
        const snippet = raw.length > 120 ? raw.slice(0, 120) + "…" : raw;
        results.push({
          type: "pet",
          id: pet._id,
          snippet,
          sectionName: "Pets",
          propertyId: pid,
        });
      }
    }

    // ── Location card captions ────────────────────────────────────────────────
    const cardHits = await ctx.db
      .query("locationCards")
      .withSearchIndex("search_caption", (q) =>
        q.search("caption", args.query),
      )
      .take(5);
    for (const card of cardHits) {
      if (card.caption) {
        const raw = card.caption;
        const snippet = raw.length > 120 ? raw.slice(0, 120) + "…" : raw;
        results.push({
          type: "location_card",
          id: card._id,
          snippet,
          sectionName: card.roomTag ?? "Location",
          propertyId: pid,
        });
      }
    }

    // ── Emergency contacts ────────────────────────────────────────────────────
    const contactHits = await ctx.db
      .query("emergencyContacts")
      .withSearchIndex("search_name", (q) =>
        q.search("name", args.query).eq("propertyId", pid),
      )
      .take(5);
    for (const contact of contactHits) {
      const snippet = contact.role
        ? `${contact.name} — ${contact.role}`
        : contact.name;
      results.push({
        type: "contact",
        id: contact._id,
        snippet,
        sectionName: "Emergency Contacts",
        propertyId: pid,
      });
    }

    return results;
  },
});
