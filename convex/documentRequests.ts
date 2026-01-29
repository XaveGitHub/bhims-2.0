/**
 * Convex functions for managing document requests
 * Optimized queries using schema indexes
 */

import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { getCurrentUser } from "./users"

// ==================== QUERIES ====================

/**
 * List all document requests with optional filtering
 * Uses indexes for efficient filtering
 * Supports filtering by status, date range, resident, and document type
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("queued"),
        v.literal("serving"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
    startDate: v.optional(v.number()), // Timestamp
    endDate: v.optional(v.number()), // Timestamp
    residentId: v.optional(v.id("residents")),
    documentTypeId: v.optional(v.id("documentTypes")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const offset = args.offset ?? 0

    let requests: any[]

    // Use appropriate index based on filters
    if (args.status) {
      // Use composite index for status + date filtering
      requests = await ctx.db
        .query("documentRequests")
        .withIndex("by_status_requestedAt", (q) => q.eq("status", args.status!))
        .order("desc") // Newest first
        .take((limit + offset) * 2) // Fetch more to account for date/resident filtering
    } else if (args.residentId) {
      // Use resident index
      requests = await ctx.db
        .query("documentRequests")
        .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId!))
        .order("desc")
        .take((limit + offset) * 2)
    } else {
      // Default: use requestedAt index
      requests = await ctx.db
        .query("documentRequests")
        .withIndex("by_requestedAt")
        .order("desc")
        .take((limit + offset) * 2)
    }

    // Apply date range filter if provided
    if (args.startDate || args.endDate) {
      requests = requests.filter((req) => {
        if (args.startDate && req.requestedAt < args.startDate) return false
        if (args.endDate && req.requestedAt > args.endDate) return false
        return true
      })
    }

    // If filtering by document type, we need to check documentRequestItems
    if (args.documentTypeId) {
      // Get all document request items for these requests
      const requestIds = requests.map((r) => r._id)
      const allItems = await Promise.all(
        requestIds.map((id) =>
          ctx.db
            .query("documentRequestItems")
            .withIndex("by_documentRequestId", (q) => q.eq("documentRequestId", id))
            .collect()
        )
      )

      // Filter requests that have items with the specified document type
      const filteredRequestIds = new Set(
        allItems
          .flatMap((items, idx) =>
            items.some((item) => item.documentTypeId === args.documentTypeId)
              ? [requestIds[idx]]
              : []
          )
      )

      requests = requests.filter((req) => filteredRequestIds.has(req._id))
    }

    // Apply pagination
    return requests.slice(offset, offset + limit)
  },
})

/**
 * Get document request by ID
 */
