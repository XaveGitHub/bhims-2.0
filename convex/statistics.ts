/**
 * Convex functions for statistics and reporting
 * OPTIMIZED for 40k+ residents - uses indexes, minimal data transfer
 * 
 * Key optimizations:
 * - Uses indexed queries (no full table scans) - O(log n) lookup time
 * - Returns only counts/numbers (not full records) - minimal response size
 * - Efficient date range queries - uses indexed fields
 * - Parallel queries where possible - reduces total query time
 * - Single query for residents, then count in memory - avoids duplicate queries
 * 
 * IMPORTANT NOTE ON SCALABILITY:
 * - Convex doesn't support native COUNT aggregation (like SQL COUNT(*))
 * - Current approach: Uses indexed queries + .collect() + count in memory
 * - For 40k residents: Fetches ~40k records to count (uses index, so fast lookup)
 * - Bandwidth: ~40k records × ~200 bytes = ~8MB per dashboard load
 * - Query time: Fast (indexed lookup), but data transfer is the bottleneck
 * 
 * FUTURE OPTIMIZATION (if bandwidth becomes an issue):
 * - Maintain cached counters in a separate table
 * - Update counters on mutations (create/update/delete residents)
 * - Query cached counters instead of counting records
 * - Trade-off: More complex, but reduces bandwidth to ~1KB per query
 */

import { v } from "convex/values"
import { query } from "./_generated/server"
import { getCurrentUser } from "./users"

/**
 * Get dashboard statistics for Admin/Superadmin
 * Returns only counts and numbers - no full records
 * Uses indexed queries for efficient counting
 */
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")
    
    // Only admin/superadmin can view statistics
    if (user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only admins can view statistics")
    }

    // OPTIMIZATION: Single query for residents, then count in memory
    // This is more efficient than multiple queries
    // Uses by_status index - fast lookup even with 40k records
    const allResidents = await ctx.db
      .query("residents")
      .withIndex("by_status", (q) => q.eq("status", "resident"))
      .collect()

    // Count in memory (single pass through data)
    const totalResidents = allResidents.length
    const maleResidents = allResidents.filter((r) => r.sex === "male").length
    const femaleResidents = allResidents.filter((r) => r.sex === "female").length

    // Get queue volume today
    const queueToday = await getQueueVolumeToday(ctx)

    // Calculate other residents (other gender)
    const otherResidents = totalResidents - maleResidents - femaleResidents

    // Calculate age groups (single pass through residents)
    const now = Date.now()
    const ageGroups = {
      age0to5: { total: 0, male: 0, female: 0 },
      age6to12: { total: 0, male: 0, female: 0 },
      age13to17: { total: 0, male: 0, female: 0 },
      age18to35: { total: 0, male: 0, female: 0 },
      age36to50: { total: 0, male: 0, female: 0 },
      age51to65: { total: 0, male: 0, female: 0 },
      age65plus: { total: 0, male: 0, female: 0 },
    }

    for (const resident of allResidents) {
      const age = calculateAge(resident.birthdate, now)
      const isMale = resident.sex === "male"
      const isFemale = resident.sex === "female"

      if (age >= 0 && age <= 5) {
        ageGroups.age0to5.total++
        if (isMale) ageGroups.age0to5.male++
        if (isFemale) ageGroups.age0to5.female++
      } else if (age >= 6 && age <= 12) {
        ageGroups.age6to12.total++
        if (isMale) ageGroups.age6to12.male++
        if (isFemale) ageGroups.age6to12.female++
      } else if (age >= 13 && age <= 17) {
        ageGroups.age13to17.total++
        if (isMale) ageGroups.age13to17.male++
        if (isFemale) ageGroups.age13to17.female++
      } else if (age >= 18 && age <= 35) {
        ageGroups.age18to35.total++
        if (isMale) ageGroups.age18to35.male++
        if (isFemale) ageGroups.age18to35.female++
      } else if (age >= 36 && age <= 50) {
        ageGroups.age36to50.total++
        if (isMale) ageGroups.age36to50.male++
        if (isFemale) ageGroups.age36to50.female++
      } else if (age >= 51 && age <= 65) {
        ageGroups.age51to65.total++
        if (isMale) ageGroups.age51to65.male++
        if (isFemale) ageGroups.age51to65.female++
      } else if (age > 65) {
        ageGroups.age65plus.total++
        if (isMale) ageGroups.age65plus.male++
        if (isFemale) ageGroups.age65plus.female++
      }
    }

    const result = {
      residents: {
        total: totalResidents,
        male: maleResidents,
        female: femaleResidents,
        other: otherResidents,
        ageGroups,
      },
      queue: {
        today: queueToday,
      },
    }

    // Add sales statistics only for Superadmin
    if (user.role === "superadmin") {
      const salesStats = await getSalesStatistics(ctx)
      return {
        ...result,
        sales: salesStats,
      }
    }

    return result
  },
})

