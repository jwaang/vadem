"use node";

/**
 * Vault encryption actions — runs in Node.js runtime for access to crypto APIs.
 *
 * KEY MANAGEMENT STRATEGY
 * ========================
 * One symmetric AES-256-GCM key per Convex deployment, stored as a base64-encoded
 * 32-byte value in the VAULT_ENCRYPTION_KEY environment variable (Convex dashboard →
 * Settings → Environment Variables).
 *
 * Generating a key:
 *   openssl rand -base64 32
 *
 * KEY ROTATION PROCEDURE
 * ----------------------
 * 1. Generate a new key:   openssl rand -base64 32
 * 2. Add VAULT_ENCRYPTION_KEY_PREVIOUS = <old key> to Convex env vars.
 * 3. Set VAULT_ENCRYPTION_KEY = <new key> in Convex env vars.
 * 4. Deploy a one-time migration action that:
 *    a. Queries all vaultItems via an internal query.
 *    b. Tries decrypting each item with the new key; on failure, decrypts
 *       with VAULT_ENCRYPTION_KEY_PREVIOUS.
 *    c. Re-encrypts with the new key and patches via _patchEncrypted.
 * 5. Once migration is verified, remove VAULT_ENCRYPTION_KEY_PREVIOUS.
 *
 * Note: encryptedValue stores AES-256-GCM ciphertext + auth tag + IV as a
 * base64 JSON string: { iv: string, ciphertext: string }
 * The 16-byte GCM auth tag is appended to the ciphertext before encoding.
 */

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const TAG_LENGTH = 16; // GCM auth tag is always 128 bits

function getEncryptionKey(): Buffer {
  const keyBase64 = process.env.VAULT_ENCRYPTION_KEY;
  if (!keyBase64) {
    throw new Error("VAULT_ENCRYPTION_KEY environment variable is not set");
  }
  const keyBuffer = Buffer.from(keyBase64, "base64");
  if (keyBuffer.length !== 32) {
    throw new Error(
      "VAULT_ENCRYPTION_KEY must be a base64-encoded 32-byte (256-bit) key",
    );
  }
  return keyBuffer;
}

/**
 * Encrypt a plaintext string with AES-256-GCM.
 * Returns a base64 JSON string: { iv, ciphertext }
 * The GCM auth tag (16 bytes) is appended to the ciphertext before encoding.
 */
function encryptValue(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(12); // 96-bit IV — recommended for GCM
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(Buffer.from(plaintext, "utf8")),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag(); // 128-bit tag
  const ciphertextWithTag = Buffer.concat([encrypted, authTag]);
  return JSON.stringify({
    iv: iv.toString("base64"),
    ciphertext: ciphertextWithTag.toString("base64"),
  });
}

/**
 * Decrypt an AES-256-GCM value produced by encryptValue.
 * Throws if authentication fails (tampered data or wrong key).
 */