export const get = query({
  args: { id: v.id("documentRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/**
 * Get document request with all related data for staff process page
 * Returns request with resident, items, document types, and queue info
 */
export const getForProcessing = query({
  args: { id: v.id("documentRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id)
    if (!request) return null

    // Get resident
    const resident = await ctx.db.get(request.residentId)
    if (!resident) return null

    // ✅ OPTIMIZED: Get all items for this request (items per request are typically < 10)
    // Using index + collect is acceptable here since items per request are small
    const items = await ctx.db
      .query("documentRequestItems")
      .withIndex("by_documentRequestId", (q) =>
        q.eq("documentRequestId", args.id)
      )
      .order("asc")
      .take(50) // ✅ OPTIMIZED: Add limit for safety (should never exceed this)

    // Batch fetch document types
    const documentTypeIds = [...new Set(items.map((item: any) => item.documentTypeId))]
    const documentTypes = await Promise.all(
      documentTypeIds.map((id) => ctx.db.get(id))
    )
    const documentTypeMap = new Map(
      documentTypes.filter(Boolean).map((dt: any) => [dt._id, dt])
    )

    // Enrich items with document type info
    const enrichedItems = items.map((item: any) => ({
      ...item,
      documentType: documentTypeMap.get(item.documentTypeId) || null,
    }))

    // Get queue info if exists (using index for efficient lookup)
    // Since documentRequestId is unique, we can query efficiently with the index
    const queueItem = await ctx.db
      .query("queue")
      .withIndex("by_documentRequestId", (q) => q.eq("documentRequestId", args.id))
      .first() || null

    return {
      request,
      resident,
      items: enrichedItems,
      queue: queueItem || null,
    }
  },
})

/**
 * Get document requests by resident ID
 * Uses by_residentId index
 */
export const listByResident = query({
  args: {
    residentId: v.id("residents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentRequests")
      .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId))
      .order("desc") // Newest first
      .take(args.limit ?? 100)
  },
})

/**
 * Get document requests by status
 * Uses by_status_requestedAt index
 */
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("serving"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentRequests")
      .withIndex("by_status_requestedAt", (q) => q.eq("status", args.status))
      .order("desc") // Newest first
      .take(args.limit ?? 100)
  },
})

/**
 * List document requests with enriched data for transactions page
 * Returns requests with resident info, document types, and queue info
 * Supports filtering by status, date range, resident, and document type
 */
export const listEnriched = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("queued"),
        v.literal("serving"),
        v.literal("completed"),
        v.literal("cancelled")
      )
    ),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    residentId: v.optional(v.id("residents")),
    documentTypeId: v.optional(v.id("documentTypes")),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const offset = args.offset ?? 0

    // Get filtered requests using the list query logic
    let requests: any[]

    if (args.status) {
      requests = await ctx.db
        .query("documentRequests")
        .withIndex("by_status_requestedAt", (q) => q.eq("status", args.status!))
        .order("desc")
        .take((limit + offset) * 2)
    } else if (args.residentId) {
      requests = await ctx.db
        .query("documentRequests")
        .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId!))
        .order("desc")
        .take((limit + offset) * 2)
    } else {
      requests = await ctx.db
        .query("documentRequests")
        .withIndex("by_requestedAt")
        .order("desc")
        .take((limit + offset) * 2)
    }

    // Apply date range filter
    if (args.startDate || args.endDate) {
      requests = requests.filter((req) => {
        if (args.startDate && req.requestedAt < args.startDate) return false
        if (args.endDate && req.requestedAt > args.endDate) return false
        return true
      })
    }

    // Filter by document type if provided
    if (args.documentTypeId) {
      const requestIds = requests.map((r) => r._id)
      const allItems = await Promise.all(
        requestIds.map((id) =>
          ctx.db
            .query("documentRequestItems")
            .withIndex("by_documentRequestId", (q) => q.eq("documentRequestId", id))
            .collect()
        )
      )
      const filteredRequestIds = new Set(
        allItems
          .flatMap((items, idx) =>
            items.some((item) => item.documentTypeId === args.documentTypeId)
              ? [requestIds[idx]]
              : []
          )
      )
      requests = requests.filter((req) => filteredRequestIds.has(req._id))
    }

    // Apply pagination
    const paginatedRequests = requests.slice(offset, offset + limit)

    // Enrich with resident data
    const residentIds = [...new Set(paginatedRequests.map((r) => r.residentId))]
    const residents = await Promise.all(residentIds.map((id) => ctx.db.get(id)))
    const residentMap = new Map(
      residents.filter(Boolean).map((r: any) => [r._id, r])
    )

    // Enrich with document request items and document types
    const requestIds = paginatedRequests.map((r) => r._id)
    const allItems = await Promise.all(
      requestIds.map((id) =>
        ctx.db
          .query("documentRequestItems")
          .withIndex("by_documentRequestId", (q) => q.eq("documentRequestId", id))
          .collect()
      )
    )

    const documentTypeIds = [
      ...new Set(allItems.flatMap((items) => items.map((item: any) => item.documentTypeId))),
    ]
    const documentTypes = await Promise.all(
      documentTypeIds.map((id) => ctx.db.get(id))
    )
    const documentTypeMap = new Map(
      documentTypes.filter(Boolean).map((dt: any) => [dt._id, dt])
    )

    // Enrich items with document type info
    const enrichedItemsByRequest = allItems.map((items) =>
      items.map((item: any) => ({
        ...item,
        documentType: documentTypeMap.get(item.documentTypeId) || null,
      }))
    )

    // Get queue info
    const queueItems = await Promise.all(
      requestIds.map((id) =>
        ctx.db
          .query("queue")
          .withIndex("by_documentRequestId", (q) => q.eq("documentRequestId", id))
          .first()
      )
    )
    const queueMap = new Map(
      queueItems.filter(Boolean).map((q: any) => [q.documentRequestId, q])
    )

    // Combine everything
    return paginatedRequests.map((request, idx) => ({
      ...request,
      resident: residentMap.get(request.residentId) || null,
      items: enrichedItemsByRequest[idx] || [],
      queue: queueMap.get(request._id) || null,
    }))
  },
})

