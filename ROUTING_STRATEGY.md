# Routing Strategy - Best Practices

## Overview

We're using **file-based routing** with TanStack Router, following best practices:

1. **Separate routes for each role** (not redirects in root)
2. **Public landing page** (`/`) - shows logo, redirects authenticated users
3. **Dedicated protected routes** - each role has its own route files

## Route Structure

### Public Routes (No Authentication)
```
/                    → Public landing page (shows logo)
/login              → Login page (Clerk SignIn)
/kiosk              → Kiosk interface (not created yet)
/queue-display      → Queue display screen (not created yet)
```

### Protected Routes (Authentication + Role Required)

#### Staff Routes
```
/staff/queue                    → Staff queue dashboard
/staff/process/$requestId       → Process document request
```

#### Admin Routes
```
/admin/dashboard               → Admin dashboard
/admin/residents               → Resident management
/admin/residents/$id           → Individual resident profile
/admin/statistics              → Statistics & reports
```

#### Superadmin Routes (includes all admin routes +)
```
/admin/settings                → System settings
/admin/settings/users          → User management
/admin/transactions            → All document requests
```

#### Special Routes
```
/pending-approval              → Pending approval page (authenticated, no role)
```

## Implementation Pattern

### Public Routes
```tsx
// src/routes/index.tsx
export const Route = createFileRoute('/')({
  component: HomePage,
  // ✅ No beforeLoad - public access
})

function HomePage() {
  // Shows logo for unauthenticated
  // Redirects authenticated users to role-based dashboard
}
```

### Protected Routes (Template)
```tsx
// src/routes/staff/queue.tsx
import { createFileRoute } from '@tanstack/react-router'
import { requireAuthRoute } from '@/lib/route-protection'
import { RouteGuard } from '@/lib/route-guards'

export const Route = createFileRoute('/staff/queue')({
  // ✅ Layer 1: Server-side protection
  beforeLoad: requireAuthRoute(),
  
  component: StaffQueuePage,
})

function StaffQueuePage() {
  return (
    // ✅ Layer 2: Client-side role protection
    <RouteGuard allowedRoles={['staff']}>
      {/* Page content */}
    </RouteGuard>
  )
}
```

## Benefits of This Approach

1. ✅ **Clear separation** - Each route is self-contained
2. ✅ **Better SEO** - Each route can have its own metadata
3. ✅ **Bookmarkable** - Users can bookmark `/staff/queue` directly
4. ✅ **Easier testing** - Each route can be tested independently
5. ✅ **Maintainable** - Changes to one route don't affect others
6. ✅ **Type-safe** - TanStack Router provides full TypeScript support

## Header Behavior

Header shows on:
- ✅ All protected routes (`/staff/*`, `/admin/*`, `/pending-approval`)

Header hides on:
- ❌ Public routes (`/`, `/login`, `/kiosk`, `/queue-display`)
- ❌ 404 pages (unknown routes)

## Next Steps

When creating new routes:

1. Create route file: `src/routes/staff/queue.tsx`
2. Add protection:
   - `beforeLoad: requireAuthRoute()` (server-side)
   - `<RouteGuard allowedRoles={['staff']}>` (client-side)
3. Implement page content
4. Header will automatically show (not in public paths list)

## Route Files to Create

### Phase 1: Public Routes
- [ ] `src/routes/kiosk.tsx`
- [ ] `src/routes/queue-display.tsx`

### Phase 2: Staff Routes
- [ ] `src/routes/staff/queue.tsx`
- [ ] `src/routes/staff/process.$requestId.tsx`

### Phase 3: Admin Routes
- [ ] `src/routes/admin/dashboard.tsx`
- [ ] `src/routes/admin/residents.tsx`
- [ ] `src/routes/admin/residents.$id.tsx`
- [ ] `src/routes/admin/statistics.tsx`

### Phase 4: Superadmin Routes
- [ ] `src/routes/admin/settings.tsx`
- [ ] `src/routes/admin/settings/users.tsx`
- [ ] `src/routes/admin/transactions.tsx`
