/**
 * Convex functions for managing document types
 * Optimized queries using schema indexes
 */

import { v } from "convex/values"
import { query, mutation } from "./_generated/server"
import { getCurrentUser } from "./users"

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

// ==================== MUTATIONS ====================

/**
 * Create a new document type
 * Superadmin only
 */
export const create = mutation({
  args: {
    name: v.string(),
    templateKey: v.string(), // PDF template filename (e.g., "clearance.pdf")
    price: v.number(), // In cents (e.g., 5000 = ₱50.00)
    requiresPurpose: v.boolean(),
    isActive: v.optional(v.boolean()), // Default: true
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only superadmin can create document types
    if (user.role !== "superadmin") {
      throw new Error("Unauthorized: Only superadmin can create document types")
    }

    // Check if name already exists
    const existing = await ctx.db
      .query("documentTypes")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first()

    if (existing) {
      throw new Error(`Document type "${args.name}" already exists`)
    }

    const now = Date.now()
    return await ctx.db.insert("documentTypes", {
      name: args.name,
      templateKey: args.templateKey,
      price: args.price,
      requiresPurpose: args.requiresPurpose,
      isActive: args.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    })
  },
})

/**
 * Update an existing document type
 * Superadmin only
 */
export const update = mutation({
  args: {
    id: v.id("documentTypes"),
    name: v.optional(v.string()),
    templateKey: v.optional(v.string()),
    price: v.optional(v.number()),
    requiresPurpose: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only superadmin can update document types
    if (user.role !== "superadmin") {
      throw new Error("Unauthorized: Only superadmin can update document types")
    }

    const { id, ...updates } = args

    // Check if name already exists (if name is being changed)
    if (updates.name !== undefined) {
      const existing = await ctx.db
        .query("documentTypes")
        .withIndex("by_name", (q) => q.eq("name", updates.name!))
        .first()

      if (existing && existing._id !== id) {
        throw new Error(`Document type "${updates.name}" already exists`)
      }
    }

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
 * Delete a document type
 * Superadmin only
 */
export const remove = mutation({
  args: { id: v.id("documentTypes") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only superadmin can delete document types
    if (user.role !== "superadmin") {
      throw new Error("Unauthorized: Only superadmin can delete document types")
    }

    // Check if document type is being used in any requests
    const documentRequestItems = await ctx.db
      .query("documentRequestItems")
      .collect()

    const isInUse = documentRequestItems.some(
      (item: any) => item.documentTypeId === args.id
    )

    if (isInUse) {
      throw new Error(
        "Cannot delete document type: It is being used in existing requests. Deactivate it instead."
      )
    }

    await ctx.db.delete(args.id)
    return args.id
  },
})

/**
 * Toggle document type active status
 * Superadmin only
 */
export const toggleActive = mutation({
  args: {
    id: v.id("documentTypes"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx)
    if (!user) throw new Error("Unauthorized")

    // Only superadmin can toggle document types
    if (user.role !== "superadmin") {
      throw new Error("Unauthorized: Only superadmin can toggle document types")
    }

    await ctx.db.patch(args.id, {
      isActive: args.isActive,
      updatedAt: Date.now(),
    })

    return args.id
  },
})