/**
 * Get document requests for staff dashboard
 * Returns requests grouped by status (queued, serving, completed)
 * Enriched with resident and document type information
 * Optimized with limits and error handling
 */
export const getStaffRequests = query({
  args: {
    queuedLimit: v.optional(v.number()), // Limit for queued requests (default: 50)
    servingLimit: v.optional(v.number()), // Limit for serving requests (default: 20)
  },
  handler: async (ctx, args) => {
    // Get requests by status with reasonable limits
    const queued = await ctx.db
      .query("documentRequests")
      .withIndex("by_status_requestedAt", (q) => q.eq("status", "queued"))
      .order("asc") // Oldest first (FIFO)
      .take(args.queuedLimit ?? 50) // Limit to prevent fetching too many

    const serving = await ctx.db
      .query("documentRequests")
      .withIndex("by_status_requestedAt", (q) => q.eq("status", "serving"))
      .order("asc") // Oldest first
      .take(args.servingLimit ?? 20) // Limit serving requests

    const completed = await ctx.db
      .query("documentRequests")
      .withIndex("by_status_requestedAt", (q) => q.eq("status", "completed"))
      .order("desc") // Most recent first
      .take(20) // Show last 20 completed

    // Collect all requests for batch processing
    const allRequests = [...queued, ...serving, ...completed]
    
    // Batch fetch all residents (unique IDs)
    const residentIds = [...new Set(allRequests.map((r: any) => r.residentId))]
    const residents = await Promise.all(
      residentIds.map((id) => ctx.db.get(id))
    )
    const residentMap = new Map(
      residents.filter(Boolean).map((r: any) => [r._id, r])
    )

    // ✅ OPTIMIZED: Get all document request items for all requests (with limit)
    const allItems = await Promise.all(
      allRequests.map((request: any) =>
        ctx.db
          .query("documentRequestItems")
          .withIndex("by_documentRequestId", (q) => q.eq("documentRequestId", request._id))
          .take(50) // ✅ OPTIMIZED: Limit items per request (should never exceed this)
      )
    )
    const flatItems = allItems.flat()

    // Batch fetch all document types (unique IDs)
    const documentTypeIds = [...new Set(flatItems.map((item: any) => item.documentTypeId))]
    const documentTypes = await Promise.all(
      documentTypeIds.map((id) => ctx.db.get(id))
    )
    const documentTypeMap = new Map(
      documentTypes.filter(Boolean).map((dt: any) => [dt._id, dt])
    )

    // Create items map by request ID
    const itemsByRequestId = new Map<string, any[]>()
    flatItems.forEach((item: any) => {
      const requestId = item.documentRequestId
      if (!itemsByRequestId.has(requestId)) {
        itemsByRequestId.set(requestId, [])
      }
      itemsByRequestId.get(requestId)!.push({
        ...item,
        documentType: documentTypeMap.get(item.documentTypeId) || null,
      })
    })

    // Enrich requests with batched data
    const enrichRequest = (request: any) => ({
      ...request,
      resident: residentMap.get(request.residentId) || null,
      items: itemsByRequestId.get(request._id) || [],
    })

    // Enrich all requests (no async needed, using pre-fetched data)
    const enrichedQueued = queued.map(enrichRequest)
    const enrichedServing = serving.map(enrichRequest)
    const enrichedCompleted = completed.map(enrichRequest)

    return {
      queued: enrichedQueued,
      serving: enrichedServing,
      completed: enrichedCompleted,
      counts: {
        queued: enrichedQueued.length,
        serving: enrichedServing.length,
        completed: enrichedCompleted.length,
        total: enrichedQueued.length + enrichedServing.length + enrichedCompleted.length,
      },
    }
  },
})

// ==================== MUTATIONS ====================

/**
 * Generate unique request number
 * ✅ OPTIMIZED: Uses by_requestedAt index to query only today's requests
 * Format: REQ-YYYYMMDD-001 (increments daily)
 */