function decryptValue(encryptedJson: string): string {
  const key = getEncryptionKey();
  const parsed = JSON.parse(encryptedJson) as { iv: string; ciphertext: string };
  const iv = Buffer.from(parsed.iv, "base64");
  const ciphertextWithTag = Buffer.from(parsed.ciphertext, "base64");
  // Last TAG_LENGTH bytes are the GCM auth tag
  const authTag = ciphertextWithTag.subarray(ciphertextWithTag.length - TAG_LENGTH);
  const ciphertext = ciphertextWithTag.subarray(0, ciphertextWithTag.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

const vaultItemType = v.union(
  v.literal("door_code"),
  v.literal("alarm_code"),
  v.literal("wifi"),
  v.literal("gate_code"),
  v.literal("garage_code"),
  v.literal("safe_combination"),
  v.literal("custom"),
);

/**
 * Create a vault item — encrypts the plaintext value server-side before storing.
 * Never sends the plaintext to the database; only the ciphertext+IV is stored.
 */
export const createVaultItem = action({
  args: {
    propertyId: v.id("properties"),
    itemType: vaultItemType,
    label: v.string(),
    value: v.string(), // plaintext — encrypted before storage, never persisted
    instructions: v.optional(v.string()),
    locationCardId: v.optional(v.id("locationCards")),
    sortOrder: v.number(),
  },
  returns: v.id("vaultItems"),
  handler: async (ctx, args): Promise<Id<"vaultItems">> => {
    const encryptedValue = encryptValue(args.value);
    return await ctx.runMutation(internal.vaultItems._insert, {
      propertyId: args.propertyId,
      itemType: args.itemType,
      label: args.label,
      encryptedValue,
      instructions: args.instructions,
      locationCardId: args.locationCardId,
      sortOrder: args.sortOrder,
    });
  },
});

/**
 * Re-encrypt and update the value for an existing vault item.
 * Called when the owner edits a vault item's code or password.
 */
export const updateVaultItemValue = action({
  args: {
    vaultItemId: v.id("vaultItems"),
    value: v.string(), // plaintext — will be re-encrypted before storage
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const encryptedValue = encryptValue(args.value);
    await ctx.runMutation(internal.vaultItems._patchEncrypted, {
      vaultItemId: args.vaultItemId,
      encryptedValue,
    });
    return null;
  },
});

// ── SMS PIN verification helpers ──────────────────────────────────────────────

const PIN_TTL_MS = 10 * 60 * 1000; // 10 minutes — pending PIN validity
const MAX_PIN_ATTEMPTS = 3;

/** Normalize a US phone number to 10 digits only (strip formatting and leading 1). */
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;
}

/** Hash a PIN with a salt using SHA-256. */
function hashPin(pin: string, salt: string): string {
  return createHash("sha256").update(`${pin}${salt}`).digest("hex");
}

/**
 * Send a 6-digit SMS PIN to the sitter for vault verification.
 *
 * Validates that the sitter is registered for the trip with vaultAccess=true,
 * generates and stores a hashed PIN, then sends it via Twilio SMS.
 * In development (no Twilio env vars), logs the PIN to the console instead.
 */
export const sendSmsPin = action({
  args: {
    tripId: v.id("trips"),
    sitterPhone: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({
      success: v.literal(false),
      error: v.union(
        v.literal("TRIP_INACTIVE"),
        v.literal("NOT_REGISTERED"),
        v.literal("VAULT_ACCESS_DENIED"),
      ),
    }),
  ),
  handler: async (ctx, args): Promise<
    | { success: true }
    | { success: false; error: "TRIP_INACTIVE" | "NOT_REGISTERED" | "VAULT_ACCESS_DENIED" }
  > => {
    // 1. Validate trip is active
    const trip = await ctx.runQuery(internal.trips._getById, { tripId: args.tripId });
    if (!trip || trip.status !== "active") {
      return { success: false as const, error: "TRIP_INACTIVE" as const };
    }

    // 2. Find sitter by normalized phone (handles formatting differences)
    const normalizedInput = normalizePhone(args.sitterPhone);
    const allSitters = await ctx.runQuery(internal.sitters._listByTrip, { tripId: args.tripId });
    const sitter = allSitters.find(
      (s) => s.phone !== undefined && normalizePhone(s.phone) === normalizedInput,
    );
    if (!sitter) {
      return { success: false as const, error: "NOT_REGISTERED" as const };
    }
    if (!sitter.vaultAccess) {
      return { success: false as const, error: "VAULT_ACCESS_DENIED" as const };
    }

    // 3. Generate and hash a 6-digit PIN
    const pin = String(Math.floor(100000 + Math.random() * 900000));
    const salt = randomBytes(16).toString("hex");
    const hashedPin = hashPin(pin, salt);
    const expiresAt = Date.now() + PIN_TTL_MS;

    // 4. Store PIN with normalized phone (canonical form for consistent lookup)
    await ctx.runMutation(internal.vaultPins._upsert, {
      tripId: args.tripId,
      sitterPhone: normalizedInput,
      hashedPin,
      salt,
      expiresAt,
    });

    // 5. Send SMS via Twilio, or log PIN in development
    const twilioSid = process.env.TWILIO_ACCOUNT_SID;
    const twilioToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioFrom = process.env.TWILIO_PHONE_NUMBER;

    if (twilioSid && twilioToken && twilioFrom) {
      try {
        // Use E.164 format for Twilio
        const toPhone = normalizedInput.length === 10 ? `+1${normalizedInput}` : `+${normalizedInput}`;
        const body = `Your Handoff vault code is: ${pin}. Valid for 10 minutes. Do not share this code.`;
        const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ To: toPhone, From: twilioFrom, Body: body }).toString(),
        });
        if (!res.ok) {
          const errText = await res.text();
          console.error("[Twilio] SMS send failed:", errText);
          // PIN is stored — sitter can retry; don't expose Twilio errors to client
        }
      } catch (err) {
        console.error("[Twilio] SMS send error:", err);
      }
    } else {
      // Development fallback: log the PIN so the flow can be tested without Twilio
      console.log(`[DEV] Vault PIN for ${sitter.phone ?? normalizedInput} (trip ${args.tripId}): ${pin}`);
    }

    return { success: true as const };
  },
});

