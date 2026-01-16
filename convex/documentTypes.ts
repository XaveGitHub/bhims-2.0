/**
 * Convex functions for managing document types
 * Optimized queries using schema indexes
 */

import { v } from "convex/values"
import { query } from "./_generated/server"

// ==================== QUERIES ====================

/**
 * List all document types
 * Uses by_isActive index for filtering active types
 */
export const list = query({
  args: {
    includeInactive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    if (args.includeInactive) {
      // Return all document types
      return await ctx.db.query("documentTypes").order("desc").collect()
    } else {
      // Return only active document types (most common use case)
      return await ctx.db
        .query("documentTypes")
        .withIndex("by_isActive", (q) => q.eq("isActive", true))
        .order("desc")
        .collect()
    }
  },
})

/**
 * Get active document types only
 * Optimized query for kiosk and request forms
 * Uses by_isActive index
 */
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("documentTypes")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .order("desc")
      .collect()
  },
})

/**
 * Get document type by ID
 */
export const get = query({
  args: { id: v.id("documentTypes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id)
  },
})

/**
 * Get document type by name
 * Uses by_name index for efficient lookup
 */
export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("documentTypes")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first()
  },
})

/**
 * Get document type by template key
 * Used for PDF generation
 */
export const getByTemplateKey = query({
  args: { templateKey: v.string() },
  handler: async (ctx, args) => {
    // No index for templateKey, so scan all active types (should be small set)
    const types = await ctx.db
      .query("documentTypes")
      .withIndex("by_isActive", (q) => q.eq("isActive", true))
      .collect()
    
    return types.find((type) => type.templateKey === args.templateKey)
  },
})
