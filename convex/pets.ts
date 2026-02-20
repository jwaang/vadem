import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ConvexError } from "convex/values";
import { internal } from "./_generated/api";

const medicationObject = v.object({
  name: v.string(),
  dosage: v.string(),
  frequency: v.string(),
  time: v.string(),
  locationCardId: v.optional(v.id("locationCards")),
});

const petObject = v.object({
  _id: v.id("pets"),
  _creationTime: v.number(),
  propertyId: v.id("properties"),
  name: v.string(),
  species: v.string(),
  breed: v.optional(v.string()),
  age: v.optional(v.string()),
  photos: v.array(v.id("_storage")),
  feedingInstructions: v.optional(v.string()),
  vetName: v.optional(v.string()),
  vetPhone: v.optional(v.string()),
  personalityNotes: v.optional(v.string()),
  medicalConditions: v.optional(v.string()),
  medications: v.array(medicationObject),
  behavioralQuirks: v.optional(v.string()),
  allergies: v.optional(v.string()),
  microchipNumber: v.optional(v.string()),
  insuranceInfo: v.optional(v.string()),
  walkingRoutine: v.optional(v.string()),
  groomingNeeds: v.optional(v.string()),
  comfortItems: v.optional(v.string()),
  sortOrder: v.number(),
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    species: v.string(),
    breed: v.optional(v.string()),
    age: v.optional(v.string()),
    photos: v.array(v.id("_storage")),
    feedingInstructions: v.optional(v.string()),
    vetName: v.optional(v.string()),
    vetPhone: v.optional(v.string()),
    personalityNotes: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    medications: v.array(medicationObject),
    behavioralQuirks: v.optional(v.string()),
    allergies: v.optional(v.string()),
    microchipNumber: v.optional(v.string()),
    insuranceInfo: v.optional(v.string()),
    walkingRoutine: v.optional(v.string()),
    groomingNeeds: v.optional(v.string()),
    comfortItems: v.optional(v.string()),
    sortOrder: v.number(),
  },
  returns: v.id("pets"),
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("pets", {
      propertyId: args.propertyId,
      name: args.name,
      species: args.species,
      breed: args.breed,
      age: args.age,
      photos: args.photos,
      feedingInstructions: args.feedingInstructions,
      vetName: args.vetName,
      vetPhone: args.vetPhone,
      personalityNotes: args.personalityNotes,
      medicalConditions: args.medicalConditions,
      medications: args.medications,
      behavioralQuirks: args.behavioralQuirks,
      allergies: args.allergies,
      microchipNumber: args.microchipNumber,
      insuranceInfo: args.insuranceInfo,
      walkingRoutine: args.walkingRoutine,
      groomingNeeds: args.groomingNeeds,
      comfortItems: args.comfortItems,
      sortOrder: args.sortOrder,
    });
    await ctx.scheduler.runAfter(0, internal.properties.bumpManualVersion, {
      propertyId: args.propertyId,
    });
    return id;
  },
});

export const getPetsByPropertyId = query({
  args: { propertyId: v.id("properties") },
  returns: v.array(petObject),
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pets")
      .withIndex("by_property_sort", (q) => q.eq("propertyId", args.propertyId))
      .order("asc")
      .collect();
  },
});

export const update = mutation({
  args: {
    petId: v.id("pets"),
    name: v.optional(v.string()),
    species: v.optional(v.string()),
    breed: v.optional(v.string()),
    age: v.optional(v.string()),
    photos: v.optional(v.array(v.id("_storage"))),
    feedingInstructions: v.optional(v.string()),
    vetName: v.optional(v.string()),
    vetPhone: v.optional(v.string()),
    personalityNotes: v.optional(v.string()),
    medicalConditions: v.optional(v.string()),
    medications: v.optional(v.array(medicationObject)),
    behavioralQuirks: v.optional(v.string()),
    allergies: v.optional(v.string()),
    microchipNumber: v.optional(v.string()),
    insuranceInfo: v.optional(v.string()),
    walkingRoutine: v.optional(v.string()),
    groomingNeeds: v.optional(v.string()),
    comfortItems: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const { petId, ...fields } = args;
    const updates = Object.fromEntries(
      Object.entries(fields).filter(([, val]) => val !== undefined),
    );
    if (Object.keys(updates).length > 0) {
      await ctx.db.patch(petId, updates);
    }
    return null;
  },
});

export const remove = mutation({
  args: { petId: v.id("pets") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const pet = await ctx.db.get(args.petId);
    if (!pet) {
      throw new ConvexError({ code: "NOT_FOUND", message: "Pet not found" });
    }
    await ctx.db.delete(args.petId);
    await ctx.scheduler.runAfter(0, internal.properties.bumpManualVersion, {
      propertyId: pet.propertyId,
    });
    return null;
  },
});

export const reorderPets = mutation({
  args: {
    updates: v.array(
      v.object({ petId: v.id("pets"), sortOrder: v.number() }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await Promise.all(
      args.updates.map(({ petId, sortOrder }) =>
        ctx.db.patch(petId, { sortOrder }),
      ),
    );
    return null;
  },
});
