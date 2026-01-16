/**
 * Convex functions for managing queue system
 * Optimized queries using schema indexes
 */

import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { getCurrentUser } from "./users"

// ==================== QUERIES ====================

/**
 * List all queue items with optional filtering
 * Uses by_status index for efficient filtering
 */
export const list = query({
  args: {
    status: v.optional(
      v.union(
        v.literal("waiting"),
        v.literal("serving"),
        v.literal("done"),
        v.literal("skipped")
      )
    ),
    counterNumber: v.optional(v.number()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // If counter number is provided, use by_counterNumber_status index
    if (args.counterNumber !== undefined && args.status !== undefined) {
      return await ctx.db
        .query("queue")
        .withIndex("by_counterNumber_status", (q) =>
          q.eq("counterNumber", args.counterNumber!).eq("status", args.status!)
        )
        .order("asc") // Oldest first
        .take(args.limit ?? 100)
    }

    // If only status is provided, use by_status_createdAt index for ordering
    if (args.status !== undefined) {
      return await ctx.db
        .query("queue")
        .withIndex("by_status_createdAt", (q) => q.eq("status", args.status!))
        .order("asc") // Oldest first (FIFO)
        .take(args.limit ?? 100)
    }

    // If only counter number is provided, scan and filter (less efficient, but rare)
    if (args.counterNumber !== undefined) {
      const allItems = await ctx.db
        .query("queue")
        .withIndex("by_status", (q) => q.eq("status", "waiting"))
        .take(1000)
      return allItems
        .filter((item: any) => item.counterNumber === args.counterNumber)
        .slice(0, args.limit ?? 100)
    }

    // Default: return all queue items (limited)
    return await ctx.db
      .query("queue")
      .order("asc")
      .take(args.limit ?? 100)
  },
})

/**
 * Get queue item by queue number (Q-001 format)
 * Uses by_queueNumber index
 */
export const getByQueueNumber = query({
  args: { queueNumber: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("queue")
      .withIndex("by_queueNumber", (q) => q.eq("queueNumber", args.queueNumber))
      .first()
  },
})

/**
 * Get queue item by document request ID
 * documentRequestId is unique in queue table
 */
export const getByRequestId = query({
  args: { documentRequestId: v.id("documentRequests") },
  handler: async (ctx, args) => {
    // Scan queue items (should be small set, or could add index later)
    const allItems = await ctx.db.query("queue").collect()
    return allItems.find((item: any) => item.documentRequestId === args.documentRequestId) || null
  },
})

/**
 * Get queue items by status
 * Uses by_status_createdAt index for efficient ordering
 */
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("waiting"),
      v.literal("serving"),
      v.literal("done"),
      v.literal("skipped")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", args.status))
      .order("asc") // FIFO - oldest first
      .take(args.limit ?? 100)
  },
})

/**
 * Get active queue (waiting + serving)
 * Optimized for queue display screens
 */
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const waiting = await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "waiting"))
      .order("asc")
      .collect()

    const serving = await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "serving"))
      .order("asc")
      .collect()

    return {
      waiting,
      serving,
      all: [...waiting, ...serving].sort((a, b) => a.createdAt - b.createdAt),
    }
  },
})

/**
 * Get all queue data for display screen (waiting + serving + done)
 * Optimized single query for queue display - reduces from 3 queries to 1
 * Uses indexed queries for each status
 */
export const getDisplayData = query({
  args: {
    doneLimit: v.optional(v.number()), // Limit for done items (default: 10)
  },
  handler: async (ctx, args) => {
    // All three queries run in parallel on the server
    const waiting = await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "waiting"))
      .order("asc")
      .collect()

    const serving = await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "serving"))
      .order("asc")
      .collect()

    const done = await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "done"))
      .order("asc")
      .take(args.doneLimit ?? 10)

    return {
      waiting,
      serving,
      done,
    }
  },
})

/**
 * Get queue items with document request and resident details for staff dashboard
 * Optimized query that includes all necessary data for staff queue management
 */
export const getStaffQueueData = query({
  args: {
    counterNumber: v.optional(v.number()), // Filter by counter number (optional)
  },
  handler: async (ctx, args) => {
    // Get all queue items with their statuses
    const waiting = await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "waiting"))
      .order("asc")
      .collect()

    const serving = await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "serving"))
      .order("asc")
      .collect()

    const done = await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "done"))
      .order("desc") // Most recent first for claim section
      .take(20) // Show last 20 completed items

    // Enrich with document request and resident details
    const enrichQueueItem = async (item: any) => {
      const documentRequest = await ctx.db.get(item.documentRequestId)
      if (!documentRequest) {
        return { ...item, documentRequest: null, resident: null }
      }

      // documentRequest has residentId field from schema
      const residentId = (documentRequest as any).residentId
      if (!residentId) {
        return { ...item, documentRequest, resident: null }
      }

      const resident = await ctx.db.get(residentId)
      return {
        ...item,
        documentRequest,
        resident,
      }
    }

    // Enrich all items in parallel
    const [enrichedWaiting, enrichedServing, enrichedDone] = await Promise.all([
      Promise.all(waiting.map(enrichQueueItem)),
      Promise.all(serving.map(enrichQueueItem)),
      Promise.all(done.map(enrichQueueItem)),
    ])

    // Filter by counter number if provided
    let filteredWaiting = enrichedWaiting
    let filteredServing = enrichedServing

    if (args.counterNumber !== undefined) {
      filteredWaiting = enrichedWaiting.filter(
        (item) => item.counterNumber === args.counterNumber
      )
      filteredServing = enrichedServing.filter(
        (item) => item.counterNumber === args.counterNumber
      )
    }

    return {
      waiting: filteredWaiting,
      serving: filteredServing,
      done: enrichedDone,
      counts: {
        waiting: filteredWaiting.length,
        serving: filteredServing.length,
        done: enrichedDone.length,
        total: filteredWaiting.length + filteredServing.length + enrichedDone.length,
      },
    }
  },
})