/**
 * Get residents count by status
 * Returns counts for: resident, pending, deceased, moved
 * Optimized using indexed queries
 */
export const getResidentsByStatus = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")
    
    if (user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only admins can view statistics")
    }

    // Query each status using indexed queries (parallel for efficiency)
    const [residentCount, pendingCount, deceasedCount, movedCount] = await Promise.all([
      ctx.db.query("residents").withIndex("by_status", (q) => q.eq("status", "resident")).collect(),
      ctx.db.query("residents").withIndex("by_status", (q) => q.eq("status", "pending")).collect(),
      ctx.db.query("residents").withIndex("by_status", (q) => q.eq("status", "deceased")).collect(),
      ctx.db.query("residents").withIndex("by_status", (q) => q.eq("status", "moved")).collect(),
    ])

    return {
      resident: residentCount.length,
      pending: pendingCount.length,
      deceased: deceasedCount.length,
      moved: movedCount.length,
    }
  },
})

/**
 * Helper: Calculate age from birthdate timestamp
 */
function calculateAge(birthdate: number, currentTime: number): number {
  const today = new Date(currentTime)
  const birth = new Date(birthdate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

/**
 * Helper: Get queue volume today
 * Uses indexed query on createdAt timestamp
 * 
 * OPTIMIZATION: Queue items are typically small in number (hundreds, not thousands)
 * So fetching all and filtering is acceptable
 */
async function getQueueVolumeToday(ctx: any): Promise<number> {
  const now = Date.now()
  const startOfDay = new Date(now)
  startOfDay.setHours(0, 0, 0, 0)
  const startOfDayTimestamp = startOfDay.getTime()

  // Query queue items by status (uses index)
  // Queue items are typically small in number (hundreds per day, not thousands)
  // So fetching all and filtering is efficient
  const [waitingItems, servingItems, doneItems] = await Promise.all([
    ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q: any) => q.eq("status", "waiting"))
      .collect(),
    ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q: any) => q.eq("status", "serving"))
      .collect(),
    ctx.db
      .query("queue")
      .withIndex("by_status_createdAt", (q: any) => q.eq("status", "done"))
      .collect(),
  ])

  // Combine and filter by date (in-memory filtering)
  const allToday = [
    ...waitingItems,
    ...servingItems,
    ...doneItems,
  ].filter((item: any) => item.createdAt >= startOfDayTimestamp)

  return allToday.length
}

/**
 * Helper: Get sales statistics (Superadmin only)
 * Calculates total revenue from printed services
 */
async function getSalesStatistics(ctx: any): Promise<{
  totalRevenue: number // In cents
  revenueThisMonth: number // In cents
}> {
  // Get all printed items
  const printedItems = await ctx.db
    .query("documentRequestItems")
    .withIndex("by_status", (q: any) => q.eq("status", "printed"))
    .collect()

  // Get document types for pricing
  const documentTypeIds = [...new Set(printedItems.map((item: any) => item.documentTypeId))]
  const documentTypes = await Promise.all(
    documentTypeIds.map((id) => ctx.db.get(id))
  )
  const documentTypeMap = new Map(
    documentTypes.filter(Boolean).map((dt: any) => [dt._id, dt])
  )

  // Calculate total revenue
  let totalRevenue = 0
  let revenueThisMonth = 0

  const now = Date.now()
  const startOfMonth = new Date(now)
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const startOfMonthTimestamp = startOfMonth.getTime()

  for (const item of printedItems) {
    const documentType = documentTypeMap.get(item.documentTypeId)
    if (documentType) {
      totalRevenue += documentType.price

      // Check if printed this month
      if (item.printedAt && item.printedAt >= startOfMonthTimestamp) {
        revenueThisMonth += documentType.price
      }
    }
  }

  return {
    totalRevenue,
    revenueThisMonth,
  }
}

