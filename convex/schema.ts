import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    passwordHash: v.optional(v.string()),
    salt: v.optional(v.string()),
    googleId: v.optional(v.string()),
    appleId: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_google_id", ["googleId"])
    .index("by_apple_id", ["appleId"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_token", ["token"]),

  properties: defineTable({
    name: v.string(),
    address: v.optional(v.string()),
    photo: v.optional(v.id("_storage")),
    ownerId: v.id("users"),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
  }).index("by_owner", ["ownerId"]),

  manualSections: defineTable({
    propertyId: v.id("properties"),
    title: v.string(),
    icon: v.string(),
    sortOrder: v.number(),
  })
    .index("by_property_sort", ["propertyId", "sortOrder"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["propertyId"],
    }),

  instructions: defineTable({
    sectionId: v.id("manualSections"),
    text: v.string(),
    sortOrder: v.number(),
    timeSlot: v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("anytime"),
    ),
    isRecurring: v.boolean(),
    proofRequired: v.boolean(),
  })
    .index("by_section_sort", ["sectionId", "sortOrder"])
    .searchIndex("search_text", { searchField: "text" }),

  locationCards: defineTable({
    parentId: v.string(),
    parentType: v.union(
      v.literal("instruction"),
      v.literal("pet"),
      v.literal("vault"),
      v.literal("overlayItem"),
    ),
    storageId: v.optional(v.id("_storage")),
    videoStorageId: v.optional(v.id("_storage")),
    photoUrl: v.optional(v.string()),
    videoUrl: v.optional(v.string()),
    caption: v.optional(v.string()),
    roomTag: v.optional(v.string()),
  })
    .index("by_parent", ["parentId", "parentType"])
    .searchIndex("search_caption", { searchField: "caption" }),

  vaultItems: defineTable({
    propertyId: v.id("properties"),
    type: v.union(
      v.literal("door_code"),
      v.literal("alarm_code"),
      v.literal("wifi"),
      v.literal("gate_code"),
      v.literal("garage_code"),
      v.literal("safe_combination"),
      v.literal("custom"),
    ),
    label: v.string(),
    value: v.string(),
    instructions: v.optional(v.string()),
    sortOrder: v.number(),
  }).index("by_property_sort", ["propertyId", "sortOrder"]),

  pets: defineTable({
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
    medications: v.array(
      v.object({
        name: v.string(),
        dosage: v.string(),
        frequency: v.string(),
        time: v.string(),
        locationCardId: v.optional(v.id("locationCards")),
      }),
    ),
    behavioralQuirks: v.optional(v.string()),
    allergies: v.optional(v.string()),
    microchipNumber: v.optional(v.string()),
    insuranceInfo: v.optional(v.string()),
    walkingRoutine: v.optional(v.string()),
    groomingNeeds: v.optional(v.string()),
    comfortItems: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_property_sort", ["propertyId", "sortOrder"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["propertyId"],
    })
    .searchIndex("search_feeding", {
      searchField: "feedingInstructions",
      filterFields: ["propertyId"],
    }),

  emergencyContacts: defineTable({
    propertyId: v.id("properties"),
    name: v.string(),
    role: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
    sortOrder: v.number(),
    isLocked: v.boolean(),
  }).index("by_property_sort", ["propertyId", "sortOrder"]),

  trips: defineTable({
    propertyId: v.id("properties"),
    startDate: v.string(),
    endDate: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("expired"),
    ),
    shareLink: v.optional(v.string()),
    linkPassword: v.optional(v.string()),
    linkExpiry: v.optional(v.number()),
  }).index("by_property_status", ["propertyId", "status"]),

  sitters: defineTable({
    tripId: v.id("trips"),
    name: v.string(),
    phone: v.optional(v.string()),
    vaultAccess: v.boolean(),
  }).index("by_trip", ["tripId"]),

  overlayItems: defineTable({
    tripId: v.id("trips"),
    text: v.string(),
    date: v.optional(v.string()),
    timeSlot: v.union(
      v.literal("morning"),
      v.literal("afternoon"),
      v.literal("evening"),
      v.literal("anytime"),
    ),
    proofRequired: v.boolean(),
    locationCardId: v.optional(v.id("locationCards")),
  }).index("by_trip_date", ["tripId", "date"]),

  taskCompletions: defineTable({
    tripId: v.id("trips"),
    taskRef: v.string(),
    taskType: v.union(v.literal("recurring"), v.literal("overlay")),
    sitterName: v.string(),
    completedAt: v.number(),
    proofPhotoUrl: v.optional(v.string()),
  }).index("by_trip_taskref", ["tripId", "taskRef"]),

  activityLog: defineTable({
    tripId: v.id("trips"),
    propertyId: v.id("properties"),
    event: v.string(),
    createdAt: v.number(),
  })
    .index("by_trip", ["tripId"])
    .index("by_property", ["propertyId"]),
});
