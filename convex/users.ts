import { internalMutation, query, QueryCtx } from "./_generated/server";
import { UserJSON } from "@clerk/backend";
import { v, Validator } from "convex/values";

// Get current user (exposed to client)
export const current = query({
  args: {},
  handler: async (ctx) => {
    return await getCurrentUser(ctx);
  },
});

// Get user role for current user
export const getUserRole = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user?.role || null;
  },
});

// Upsert user from Clerk webhook (internal mutation)
export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    // Validate and cast role to match schema type
    // If no role in metadata or invalid, set to undefined (pending approval)
    const roleFromMetadata = data.public_metadata?.role as string | undefined;
    const validRoles = ["superadmin", "admin", "staff"] as const;
    const role = validRoles.includes(roleFromMetadata as any)
      ? (roleFromMetadata as "superadmin" | "admin" | "staff")
      : undefined; // undefined = pending approval (no default role)

    const userAttributes = {
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
      externalId: data.id, // Clerk user ID (stored in subject JWT field)
      email: data.email_addresses[0]?.email_address || "",
      role, // Can be undefined if no role assigned
      isActive: true,
      updatedAt: Date.now(),
    };

    // Double-check pattern to prevent race conditions
    let user = await userByExternalId(ctx, data.id);
    
    if (user === null) {
      // New user - add createdAt
      // Don't include lastLoginAt - it's optional and will be undefined by default
      try {
        await ctx.db.insert("users", {
          ...userAttributes,
          createdAt: Date.now(),
        });
      } catch (error) {
        // Race condition: another webhook call might have created this user
        // Re-check and update if it now exists
        user = await userByExternalId(ctx, data.id);
        if (user) {
          await ctx.db.patch(user._id, userAttributes);
        } else {
          // If still not found, re-throw the error
          throw error;
        }
      }
    } else {
      // Existing user - update
      await ctx.db.patch(user._id, userAttributes);
    }
  },
});

// Delete user from Clerk webhook (internal mutation)
export const deleteFromClerk = internalMutation({
  args: { clerkUserId: v.string() },
  async handler(ctx, { clerkUserId }) {
    console.log("deleteFromClerk called with:", clerkUserId);
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      // Hard delete - completely remove user from database
      await ctx.db.delete(user._id);
      console.log(`User ${clerkUserId} deleted from database`);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
  },
});

// Update user role (Superadmin only)
export const updateRole = internalMutation({
  args: {
    clerkUserId: v.string(),
    role: v.union(
      v.literal("superadmin"),
      v.literal("admin"),
      v.literal("staff")
    ),
  },
  handler: async (ctx, args) => {
    const user = await userByExternalId(ctx, args.clerkUserId);

    if (user) {
      await ctx.db.patch(user._id, {
        role: args.role,
        updatedAt: Date.now(),
      });
    }
  },
});

// List all users (Superadmin only)
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Helper: Get current user or throw error
export async function getCurrentUserOrThrow(ctx: QueryCtx) {
  const userRecord = await getCurrentUser(ctx);
  if (!userRecord) throw new Error("Can't get current user");
  return userRecord;
}

// Helper: Get current user (returns null if not authenticated)
// ✅ SAFETY: Multiple defensive checks to prevent ctx.auth errors
export async function getCurrentUser(ctx: QueryCtx) {
  // Safety check 1: ctx might be undefined (shouldn't happen, but defensive)
  if (!ctx) {
    console.warn('getCurrentUser: ctx is undefined');
    return null;
  }
  
  // Safety check 2: ctx.auth might be undefined during navigation/auth setup
  if (!ctx.auth) {
    // This can happen if query is called before auth token is ready
    // Return null gracefully instead of throwing error
    return null;
  }
  
  // Safety check 3: ctx.auth.getUserIdentity might not exist
  if (typeof ctx.auth.getUserIdentity !== 'function') {
    console.warn('getCurrentUser: ctx.auth.getUserIdentity is not a function');
    return null;
  }
  
  try {
    const identity = await ctx.auth.getUserIdentity();
    if (identity === null) {
      return null;
    }
    
    // Safety check 4: identity.subject might be missing
    if (!identity?.subject) {
      console.warn('getCurrentUser: identity.subject is missing');
      return null;
    }
    
    // Use identity.subject which contains the Clerk user ID
    return await userByExternalId(ctx, identity.subject);
  } catch (error) {
    // Handle auth errors gracefully (e.g., token expired, invalid token, ctx.auth undefined)
    // Don't log if it's just "not authenticated" - that's expected
    if (error instanceof Error && !error.message.includes('not authenticated')) {
      console.error('Error getting user identity:', error);
    }
    return null;
  }
}

// Helper: Get user by Clerk ID (externalId)
async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}
