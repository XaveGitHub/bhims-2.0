# Security Implementation Guide

## Overview

BHIMS uses a **multi-layer security approach** following Clerk and Convex best practices:

1. **Client-side UX Protection** (RouteGuard components)
2. **Database-level Protection** (Convex queries/mutations - PRIMARY security layer)

## Security Layers

### Layer 1: Convex JWT Validation (Primary Defense)

**How it works:**
- Convex automatically validates Clerk JWT tokens server-side via `auth.config.js`
- All queries/mutations check authentication via `ctx.auth.getUserIdentity()`
- If no valid token → returns `null` → throws "Unauthorized" error
- **Cannot be bypassed** - server-side validation

**Example:**
```ts
export const getDashboardStats = query({
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx) // ✅ Validates JWT, gets user
    if (!user) throw new Error("Unauthorized")
    
    // Role check
    if (user.role !== 'admin' && user.role !== 'superadmin') {
      throw new Error("Insufficient permissions")
    }
    
    // ... return data
  },
})
```

**Why it matters**: 
- Runs on the server (Convex backend)
- Validates JWT token before executing any query/mutation
- Cannot be bypassed by client-side manipulation
- All data access is protected server-side

### Layer 2: Client-side Role Protection (UX & Fine-grained Access)

**File**: `src/lib/route-guards.tsx`

```tsx
import { RouteGuard } from '@/lib/route-guards'

function DashboardPage() {
  return (
    <RouteGuard allowedRoles={['admin', 'superadmin']}>
      {/* Page content */}
    </RouteGuard>
  )
}
```

**Why it matters**:
- Provides better UX (shows loading states, pending approval, etc.)
- Handles role-based routing (redirects based on user role)
- Checks user role from Convex (client-side, but role is validated server-side in Convex)
- Redirects unauthenticated users to `/login`
- Redirects pending approval users to `/pending-approval`

**Note**: This is a **UX layer**. Data is already protected by Convex JWT validation.

## Best Practices

### ✅ DO

1. **Always use `<RouteGuard>`** for protected routes (UX and role-based routing)
2. **Check roles in Convex mutations** server-side
3. **Use `getCurrentUser(ctx)` in all mutations** that modify data
4. **Validate all inputs** using Convex validators (`v.string()`, `v.id()`, etc.)

### ❌ DON'T

1. **Don't rely only on client-side protection** - Convex protects all data server-side
2. **Don't skip role checks in Convex** - validate permissions server-side
3. **Don't trust client-provided user IDs** - always get from `ctx.auth.getUserIdentity()`

## Authentication Flow

```
User requests /admin/dashboard
    ↓
[Layer 1] RouteGuard component (client-side)
    - Client checks: useUserRole() → role in ['admin', 'superadmin']?
    - ❌ Not signed in → Redirect to /login
    - ❌ Wrong role → Redirect to /
    - ❌ Pending approval → Redirect to /pending-approval
    - ✅ Correct role → Render page
    ↓
[Layer 2] Convex query/mutation (server-side)
    - Server validates: JWT token via auth.config.js
    - Server gets: ctx.auth.getUserIdentity() → userId
    - Server checks: getCurrentUser(ctx) → user.role
    - ❌ No user or wrong role → Throws "Unauthorized" error
    - ✅ All checks pass → Return/modify data
```

## Convex Security

Convex automatically protects all queries/mutations server-side:

1. **JWT Validation**: `auth.config.js` validates Clerk JWT tokens
2. **User Identity**: `ctx.auth.getUserIdentity()` returns authenticated user ID
3. **Role Storage**: Roles stored in Convex `users` table (synced from Clerk)

**All Convex functions run server-side**, so `getCurrentUser(ctx)` is secure and cannot be bypassed.

## Testing Security

To verify your routes are properly protected:

1. **Try accessing a protected route without logging in**
   - RouteGuard should redirect to `/login` (client-side check)
   - Convex queries will fail with "Unauthorized" (server-side check)

2. **Try accessing admin route as staff user**
   - RouteGuard should redirect to `/` (client-side role check)
   - Convex queries will fail with "Insufficient permissions" (server-side role check)

3. **Try calling Convex mutation without auth**
   - Should throw "Unauthorized" error (Convex JWT validation)

4. **Try calling Convex mutation with wrong role**
   - Should throw "Insufficient permissions" (server-side role check)

## References

- [Clerk TanStack Start Authentication](https://clerk.com/docs/tanstack-react-start/guides/users/reading)
- [Convex Authentication](https://docs.convex.dev/auth/overview)
- [Convex Clerk Integration](https://docs.convex.dev/auth/clerk)
