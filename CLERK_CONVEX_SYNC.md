# Clerk + Convex Sync Guide

Complete guide for syncing Clerk authentication with Convex database for BHIMS using TanStack Start.

**Official Documentation References:**
- [Clerk Convex Integration](https://clerk.com/docs/integrations/databases/convex)
- [Clerk Webhooks Syncing Guide](https://clerk.com/docs/guides/development/webhooks/syncing)
- [Clerk Webhooks Debugging](https://clerk.com/docs/guides/development/webhooks/debugging)
- [Convex Clerk Auth (TanStack Start)](https://docs.convex.dev/auth/clerk#tanstack-start)
- [Clerk TanStack Start Reference](https://clerk.com/docs/tanstack-react-start/reference/components/authentication/sign-in#override-ur-ls)
- [Convex Database Auth](https://docs.convex.dev/auth/database-auth)

## Overview

We need to:
1. **Authenticate users** in Convex using Clerk JWTs
2. **Sync user data** from Clerk to Convex (roles, profile info)
3. **Keep data in sync** when users are created/updated/deleted

---

## Method 1: Webhook Sync (Recommended - Automatic)

### Step 1: Set Up Convex HTTP Action for Webhooks

Create `convex/http.ts`:

```typescript
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { WebhookEvent } from "@clerk/backend";
import { Webhook } from "svix";

const http = httpRouter();

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const event = await validateRequest(request);
    if (!event) {
      return new Response("Error occurred", { status: 400 });
    }
    
    switch (event.type) {
      case "user.created": // intentional fallthrough
      case "user.updated":
        await ctx.runMutation(internal.users.upsertFromClerk, {
          data: event.data,
        });
        break;

      case "user.deleted": {
        const clerkUserId = event.data.id!;
        await ctx.runMutation(internal.users.deleteFromClerk, { clerkUserId });
        break;
      }
      
      default:
        console.log("Ignored Clerk webhook event", event.type);
    }

    return new Response(null, { status: 200 });
  }),
});

async function validateRequest(req: Request): Promise<WebhookEvent | null> {
  const payloadString = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
  try {
    return wh.verify(payloadString, svixHeaders) as unknown as WebhookEvent;
  } catch (error) {
    console.error("Error verifying webhook event", error);
    return null;
  }
}

export default http;
```

**Key Changes from Official Docs:**
- Uses `WebhookEvent` from `@clerk/backend` (not `@clerk/clerk-sdk-node`)
- Uses `validateRequest` helper function for cleaner code
- Passes full `event.data` to mutation (not individual fields)
- Returns `null` status 200 (not "OK" string)
- Webhook path: `/clerk-users-webhook` (standard naming)

**Reference:** [Convex Database Auth - Webhook Implementation](https://docs.convex.dev/auth/database-auth#webhook-endpoint-implementation)

### Step 2: Update Schema (Optional but Recommended)

First, update your schema to use `externalId` instead of `clerkUserId`:

```typescript
// convex/schema.ts
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
  }).index("byExternalId", ["externalId"]), // Index for efficient lookups
});
```

**Reference:** [Convex Database Auth - Users Table Schema](https://docs.convex.dev/auth/database-auth#optional-users-table-schema)

### Step 3: Create User Sync Mutations

Create `convex/users.ts`:

```typescript
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

// Upsert user from Clerk webhook (internal mutation)
export const upsertFromClerk = internalMutation({
  args: { data: v.any() as Validator<UserJSON> }, // no runtime validation, trust Clerk
  async handler(ctx, { data }) {
    const userAttributes = {
      name: `${data.first_name || ""} ${data.last_name || ""}`.trim() || "User",
      externalId: data.id, // Clerk user ID (stored in subject JWT field)
      email: data.email_addresses[0]?.email_address || "",
      role: (data.public_metadata?.role as string) || "staff",
      isActive: true,
      updatedAt: Date.now(),
    };

    const user = await userByExternalId(ctx, data.id);
    if (user === null) {
      // New user - add createdAt
      await ctx.db.insert("users", {
        ...userAttributes,
        createdAt: Date.now(),
        lastLoginAt: null,
      });
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
    const user = await userByExternalId(ctx, clerkUserId);

    if (user !== null) {
      // Hard delete - removes user from database
      // Note: For BHIMS, you might want soft delete instead (mark as inactive)
      // If so, use: await ctx.db.patch(user._id, { isActive: false, updatedAt: Date.now() });
      await ctx.db.delete(user._id);
    } else {
      console.warn(
        `Can't delete user, there is none for Clerk user ID: ${clerkUserId}`,
      );
    }
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
```

**Key Changes from Official Docs:**
- Uses `internalMutation` for webhook handlers (not regular `mutation`)
- Uses `UserJSON` type from `@clerk/backend` for type safety
- Uses `externalId` field to store Clerk user ID (matches `subject` from JWT)
- Uses `identity.subject` to get current user (not `tokenIdentifier`)
- Includes helper functions: `getCurrentUser`, `getCurrentUserOrThrow`, `userByExternalId`

**Reference:** [Convex Database Auth - Mutations for Upserting](https://docs.convex.dev/auth/database-auth#mutations-for-upserting-and-deleting-users)

### Additional Helper Queries/Mutations

```typescript
// Get user role for current user
export const getUserRole = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    return user?.role || null;
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
```

**Key Points:**
- `getCurrentUser` uses `identity.subject` (Clerk user ID from JWT)
- `identity.subject` matches the `externalId` field in database
- All webhook mutations use `internalMutation` (not regular `mutation`)
- Helper functions make it easy to get current user in queries/mutations

### Step 4: Configure Clerk Webhook

1. **Get your Convex webhook URL:**
   - Deploy your Convex project: `npx convex deploy`
   - Get your deployment URL: `https://your-deployment.convex.site` (note: `.site` not `.cloud`)
   - Webhook URL: `https://your-deployment.convex.site/clerk-users-webhook`
   
   **Important:** 
   - Convex webhook URLs use `.convex.site` domain, not `.convex.cloud`
   - The webhook path should be `/clerk-users-webhook` (as per Convex docs)

2. **Set up webhook in Clerk Dashboard:**
   - Go to Clerk Dashboard → **Webhooks**
   - Click **Add Endpoint**
   - Enter your Convex webhook URL: `https://your-deployment.convex.site/clerk-users-webhook`
   - In **Message Filtering**, select events:
     - `user.created`
     - `user.updated`
     - `user.deleted`
   - Click **Create** to save
   - Copy the **Signing Secret** (starts with `whsec_`) - you'll need this for verification
   
   **Reference:** [Clerk Webhooks Setup](https://clerk.com/docs/guides/development/webhooks/syncing)

3. **Add environment variable:**
   ```env
   CLERK_WEBHOOK_SECRET=whsec_...
   ```

### Step 5: Install Required Packages

```bash
# For webhook handling (use @clerk/backend, not @clerk/clerk-sdk-node)
npm install svix @clerk/backend

# For TanStack Start + Clerk integration
npm install @clerk/tanstack-start

# For Convex authentication
npm install @convex-dev/auth
```

**Important Notes:** 
- Use `@clerk/backend` for webhook types (`WebhookEvent`, `UserJSON`) - not `@clerk/clerk-sdk-node`
- `svix` is for webhook signature verification
- `@clerk/tanstack-start` is the Clerk SDK for TanStack Start
- `@convex-dev/auth` provides `getAuthUserId` and `ctx.auth.getUserIdentity()` for Convex

**Reference:** [Convex Database Auth - Webhook Setup](https://docs.convex.dev/auth/database-auth#set-up-webhooks)

---

## Method 2: Manual Sync on Login (Fallback - Not Recommended)

**Note:** According to [Convex Database Auth docs](https://docs.convex.dev/auth/database-auth), webhooks are the recommended approach. Manual sync is only needed as a fallback if webhooks aren't working.

If you need manual sync, you'll need to create a `store` mutation that uses `ctx.auth.getUserIdentity()` to get user info from the JWT. See [Convex Database Auth - Call Mutation from Client](https://docs.convex.dev/auth/database-auth#call-a-mutation-from-the-client) for the complete implementation.

**For BHIMS, we recommend using webhooks only** - they're more reliable and automatic.

### Use in Root Component (TanStack Start)

```typescript
// app/root.tsx
import { ClerkProvider } from "@clerk/tanstack-start";
import { useStoreUserEffect } from "@/lib/hooks/useStoreUserEffect";

function App() {
  const { isLoading, isAuthenticated } = useStoreUserEffect();
  
  return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}>
      {isLoading ? (
        <div>Loading...</div>
      ) : isAuthenticated ? (
        <YourApp />
      ) : (
        <LoginPage />
      )}
    </ClerkProvider>
  );
}
```

**Note:** 
- For TanStack Start, use `@clerk/tanstack-start` instead of `@clerk/clerk-react`
- The `useStoreUserEffect` hook ensures user is stored before rendering authenticated content
- See [Clerk TanStack Start docs](https://clerk.com/docs/tanstack-react-start) and [Convex Database Auth - Waiting for User](https://docs.convex.dev/auth/database-auth#waiting-for-current-user-to-be-stored)

---

## Step 6: Set Up JWT Authentication in Convex

### Create `convex/auth.config.js`

```javascript
export default {
  providers: [
    {
      domain: process.env.CLERK_FRONTEND_API_URL,
      applicationID: "convex",
    },
  ],
};
```

**Note:** According to [Clerk's Convex integration docs](https://clerk.com/docs/integrations/databases/convex), use `CLERK_FRONTEND_API_URL` which should be set to the Issuer URL from the JWT template.

### Get Clerk JWT Issuer URL

1. Go to Clerk Dashboard → **JWT Templates**
2. Click **New template** → Select **Convex** preset
3. Copy the **Issuer URL** (looks like `https://your-app.clerk.accounts.dev`)
   - This is also called the "Frontend API URL" in some Clerk docs
4. Add to environment variables in Convex Dashboard:

```env
CLERK_FRONTEND_API_URL=https://your-app.clerk.accounts.dev
```

**Important:** Set this in your Convex Dashboard under Settings → Environment Variables, not in your local `.env` file.

### Use Authentication in Convex Queries/Mutations

```typescript
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getCurrentUser = query({
  handler: async (ctx) => {
    // getAuthUserId returns the Clerk user ID from the JWT
    const clerkUserId = await getAuthUserId(ctx);
    
    if (!clerkUserId) {
      return null; // Not authenticated
    }

    // Get user from Convex database
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .first();

    return user;
  },
});
```

**Note:** According to [Convex Clerk auth docs](https://docs.convex.dev/auth/clerk), `getAuthUserId(ctx)` returns the Clerk user ID (e.g., `user_abc123`), which you can then use to query your Convex `users` table.

---

## Step 7: Setting User Roles

### Option A: Via Clerk Dashboard (Manual)

1. Go to Clerk Dashboard → **Users**
2. Select a user
3. Go to **Metadata** tab
4. Add to **Public metadata**:
   ```json
   {
     "role": "superadmin"
   }
   ```
5. Webhook will automatically sync to Convex

### Option B: Via API (Programmatic)

```typescript
// In your admin panel
import { clerkClient } from "@clerk/clerk-react";

async function updateUserRole(clerkUserId: string, role: string) {
  await clerkClient.users.updateUser(clerkUserId, {
    publicMetadata: {
      role: role,
    },
  });
  // Webhook will sync to Convex automatically
}
```

### Option C: Direct Convex Update (Superadmin Only)

```typescript
// In your superadmin user management page
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function UserManagement() {
  const updateRole = useMutation(api.users.updateRole);

  const handleRoleChange = async (clerkUserId: string, newRole: string) => {
    // Update in Convex
    await updateRole({
      clerkUserId,
      role: newRole as "superadmin" | "admin" | "staff",
    });

    // Also update in Clerk (optional, for consistency)
    await clerkClient.users.updateUser(clerkUserId, {
      publicMetadata: { role: newRole },
    });
  };
}
```

---

## Complete Flow Diagram

```
1. User signs up in Clerk
   ↓
2. Clerk sends webhook → Convex HTTP action
   ↓
3. Convex creates/updates user record
   ↓
4. User logs in → Clerk issues JWT
   ↓
5. Convex verifies JWT → User authenticated
   ↓
6. App queries Convex for user role
   ↓
7. Role-based access control applied
```

---

## Testing the Sync

### Test Webhook Locally

1. Deploy your Convex project to get a webhook URL:
   ```bash
   npx convex deploy
   # This gives you: https://your-deployment.convex.site
   ```

2. Use Clerk's webhook testing in Dashboard:
   - Go to Clerk Dashboard → Webhooks → Your endpoint
   - Click "Send test webhook" to test events
   - Check "Recent deliveries" to see webhook responses
   - See [Clerk webhook debugging guide](https://clerk.com/docs/guides/development/webhooks/debugging)

3. Verify in Convex Dashboard:
   - Check Convex logs for webhook handler execution
   - Query your `users` table to verify sync

### Verify Sync

```typescript
// Check if user exists in Convex using externalId (Clerk user ID)
const user = await ctx.db
  .query("users")
  .withIndex("byExternalId", (q) => q.eq("externalId", "user_xxx"))
  .unique();

console.log("User in Convex:", user);

// Or use the helper function
import { getCurrentUser } from "./users";
const currentUser = await getCurrentUser(ctx);
console.log("Current user:", currentUser);
```

**Note:** Use `byExternalId` index (not `by_clerkUserId`) to match the official Convex pattern.

---

## Troubleshooting

### Webhook not receiving events
- Check webhook URL is correct
- Verify `CLERK_WEBHOOK_SECRET` is set
- Check Clerk Dashboard → Webhooks → Recent deliveries

### JWT authentication failing
- Verify `CLERK_FRONTEND_API_URL` is set in Convex Dashboard (not local `.env`)
- Check JWT template is set to "Convex" preset in Clerk Dashboard
- Ensure `auth.config.js` exists in `convex/` directory
- Verify the Issuer URL from JWT template matches the environment variable
- See [Convex Clerk auth troubleshooting](https://docs.convex.dev/auth/clerk#troubleshooting)

### User not syncing
- Check webhook events in Clerk Dashboard
- Verify Convex mutations are working
- Use manual sync as fallback

---

## Best Practices

1. **Always use webhooks** for production (automatic sync)
2. **Keep manual sync** as fallback for development
3. **Store roles in Convex** for fast queries (indexed)
4. **Sync roles to Clerk metadata** for consistency
5. **Handle edge cases**: User deleted in Clerk, role changes, etc.

---

## Environment Variables Summary

### Local Development (.env)
```env
# Clerk (for TanStack Start)
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Convex
VITE_CONVEX_URL=https://your-deployment.convex.cloud
```

### Convex Dashboard (Settings → Environment Variables)
```env
# Clerk Webhook (for webhook verification)
CLERK_WEBHOOK_SECRET=whsec_...

# Clerk JWT (for authentication)
CLERK_FRONTEND_API_URL=https://your-app.clerk.accounts.dev
```

**Important Notes:**
- Set `CLERK_WEBHOOK_SECRET` and `CLERK_FRONTEND_API_URL` in **Convex Dashboard**, not local `.env`
- These are server-side secrets used by Convex HTTP actions
- `VITE_` prefixed variables are for client-side (TanStack Start)
- See [Convex environment variables docs](https://docs.convex.dev/production/environment-variables) for details

---

That's it! Your Clerk and Convex are now synced. 🎉