async function generateRequestNumber(ctx: any): Promise<string> {
  const today = new Date()
  const todayStart = new Date(today)
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date(today)
  todayEnd.setHours(23, 59, 59, 999)
  
  const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, "") // YYYYMMDD

  // ✅ OPTIMIZED: Query only today's requests using by_requestedAt index
  const todayRequests = await ctx.db
    .query("documentRequests")
    .withIndex("by_requestedAt", (q: any) =>
      q.gte("requestedAt", todayStart.getTime()).lte("requestedAt", todayEnd.getTime())
    )
    .collect()

  let maxNumber = 0

  for (const req of todayRequests) {
    const match = req.requestNumber.match(new RegExp(`${datePrefix}-(\\d+)`))
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNumber) maxNumber = num
    }
  }

  const nextNumber = (maxNumber + 1).toString().padStart(3, "0")
  return `REQ-${datePrefix}-${nextNumber}`
}

/**
 * Create a new document request
 * Public users (via kiosk) can create requests
 * Creates request with status "pending", then should be moved to "queued" when queue item is created
 */
export const create = mutation({
  args: {
    residentId: v.id("residents"),
    totalPrice: v.number(), // In cents, sum of all documentRequestItems
    requestNumber: v.optional(v.string()), // Optional - will auto-generate
  },
  handler: async (ctx, args) => {
    // Note: This can be called by public users (kiosk), so no auth check needed
    // Or we can make it require auth - depends on requirements
    // For now, allowing public creation (kiosk use case)

    // Generate request number if not provided
    const requestNumber = args.requestNumber || (await generateRequestNumber(ctx))

    // ✅ OPTIMIZED: Check if request number already exists using today's requests only
    // Since request numbers are unique per day, we only need to check today's requests
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    
    const todayRequests = await ctx.db
      .query("documentRequests")
      .withIndex("by_requestedAt", (q) =>
        q.gte("requestedAt", todayStart.getTime()).lte("requestedAt", todayEnd.getTime())
      )
      .collect()
    
    const existing = todayRequests.find((req) => req.requestNumber === requestNumber)

    if (existing) {
      throw new Error(`Request number ${requestNumber} already exists`)
    }

    const now = Date.now()
    return await ctx.db.insert("documentRequests", {
      residentId: args.residentId,
      requestNumber,
      status: "pending", // Will be changed to "queued" when queue item is created
      totalPrice: args.totalPrice,
      requestedAt: now,
    })
  },
})

/**
 * Update document request status
 * Staff/Admin can update request status
 */
export const updateStatus = mutation({
  args: {
    id: v.id("documentRequests"),
    status: v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("serving"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, args) => {
    // Optional: Check auth if you want to restrict to staff/admin
    // For now, allowing updates (queue system will update status)

    const updates: any = {
      status: args.status,
    }

    // Set completedAt when status becomes "completed"
    if (args.status === "completed") {
      updates.completedAt = Date.now()
    }

    await ctx.db.patch(args.id, updates)
    return args.id
  },
})

/**
 * Complete document request
 * Marks request as completed and sets completedAt timestamp
 */
export const complete = mutation({
  args: { id: v.id("documentRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only staff/admin can complete requests
    if (user.role !== "staff" && user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only staff can complete requests")
    }

    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: Date.now(),
    })

    return args.id
  },
})

/**
 * Mark request as claim (all services printed, ready for resident to claim)
 * Also updates queue status to "done"
 */
export const markAsClaim = mutation({
  args: { id: v.id("documentRequests") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only staff can mark as claim
    if (user.role !== "staff" && user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only staff can mark requests as claim")
    }

    // ✅ OPTIMIZED: Check that all items are printed (with limit)
    const items = await ctx.db
      .query("documentRequestItems")
      .withIndex("by_documentRequestId", (q) =>
        q.eq("documentRequestId", args.id)
      )
      .take(50) // ✅ OPTIMIZED: Limit items per request

    const allPrinted = items.every((item: any) => item.status === "printed")
    if (!allPrinted) {
      throw new Error("Cannot mark as claim: Not all services have been printed")
    }

    // Update request status to "completed" (claim is represented by completed status)
    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: Date.now(),
    })

    // Update queue status to "done" if queue item exists
    const allQueueItems = await ctx.db.query("queue").collect()
    const queueItem = allQueueItems.find((q: any) => q.documentRequestId === args.id)
    if (queueItem) {
      await ctx.db.patch(queueItem._id, {
        status: "done",
        completedAt: Date.now(),
      })
    }

    return args.id
  },
})