/**
 * Verify a 6-digit SMS PIN for vault access.
 *
 * Checks expiry, attempt count, and hash match. On success, marks the record as a
 * verified session (extends expiry to 24h, clears PIN hash).
 */
export const verifyPin = action({
  args: {
    tripId: v.id("trips"),
    sitterPhone: v.string(),
    pin: v.string(), // 6-digit PIN as string
  },
  returns: v.union(
    v.object({ success: v.literal(true) }),
    v.object({
      success: v.literal(false),
      error: v.union(
        v.literal("NOT_FOUND"),
        v.literal("EXPIRED"),
        v.literal("MAX_ATTEMPTS"),
        v.literal("INVALID_PIN"),
      ),
    }),
  ),
  handler: async (ctx, args): Promise<
    | { success: true }
    | { success: false; error: "NOT_FOUND" | "EXPIRED" | "MAX_ATTEMPTS" | "INVALID_PIN" }
  > => {
    const normalizedPhone = normalizePhone(args.sitterPhone);
    const record = await ctx.runQuery(internal.vaultPins._getByTripAndPhone, {
      tripId: args.tripId,
      sitterPhone: normalizedPhone,
    });

    if (!record || record.verified) {
      // No pending PIN (either never sent, or already verified/used)
      return { success: false as const, error: "NOT_FOUND" as const };
    }
    if (Date.now() > record.expiresAt) {
      await ctx.runMutation(internal.vaultPins._delete, { pinId: record._id });
      return { success: false as const, error: "EXPIRED" as const };
    }
    if (record.attemptCount >= MAX_PIN_ATTEMPTS) {
      return { success: false as const, error: "MAX_ATTEMPTS" as const };
    }

    const expectedHash = hashPin(args.pin, record.salt);
    if (expectedHash !== record.hashedPin) {
      await ctx.runMutation(internal.vaultPins._incrementAttempt, { pinId: record._id });
      return { success: false as const, error: "INVALID_PIN" as const };
    }

    // Correct PIN — promote to verified session (24h)
    await ctx.runMutation(internal.vaultPins._markVerified, { pinId: record._id });
    return { success: true as const };
  },
});

/**
 * Return all decrypted vault items for a property — only for authorized, PIN-verified sitters.
 *
 * More efficient than calling getDecryptedVaultItem N times: performs the three-layer
 * access check once, then decrypts all items and resolves location card URLs in a single call.
 * Logs a vault_accessed event to the activity log on success.
 *
 * Access control (three-layer check):
 *  1. Trip must have status === 'active' and belong to the given property.
 *  2. Sitter phone must be registered for the trip with vaultAccess === true.
 *  3. Sitter must have a valid, unexpired SMS PIN verification session.
 */
