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
    const roleFromMetadata = data.public_metadata?.role as string | undefined;
    const validRoles = ["superadmin", "admin", "staff"] as const;
    const role = (validRoles.includes(roleFromMetadata as any) 
      ? roleFromMetadata 
      : "staff") as "superadmin" | "admin" | "staff";

    const userAttributes = {
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
      externalId: data.id, // Clerk user ID (stored in subject JWT field)
      email: data.email_addresses[0]?.email_address || "",
      role,
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
export async function getCurrentUser(ctx: QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (identity === null) {
    return null;
  }
  // Use identity.subject which contains the Clerk user ID
  return await userByExternalId(ctx, identity.subject);
}

// Helper: Get user by Clerk ID (externalId)
async function userByExternalId(ctx: QueryCtx, externalId: string) {
  return await ctx.db
    .query("users")
    .withIndex("byExternalId", (q) => q.eq("externalId", externalId))
    .unique();
}
