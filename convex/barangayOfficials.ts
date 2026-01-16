/**
 * Convex functions for managing barangay officials
 * Optimized queries using schema indexes
 */

import { v } from "convex/values"
import { query } from "./_generated/server"

// ==================== QUERIES ====================

/**
 * List all barangay officials
 * Uses by_isActive index for filtering active officials
 */
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeInactive) {
      // Return all officials
      return await ctx.db.query("barangayOfficials").order("desc").collect()
    } else {
      // Return only active officials (most common use case)
      return await ctx.db
        .query("barangayOfficials")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .order("desc")
        .collect()
    }
  },
})

/**
 * Get active barangay officials only
 * Optimized query for document templates
 * Uses by_isActive index
 */
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("barangayOfficials")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .order("desc")
      .collect()
  },
})

/**
 * Get official by position
 * Uses by_position index for efficient lookup
 * Used for PDF generation (e.g., get captain for signature)
 */
export const getByPosition = query({
  args: { position: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("barangayOfficials")
      .withIndex("by_position", (q) => q.eq("position", args.position))
      .first()
  },
})

/**
 * Get official by ID
 */
export const get = query({
  args: { id: v.id("barangayOfficials") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})