export const getDecryptedVaultItems = action({
  args: {
    propertyId: v.id("properties"),
    tripId: v.id("trips"),
    sitterPhone: v.string(),
  },
  returns: v.union(
    v.object({
      success: v.literal(true),
      items: v.array(
        v.object({
          id: v.string(),
          label: v.string(),
          itemType: vaultItemType,
          instructions: v.optional(v.string()),
          value: v.string(),
          locationCard: v.optional(
            v.object({
              caption: v.string(),
              roomTag: v.optional(v.string()),
              photoUrl: v.optional(v.string()),
              videoUrl: v.optional(v.string()),
            }),
          ),
        }),
      ),
    }),
    v.object({
      success: v.literal(false),
      error: v.union(
        v.literal("TRIP_INACTIVE"),
        v.literal("NOT_REGISTERED"),
        v.literal("VAULT_ACCESS_DENIED"),
        v.literal("NOT_VERIFIED"),
      ),
    }),
  ),
  handler: async (
    ctx,
    args,
  ): Promise<
    | {
        success: true;
        items: Array<{
          id: string;
          label: string;
          itemType:
            | "door_code"
            | "alarm_code"
            | "wifi"
            | "gate_code"
            | "garage_code"
            | "safe_combination"
            | "custom";
          instructions?: string;
          value: string;
          locationCard?: {
            caption: string;
            roomTag?: string;
            photoUrl?: string;
            videoUrl?: string;
          };
        }>;
      }
    | {
        success: false;
        error: "TRIP_INACTIVE" | "NOT_REGISTERED" | "VAULT_ACCESS_DENIED" | "NOT_VERIFIED";
      }
  > => {
    const normalizedPhone = normalizePhone(args.sitterPhone);

    // 1. Verify trip is active and belongs to the given property
    const trip = await ctx.runQuery(internal.trips._getById, { tripId: args.tripId });
    if (!trip || trip.propertyId !== args.propertyId || trip.status !== "active") {
      return { success: false as const, error: "TRIP_INACTIVE" as const };
    }

    // 2. Verify sitter is registered for this trip with vault access
    const allSitters = await ctx.runQuery(internal.sitters._listByTrip, { tripId: args.tripId });
    const sitter = allSitters.find(
      (s) => s.phone !== undefined && normalizePhone(s.phone) === normalizedPhone,
    );
    if (!sitter) {
      return { success: false as const, error: "NOT_REGISTERED" as const };
    }
    if (!sitter.vaultAccess) {
      return { success: false as const, error: "VAULT_ACCESS_DENIED" as const };
    }

    // 3. Verify SMS PIN session — must have a valid, non-expired verified session
    const pinRecord = await ctx.runQuery(internal.vaultPins._getByTripAndPhone, {
      tripId: args.tripId,
      sitterPhone: normalizedPhone,
    });
    if (!pinRecord || !pinRecord.verified || Date.now() > pinRecord.expiresAt) {
      return { success: false as const, error: "NOT_VERIFIED" as const };
    }

    // 4. Fetch all vault items for the property and decrypt each
    const rawItems = await ctx.runQuery(internal.vaultItems._listByPropertyFull, {
      propertyId: args.propertyId,
    });

    const items = await Promise.all(
      rawItems.map(async (item) => {
        let value: string;
        try {
          value = decryptValue(item.encryptedValue);
        } catch {
          throw new Error("Failed to decrypt vault item. Contact support if this persists.");
        }

        let locationCard:
          | { caption: string; roomTag?: string; photoUrl?: string; videoUrl?: string }
          | undefined;
        if (item.locationCardId) {
          const card = await ctx.runQuery(internal.locationCards._getByIdWithUrl, {
            cardId: item.locationCardId,
          });
          if (card) {
            locationCard = {
              caption: card.caption,
              roomTag: card.roomTag,
              photoUrl: card.photoUrl,
              videoUrl: card.videoUrl,
            };
          }
        }

        return {
          id: item._id as string,
          label: item.label,
          itemType: item.itemType,
          instructions: item.instructions,
          value,
          locationCard,
        };
      }),
    );

    // 5. Log vault access to the activity log
    await ctx.runMutation(internal.vaultItems._logVaultAccess, {
      tripId: args.tripId,
      propertyId: args.propertyId,
    });

    return { success: true as const, items };
  },
});