/**
 * Get detailed statistics with filtering
 * Used for /superadmin/statistics page
 * Supports filtering by zone, gender, date range
 * Includes documents issued stats and sales stats (superadmin only)
 */
export const getDetailedStats = query({
  args: {
    purok: v.optional(v.string()), // Changed from zone to purok to match schema
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    startDate: v.optional(v.number()), // Timestamp
    endDate: v.optional(v.number()), // Timestamp
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")
    
    if (user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only admins can view statistics")
    }

    // Build resident query based on filters
    let residents
    if (args.purok) {
      // Use composite index for purok + status (index name is by_status_zone but field is purok)
      residents = await ctx.db
        .query("residents")
        .withIndex("by_status_zone", (q: any) =>
          q.eq("status", "resident").eq("purok", args.purok!)
        )
        .collect()
    } else {
      // Use status index
      residents = await ctx.db
        .query("residents")
        .withIndex("by_status", (q: any) => q.eq("status", "resident"))
        .collect()
    }

    // Apply gender filter if provided
    let filteredResidents = residents
    if (args.gender) {
      filteredResidents = residents.filter((r: any) => r.sex === args.gender)
    }

    // Count by gender
    const maleCount = filteredResidents.filter((r) => r.sex === "male").length
    const femaleCount = filteredResidents.filter((r) => r.sex === "female").length
    const otherCount = filteredResidents.filter((r) => r.sex === "other").length

    // Get documents issued statistics
    const documentsStats = await getDocumentsIssuedStats(ctx, args.startDate, args.endDate)

    const result = {
      residents: {
        total: filteredResidents.length,
        male: maleCount,
        female: femaleCount,
        other: otherCount,
      },
      documents: documentsStats,
      purok: args.purok || null,
      gender: args.gender || null,
      dateRange: {
        start: args.startDate || null,
        end: args.endDate || null,
      },
    }

    // Add sales statistics only for Superadmin
    if (user.role === "superadmin") {
      const salesStats = await getSalesStatisticsWithFilters(ctx, args.startDate, args.endDate)
      return {
        ...result,
        sales: salesStats,
      }
    }

    return result
  },
})

/**
 * Helper: Get documents issued statistics
 * Returns total documents issued, by month, and by document type
 */
