import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    externalId: v.string(), // Clerk user ID (stored in JWT subject field)
    email: v.optional(v.string()),
    role: v.union(
      v.literal("superadmin"),
      v.literal("admin"),
      v.literal("staff")
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("byExternalId", ["externalId"]) // Index for efficient lookups
    .index("by_role", ["role"]) // Index for role-based queries
    .index("by_isActive", ["isActive"]), // Index for filtering active users
});
