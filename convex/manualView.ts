// Manual sitter view query — composed to avoid N+1 patterns
import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Composed query returning all data needed for the sitter's manual browse view.
 * Avoids N+1 by fetching all child records in parallel using Promise.all().
 */
export const getFullManual = query({
  args: { propertyId: v.id("properties") },
  returns: v.any(),
  handler: async (ctx, { propertyId }) => {
    const property = await ctx.db.get(propertyId);
    if (!property) return null;

    // Fetch top-level collections in parallel
    const [sections, pets, emergencyContacts] = await Promise.all([
      ctx.db
        .query("manualSections")
        .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
        .order("asc")
        .collect(),
      ctx.db
        .query("pets")
        .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
        .order("asc")
        .collect(),
      ctx.db
        .query("emergencyContacts")
        .withIndex("by_property_sort", (q) => q.eq("propertyId", propertyId))
        .order("asc")
        .collect(),
    ]);

    // Filter to sections visible in the manual view (exclude tasks-only)
    const manualSections = sections.filter(
      (s) => (s.visibility ?? "both") !== "tasks",
    );

    // Fetch instructions for manual-visible sections in parallel
    const instructionsPerSection = await Promise.all(
      manualSections.map((section) =>
        ctx.db
          .query("instructions")
          .withIndex("by_section_sort", (q) => q.eq("sectionId", section._id))
          .order("asc")
          .collect(),
      ),
    );

    // Flatten all instructions so we can batch-fetch their location cards
    const allInstructions = instructionsPerSection.flat();

    // Fetch location cards for every instruction in parallel
    const locationCardsPerInstruction = await Promise.all(
      allInstructions.map((instruction) =>
        ctx.db
          .query("locationCards")
          .withIndex("by_parent", (q) =>
            q.eq("parentId", instruction._id as string),
          )
          .collect(),
      ),
    );

    // Flatten all location cards and resolve storageId/videoStorageId → URLs in parallel
    const allLocationCards = locationCardsPerInstruction.flat();
    const [resolvedPhotoUrls, resolvedVideoUrls] = await Promise.all([
      Promise.all(
        allLocationCards.map(async (card) => {
          if (card.storageId) {
            return ctx.storage.getUrl(card.storageId);
          }
          return card.photoUrl ?? null;
        }),
      ),
      Promise.all(
        allLocationCards.map(async (card) => {
          if (card.videoStorageId) {
            return ctx.storage.getUrl(card.videoStorageId);
          }
          return card.videoUrl ?? null;
        }),
      ),
    ]);

    // Build maps from card._id to resolved URLs
    const resolvedUrlByCardId = new Map(
      allLocationCards.map((card, i) => [card._id, resolvedPhotoUrls[i]]),
    );
    const resolvedVideoUrlByCardId = new Map(
      allLocationCards.map((card, i) => [card._id, resolvedVideoUrls[i]]),
    );

    // Build instruction._id → locationCards[] lookup
    const cardsByInstructionId = new Map(
      allInstructions.map((instruction, i) => [
        instruction._id,
        locationCardsPerInstruction[i],
      ]),
    );

    // Resolve each pet's primary photo URL (storage ID → public URL)
    const petPhotoUrls = await Promise.all(
      pets.map(async (pet) => {
        const firstId = pet.photos?.[0];
        if (!firstId) return null;
        return ctx.storage.getUrl(firstId);
      }),
    );

    // Assemble sections with nested instructions + their location cards
    const sectionsWithData = manualSections.map((section, si) => ({
      ...section,
      instructions: instructionsPerSection[si].map((instruction) => ({
        ...instruction,
        locationCards: (cardsByInstructionId.get(instruction._id) ?? []).map(
          (card) => ({
            ...card,
            photoUrl: resolvedUrlByCardId.get(card._id) ?? card.photoUrl ?? null,
            resolvedVideoUrl: resolvedVideoUrlByCardId.get(card._id) ?? null,
          }),
        ),
      })),
    }));

    // Attach resolved photo URL to each pet
    const petsWithPhotos = pets.map((pet, i) => ({
      ...pet,
      resolvedPhotoUrl: petPhotoUrls[i] ?? null,
    }));

    return {
      property,
      sections: sectionsWithData,
      pets: petsWithPhotos,
      emergencyContacts,
    };
  },
});