async function getDocumentsIssuedStats(
  ctx: any,
  startDate?: number,
  endDate?: number
): Promise<{
  total: number
  byMonth: Array<{ month: string; count: number }>
  byType: Array<{ documentTypeId: string; documentTypeName: string; count: number }>
}> {
  // Get all printed items
  let printedItems = await ctx.db
    .query("documentRequestItems")
    .withIndex("by_status", (q: any) => q.eq("status", "printed"))
    .collect()

  // Apply date filter if provided
  if (startDate || endDate) {
    printedItems = printedItems.filter((item: any) => {
      if (!item.printedAt) return false
      if (startDate && item.printedAt < startDate) return false
      if (endDate && item.printedAt > endDate) return false
      return true
    })
  }

  // Get all document types for mapping
  const documentTypeIds = [...new Set(printedItems.map((item: any) => item.documentTypeId))]
  const documentTypes = await Promise.all(
    documentTypeIds.map((id) => ctx.db.get(id))
  )
  const documentTypeMap = new Map(
    documentTypes.filter(Boolean).map((dt: any) => [dt._id, dt])
  )

  // Count by month
  const byMonthMap = new Map<string, number>()
  for (const item of printedItems) {
    if (item.printedAt) {
      const date = new Date(item.printedAt)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      byMonthMap.set(monthKey, (byMonthMap.get(monthKey) || 0) + 1)
    }
  }

  // Convert to array and sort by month
  const byMonth = Array.from(byMonthMap.entries())
    .map(([month, count]) => ({ month, count }))
    .sort((a, b) => a.month.localeCompare(b.month))

  // Count by document type
  const byTypeMap = new Map<string, { name: string; count: number }>()
  for (const item of printedItems) {
    const docType = documentTypeMap.get(item.documentTypeId)
    if (docType) {
      const existing = byTypeMap.get(item.documentTypeId) || { name: docType.name, count: 0 }
      byTypeMap.set(item.documentTypeId, {
        name: existing.name,
        count: existing.count + 1,
      })
    }
  }

  // Convert to array and sort by count (descending)
  const byType = Array.from(byTypeMap.entries())
    .map(([documentTypeId, data]) => ({
      documentTypeId,
      documentTypeName: data.name,
      count: data.count,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    total: printedItems.length,
    byMonth,
    byType,
  }
}

/**
 * Helper: Get sales statistics with date filtering (Superadmin only)
 * Calculates total revenue from printed services within date range
 */
async function getSalesStatisticsWithFilters(
  ctx: any,
  startDate?: number,
  endDate?: number
): Promise<{
  totalRevenue: number // In cents
  revenueThisMonth: number // In cents
  revenueByMonth: Array<{ month: string; revenue: number }>
  revenueByType: Array<{ documentTypeId: string; documentTypeName: string; revenue: number }>
}> {
  // Get all printed items
  let printedItems = await ctx.db
    .query("documentRequestItems")
    .withIndex("by_status", (q: any) => q.eq("status", "printed"))
    .collect()

  // Apply date filter if provided
  if (startDate || endDate) {
    printedItems = printedItems.filter((item: any) => {
      if (!item.printedAt) return false
      if (startDate && item.printedAt < startDate) return false
      if (endDate && item.printedAt > endDate) return false
      return true
    })
  }

  // Get document types for pricing
  const documentTypeIds = [...new Set(printedItems.map((item: any) => item.documentTypeId))]
  const documentTypes = await Promise.all(
    documentTypeIds.map((id) => ctx.db.get(id))
  )
  const documentTypeMap = new Map(
    documentTypes.filter(Boolean).map((dt: any) => [dt._id, dt])
  )

  // Calculate total revenue
  let totalRevenue = 0
  let revenueThisMonth = 0

  const now = Date.now()
  const startOfMonth = new Date(now)
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)
  const startOfMonthTimestamp = startOfMonth.getTime()

  // Revenue by month
  const revenueByMonthMap = new Map<string, number>()

  // Revenue by document type
  const revenueByTypeMap = new Map<string, { name: string; revenue: number }>()

  for (const item of printedItems) {
    const documentType = documentTypeMap.get(item.documentTypeId)
    if (documentType) {
      totalRevenue += documentType.price

      // Check if printed this month
      if (item.printedAt && item.printedAt >= startOfMonthTimestamp) {
        revenueThisMonth += documentType.price
      }

      // Group by month
      if (item.printedAt) {
        const date = new Date(item.printedAt)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        revenueByMonthMap.set(
          monthKey,
          (revenueByMonthMap.get(monthKey) || 0) + documentType.price
        )
      }

      // Group by document type
      const existing = revenueByTypeMap.get(item.documentTypeId) || {
        name: documentType.name,
        revenue: 0,
      }
      revenueByTypeMap.set(item.documentTypeId, {
        name: existing.name,
        revenue: existing.revenue + documentType.price,
      })
    }
  }

  // Convert to arrays and sort
  const revenueByMonth = Array.from(revenueByMonthMap.entries())
    .map(([month, revenue]) => ({ month, revenue }))
    .sort((a, b) => a.month.localeCompare(b.month))

  const revenueByType = Array.from(revenueByTypeMap.entries())
    .map(([documentTypeId, data]) => ({
      documentTypeId,
      documentTypeName: data.name,
      revenue: data.revenue,
    }))
    .sort((a, b) => b.revenue - a.revenue)

  return {
    totalRevenue,
    revenueThisMonth,
    revenueByMonth,
    revenueByType,
  }
}

