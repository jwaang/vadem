"use node";

/**
 * Seed script: creates a demo "test / test" account with realistic sample data.
 * Run via: pnpm seed-demo       (dev)
 *          pnpm seed-demo prod  (production)
 */

import { action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import {
  randomBytes,
  pbkdf2Sync,
  createCipheriv,
} from "node:crypto";
import type { Id } from "./_generated/dataModel";

// ── Crypto helpers (match authActions / vaultActions) ──────────────────

function generateSalt(): string {
  return randomBytes(32).toString("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function encryptValue(plaintext: string): string {
  const keyBase64 = process.env.VAULT_ENCRYPTION_KEY;
  if (!keyBase64) throw new Error("VAULT_ENCRYPTION_KEY not set");
  const key = Buffer.from(keyBase64, "base64");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const ciphertextWithTag = Buffer.concat([encrypted, authTag]);
  return JSON.stringify({
    iv: iv.toString("base64"),
    ciphertext: ciphertextWithTag.toString("base64"),
  });
}

function hashLinkPassword(password: string): string {
  const salt = randomBytes(32).toString("hex");
  const hash = pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function generateSlug(): string {
  return randomBytes(9).toString("base64url");
}

// ── Seed action ────────────────────────────────────────────────────────

export const run = action({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const EMAIL = "test@test.com";
    const PASSWORD = "test";

    // ── 1. Check if test user already exists ───────────────────────────
    const existing = await ctx.runQuery(internal.auth._getUserByEmail, {
      email: EMAIL,
    });
    if (existing) {
      console.log("⚠️  Test account already exists. Run `pnpm nuke-db` first to reseed.");
      return null;
    }

    // ── 2. Create user ─────────────────────────────────────────────────
    const salt = generateSalt();
    const passwordHash = hashPassword(PASSWORD, salt);
    const userId = (await ctx.runMutation(internal.auth._createUser, {
      email: EMAIL,
      passwordHash,
      salt,
    })) as Id<"users">;

    // Mark email verified and onboarding complete
    await ctx.runMutation(internal.seedHelpers.patchUser, {
      userId,
      emailVerified: true,
      hasCompletedOnboarding: true,
    });

    // Create session
    const sessionToken = generateToken();
    await ctx.runMutation(internal.auth._createSession, {
      userId,
      token: sessionToken,
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    console.log(`✓ User created: ${EMAIL} / ${PASSWORD}`);

    // ── 3. Create property ─────────────────────────────────────────────
    const propertyId = await ctx.runMutation(api.properties.create, {
      name: "The Lake House",
      address: "742 Evergreen Terrace, Lake Tahoe, CA 96150",
      ownerId: userId,
    });
    // Publish it
    await ctx.runMutation(internal.seedHelpers.patchProperty, {
      propertyId,
      status: "published",
    });
    console.log("✓ Property created: The Lake House");

    // ── 4. Create pets ─────────────────────────────────────────────────
    await ctx.runMutation(api.pets.create, {
      propertyId,
      name: "Luna",
      species: "Dog",
      breed: "Golden Retriever",
      age: "4 years",
      photos: [],
      feedingInstructions:
        "2 cups of Purina Pro Plan in the morning (7am) and evening (6pm). Bowl is in the kitchen next to the pantry. Fresh water always available.",
      vetName: "Dr. Sarah Mitchell",
      vetPhone: "5305551234",
      personalityNotes:
        "Very friendly and loves belly rubs. Gets excited around other dogs. Will bring you her favorite ball to play fetch.",
      medicalConditions: "Mild hip dysplasia — no jumping on/off high surfaces",
      medications: [
        {
          name: "Glucosamine Chew",
          dosage: "1 chew",
          frequency: "Daily",
          time: "With morning meal",
        },
      ],
      behavioralQuirks:
        "Barks at the mailman (arrives ~11am). Loves to dig in the garden — keep her out of the flower beds!",
      allergies: "Chicken — only beef or fish-based treats",
      walkingRoutine:
        "Morning walk at 7:30am (30 min around the lake trail). Evening walk at 5pm (20 min neighborhood loop).",
      groomingNeeds: "Brush coat every other day. Grooming brush is in the hall closet.",
      comfortItems: "Pink stuffed bunny — she sleeps with it every night. Don't wash it.",
      sortOrder: 0,
    });

    await ctx.runMutation(api.pets.create, {
      propertyId,
      name: "Mochi",
      species: "Cat",
      breed: "Ragdoll",
      age: "2 years",
      photos: [],
      feedingInstructions:
        "1/3 cup dry food in the morning. One can of wet food (Fancy Feast) at dinner. Treats are in the pantry — max 5 per day.",
      vetName: "Dr. Sarah Mitchell",
      vetPhone: "5305551234",
      personalityNotes:
        "Independent but affectionate on her terms. Loves sitting in sunbeams. Will climb on your lap around 9pm for cuddles.",
      medications: [],
      behavioralQuirks:
        "Knocks things off counters on purpose. Hides under the bed during thunderstorms.",
      allergies: "None known",
      groomingNeeds: "Brush weekly to prevent matting. She actually enjoys it.",
      comfortItems: "Heated cat bed in the living room — plug it in before bed.",
      sortOrder: 1,
    });
    console.log("✓ Pets created: Luna (dog) & Mochi (cat)");

    // ── 5. Create manual sections & instructions ───────────────────────
    // Daily Routine (merged morning + evening, chronological by specificTime)
    const dailyId = await ctx.runMutation(api.sections.create, {
      propertyId,
      title: "Daily Routine",
      icon: "📋",
      sortOrder: 0,
    });
    // When specificTime is set, the mutation derives timeSlot via timeToSlot()
    // (overriding whatever we pass). Items without specificTime stay "anytime".
    const dailyTasks: { text: string; timeSlot: "morning" | "evening" | "anytime"; specificTime?: string; proofRequired?: boolean }[] = [
      { text: "Let Luna out to the backyard (she'll scratch the sliding door)", timeSlot: "morning", specificTime: "07:00" },
      { text: "Feed Luna — 2 cups kibble in the silver bowl by the pantry", timeSlot: "morning", specificTime: "07:15" },
      { text: "Feed Mochi — 1/3 cup dry food in the blue bowl on the counter", timeSlot: "morning", specificTime: "07:15" },
      { text: "Give Luna her glucosamine chew (bag on the kitchen counter)", timeSlot: "morning", specificTime: "07:15" },
      { text: "Walk Luna around the lake trail — 30 minutes", timeSlot: "morning", specificTime: "07:30", proofRequired: true },
      { text: "Check water bowls and refill if needed", timeSlot: "anytime" },
      { text: "Walk Luna — 20 min neighborhood loop around 5pm", timeSlot: "evening", specificTime: "17:00", proofRequired: true },
      { text: "Feed Luna dinner — 2 cups kibble", timeSlot: "evening", specificTime: "18:00" },
      { text: "Feed Mochi — 1 can wet food (Fancy Feast from the pantry)", timeSlot: "evening", specificTime: "18:00" },
      { text: "Plug in Mochi's heated bed in the living room", timeSlot: "evening", specificTime: "21:00" },
      { text: "Let Luna out one last time before bed (~10pm)", timeSlot: "evening", specificTime: "22:00" },
      { text: "Lock the back sliding door and check the front deadbolt", timeSlot: "evening", specificTime: "22:00" },
      { text: "Close all blinds before bed — Mochi gets spooked by raccoons", timeSlot: "evening", specificTime: "22:00" },
    ];
    const dailyInstructionIds: Id<"instructions">[] = [];
    for (const [i, task] of dailyTasks.entries()) {
      const id = await ctx.runMutation(api.instructions.create, {
        sectionId: dailyId,
        text: task.text,
        sortOrder: i,
        timeSlot: task.timeSlot,
        isRecurring: true,
        proofRequired: task.proofRequired ?? false,
        ...(task.specificTime ? { specificTime: task.specificTime } : {}),
      });
      dailyInstructionIds.push(id);
    }

    // Where Things Are (manual-only reference section)
    const whereId = await ctx.runMutation(api.sections.create, {
      propertyId,
      title: "Where Things Are",
      icon: "📍",
      sortOrder: 1,
      visibility: "manual",
    });
    for (const [i, text] of [
      "Thermostat is on the wall in the hallway by the kitchen",
      "Fuse box is in the garage, left wall behind the door",
      "Water shutoff valve is in the garage behind the bikes",
      "First aid kit is under the master bathroom sink",
      "Extra towels and linens are in the hall closet, top shelf",
    ].entries()) {
      await ctx.runMutation(api.instructions.create, {
        sectionId: whereId,
        text,
        sortOrder: i,
        timeSlot: "anytime",
        isRecurring: false,
        proofRequired: false,
      });
    }

    // House Rules
    const rulesId = await ctx.runMutation(api.sections.create, {
      propertyId,
      title: "House Rules",
      icon: "📋",
      sortOrder: 2,
      visibility: "manual",
    });
    for (const [i, task] of [
      "No shoes in the house — shoe rack by the front door",
      "Thermostat stays at 72°F — don't adjust below 68°F",
      "Recycling goes in the blue bin, trash in black (pickup is Thursday)",
      "Don't let Luna on the couch — she knows the rule but will test you",
    ].entries()) {
      await ctx.runMutation(api.instructions.create, {
        sectionId: rulesId,
        text: task,
        sortOrder: i,
        timeSlot: "anytime",
        isRecurring: true,
        proofRequired: false,
      });
    }

    // Plants & Garden
    const plantsId = await ctx.runMutation(api.sections.create, {
      propertyId,
      title: "Plants & Garden",
      icon: "🌿",
      sortOrder: 3,
    });
    await ctx.runMutation(api.instructions.create, {
      sectionId: plantsId,
      text: "Water indoor plants every other day — there are 6 pots on the windowsills",
      sortOrder: 0,
      timeSlot: "anytime",
      isRecurring: true,
      proofRequired: false,
    });
    await ctx.runMutation(api.instructions.create, {
      sectionId: plantsId,
      text: "Garden hose for the raised beds — 5 minutes each, every morning",
      sortOrder: 1,
      timeSlot: "morning",
      specificTime: "08:00",
      isRecurring: true,
      proofRequired: false,
    });
    await ctx.runMutation(api.instructions.create, {
      sectionId: plantsId,
      text: "Don't water the succulents on the porch — they're fine for a week",
      sortOrder: 2,
      timeSlot: "anytime",
      isRecurring: true,
      proofRequired: false,
    });
    console.log("✓ Manual sections created: Daily Routine, Where Things Are, House Rules, Plants");

    // ── 6. Create emergency contacts ───────────────────────────────────
    // (ASPCA auto-created by property.create; add more)
    await ctx.runMutation(api.emergencyContacts.create, {
      propertyId,
      name: "Jamie Chen",
      role: "Neighbor",
      phone: "5305559876",
      notes: "Lives next door (#744). Has a spare key. Knows Luna & Mochi well.",
      sortOrder: 1,
      isLocked: false,
    });
    await ctx.runMutation(api.emergencyContacts.create, {
      propertyId,
      name: "Dr. Sarah Mitchell",
      role: "Veterinarian",
      phone: "5305551234",
      notes: "Tahoe Pet Hospital, 200 Lake Blvd. Open M-F 8am–6pm, Sat 9am–1pm.",
      sortOrder: 2,
      isLocked: false,
    });
    await ctx.runMutation(api.emergencyContacts.create, {
      propertyId,
      name: "Mike Torres",
      role: "Plumber",
      phone: "5305554321",
      notes: "For emergencies — water shutoff valve is in the garage behind the bikes.",
      sortOrder: 3,
      isLocked: false,
    });
    console.log("✓ Emergency contacts created");

    // ── 7. Create vault items ──────────────────────────────────────────
    await ctx.runMutation(internal.vaultItems._insert, {
      propertyId,
      itemType: "wifi",
      label: "Home WiFi",
      encryptedValue: encryptValue("LakeTahoe2026!"),
      networkName: "LakeHouse5G",
      instructions: "Router is in the office closet.",
      sortOrder: 0,
    });
    await ctx.runMutation(internal.vaultItems._insert, {
      propertyId,
      itemType: "door_code",
      label: "Front Door Keypad",
      encryptedValue: encryptValue("4829"),
      instructions: "Press code then turn handle. Lock auto-engages after 30 seconds.",
      sortOrder: 1,
    });
    await ctx.runMutation(internal.vaultItems._insert, {
      propertyId,
      itemType: "alarm_code",
      label: "Alarm System",
      encryptedValue: encryptValue("7391"),
      instructions:
        "Panel is inside the front door to the left. Disarm within 30 seconds of entering. To re-arm: press ARM → AWAY.",
      sortOrder: 2,
    });
    await ctx.runMutation(internal.vaultItems._insert, {
      propertyId,
      itemType: "garage_code",
      label: "Garage Door",
      encryptedValue: encryptValue("5520"),
      instructions: "Keypad is to the right of the garage door outside.",
      sortOrder: 3,
    });
    console.log("✓ Vault items created: WiFi, Door, Alarm, Garage");

    // ── 8. Create trip (active, spanning today) ────────────────────────
    const today = new Date();
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 2); // started 2 days ago
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 5); // ends in 5 days

    const fmt = (d: Date) => d.toISOString().split("T")[0];
    const tripStartDate = fmt(startDate);
    const tripEndDate = fmt(endDate);
    const linkExpiry = new Date(tripEndDate + "T23:59:59.999Z").getTime();

    // Use low-level create to skip conflict check (first trip)
    const shareSlug = generateSlug();
    const tripId = await ctx.runMutation(api.trips.create, {
      propertyId,
      startDate: tripStartDate,
      endDate: tripEndDate,
      status: "active",
      shareLink: shareSlug,
      linkPassword: hashLinkPassword("demo"),
      linkExpiry,
    });
    console.log(`✓ Active trip created: ${tripStartDate} → ${tripEndDate}`);
    console.log(`  Share link slug: ${shareSlug} (password: demo)`);

    // ── 9. Create sitter ───────────────────────────────────────────────
    await ctx.runMutation(api.sitters.create, {
      tripId,
      name: "Alex Rivera",
      phone: "3035550101",
      vaultAccess: true,
    });
    console.log("✓ Sitter created: Alex Rivera");

    // ── 10. Create trip-specific overlay items ─────────────────────────
    const todayStr = fmt(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfterTomorrow = new Date(today);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
    const threeDaysOut = new Date(today);
    threeDaysOut.setDate(threeDaysOut.getDate() + 3);

    await ctx.runMutation(api.overlayItems.create, {
      tripId,
      text: "FedEx delivering a package — leave the porch light on",
      date: todayStr,
      timeSlot: "afternoon",
      specificTime: "14:00",
      proofRequired: false,
    });
    await ctx.runMutation(api.overlayItems.create, {
      tripId,
      text: "Bring trash & recycling bins to the curb (pickup is early morning)",
      date: fmt(tomorrow),
      timeSlot: "evening",
      specificTime: "20:00",
      proofRequired: false,
    });
    await ctx.runMutation(api.overlayItems.create, {
      tripId,
      text: "Jamie (neighbor) is dropping off a package — leave the garage open between 2-4pm",
      date: fmt(dayAfterTomorrow),
      timeSlot: "afternoon",
      specificTime: "14:00",
      proofRequired: false,
    });
    await ctx.runMutation(api.overlayItems.create, {
      tripId,
      text: "Gardener coming at 10am — keep Luna inside until noon",
      date: fmt(threeDaysOut),
      timeSlot: "morning",
      specificTime: "10:00",
      proofRequired: false,
    });
    console.log("✓ Overlay items created");

    // ── 11. Seed task completions (partially done morning) ────────────
    // Mark a few of today's morning tasks as completed so testers see
    // what an in-progress day looks like in the sitter view.
    const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
    const fiveAndHalfHoursAgo = Date.now() - 5.5 * 60 * 60 * 1000;
    const fiveHoursAgo = Date.now() - 5 * 60 * 60 * 1000;

    // "Let Luna out" — completed
    await ctx.runMutation(internal.seedHelpers.insertTaskCompletion, {
      tripId,
      taskRef: `recurring:${dailyInstructionIds[0]}:${todayStr}`,
      taskType: "recurring",
      sitterName: "Alex Rivera",
      completedAt: sixHoursAgo,
      date: todayStr,
    });
    // "Feed Luna" — completed
    await ctx.runMutation(internal.seedHelpers.insertTaskCompletion, {
      tripId,
      taskRef: `recurring:${dailyInstructionIds[1]}:${todayStr}`,
      taskType: "recurring",
      sitterName: "Alex Rivera",
      completedAt: fiveAndHalfHoursAgo,
      date: todayStr,
    });
    // "Feed Mochi" — completed
    await ctx.runMutation(internal.seedHelpers.insertTaskCompletion, {
      tripId,
      taskRef: `recurring:${dailyInstructionIds[2]}:${todayStr}`,
      taskType: "recurring",
      sitterName: "Alex Rivera",
      completedAt: fiveHoursAgo,
      date: todayStr,
    });
    console.log("✓ Task completions seeded (3 morning tasks done today)");

    // ── 12. Seed activity log entries ─────────────────────────────────
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const yesterday = Date.now() - 24 * 60 * 60 * 1000;

    await ctx.runMutation(internal.seedHelpers.insertActivity, {
      tripId,
      propertyId,
      eventType: "link_opened",
      sitterName: "Alex Rivera",
      createdAt: yesterday,
    });
    await ctx.runMutation(internal.seedHelpers.insertActivity, {
      tripId,
      propertyId,
      eventType: "task_completed",
      sitterName: "Alex Rivera",
      taskTitle: "Let Luna out to the backyard",
      createdAt: sixHoursAgo,
    });
    await ctx.runMutation(internal.seedHelpers.insertActivity, {
      tripId,
      propertyId,
      eventType: "task_completed",
      sitterName: "Alex Rivera",
      taskTitle: "Feed Luna — 2 cups kibble in the silver bowl by the pantry",
      createdAt: fiveAndHalfHoursAgo,
    });
    await ctx.runMutation(internal.seedHelpers.insertActivity, {
      tripId,
      propertyId,
      eventType: "task_completed",
      sitterName: "Alex Rivera",
      taskTitle: "Feed Mochi — 1/3 cup dry food in the blue bowl on the counter",
      createdAt: fiveHoursAgo,
    });
    await ctx.runMutation(internal.seedHelpers.insertActivity, {
      tripId,
      propertyId,
      eventType: "link_opened",
      sitterName: "Alex Rivera",
      createdAt: twoHoursAgo,
    });
    console.log("✓ Activity log seeded");

    // ── Done ───────────────────────────────────────────────────────────
    console.log("\n🎉 Demo account ready!");
    console.log(`   Login: ${EMAIL} / ${PASSWORD}`);
    console.log(`   Sitter link: /t/${shareSlug} (password: demo)`);
    return null;
  },
});