// ==================== MUTATIONS ====================

/**
 * Generate next queue number (Q-001 format, resets daily)
 * Finds the highest queue number for today and increments
 */
async function generateNextQueueNumber(ctx: any): Promise<string> {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayStart = today.getTime()

  // Get all queue items created today
  const allQueueItems = await ctx.db.query("queue").collect()
  const todayItems = allQueueItems.filter((item: any) => item.createdAt >= todayStart)

  let maxNumber = 0

  for (const item of todayItems) {
    const match = item.queueNumber.match(/Q-(\d+)/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNumber) maxNumber = num
    }
  }

  const nextNumber = (maxNumber + 1).toString().padStart(3, "0")
  return `Q-${nextNumber}`
}

/**
 * Create a new queue item
 * Public (kiosk) can create queue items when submitting requests
 */
export const create = mutation({
  args: {
    documentRequestId: v.id("documentRequests"),
    serviceType: v.optional(v.string()), // Default: 'certificate'
  },
  handler: async (ctx, args) => {
    // ✅ PUBLIC: Kiosk can create queue items (no auth required)

    // Check if queue item already exists for this request
    const allItems = await ctx.db.query("queue").collect()
    const existing = allItems.find(
      (item: any) => item.documentRequestId === args.documentRequestId
    )

    if (existing) {
      throw new Error(
        `Queue item already exists for document request ${args.documentRequestId}`
      )
    }

    // Generate queue number
    const queueNumber = await generateNextQueueNumber(ctx)

    const now = Date.now()
    const queueId = await ctx.db.insert("queue", {
      documentRequestId: args.documentRequestId,
      queueNumber,
      serviceType: args.serviceType || "certificate",
      status: "waiting",
      createdAt: now,
    })

    // Update document request status to "queued"
    await ctx.db.patch(args.documentRequestId, {
      status: "queued",
    })

    return queueId
  },
})

/**
 * Update queue status
 * Staff can update queue status (e.g., waiting → serving → done)
 */
export const updateStatus = mutation({
  args: {
    id: v.id("queue"),
    status: v.union(
      v.literal("waiting"),
      v.literal("serving"),
      v.literal("done"),
      v.literal("skipped")
    ),
    counterNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only staff can update queue
    if (user.role !== "staff" && user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only staff can update queue")
    }

    const updates: any = {
      status: args.status,
    }

    // Set startedAt when status becomes "serving"
    if (args.status === "serving") {
      updates.startedAt = Date.now()
      updates.servedBy = user.externalId // Store Clerk user ID
    }

    // Set completedAt when status becomes "done"
    if (args.status === "done") {
      updates.completedAt = Date.now()
    }

    // Update counter number if provided
    if (args.counterNumber !== undefined) {
      updates.counterNumber = args.counterNumber
    }

    await ctx.db.patch(args.id, updates)
    return args.id
  },
})

/**
 * Process next queue item (Staff action)
 * Marks queue as "serving" and assigns counter
 * Updates document request status to "serving"
 */
export const processNext = mutation({
  args: {
    counterNumber: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only staff can process queue
    if (user.role !== "staff" && user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only staff can process queue")
    }

    // Get oldest waiting item (FIFO)
    const nextItem = await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "waiting"))
      .order("asc")
      .first()

    if (!nextItem) {
      throw new Error("No items in queue")
    }

    // Update queue item to "serving"
    await ctx.db.patch(nextItem._id, {
      status: "serving",
      startedAt: Date.now(),
      servedBy: user.externalId,
      counterNumber: args.counterNumber,
    })

    // Update document request status to "serving"
    await ctx.db.patch(nextItem.documentRequestId, {
      status: "serving",
    })

    // Return both queue ID and documentRequestId for easier navigation
    return {
      queueId: nextItem._id,
      documentRequestId: nextItem.documentRequestId,
    }
  },
})

/**
 * Mark queue item as done (ready for claim)
 * Called after staff prints certificates and marks request items as printed
 * Updates queue status to "done" and document request to "completed"
 */
export const markDone = mutation({
  args: { id: v.id("queue") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only staff can mark as done
    if (user.role !== "staff" && user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only staff can mark items as done")
    }

    const queueItem = await ctx.db.get(args.id)
    if (!queueItem) {
      throw new Error("Queue item not found")
    }

    // Update queue status to "done" (ready for claim)
    await ctx.db.patch(args.id, {
      status: "done",
      completedAt: Date.now(),
    })

    // Update document request status to "completed"
    await ctx.db.patch(queueItem.documentRequestId, {
      status: "completed",
      completedAt: Date.now(),
    })

    return args.id
  },
})
