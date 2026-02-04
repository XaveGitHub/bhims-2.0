/**
 * Convex functions for managing residents
 * Optimized queries using schema indexes
 */

import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { getCurrentUser } from "./users"

// ==================== QUERIES ====================

/**
 * List all residents with optional filtering and pagination
 * ✅ OPTIMIZED: Uses indexes efficiently, supports pagination for large datasets (40k+ residents)
 * ✅ UPDATED: Now supports filtering by phase, block, lot, sectoral flags, voter status, etc.
 */
export const list = query({
  args: {
    // Basic filters
    status: v.optional(
      v.union(
        v.literal("resident"),
        v.literal("deceased"),
        v.literal("moved"),
        v.literal("pending")
      )
    ),
    purok: v.optional(v.string()),
    phase: v.optional(v.string()),
    block: v.optional(v.string()),
    lot: v.optional(v.string()),
    gender: v.optional(v.union(v.literal("male"), v.literal("female"), v.literal("other"))),
    
    // Sectoral filters (all boolean)
    isOFW: v.optional(v.boolean()),
    isPWD: v.optional(v.boolean()),
    isOSY: v.optional(v.boolean()),
    isSeniorCitizen: v.optional(v.boolean()),
    isSoloParent: v.optional(v.boolean()),
    isIP: v.optional(v.boolean()),
    isMigrant: v.optional(v.boolean()),
    
    // Voter filters
    isResidentVoter: v.optional(v.boolean()),
    isRegisteredVoter: v.optional(v.boolean()),
    
    // Employment filter
    employmentStatus: v.optional(v.union(v.literal("Employed"), v.literal("Unemployed"))),
    
    // Age range filter (calculated from birthdate)
    minAge: v.optional(v.number()),
    maxAge: v.optional(v.number()),
    
    // Pagination
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
    _refreshKey: v.optional(v.number()), // ✅ OPTIMIZATION: Ignored, used for client-side cache invalidation
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 50
    const offset = args.offset ?? 0

    // ✅ OPTIMIZED: Use indexes for efficient filtering
    // Priority: Composite indexes > Single indexes (most selective first)
    
    let allResidents: any[]
    
    // Strategy: Use composite indexes when multiple filters match
    if (args.status !== undefined && args.purok !== undefined) {
      // ✅ BEST: Use composite index by_status_zone (status + purok)
      allResidents = await ctx.db
        .query("residents")
        .withIndex("by_status_zone", (q) => 
          q.eq("status", args.status!).eq("purok", args.purok!)
        )
        .order("desc")
        .take((limit + offset) * 2) // Less overhead with composite index
    } else if (args.block !== undefined && args.lot !== undefined) {
      // ✅ BEST: Use composite index by_block_lot
      allResidents = await ctx.db
        .query("residents")
        .withIndex("by_block_lot", (q) => 
          q.eq("block", args.block!).eq("lot", args.lot!)
        )
        .order("desc")
        .take((limit + offset) * 2)
    } else if (args.status !== undefined) {
      // Use by_status index
      allResidents = await ctx.db
        .query("residents")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take((limit + offset) * 3) // Fetch more to account for additional filters
    } else if (args.purok !== undefined) {
      // Use by_purok index
      allResidents = await ctx.db
        .query("residents")
        .withIndex("by_purok", (q) => q.eq("purok", args.purok!))
        .order("desc")
        .take((limit + offset) * 3)
    } else if (args.phase !== undefined) {
      // Use by_phase index
      allResidents = await ctx.db
        .query("residents")
        .withIndex("by_phase", (q) => q.eq("phase", args.phase!))
        .order("desc")
        .take((limit + offset) * 3)
    } else {
      // Default: return all residents (limited with pagination)
      allResidents = await ctx.db
        .query("residents")
        .order("desc")
        .take((limit + offset) * 3) // Fetch more to account for filtering
    }

    // ✅ OPTIMIZED: Apply remaining filters server-side (before pagination)
    // This reduces data transfer and improves performance
    
    // Location filters (only if not already filtered by index)
    if (args.purok !== undefined && !(args.status !== undefined && args.purok !== undefined)) {
      // Filter by purok if not already filtered by composite index
      allResidents = allResidents.filter((r) => r.purok === args.purok)
    }
    if (args.phase !== undefined && args.status === undefined && args.purok === undefined) {
      // Filter by phase if not already filtered by index
      allResidents = allResidents.filter((r) => r.phase === args.phase)
    }
    if (args.block !== undefined && args.lot === undefined) {
      // Filter by block only (if lot not provided, can't use composite index)
      allResidents = allResidents.filter((r) => r.block === args.block)
    }
    if (args.lot !== undefined && args.block === undefined) {
      // Filter by lot only (if block not provided, can't use composite index)
      allResidents = allResidents.filter((r) => r.lot === args.lot)
    }
    
    // Gender filter (no index, apply client-side)
    if (args.gender !== undefined) {
      allResidents = allResidents.filter((r) => r.sex === args.gender)
    }
    
    // Sectoral filters (boolean fields, apply client-side)
    if (args.isOFW !== undefined) {
      allResidents = allResidents.filter((r) => r.isOFW === args.isOFW)
    }
    if (args.isPWD !== undefined) {
      allResidents = allResidents.filter((r) => r.isPWD === args.isPWD)
    }
    if (args.isOSY !== undefined) {
      allResidents = allResidents.filter((r) => r.isOSY === args.isOSY)
    }
    if (args.isSeniorCitizen !== undefined) {
      allResidents = allResidents.filter((r) => r.isSeniorCitizen === args.isSeniorCitizen)
    }
    if (args.isSoloParent !== undefined) {
      allResidents = allResidents.filter((r) => r.isSoloParent === args.isSoloParent)
    }
    if (args.isIP !== undefined) {
      allResidents = allResidents.filter((r) => r.isIP === args.isIP)
    }
    if (args.isMigrant !== undefined) {
      allResidents = allResidents.filter((r) => r.isMigrant === args.isMigrant)
    }
    
    // Voter filters
    if (args.isResidentVoter !== undefined) {
      allResidents = allResidents.filter((r) => r.isResidentVoter === args.isResidentVoter)
    }
    if (args.isRegisteredVoter !== undefined) {
      allResidents = allResidents.filter((r) => r.isRegisteredVoter === args.isRegisteredVoter)
    }
    
    // Employment filter
    if (args.employmentStatus !== undefined) {
      allResidents = allResidents.filter((r) => r.employmentStatus === args.employmentStatus)
    }
    
    // Age range filter (calculate age from birthdate)
    if (args.minAge !== undefined || args.maxAge !== undefined) {
      const now = Date.now()
      allResidents = allResidents.filter((r) => {
        const birthDate = new Date(r.birthdate)
        const age = Math.floor((now - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25))
        if (args.minAge !== undefined && age < args.minAge) return false
        if (args.maxAge !== undefined && age > args.maxAge) return false
        return true
      })
    }

    // Apply pagination after all filters
    return allResidents.slice(offset, offset + limit)
  },
})

