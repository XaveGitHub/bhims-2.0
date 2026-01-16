import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Clerk Integration - User management
  users: defineTable({
    name: v.string(),
    externalId: v.string(), // Clerk user ID (stored in JWT subject field)
    email: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("superadmin"),
        v.literal("admin"),
        v.literal("staff")
      )
    ), // Optional - null means pending approval
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  })
    .index("byExternalId", ["externalId"]) // Index for efficient lookups
    .index("by_role", ["role"]) // Index for role-based queries
    .index("by_isActive", ["isActive"]), // Index for filtering active users

  // Master Data - Residents
  residents: defineTable({
    residentId: v.string(), // Sequential format: BH-00001 (unique, for barcode)
    firstName: v.string(),
    middleName: v.string(),
    lastName: v.string(),
    sex: v.union(v.literal("male"), v.literal("female"), v.literal("other")),
    birthdate: v.number(), // Timestamp
    zone: v.string(),
    purok: v.string(),
    address: v.string(),
    disability: v.boolean(),
    status: v.union(
      v.literal("resident"),
      v.literal("deceased"),
      v.literal("moved"),
      v.literal("pending") // Guest records from kiosk
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_residentId", ["residentId"]) // Unique index for barcode lookup
    .index("by_status", ["status"]) // For filtering by status
    .index("by_zone", ["zone"]) // For zone-based queries
    .index("by_name", ["lastName", "firstName"]) // For alphabetical sorting
    .index("by_status_zone", ["status", "zone"]), // Composite for filtered zone queries

  // Document Types Configuration
  documentTypes: defineTable({
    name: v.string(), // e.g., "Barangay Clearance"
    templateKey: v.string(), // References template file name
    price: v.number(), // Stored in cents (e.g., 5000 = ₱50.00)
    requiresPurpose: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isActive", ["isActive"]) // For filtering active document types
    .index("by_name", ["name"]), // For name lookups

  // Document Requests (Main Request Record)
  documentRequests: defineTable({
    residentId: v.id("residents"), // FK to residents
    requestNumber: v.string(), // Unique, auto-generated
    status: v.union(
      v.literal("pending"),
      v.literal("queued"),
      v.literal("serving"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    totalPrice: v.number(), // In cents, sum of all documentRequestItems
    requestedAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_residentId", ["residentId"]) // For resident transaction history
    .index("by_status", ["status"]) // For queue filtering
    .index("by_requestedAt", ["requestedAt"]) // For date range queries
    .index("by_status_requestedAt", ["status", "requestedAt"]), // Composite for queue sorting

  // Document Request Items (Junction Table - Multiple Certificates per Request)
  documentRequestItems: defineTable({
    documentRequestId: v.id("documentRequests"), // FK to documentRequests
    documentTypeId: v.id("documentTypes"), // FK to documentTypes
    purpose: v.string(), // Required if documentType.requiresPurpose is true
    status: v.union(v.literal("pending"), v.literal("printed")),
    printedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_documentRequestId", ["documentRequestId"]) // For request details
    .index("by_status", ["status"]) // For filtering printed items
    .index("by_documentRequestId_status", ["documentRequestId", "status"]), // Composite for request status

  // Queue System
  queue: defineTable({
    documentRequestId: v.id("documentRequests"), // FK to documentRequests (unique)
    queueNumber: v.string(), // Format: Q-001, Q-002 (resets daily)
    serviceType: v.string(), // Default: 'certificate'
    status: v.union(
      v.literal("waiting"),
      v.literal("serving"),
      v.literal("done"),
      v.literal("skipped")
    ),
    counterNumber: v.optional(v.number()), // Assigned when serving
    servedBy: v.optional(v.string()), // Clerk user ID
    createdAt: v.number(),
    startedAt: v.optional(v.number()), // When status becomes serving
    completedAt: v.optional(v.number()),
  })
    .index("by_status", ["status"]) // CRITICAL for real-time queue updates
    .index("by_queueNumber", ["queueNumber"]) // For queue number lookups
    .index("by_status_createdAt", ["status", "createdAt"]) // Composite for queue ordering
    .index("by_counterNumber_status", ["counterNumber", "status"]) // For counter-specific queues
    .index("by_documentRequestId", ["documentRequestId"]) // For efficient request lookup (unique)
    .index("by_createdAt", ["createdAt"]), // ✅ NEW: For queue number generation (daily reset)

  // Printed Documents History
  printedDocuments: defineTable({
    documentRequestItemId: v.id("documentRequestItems"), // FK to documentRequestItems
    printedBy: v.string(), // Clerk user ID
    printedAt: v.number(),
    reprintCount: v.number(), // Default: 0
    pdfPath: v.optional(v.string()), // Path to saved PDF file (Convex storage)
  })
    .index("by_documentRequestItemId", ["documentRequestItemId"]) // For item history
    .index("by_printedAt", ["printedAt"]) // For date range queries
    .index("by_printedBy", ["printedBy"]), // For staff statistics

  // Barangay Officials Configuration
  barangayOfficials: defineTable({
    position: v.string(), // e.g., 'captain', 'secretary', 'treasurer' (unique)
    name: v.string(),
    title: v.optional(v.string()), // e.g., 'Barangay Captain'
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_position", ["position"]) // Unique index for position lookups
    .index("by_isActive", ["isActive"]), // For filtering active officials

  // Audit Logs (Optional - for tracking system actions)
  auditLogs: defineTable({
    userId: v.optional(v.string()), // Clerk user ID
    action: v.string(), // e.g., 'create_resident', 'delete_user', 'update_price'
    resourceType: v.string(), // e.g., 'resident', 'user', 'documentType'
    resourceId: v.optional(v.string()),
    details: v.any(), // Additional context as object
    ipAddress: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"]) // For user activity logs
    .index("by_resourceType", ["resourceType"]) // For resource filtering
    .index("by_createdAt", ["createdAt"]) // For date range queries
    .index("by_resourceType_resourceId", ["resourceType", "resourceId"]), // Composite for resource history
});
