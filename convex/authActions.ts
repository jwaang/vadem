"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { randomBytes, pbkdf2Sync, sign as cryptoSign } from "node:crypto";
import type { Id } from "./_generated/dataModel";

function generateSalt(): string {
  return randomBytes(32).toString("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("hex");
}

function hashPassword(password: string, salt: string): string {
  return pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// Sign up: create a new user account and return a session token
export const signUp = action({
  args: { email: v.string(), password: v.string(), originTripId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<{ token: string; email: string }> => {
    const existing = await ctx.runQuery(internal.auth._getUserByEmail, {
      email: args.email,
    });
    if (existing) throw new Error("An account with this email already exists");

    const salt = generateSalt();
    const passwordHash = hashPassword(args.password, salt);

    const userId = (await ctx.runMutation(internal.auth._createUser, {
      email: args.email,
      passwordHash,
      salt,
    })) as Id<"users">;

    const token = generateToken();
    await ctx.runMutation(internal.auth._createSession, {
      userId,
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    // Record sitter-to-creator conversion if originTripId is provided
    if (args.originTripId) {
      try {
        await ctx.runMutation(internal.trips.recordConversionInternal, {
          sitterUserId: userId,
          originTripId: args.originTripId as Id<"trips">,
        });
      } catch {
        // Non-critical — don't fail signup if conversion recording fails
      }
    }

    return { token, email: args.email };
  },
});

// Sign in: validate credentials and return a session token
export const signIn = action({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args): Promise<{ token: string; email: string }> => {
    const user = await ctx.runQuery(internal.auth._getUserByEmail, {
      email: args.email,
    });
    if (!user) throw new Error("Invalid email or password");
    if (!user.passwordHash || !user.salt)
      throw new Error("This account uses social login. Please sign in with Google or Apple.");

    const passwordHash = hashPassword(args.password, user.salt);
    if (passwordHash !== user.passwordHash)
      throw new Error("Invalid email or password");

    const token = generateToken();
    await ctx.runMutation(internal.auth._createSession, {
      userId: user._id,
      token,
      expiresAt: Date.now() + SESSION_TTL_MS,
    });

    return { token, email: user.email };
  },
});

// Exchange an OAuth authorization code for a session token.
// Handles Google and Apple, creating or merging accounts by email.
export const exchangeOAuthCode = action({
  args: {
    provider: v.union(v.literal("google"), v.literal("apple")),
    code: v.string(),
    redirectUri: v.string(),
  },
  handler: async (ctx, args): Promise<{ token: string; email: string }> => {
    let email: string;
    let providerId: string;

    if (args.provider === "google") {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      if (!clientId || !clientSecret) {
        throw new Error("Google OAuth is not configured on this deployment");
      }

      // Exchange authorization code for access token
      const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: args.code,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: args.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        throw new Error(`Google token exchange failed: ${errBody}`);
      }

      const tokenData = (await tokenRes.json()) as { access_token: string };

      // Fetch user profile
      const userRes = await fetch(
        "https://www.googleapis.com/oauth2/v3/userinfo",
        { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
      );
      if (!userRes.ok) throw new Error("Failed to fetch Google user info");

      const userData = (await userRes.json()) as { sub: string; email: string };
      email = userData.email;
      providerId = userData.sub;

      // Find or create user, linking Google ID
      let userId: Id<"users">;
      const byGoogleId = await ctx.runQuery(internal.auth._getUserByGoogleId, {
        googleId: providerId,
      });
      if (byGoogleId) {
        userId = byGoogleId._id;
      } else {
        const byEmail = await ctx.runQuery(internal.auth._getUserByEmail, {
          email,
        });
        if (byEmail) {
          // Merge: link Google to the existing email-based account
          await ctx.runMutation(internal.auth._linkOAuthProvider, {
            userId: byEmail._id,
            googleId: providerId,
          });
          userId = byEmail._id;
        } else {
          // New user via Google
          userId = (await ctx.runMutation(internal.auth._createUser, {
            email,
            googleId: providerId,
          })) as Id<"users">;
        }
      }

      const token = generateToken();
      await ctx.runMutation(internal.auth._createSession, {
        userId,
        token,
        expiresAt: Date.now() + SESSION_TTL_MS,
      });
      return { token, email };
    }

    if (args.provider === "apple") {
      const clientId = process.env.APPLE_CLIENT_ID;
      const teamId = process.env.APPLE_TEAM_ID;
      const keyId = process.env.APPLE_KEY_ID;
      const privateKeyPem = process.env.APPLE_PRIVATE_KEY;
      if (!clientId || !teamId || !keyId || !privateKeyPem) {
        throw new Error("Apple OAuth is not configured on this deployment");
      }

      // Build client secret JWT (ES256, valid 6 months)
      const now = Math.floor(Date.now() / 1000);
      const jwtHeader = Buffer.from(
        JSON.stringify({ alg: "ES256", kid: keyId }),
      ).toString("base64url");
      const jwtPayload = Buffer.from(
        JSON.stringify({
          iss: teamId,
          iat: now,
          exp: now + 15777000, // ~6 months
          aud: "https://appleid.apple.com",
          sub: clientId,
        }),
      ).toString("base64url");

      // Apple requires ES256 = ECDSA-SHA256 in IEEE P1363 format (raw R+S bytes).
      // Node's createSign returns DER-encoded signatures — use crypto.sign() with
      // dsaEncoding: 'ieee-p1363' to get the correct format for JWT.
      const signingInput = `${jwtHeader}.${jwtPayload}`;
      const sig = cryptoSign(
        "SHA256",
        Buffer.from(signingInput),
        { key: privateKeyPem.replace(/\\n/g, "\n"), dsaEncoding: "ieee-p1363" },
      ).toString("base64url");
      const appleClientSecret = `${signingInput}.${sig}`;

      // Exchange authorization code for tokens
      const tokenRes = await fetch("https://appleid.apple.com/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: args.code,
          client_id: clientId,
          client_secret: appleClientSecret,
          redirect_uri: args.redirectUri,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenRes.ok) {
        const errBody = await tokenRes.text();
        throw new Error(`Apple token exchange failed: ${errBody}`);
      }

      const tokenData = (await tokenRes.json()) as { id_token: string };

      // Decode Apple id_token (JWT) — we only need payload, no signature verify needed
      // since this token came directly from Apple's token endpoint over HTTPS
      const idTokenParts = tokenData.id_token.split(".");
      const idTokenPayload = JSON.parse(
        Buffer.from(idTokenParts[1], "base64url").toString("utf-8"),
      ) as { sub: string; email?: string };

      providerId = idTokenPayload.sub;
      email = idTokenPayload.email ?? "";
      if (!email) throw new Error("Apple did not return an email address");

      // Find or create user, linking Apple ID
      let userId: Id<"users">;
      const byAppleId = await ctx.runQuery(internal.auth._getUserByAppleId, {
        appleId: providerId,
      });
      if (byAppleId) {
        userId = byAppleId._id;
      } else {
        const byEmail = await ctx.runQuery(internal.auth._getUserByEmail, {
          email,
        });
        if (byEmail) {
          await ctx.runMutation(internal.auth._linkOAuthProvider, {
            userId: byEmail._id,
            appleId: providerId,
          });
          userId = byEmail._id;
        } else {
          userId = (await ctx.runMutation(internal.auth._createUser, {
            email,
            appleId: providerId,
          })) as Id<"users">;
        }
      }

      const token = generateToken();
      await ctx.runMutation(internal.auth._createSession, {
        userId,
        token,
        expiresAt: Date.now() + SESSION_TTL_MS,
      });
      return { token, email };
    }

    throw new Error("Unknown OAuth provider");
  },
});
