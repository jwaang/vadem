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

    // Fetch instructions for all sections in parallel
    const instructionsPerSection = await Promise.all(
      sections.map((section) =>
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

    // Flatten all location cards and resolve storageId → URL in parallel
    const allLocationCards = locationCardsPerInstruction.flat();
    const resolvedPhotoUrls = await Promise.all(
      allLocationCards.map(async (card) => {
        if (card.storageId) {
          return ctx.storage.getUrl(card.storageId);
        }
        return card.photoUrl ?? null;
      }),
    );

    // Build a map from card._id to its resolved photoUrl
    const resolvedUrlByCardId = new Map(
      allLocationCards.map((card, i) => [card._id, resolvedPhotoUrls[i]]),
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
    const sectionsWithData = sections.map((section, si) => ({
      ...section,
      instructions: instructionsPerSection[si].map((instruction) => ({
        ...instruction,
        locationCards: (cardsByInstructionId.get(instruction._id) ?? []).map(
          (card) => ({
            ...card,
            photoUrl: resolvedUrlByCardId.get(card._id) ?? card.photoUrl ?? null,
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
