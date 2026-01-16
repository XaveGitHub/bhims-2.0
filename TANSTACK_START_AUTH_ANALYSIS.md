# TanStack Start Authentication Patterns Analysis

## Comparison: TanStack Start Docs vs Our Implementation

### 1. Server Functions for Authentication

**TanStack Start Recommendation:**
```typescript
const loginFn = createServerFn({ method: 'POST' })
  .inputValidator((data) => data)
  .handler(async ({ data }) => {
    const user = await authenticateUser(data.email, data.password)
    const session = await useAppSession()
    await session.update({ userId: user.id })
    throw redirect({ to: '/dashboard' })
  })
```

**Our Implementation:**
- ✅ Using **Clerk** (partner solution) - Clerk handles login/logout via their UI components
- ✅ Clerk manages authentication flow (no need for custom server functions)
- ✅ Clerk provides `<SignIn />` and `<SignOut />` components

**Status:** ✅ COMPLIANT - Using partner solution (recommended by TanStack Start)

---

### 2. Session Management

**TanStack Start Recommendation:**
```typescript
export function useAppSession() {
  return useSession<SessionData>({
    name: 'app-session',
    password: process.env.SESSION_SECRET!,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      httpOnly: true,
    },
  })
}
```

**Our Implementation:**
- ✅ Using **Clerk** for session management
- ✅ Clerk automatically handles:
  - HTTP-only cookies ✅
  - Secure flag in production ✅
  - SameSite protection ✅
  - Session expiration ✅
  - Token refresh ✅
- ✅ JWT tokens validated server-side by Convex

**Status:** ✅ COMPLIANT - Clerk handles session management (equivalent to TanStack Start's `useSession`)

---

### 3. Route Protection

**TanStack Start Recommendation:**
```typescript
// routes/_authed.tsx
export const Route = createFileRoute('/_authed')({
  beforeLoad: async ({ location }) => {
    const user = await getCurrentUserFn()
    if (!user) {
      throw redirect({
        to: '/login',
        search: { redirect: location.href },
      })
    }
    return { user }
  },
})
```

**Our Implementation:**
- ❌ **Currently missing** `beforeLoad` route protection
- ✅ Using client-side `RouteGuard` component
- ✅ Convex queries/mutations protect data server-side

**Gap Analysis:**
- TanStack Start recommends `beforeLoad` for server-side route protection
- We removed `beforeLoad` because Clerk's `auth()` was causing errors
- **However:** We can use Convex queries in `beforeLoad` instead of Clerk's `auth()`

**Recommendation:** Add `beforeLoad` using Convex queries for better alignment with TanStack Start patterns

---

### 4. Role-Based Access Control (RBAC)

**TanStack Start Recommendation:**
```typescript
export function hasPermission(userRole: Role, requiredRole: Role): boolean {
  const hierarchy: Record<Role, number> = {
    [roles.USER]: 0,
    [roles.MODERATOR]: 1,
    [roles.ADMIN]: 2,
  }
  return hierarchy[userRole] >= hierarchy[requiredRole]
}

// In route
export const Route = createFileRoute('/_authed/admin')({
  beforeLoad: async ({ context }) => {
    if (!hasPermission(context.user.role, roles.ADMIN)) {
      throw redirect({ to: '/unauthorized' })
    }
  },
})
```

**Our Implementation:**
- ✅ `hasRolePermission()` function in `auth.ts`
- ✅ Role hierarchy: `staff: 1, admin: 2, superadmin: 3`
- ✅ `useRequireRole()` hook for role checks
- ✅ `RouteGuard` component handles role-based routing
- ✅ Convex functions check roles server-side

**Status:** ✅ COMPLIANT - We have RBAC implementation matching TanStack Start patterns

---

## Key Differences & Recommendations

### ✅ What We're Doing Right

1. **Using Partner Solution (Clerk)** - Recommended by TanStack Start
2. **RBAC Implementation** - Matches TanStack Start patterns
3. **Server-Side Data Protection** - Convex validates all queries/mutations
4. **Component-Level Protection** - RouteGuard provides UX

### ⚠️ Gap: Missing `beforeLoad` Route Protection

**Current State:**
- No `beforeLoad` protection (removed due to Clerk `auth()` errors)
- Client-side `RouteGuard` handles routing
- Convex protects data server-side

**TanStack Start Recommendation:**
- Use `beforeLoad` in layout routes for server-side route protection
- This prevents unauthenticated users from even loading the route HTML/JS

**Solution:**
We can add `beforeLoad` using Convex queries instead of Clerk's `auth()`:

```typescript
// Create a server function that checks auth via Convex
const getCurrentUserFn = createServerFn({ method: 'GET' })
  .handler(async () => {
    // This would need to call Convex, but Convex queries are client-side...
    // Actually, we can't use Convex in server functions directly
  })
```

**Challenge:** Convex queries run client-side, not server-side. We can't use Convex in `beforeLoad` directly.

**Alternative Approach:**
Since we're using Clerk, we could:
1. Use Clerk's `auth()` in `beforeLoad` (but it was causing errors)
2. Use client-side `RouteGuard` + Convex server-side protection (current approach)
3. Create a TanStack Start server function that validates Clerk JWT directly

---

## Recommendation

### Option 1: Keep Current Approach ✅ (Recommended)
- **Pros:** Works reliably, Convex protects all data server-side
- **Cons:** Doesn't match TanStack Start's `beforeLoad` pattern exactly
- **Status:** Secure, but not following TanStack Start route protection pattern

### Option 2: Add `beforeLoad` with Clerk JWT Validation
- Create a server function that validates Clerk JWT token directly
- Use it in `beforeLoad` to match TanStack Start patterns
- **Pros:** Matches TanStack Start patterns exactly
- **Cons:** More complex, requires JWT validation in server function

### Option 3: Fix Clerk `auth()` in `beforeLoad`
- Debug why `clerkMiddleware()` isn't working properly
- Fix the middleware configuration
- Use Clerk's `auth()` in `beforeLoad` as recommended
- **Pros:** Matches both TanStack Start and Clerk patterns
- **Cons:** Requires debugging middleware issues

---

## Conclusion

**Current Status:**
- ✅ Using partner solution (Clerk) - Recommended
- ✅ RBAC implementation - Matches patterns
- ✅ Server-side data protection - Convex validates all queries
- ⚠️ Missing `beforeLoad` route protection - Not matching TanStack Start pattern

**Security:** ✅ Secure (Convex protects all data server-side)
**Pattern Compliance:** ⚠️ Partially compliant (missing `beforeLoad`)

**Recommendation:** 
- Current approach is secure and works
- To fully match TanStack Start patterns, we should add `beforeLoad` route protection
- Options: Fix Clerk middleware OR use Convex queries in `beforeLoad` (if possible) OR create custom JWT validation