/**
 * Get resident by Convex ID
 */
export const get = query({
  args: { id: v.id("residents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/**
 * Get resident by residentId (BH-00001 format) - Used for barcode scanning
 * Uses by_residentId index for fast lookup
 * ✅ PUBLIC: No auth required (kiosk is public)
 */
export const getByResidentId = query({
  args: { residentId: v.string() },
  handler: async (ctx, args) => {
    // Normalize the residentId (uppercase, trimmed)
    const normalizedId = args.residentId.trim().toUpperCase()
    
    // Query using the index
    const resident = await ctx.db
      .query("residents")
      .withIndex("by_residentId", (q) => q.eq("residentId", normalizedId))
      .first()
    
    return resident || null
  },
})

/**
 * Get relatives (family and household members) for a resident
 * ✅ OPTIMIZED: Uses indexes for efficient queries
 * Returns both family members (by blood/marriage) and household members (same residence)
 */
export const getRelatives = query({
  args: { residentId: v.id("residents") },
  handler: async (ctx, args) => {
    // Get the resident
    const resident = await ctx.db.get(args.residentId)
    if (!resident) {
      return {
        familyMembers: [],
        householdMembers: [],
      }
    }

    const familyMembers: any[] = []
    const householdMembers: any[] = []

    // ✅ OPTIMIZED: Get family members using by_familyId index
    if (resident.familyId) {
      const family = await ctx.db
        .query("residents")
        .withIndex("by_familyId", (q) => q.eq("familyId", resident.familyId!))
        .collect()
      
      // Exclude the resident themselves
      familyMembers.push(
        ...family.filter((r) => r._id !== args.residentId)
      )
    }

    // ✅ OPTIMIZED: Get household members using by_householdId index
    if (resident.householdId) {
      const household = await ctx.db
        .query("residents")
        .withIndex("by_householdId", (q) => q.eq("householdId", resident.householdId!))
        .collect()
      
      // Exclude the resident themselves
      householdMembers.push(
        ...household.filter((r) => r._id !== args.residentId)
      )
    }

    return {
      familyMembers,
      householdMembers,
    }
  },
})

/**
 * Search residents by name, ID, block, lot, phase, purok, etc.
 * ✅ OPTIMIZED: Uses indexes efficiently, supports multiple search fields
 * ✅ UPDATED: Now supports searching by resident ID, block, lot, phase, purok
 */
export const search = query({
  args: {
    searchTerm: v.string(),
    // Optional filters to narrow search results
    status: v.optional(
      v.union(
        v.literal("resident"),
        v.literal("deceased"),
        v.literal("moved"),
        v.literal("pending")
      )
    ),
    purok: v.optional(v.string()),
    phase: v.optional(v.string()),
    limit: v.optional(v.number()),
    _refreshKey: v.optional(v.number()), // ✅ OPTIMIZATION: Ignored, used for client-side cache invalidation
  },
  handler: async (ctx, args) => {
    const term = args.searchTerm.toLowerCase().trim()
    if (!term) return []

    const limit = args.limit ?? 50

    // ✅ OPTIMIZED: Check if search term is a Resident ID (BH-00001 format)
    const residentIdMatch = term.match(/^bh-?(\d+)$/i)
    if (residentIdMatch) {
      const idNumber = residentIdMatch[1].padStart(5, '0')
      const residentId = `BH-${idNumber}`
      
      // Use by_residentId index for efficient ID lookup
      const byId = await ctx.db
        .query("residents")
        .withIndex("by_residentId", (q) => q.eq("residentId", residentId))
        .take(1)
      
      // Apply optional filters
      let results = byId
      if (args.status !== undefined) {
        results = results.filter((r) => r.status === args.status)
      }
      if (args.purok !== undefined) {
        results = results.filter((r) => r.purok === args.purok)
      }
      if (args.phase !== undefined) {
        results = results.filter((r) => r.phase === args.phase)
      }
      
      return results.slice(0, limit)
    }

    // ✅ OPTIMIZED: Check if search term matches Block+Lot format (e.g., "12-34" or "12 34")
    const blockLotMatch = term.match(/^(\d+)[\s-]+(\d+)$/)
    if (blockLotMatch) {
      const block = blockLotMatch[1]
      const lot = blockLotMatch[2]
      
      // Use by_block_lot composite index for efficient lookup
      const byBlockLot = await ctx.db
        .query("residents")
        .withIndex("by_block_lot", (q) => 
          q.eq("block", block).eq("lot", lot)
        )
        .take(limit)
      
      // Apply optional filters
      let results = byBlockLot
      if (args.status !== undefined) {
        results = results.filter((r) => r.status === args.status)
      }
      if (args.purok !== undefined) {
        results = results.filter((r) => r.purok === args.purok)
      }
      if (args.phase !== undefined) {
        results = results.filter((r) => r.phase === args.phase)
      }
      
      return results.slice(0, limit)
    }

    // ✅ OPTIMIZED: Search by last name using by_name index (most efficient)
    // Uses range query: lastName >= term AND lastName < term + "\uffff"
    let query = ctx.db.query("residents")
    
    // Apply status filter with index if provided
    if (args.status !== undefined) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status!))
    } else if (args.purok !== undefined) {
      // Use purok index if no status filter
      query = query.withIndex("by_purok", (q) => q.eq("purok", args.purok!))
    } else if (args.phase !== undefined) {
      // Use phase index if no status/purok filter
      query = query.withIndex("by_phase", (q) => q.eq("phase", args.phase!))
    } else {
      // Use by_name index for name search
      query = query.withIndex("by_name", (q) => 
        q.gte("lastName", term).lt("lastName", term + "\uffff")
      )
    }
    
    const byLastName = await query.take(limit * 2) // Fetch more to account for filtering

    // ✅ OPTIMIZED: Filter by name if we used status/purok/phase index
    let nameFiltered = byLastName
    if (args.status !== undefined || args.purok !== undefined || args.phase !== undefined) {
      nameFiltered = byLastName.filter((r) => 
        r.lastName.toLowerCase().includes(term) ||
        r.firstName.toLowerCase().includes(term) ||
        r.middleName?.toLowerCase().includes(term) ||
        r.suffix?.toLowerCase().includes(term) ||
        r.block === term ||
        r.lot === term ||
        r.purok?.toLowerCase().includes(term) ||
        r.phase?.toLowerCase().includes(term)
      )
    }

    // ✅ OPTIMIZED: For first name/middle name search, use a limited scan
    // Only if we haven't reached the limit yet
    const remainingLimit = Math.max(0, limit - nameFiltered.length)
    
    let byFirstName: any[] = []
    if (remainingLimit > 0 && args.status === undefined && args.purok === undefined && args.phase === undefined) {
      // Use a reasonable scan limit (200 records) instead of 1000
      // This balances search coverage with cost efficiency
      const scanLimit = Math.min(200, remainingLimit * 4) // Scan 4x to find matches
      const scannedResidents = await ctx.db
        .query("residents")
        .order("desc")
        .take(scanLimit)
      
      byFirstName = scannedResidents
        .filter(
          (r) =>
            r.firstName.toLowerCase().includes(term) ||
            r.middleName?.toLowerCase().includes(term) ||
            r.suffix?.toLowerCase().includes(term) ||
            r.block === term ||
            r.lot === term ||
            r.purok?.toLowerCase().includes(term) ||
            r.phase?.toLowerCase().includes(term)
        )
        .slice(0, remainingLimit)
    }

    // Combine and deduplicate
    const combined = [...nameFiltered, ...byFirstName]
    const unique = Array.from(
      new Map(combined.map((r) => [r._id, r])).values()
    )

    return unique.slice(0, limit)
  },
})

/**
 * Get residents by status
 * Uses by_status index
 */
export const listByStatus = query({
  args: {
    status: v.union(
      v.literal("resident"),
      v.literal("deceased"),
      v.literal("moved"),
      v.literal("pending")
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("residents")
      .withIndex("by_status", (q) => q.eq("status", args.status))
      .order("desc")
      .take(args.limit ?? 100)
  },
})

/**
 * Get unique puroks from residents
 * Used for filter dropdowns
 */
export const getUniquePuroks = query({
  args: {},
  handler: async (ctx) => {
    // Get all residents with status 'resident'
    const residents = await ctx.db
      .query("residents")
      .withIndex("by_status", (q) => q.eq("status", "resident"))
      .collect()
    
    // Extract unique puroks
    const puroks = [...new Set(residents.map((r) => r.purok))].sort()
    return puroks
  },
})

/**
 * Get residents by purok
 * Uses status index, then filters by purok client-side
 */
export const listByPurok = query({
  args: {
    purok: v.string(),
    status: v.optional(
      v.union(
        v.literal("resident"),
        v.literal("deceased"),
        v.literal("moved"),
        v.literal("pending")
      )
    ),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let residents: any[]
    if (args.status !== undefined) {
      // Use status index, then filter by purok client-side
      residents = await ctx.db
        .query("residents")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .take(args.limit ? args.limit * 2 : 200) // Fetch more to account for purok filtering
    } else {
      // Fetch all residents, then filter by purok
      residents = await ctx.db
        .query("residents")
        .order("desc")
        .take(args.limit ? args.limit * 2 : 200)
    }
    
    // Filter by purok client-side
    const filtered = residents.filter((r) => r.purok === args.purok)
    return filtered.slice(0, args.limit ?? 100)
  },
})

// ==================== MUTATIONS ====================

/**
 * Generate next resident ID (BH-00001 format)
 * ✅ OPTIMIZED: Uses by_residentId index to find max efficiently
 * Instead of fetching all residents, queries by pattern
 */
async function generateNextResidentId(ctx: any): Promise<string> {
  // ✅ OPTIMIZED: Query residents with BH- prefix using index
  // Since residentId is indexed, we can query efficiently
  // Query for residents starting with "BH-" and find max number
  let maxNumber = 0
  
  // Query residents with BH- prefix (using index)
  // Note: Convex indexes don't support prefix queries directly,
  // but we can query a range and filter client-side (still more efficient than .collect())
  // For now, we'll query recent residents (last 1000) which should cover most cases
  // If needed, we can add a separate counter table for better performance
  
  const recentResidents = await ctx.db
    .query("residents")
    .order("desc")
    .take(1000) // ✅ OPTIMIZED: Only check recent 1000 instead of all
  
  for (const resident of recentResidents) {
    const match = resident.residentId.match(/^BH-(\d+)$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxNumber) maxNumber = num
    }
  }
  
  // If no BH- residents found in recent 1000, check if there are any at all
  // This handles edge case where all residents are old
  if (maxNumber === 0) {
    // Fallback: Check a few more to ensure we don't miss anything
    const allResidents = await ctx.db.query("residents").take(5000)
    for (const resident of allResidents) {
      const match = resident.residentId.match(/^BH-(\d+)$/)
      if (match) {
        const num = parseInt(match[1], 10)
        if (num > maxNumber) maxNumber = num
      }
    }
  }

  const nextNumber = (maxNumber + 1).toString().padStart(5, "0")
  return `BH-${nextNumber}`
}

/**
 * Create a new resident
 * Admin/Staff can create residents
 * ✅ UPDATED: Now includes all new fields (block, lot, phase, civil status, education, sectoral info, etc.)
 */
export const create = mutation({
  args: {
    // Location (Required)
    block: v.string(),
    lot: v.string(),
    phase: v.string(),
    purok: v.string(),
    
    // Basic Info (Required)
    firstName: v.string(),
    middleName: v.string(),
    lastName: v.string(),
    suffix: v.optional(v.string()), // Optional suffix (e.g., Jr., Sr., I, II, III, IV)
    
    // Demographics (Required)
    sex: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    birthdate: v.number(), // Timestamp
    civilStatus: v.union(
      v.literal("Single"),
      v.literal("Married"),
      v.literal("Widowed"),
      v.literal("Separated"),
      v.literal("Live-in")
    ),
    
    // Education & Employment (Required)
    educationalAttainment: v.union(
      v.literal("No Grade"),
      v.literal("Elementary"),
      v.literal("High School"),
      v.literal("Vocational"),
      v.literal("College"),
      v.literal("Grad School")
    ),
    occupation: v.optional(v.string()), // Free text, optional
    employmentStatus: v.union(v.literal("Employed"), v.literal("Unemployed")),
    isResidentVoter: v.boolean(),
    isRegisteredVoter: v.boolean(),
    
    // Sectoral Information (all boolean, default false)
    isOFW: v.optional(v.boolean()),
    isPWD: v.optional(v.boolean()),
    isOSY: v.optional(v.boolean()),
    isSeniorCitizen: v.optional(v.boolean()), // Separate from PWD
    isSoloParent: v.optional(v.boolean()),
    isIP: v.optional(v.boolean()),
    isMigrant: v.optional(v.boolean()),
    
    // Contact (Optional)
    contactNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    
    // Economic Info (Optional)
    estimatedMonthlyIncome: v.optional(v.number()),
    primarySourceOfLivelihood: v.optional(v.string()),
    
    // Housing
    tenureStatus: v.optional(v.string()),
    housingType: v.union(v.literal("Owned"), v.literal("Rented"), v.literal("Shared")),
    constructionType: v.union(v.literal("Light"), v.literal("Medium"), v.literal("Heavy")),
    sanitationMethod: v.optional(v.string()),
    
    // Other (Optional)
    religion: v.optional(v.string()),
    
    // Health
    debilitatingDiseases: v.optional(v.string()),
    isBedBound: v.optional(v.boolean()),
    isWheelchairBound: v.optional(v.boolean()),
    isDialysisPatient: v.optional(v.boolean()),
    isCancerPatient: v.optional(v.boolean()),
    
    // Pension
    isNationalPensioner: v.optional(v.boolean()),
    isLocalPensioner: v.optional(v.boolean()),
    
    // Relationships (Optional)
    familyId: v.optional(v.id("families")),
    relationshipToHead: v.optional(v.string()),
    householdId: v.optional(v.id("households")),
    
    // Status
    status: v.union(
      v.literal("resident"),
      v.literal("deceased"),
      v.literal("moved"),
      v.literal("pending")
    ),
    residentId: v.optional(v.string()), // Optional - will auto-generate if not provided
  },
  handler: async (ctx, args) => {
    // Get current user for audit
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Check if residentId already exists if provided
    if (args.residentId !== undefined) {
      const existing = await ctx.db
        .query("residents")
        .withIndex("by_residentId", (q) => q.eq("residentId", args.residentId!))
        .unique()
      if (existing) {
        throw new Error(`Resident ID ${args.residentId} already exists`)
      }
    }

    // Generate residentId if not provided
    const residentId = args.residentId || (await generateNextResidentId(ctx))

    const now = Date.now()
    return await ctx.db.insert("residents", {
      residentId,
      // Location
      block: args.block,
      lot: args.lot,
      phase: args.phase,
      purok: args.purok,
      // Basic Info
      firstName: args.firstName,
      middleName: args.middleName,
      lastName: args.lastName,
      suffix: args.suffix,
      // Demographics
      sex: args.sex,
      birthdate: args.birthdate,
      civilStatus: args.civilStatus,
      // Education & Employment
      educationalAttainment: args.educationalAttainment,
      occupation: args.occupation,
      employmentStatus: args.employmentStatus,
      isResidentVoter: args.isResidentVoter,
      isRegisteredVoter: args.isRegisteredVoter,
      // Sectoral Information (default to false if not provided)
      isOFW: args.isOFW ?? false,
      isPWD: args.isPWD ?? false,
      isOSY: args.isOSY ?? false,
      isSeniorCitizen: args.isSeniorCitizen ?? false,
      isSoloParent: args.isSoloParent ?? false,
      isIP: args.isIP ?? false,
      isMigrant: args.isMigrant ?? false,
      // Contact
      contactNumber: args.contactNumber,
      email: args.email,
      // Economic Info
      estimatedMonthlyIncome: args.estimatedMonthlyIncome,
      primarySourceOfLivelihood: args.primarySourceOfLivelihood,
      // Housing
      tenureStatus: args.tenureStatus,
      housingType: args.housingType,
      constructionType: args.constructionType,
      sanitationMethod: args.sanitationMethod,
      // Other
      religion: args.religion,
      // Health
      debilitatingDiseases: args.debilitatingDiseases,
      isBedBound: args.isBedBound,
      isWheelchairBound: args.isWheelchairBound ?? false,
      isDialysisPatient: args.isDialysisPatient ?? false,
      isCancerPatient: args.isCancerPatient ?? false,
      // Pension
      isNationalPensioner: args.isNationalPensioner ?? false,
      isLocalPensioner: args.isLocalPensioner ?? false,
      // Relationships
      familyId: args.familyId,
      relationshipToHead: args.relationshipToHead,
      householdId: args.householdId,
      // Status
      status: args.status,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Update an existing resident
 * Admin/Staff can update residents
 * ✅ UPDATED: Now supports updating all new fields
 */
export const update = mutation({
  args: {
    id: v.id("residents"),
    // Location
    block: v.optional(v.string()),
    lot: v.optional(v.string()),
    phase: v.optional(v.string()),
    purok: v.optional(v.string()),
    // Basic Info
    firstName: v.optional(v.string()),
    middleName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    suffix: v.optional(v.string()),
    // Demographics
    sex: v.optional(
      v.union(v.literal("male"), v.literal("female"), v.literal("other"))
    ),
    birthdate: v.optional(v.number()),
    civilStatus: v.optional(
      v.union(
        v.literal("Single"),
        v.literal("Married"),
        v.literal("Widowed"),
        v.literal("Separated"),
        v.literal("Live-in")
      )
    ),
    // Education & Employment
    educationalAttainment: v.optional(
      v.union(
        v.literal("No Grade"),
        v.literal("Elementary"),
        v.literal("High School"),
        v.literal("Vocational"),
        v.literal("College"),
        v.literal("Grad School")
      )
    ),
    occupation: v.optional(v.string()),
    employmentStatus: v.optional(v.union(v.literal("Employed"), v.literal("Unemployed"))),
    isResidentVoter: v.optional(v.boolean()),
    isRegisteredVoter: v.optional(v.boolean()),
    // Sectoral Information
    isOFW: v.optional(v.boolean()),
    isPWD: v.optional(v.boolean()),
    isOSY: v.optional(v.boolean()),
    isSeniorCitizen: v.optional(v.boolean()),
    isSoloParent: v.optional(v.boolean()),
    isIP: v.optional(v.boolean()),
    isMigrant: v.optional(v.boolean()),
    // Contact
    contactNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    // Economic Info
    estimatedMonthlyIncome: v.optional(v.number()),
    primarySourceOfLivelihood: v.optional(v.string()),
    // Housing
    tenureStatus: v.optional(v.string()),
    housingType: v.optional(v.union(v.literal("Owned"), v.literal("Rented"), v.literal("Shared"))),
    constructionType: v.optional(v.union(v.literal("Light"), v.literal("Medium"), v.literal("Heavy"))),
    sanitationMethod: v.optional(v.string()),
    // Other
    religion: v.optional(v.string()),
    // Health
    debilitatingDiseases: v.optional(v.string()),
    isBedBound: v.optional(v.boolean()),
    isWheelchairBound: v.optional(v.boolean()),
    isDialysisPatient: v.optional(v.boolean()),
    isCancerPatient: v.optional(v.boolean()),
    // Pension
    isNationalPensioner: v.optional(v.boolean()),
    isLocalPensioner: v.optional(v.boolean()),
    // Relationships
    familyId: v.optional(v.id("families")),
    relationshipToHead: v.optional(v.string()),
    householdId: v.optional(v.id("households")),
    // Status
    status: v.optional(
      v.union(
        v.literal("resident"),
        v.literal("deceased"),
        v.literal("moved"),
        v.literal("pending")
      )
    ),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    const { id, ...updates } = args

    // Remove undefined values
    const cleanUpdates: any = {}
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        cleanUpdates[key] = value
      }
    }

    cleanUpdates.updatedAt = Date.now()

    await ctx.db.patch(id, cleanUpdates)
    return id
  },
})

/**
 * Check for duplicate residents based on name and birthdate
 * Used for pending resident approval workflow
 * Returns potential duplicates with match confidence
 */
export const checkDuplicates = query({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    birthdate: v.number(), // Timestamp
    excludeId: v.optional(v.id("residents")), // Exclude this resident from results (for pending residents)
  },
  handler: async (ctx, args) => {
    const birthdateDate = new Date(args.birthdate)
    const birthdateStart = new Date(birthdateDate)
    birthdateStart.setHours(0, 0, 0, 0)
    const birthdateEnd = new Date(birthdateDate)
    birthdateEnd.setHours(23, 59, 59, 999)

    // Normalize names for comparison
    const normalizedFirstName = args.firstName.toLowerCase().trim()
    const normalizedLastName = args.lastName.toLowerCase().trim()

    // Search by last name using index (most efficient)
    const candidates = await ctx.db
      .query("residents")
      .withIndex("by_name", (q) =>
        q.gte("lastName", normalizedLastName).lt("lastName", normalizedLastName + "\uffff")
      )
      .take(100) // Limit for efficiency

    const duplicates: Array<{
      resident: any
      confidence: "high" | "medium" | "low"
      reason: string
    }> = []

    for (const candidate of candidates) {
      // Skip if it's the same resident (excludeId)
      if (args.excludeId && candidate._id === args.excludeId) continue

      const candidateFirstName = candidate.firstName.toLowerCase().trim()
      const candidateLastName = candidate.lastName.toLowerCase().trim()
      const candidateBirthdate = new Date(candidate.birthdate)

      // Check exact match: same name + same birthdate (same day)
      if (
        candidateFirstName === normalizedFirstName &&
        candidateLastName === normalizedLastName &&
        candidateBirthdate >= birthdateStart &&
        candidateBirthdate <= birthdateEnd
      ) {
        duplicates.push({
          resident: candidate,
          confidence: "high",
          reason: "Exact match: Same name and birthdate",
        })
        continue
      }

      // Check similar: same name + birthdate within 1 day
      const dayDiff = Math.abs(
        Math.floor((candidateBirthdate.getTime() - birthdateDate.getTime()) / (1000 * 60 * 60 * 24))
      )
      if (
        candidateFirstName === normalizedFirstName &&
        candidateLastName === normalizedLastName &&
        dayDiff <= 1
      ) {
        duplicates.push({
          resident: candidate,
          confidence: "medium",
          reason: `Similar match: Same name, birthdate differs by ${dayDiff} day(s)`,
        })
      }
    }

    return duplicates.sort((a, b) => {
      // Sort by confidence: high > medium > low
      const confidenceOrder = { high: 3, medium: 2, low: 1 }
      return confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
    })
  },
})

/**
 * Approve pending resident (convert guest to full resident)
 * Assigns proper Resident ID and changes status to "resident"
 */
export const approvePending = mutation({
  args: {
    id: v.id("residents"),
    residentId: v.optional(v.string()), // Optional - will auto-generate if not provided
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only admin/superadmin can approve
    if (user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only admin can approve pending residents")
    }

    const resident = await ctx.db.get(args.id)
    if (!resident) {
      throw new Error("Resident not found")
    }

    if (resident.status !== "pending") {
      throw new Error("Resident is not pending approval")
    }

    // Generate or use provided Resident ID
    const newResidentId = args.residentId || (await generateNextResidentId(ctx))

    // Check if Resident ID already exists
    const existing = await ctx.db
      .query("residents")
      .withIndex("by_residentId", (q) => q.eq("residentId", newResidentId))
      .first()

    if (existing && existing._id !== args.id) {
      throw new Error(`Resident ID ${newResidentId} already exists`)
    }

    // Update resident: assign proper ID and change status
    await ctx.db.patch(args.id, {
      residentId: newResidentId,
      status: "resident",
      updatedAt: Date.now(),
    })

    return { id: args.id, residentId: newResidentId }
  },
})

/**
 * Reject pending resident (delete pending record)
 * Used when admin determines it's a duplicate or invalid
 */
export const rejectPending = mutation({
  args: { id: v.id("residents") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only admin/superadmin can reject
    if (user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only admin can reject pending residents")
    }

    const resident = await ctx.db.get(args.id)
    if (!resident) {
      throw new Error("Resident not found")
    }

    if (resident.status !== "pending") {
      throw new Error("Resident is not pending approval")
    }

    // Delete the pending resident record
    await ctx.db.delete(args.id)
    return args.id
  },
})

/**
 * Delete a resident (hard delete)
 * Only Admin/Superadmin should delete residents
 * Note: Consider soft delete (status update) instead
 */
export const remove = mutation({
  args: { id: v.id("residents") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only admin/superadmin can delete
    if (user.role !== "admin" && user.role !== "superadmin") {
      throw new Error("Unauthorized: Only admins can delete residents")
    }

    await ctx.db.delete(args.id)
    return args.id
  },
})
