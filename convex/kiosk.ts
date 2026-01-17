/**
 * Convex functions for kiosk operations
 * Simplified, optimized workflow for public kiosk submissions
 */

import { v } from "convex/values"
import { mutation } from "./_generated/server"

/**
 * Submit complete request from kiosk
 * Creates: documentRequest + documentRequestItems + queue item
 * Public access (no auth required)
 * 
 * This is the main kiosk submission endpoint - handles everything in one call
 */
export const submitRequest = mutation({
  args: {
    // Resident info (can be existing residentId or null for new guest)
    residentId: v.optional(v.id("residents")),
    
    // Guest resident data (if residentId not provided)
    guestResident: v.optional(
      v.object({
        firstName: v.string(),
        middleName: v.string(),
        lastName: v.string(),
        suffix: v.optional(v.string()),
        sex: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
        birthdate: v.number(),
        purok: v.string(),
        seniorOrPwd: v.union(
          v.literal("none"),
          v.literal("senior"),
          v.literal("pwd"),
          v.literal("both")
        ),
      })
    ),
    
    // Document request items (certificates)
    items: v.array(
      v.object({
        documentTypeId: v.id("documentTypes"),
        purpose: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    // ✅ PUBLIC: No auth required (kiosk is public)

    // Step 1: Handle resident (existing or create guest)
    let finalResidentId = args.residentId

    if (!finalResidentId && args.guestResident) {
      // Create guest resident (status: pending)
      finalResidentId = await ctx.db.insert("residents", {
        residentId: "GUEST-TEMP", // Will be updated later by admin
        firstName: args.guestResident.firstName,
        middleName: args.guestResident.middleName,
        lastName: args.guestResident.lastName,
        suffix: args.guestResident.suffix,
        sex: args.guestResident.sex,
        birthdate: args.guestResident.birthdate,
        purok: args.guestResident.purok,
        seniorOrPwd: args.guestResident.seniorOrPwd,
        status: "pending", // Guest record
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    if (!finalResidentId) {
      throw new Error("Either residentId or guestResident must be provided")
    }

    // Step 2: Calculate total price from document types
    let totalPrice = 0
    for (const item of args.items) {
      const docType = await ctx.db.get(item.documentTypeId)
      if (!docType) {
        throw new Error(`Document type ${item.documentTypeId} not found`)
      }
      if (!docType.isActive) {
        throw new Error(`Document type ${docType.name} is not active`)
      }
      totalPrice += docType.price
    }

    // Step 3: Generate request number
    // ✅ OPTIMIZED: Use by_requestedAt index to query only today's requests
    const today = new Date()
    const todayStart = new Date(today)
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(today)
    todayEnd.setHours(23, 59, 59, 999)
    
    const datePrefix = today.toISOString().slice(0, 10).replace(/-/g, "")
    
    // ✅ OPTIMIZED: Query only today's requests using by_requestedAt index
    const todayRequests = await ctx.db
      .query("documentRequests")
      .withIndex("by_requestedAt", (q) =>
        q.gte("requestedAt", todayStart.getTime()).lte("requestedAt", todayEnd.getTime())
      )
      .collect()
    
    let maxNum = 0
    for (const req of todayRequests) {
      const match = req.requestNumber?.match(new RegExp(`${datePrefix}-(\\d+)`))
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNum) maxNum = num
      }
    }
    const requestNumber = `REQ-${datePrefix}-${(maxNum + 1).toString().padStart(3, "0")}`

    // Step 4: Create document request
    const now = Date.now()
    const documentRequestId = await ctx.db.insert("documentRequests", {
      residentId: finalResidentId,
      requestNumber,
      status: "pending", // Will be "queued" after queue item is created
      totalPrice,
      requestedAt: now,
    })

    // Step 5: Create document request items
    for (const item of args.items) {
      const docType = await ctx.db.get(item.documentTypeId)
      if (docType?.requiresPurpose && !item.purpose.trim()) {
        throw new Error(`Purpose is required for ${docType.name}`)
      }

      await ctx.db.insert("documentRequestItems", {
        documentRequestId,
        documentTypeId: item.documentTypeId,
        purpose: item.purpose,
        status: "pending",
        createdAt: now,
      })
    }

    // Step 6: Generate queue number
    // ✅ OPTIMIZED: Use by_status_createdAt index to query only today's queue items
    const queueTodayStart = new Date(today)
    queueTodayStart.setHours(0, 0, 0, 0)
    
    // ✅ OPTIMIZED: Query today's queue items using by_status_createdAt index
    // Query recent items (last 1000) and filter by date client-side
    // This is more efficient than .collect() all items
    const recentItems = await ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q) => q.eq("status", "waiting"))
      .order("desc") // Newest first
      .take(1000) // ✅ OPTIMIZED: Limit to 1000 (should cover a day's worth)
    
    // Filter to only today's items
    const todayItems = recentItems.filter(
      (item: any) => item.createdAt >= queueTodayStart.getTime()
    )
    
    let maxQueueNum = 0
    for (const item of todayItems) {
      const match = item.queueNumber?.match(/Q-(\d+)/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxQueueNum) maxQueueNum = num
      }
    }
    const queueNumber = `Q-${(maxQueueNum + 1).toString().padStart(3, "0")}`

    // Step 7: Create queue item
    await ctx.db.insert("queue", {
      documentRequestId,
      queueNumber,
      serviceType: "certificate",
      status: "waiting",
      createdAt: now,
    })

    // Step 8: Update document request status to "queued"
    await ctx.db.patch(documentRequestId, {
      status: "queued",
    })

    // Return queue number for display
    return {
      queueNumber,
      documentRequestId,
      residentId: finalResidentId,
    }
  },
})
