/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as crons from "../crons.js";
import type * as emergencyContacts from "../emergencyContacts.js";
import type * as healthCheck from "../healthCheck.js";
import type * as instructions from "../instructions.js";
import type * as locationCards from "../locationCards.js";
import type * as manualView from "../manualView.js";
import type * as overlayItems from "../overlayItems.js";
import type * as pets from "../pets.js";
import type * as proof from "../proof.js";
import type * as properties from "../properties.js";
import type * as search from "../search.js";
import type * as sections from "../sections.js";
import type * as sitters from "../sitters.js";
import type * as storage from "../storage.js";
import type * as taskCompletions from "../taskCompletions.js";
import type * as trips from "../trips.js";
import type * as users from "../users.js";
import type * as vaultItems from "../vaultItems.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  authActions: typeof authActions;
  crons: typeof crons;
  emergencyContacts: typeof emergencyContacts;
  healthCheck: typeof healthCheck;
  instructions: typeof instructions;
  locationCards: typeof locationCards;
  manualView: typeof manualView;
  overlayItems: typeof overlayItems;
  pets: typeof pets;
  proof: typeof proof;
  properties: typeof properties;
  search: typeof search;
  sections: typeof sections;
  sitters: typeof sitters;
  storage: typeof storage;
  taskCompletions: typeof taskCompletions;
  trips: typeof trips;
  users: typeof users;
  vaultItems: typeof vaultItems;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
