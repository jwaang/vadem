/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activityLog from "../activityLog.js";
import type * as auth from "../auth.js";
import type * as authActions from "../authActions.js";
import type * as crons from "../crons.js";
import type * as emergencyContacts from "../emergencyContacts.js";
import type * as healthCheck from "../healthCheck.js";
import type * as instructions from "../instructions.js";
import type * as locationCards from "../locationCards.js";
import type * as manualView from "../manualView.js";
import type * as notifications from "../notifications.js";
import type * as overlayItems from "../overlayItems.js";
import type * as pets from "../pets.js";
import type * as phoneUtils from "../phoneUtils.js";
import type * as proof from "../proof.js";
import type * as properties from "../properties.js";
import type * as search from "../search.js";
import type * as shareActions from "../shareActions.js";
import type * as sections from "../sections.js";
import type * as sitters from "../sitters.js";
import type * as storage from "../storage.js";
import type * as taskCompletions from "../taskCompletions.js";
import type * as todayView from "../todayView.js";
import type * as trips from "../trips.js";
import type * as users from "../users.js";
import type * as vaultAccessLog from "../vaultAccessLog.js";
import type * as vaultActions from "../vaultActions.js";
import type * as vaultItems from "../vaultItems.js";
import type * as vaultPins from "../vaultPins.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activityLog: typeof activityLog;
  auth: typeof auth;
  authActions: typeof authActions;
  crons: typeof crons;
  emergencyContacts: typeof emergencyContacts;
  healthCheck: typeof healthCheck;
  instructions: typeof instructions;
  locationCards: typeof locationCards;
  manualView: typeof manualView;
  notifications: typeof notifications;
  overlayItems: typeof overlayItems;
  pets: typeof pets;
  phoneUtils: typeof phoneUtils;
  proof: typeof proof;
  properties: typeof properties;
  search: typeof search;
  shareActions: typeof shareActions;
  sections: typeof sections;
  sitters: typeof sitters;
  storage: typeof storage;
  taskCompletions: typeof taskCompletions;
  todayView: typeof todayView;
  trips: typeof trips;
  users: typeof users;
  vaultAccessLog: typeof vaultAccessLog;
  vaultActions: typeof vaultActions;
  vaultItems: typeof vaultItems;
  vaultPins: typeof vaultPins;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
