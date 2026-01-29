/**
 * Convex functions for managing document request items
 * Optimized queries using schema indexes
 */

import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { getCurrentUser } from "./users"

// ==================== QUERIES ====================

/**
 * List document request items by document request ID
 * Uses by_documentRequestId index
 */
export const listByRequest = query({
  args: {
    documentRequestId: v.id("documentRequests"),
    status: v.optional(v.union(v.literal("pending"), v.literal("printed"))),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      // ✅ OPTIMIZED: Use composite index for efficient filtering
      return await ctx.db
        .query("documentRequestItems")
        .withIndex("by_documentRequestId_status", (q) =>
          q.eq("documentRequestId", args.documentRequestId).eq("status", args.status!)
        )
        .order("asc")
        .take(50) // ✅ OPTIMIZED: Limit items per request (should never exceed this)
    }

    // ✅ OPTIMIZED: Return all items for the request (with limit)
    return await ctx.db
      .query("documentRequestItems")
      .withIndex("by_documentRequestId", (q) =>
        q.eq("documentRequestId", args.documentRequestId)
      )
      .order("asc")
      .take(50) // ✅ OPTIMIZED: Limit items per request (should never exceed this)
  },
})

/**
 * Get document request item by ID
 */
export const get = query({
  args: { id: v.id("documentRequestItems") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

// ==================== MUTATIONS ====================

/**
 * Create a new document request item
 * Public users (via kiosk) can create items
 */
export const create = mutation({
  args: {
    documentRequestId: v.id("documentRequests"),
    documentTypeId: v.id("documentTypes"),
    purpose: v.string(),
  },
  handler: async (ctx, args) => {
    // Can be called by public users (kiosk) - no auth required
    // Validate that documentType exists and requiresPurpose if purpose is provided
    const documentType = await ctx.db.get(args.documentTypeId)
    if (!documentType) {
      throw new Error(`Document type ${args.documentTypeId} not found`)
    }

    if (documentType.requiresPurpose && !args.purpose.trim()) {
      throw new Error(`Purpose is required for ${documentType.name}`)
    }

    const now = Date.now()
    return await ctx.db.insert("documentRequestItems", {
      documentRequestId: args.documentRequestId,
      documentTypeId: args.documentTypeId,
      purpose: args.purpose,
      status: "pending",
      createdAt: now,
    })
  },
})

/**
 * Update purpose for a document request item
 * Staff can edit purpose before printing
 */
export const updatePurpose = mutation({
  args: {
    id: v.id("documentRequestItems"),
    purpose: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only staff can update purposes
    if (user.role !== "staff" && user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only staff can update purposes")
    }

    // Get the item to check if purpose is required
    const item = await ctx.db.get(args.id)
    if (!item) throw new Error("Document request item not found")

    const documentType = await ctx.db.get(item.documentTypeId)
    if (!documentType) throw new Error("Document type not found")

    if (documentType.requiresPurpose && !args.purpose.trim()) {
      throw new Error(`Purpose is required for ${documentType.name}`)
    }

    await ctx.db.patch(args.id, {
      purpose: args.purpose,
    })

    return args.id
  },
})

/**
 * Mark document request item as printed
 * Staff marks item as printed after generating PDF
 */
export const markPrinted = mutation({
  args: { id: v.id("documentRequestItems") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only staff can mark items as printed
    if (user.role !== "staff" && user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only staff can mark items as printed")
    }

    await ctx.db.patch(args.id, {
      status: "printed",
      printedAt: Date.now(),
    })

    return args.id
  },
})

/**
 * Mark all items in a request as printed
 * Used when staff prints all services at once
 */
export const markAllPrinted = mutation({
  args: { documentRequestId: v.id("documentRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only staff can mark items as printed
    if (user.role !== "staff" && user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only staff can mark items as printed")
    }

    // ✅ OPTIMIZED: Get all items for this request (with limit)
    const items = await ctx.db
      .query("documentRequestItems")
      .withIndex("by_documentRequestId", (q) =>
        q.eq("documentRequestId", args.documentRequestId)
      )
      .take(50) // ✅ OPTIMIZED: Limit items per request (should never exceed this)

    const now = Date.now()
    for (const item of items) {
      if (item.status !== "printed") {
        await ctx.db.patch(item._id, {
          status: "printed",
          printedAt: now,
        })
      }
    }

    return items.map((item) => item._id)
  },
})

/**
 * Create multiple document request items at once
 * Used when creating a request with multiple services
 */
export const createBatch = mutation({
  args: {
    documentRequestId: v.id("documentRequests"),
    items: v.array(
      v.object({
        documentTypeId: v.id("documentTypes"),
        purpose: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // Can be called by public users (kiosk)
    const now = Date.now()
    const createdIds = []

    for (const item of args.items) {
      // Validate document type
      const documentType = await ctx.db.get(item.documentTypeId)
      if (!documentType) {
        throw new Error(`Document type ${item.documentTypeId} not found`)
      }

      if (documentType.requiresPurpose && !item.purpose.trim()) {
        throw new Error(`Purpose is required for ${documentType.name}`)
      }

      const id = await ctx.db.insert("documentRequestItems", {
        documentRequestId: args.documentRequestId,
        documentTypeId: item.documentTypeId,
        purpose: item.purpose,
        status: "pending",
        createdAt: now,
      })

      createdIds.push(id)
    }

    return createdIds
  },
})
