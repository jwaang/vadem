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
    pushSubscription: v.optional(v.string()), // JSON-serialized PushSubscription for web push
    notificationPreference: v.optional(
      v.union(
        v.literal("all"),
        v.literal("proof-only"),
        v.literal("digest"),
        v.literal("off"),
      ),
    ), // Legacy: task completion preference; superseded by notificationPreferences
    notificationPreferences: v.optional(
      v.object({
        taskCompletions: v.union(
          v.literal("all"),
          v.literal("proof-only"),
          v.literal("digest"),
          v.literal("off"),
        ),
        linkOpened: v.boolean(),
        tripEnding: v.boolean(),
        // vaultAccess is always on; not user-configurable
      }),
    ), // Full notification preferences; defaults applied server-side when absent
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
    // Monotonically-increasing integer bumped whenever manual content changes.
    // Sitter clients send this to the service worker so it can evict stale
    // photo/content caches on reconnect.
    manualVersion: v.optional(v.number()),
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
    itemType: v.union(
      v.literal("door_code"),
      v.literal("alarm_code"),
      v.literal("wifi"),
      v.literal("gate_code"),
      v.literal("garage_code"),
      v.literal("safe_combination"),
      v.literal("custom"),
    ),
    label: v.string(),
    // AES-256-GCM ciphertext + IV stored as base64 JSON: { iv, ciphertext }
    encryptedValue: v.string(),
    instructions: v.optional(v.string()),
    locationCardId: v.optional(v.id("locationCards")),
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
    pendingDigestAt: v.optional(v.number()), // Unix ms timestamp when a digest notification is scheduled
    tripEndingScheduledId: v.optional(v.id("_scheduled_functions")), // ID of the scheduled trip-ending-soon notification
    reportShareLink: v.optional(v.string()), // Unique slug for public read-only report sharing
  })
    .index("by_property_status", ["propertyId", "status"])
    .index("by_share_link", ["shareLink"])
    .index("by_report_share_link", ["reportShareLink"]),

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
    date: v.string(), // YYYY-MM-DD — enables per-day grouping and implicit daily reset
    proofPhotoUrl: v.optional(v.string()),
  })
    .index("by_trip_taskref", ["tripId", "taskRef"])
    .index("by_trip_date", ["tripId", "date"]),

  tripSessions: defineTable({
    tripId: v.id("trips"),
    sessionToken: v.string(),
    expiresAt: v.number(),
  })
    .index("by_token", ["sessionToken"])
    .index("by_trip", ["tripId"]),

  activityLog: defineTable({
    tripId: v.id("trips"),
    propertyId: v.id("properties"),
    // Legacy field name — one test document used 'event' instead of 'eventType'
    event: v.optional(v.string()),
    // optional to allow legacy documents that used 'event' field name
    eventType: v.optional(
      v.union(
        v.literal("link_opened"),
        v.literal("task_completed"),
        v.literal("proof_uploaded"),
        v.literal("vault_accessed"),
        v.literal("trip_started"),
        v.literal("trip_expired"),
        v.literal("task_unchecked"),
      ),
    ),
    sitterName: v.optional(v.string()),
    sitterPhone: v.optional(v.string()),
    metadata: v.optional(v.any()),
    vaultItemId: v.optional(v.id("vaultItems")),
    vaultItemLabel: v.optional(v.string()),
    proofPhotoUrl: v.optional(v.string()),
    taskTitle: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_trip_time", ["tripId", "createdAt"])
    .index("by_property", ["propertyId"]),

  // Per-item vault access log — one entry per item viewed (verified: true) or per failed
  // PIN attempt (verified: false, vaultItemId: undefined). accessedAt is always set
  // server-side (Date.now()) to prevent timestamp spoofing.
  vaultAccessLog: defineTable({
    tripId: v.id("trips"),
    vaultItemId: v.optional(v.id("vaultItems")), // undefined for failed PIN attempts
    sitterPhone: v.string(),
    sitterName: v.optional(v.string()),
    accessedAt: v.number(), // Date.now() set server-side
    verified: v.boolean(), // true = successful item view, false = failed PIN attempt
  }).index("by_trip_accessed", ["tripId", "accessedAt"]),

  // Tracks sitter-to-creator conversions for viral growth analytics.
  // Created when a sitter (originTripId) signs up as a creator.
  conversions: defineTable({
    sitterUserId: v.id("users"),
    originTripId: v.id("trips"),
    convertedAt: v.number(),
  }).index("by_user", ["sitterUserId"]),

  // Vault SMS PIN verification — verified session records only.
  // Created by verifyPin on successful Prelude OTP check; read by getDecryptedVaultItems.
  // Legacy fields (hashedPin, salt, attemptCount) are optional for backward compat with
  // pre-Prelude records; they will be absent on all new records.
  vaultPins: defineTable({
    tripId: v.id("trips"),
    sitterPhone: v.string(), // normalized 10-digit US number (digits only)
    expiresAt: v.number(), // Unix ms: now+24h after successful verification
    verified: v.optional(v.boolean()), // true for verified sessions; absent on stale records
    // Legacy Twilio fields — present on pre-Prelude records until TTL expiry
    hashedPin: v.optional(v.string()),
    salt: v.optional(v.string()),
    attemptCount: v.optional(v.number()),
  }).index("by_trip_phone", ["tripId", "sitterPhone"]),
});