/**
 * Return a decrypted vault item value — only for authorized, PIN-verified sitters.
 *
 * Access control (three-layer check):
 *  1. Trip must have status === 'active' for the vault item's property.
 *  2. Sitter phone must be registered for the trip with vaultAccess === true.
 *  3. Sitter must have a valid, unexpired SMS PIN verification session.
 *
 * Returns a discriminated union so callers can show typed error messages
 * without leaking information about what specifically failed.
 */
export const getDecryptedVaultItem = action({
  args: {
    vaultItemId: v.id("vaultItems"),
    tripId: v.id("trips"),
    sitterPhone: v.string(),
  },
  returns: v.union(
    v.object({ success: v.literal(true), value: v.string() }),
    v.object({
      success: v.literal(false),
      error: v.union(
        v.literal("ITEM_NOT_FOUND"),
        v.literal("TRIP_INACTIVE"),
        v.literal("NOT_REGISTERED"),
        v.literal("VAULT_ACCESS_DENIED"),
        v.literal("NOT_VERIFIED"),
      ),
    }),
  ),
  handler: async (ctx, args): Promise<
    | { success: true; value: string }
    | {
        success: false;
        error:
          | "ITEM_NOT_FOUND"
          | "TRIP_INACTIVE"
          | "NOT_REGISTERED"
          | "VAULT_ACCESS_DENIED"
          | "NOT_VERIFIED";
      }
  > => {
    const normalizedPhone = normalizePhone(args.sitterPhone);

    // 1. Load the vault item (internal — includes encryptedValue)
    const item = await ctx.runQuery(internal.vaultItems._getById, {
      vaultItemId: args.vaultItemId,
    });
    if (!item) {
      return { success: false as const, error: "ITEM_NOT_FOUND" as const };
    }

    // 2. Verify the trip is active and belongs to the same property
    const trip = await ctx.runQuery(internal.trips._getById, {
      tripId: args.tripId,
    });
    if (!trip || trip.propertyId !== item.propertyId || trip.status !== "active") {
      return { success: false as const, error: "TRIP_INACTIVE" as const };
    }

    // 3. Verify the sitter is registered for this trip with vault access
    const allSitters = await ctx.runQuery(internal.sitters._listByTrip, { tripId: args.tripId });
    const sitter = allSitters.find(
      (s) => s.phone !== undefined && normalizePhone(s.phone) === normalizedPhone,
    );
    if (!sitter) {
      return { success: false as const, error: "NOT_REGISTERED" as const };
    }
    if (!sitter.vaultAccess) {
      return { success: false as const, error: "VAULT_ACCESS_DENIED" as const };
    }

    // 4. Verify SMS PIN session — must have a valid, non-expired verified session
    const pinRecord = await ctx.runQuery(internal.vaultPins._getByTripAndPhone, {
      tripId: args.tripId,
      sitterPhone: normalizedPhone,
    });
    if (!pinRecord || !pinRecord.verified || Date.now() > pinRecord.expiresAt) {
      return { success: false as const, error: "NOT_VERIFIED" as const };
    }

    // 5. Decrypt and return the value
    try {
      const value = decryptValue(item.encryptedValue);
      return { success: true as const, value };
    } catch {
      throw new Error("Failed to decrypt vault item. Contact support if this persists.");
    }
  },
});
