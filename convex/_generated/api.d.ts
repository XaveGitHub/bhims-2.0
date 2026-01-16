/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as barangayOfficials from "../barangayOfficials.js";
import type * as documentRequestItems from "../documentRequestItems.js";
import type * as documentRequests from "../documentRequests.js";
import type * as documentTypes from "../documentTypes.js";
import type * as http from "../http.js";
import type * as kiosk from "../kiosk.js";
import type * as queue from "../queue.js";
import type * as residents from "../residents.js";
import type * as statistics from "../statistics.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  barangayOfficials: typeof barangayOfficials;
  documentRequestItems: typeof documentRequestItems;
  documentRequests: typeof documentRequests;
  documentTypes: typeof documentTypes;
  http: typeof http;
  kiosk: typeof kiosk;
  queue: typeof queue;
  residents: typeof residents;
  statistics: typeof statistics;
  users: typeof users;
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
