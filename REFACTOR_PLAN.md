# Refactoring Plan: Separate Admin & Superadmin Routes

## Overview

Refactor from shared routes (`/admin/*` for both Admin and Superadmin) to separate routes:
- `/admin/*` - Admin only routes
- `/superadmin/*` - Superadmin only routes

---

## Route Structure Changes

### Current Structure:
```
/admin/dashboard        → Admin + Superadmin (conditional features)
/admin/residents        → Admin + Superadmin
/admin/statistics       → Admin + Superadmin (conditional features)
/admin/settings         → Superadmin only
/admin/transactions     → Superadmin only
```

### New Structure:
```
/admin/dashboard        → Admin only
/admin/residents        → Admin only
/admin/residents/[id]   → Admin only
/admin/statistics       → Admin only

/superadmin/dashboard   → Superadmin only (with sales stats)
/superadmin/residents   → Superadmin only
/superadmin/residents/[id] → Superadmin only
/superadmin/statistics  → Superadmin only (with sales stats)
/superadmin/settings    → Superadmin only
/superadmin/settings/users → Superadmin only
/superadmin/transactions → Superadmin only
```

---

## Implementation Plan

### Phase 1: Create Superadmin Routes
1. Create `/superadmin/dashboard.tsx` (copy from admin, add sales stats)
2. Create `/superadmin/residents.tsx` (copy from admin)
3. Create `/superadmin/residents/[id].tsx` (copy from admin)
4. Create `/superadmin/statistics.tsx` (copy from admin, add sales stats)
5. Create `/superadmin/settings.tsx` (new)
6. Create `/superadmin/settings/users.tsx` (new)
7. Create `/superadmin/transactions.tsx` (new)

### Phase 2: Update Admin Routes
1. Update `/admin/dashboard.tsx` - Remove sales stats, Admin only
2. Update `/admin/residents.tsx` - Admin only (when created)
3. Update `/admin/residents/[id].tsx` - Admin only (when created)
4. Update `/admin/statistics.tsx` - Remove sales stats, Admin only (when created)

### Phase 3: Update Navigation & Guards
1. Create `SuperadminSidebar` component (or update AdminSidebar to handle both)
2. Update RouteGuard to use separate routes
3. Update root redirect logic (`/` → `/admin/dashboard` for Admin, `/superadmin/dashboard` for Superadmin)

### Phase 4: Update Convex Functions
1. Split `getDashboardStats` into:
   - `getAdminDashboardStats` (no sales)
   - `getSuperadminDashboardStats` (with sales)
2. Or keep shared function but return sales only for superadmin (current approach is fine)

### Phase 5: Code Sharing Strategy
- **Option A**: Shared components (recommended)
  - Create shared components for common features
  - Use in both `/admin/*` and `/superadmin/*` routes
  - Example: `<ResidentsTable>` used by both

- **Option B**: Duplicate code
  - Copy code to both routes
  - More maintenance overhead

**Recommendation**: Option A - Shared components

---

## Convex Optimization Review

### ✅ Good Practices Found:
1. ✅ Most queries use indexes (`withIndex`)
2. ✅ Pagination with `.take()` limits
3. ✅ Composite indexes for multi-field queries
4. ✅ Real-time subscriptions instead of polling

### ⚠️ Optimization Opportunities:

1. **`generateNextResidentId` (residents.ts:200)**
   - Uses `.collect()` without limit
   - **Fix**: Could use a counter table or optimize query

2. **`getByRequestId` (queue.ts:91)**
   - Uses `.collect()` then `.find()`
   - **Fix**: Add index `by_documentRequestId` if not exists (check schema)

3. **Statistics query (statistics.ts:52)**
   - Fetches all 40k residents to count
   - **Status**: Documented, acceptable for now (uses index)
   - **Future**: Consider cached counters if bandwidth becomes issue

4. **Some queries fetch all then filter**
   - **Fix**: Use indexes + `.take()` where possible

---

## Security Review

### ✅ Security Status: SECURE

**Authentication:**
- ✅ Clerk JWT validation (server-side)
- ✅ All queries check `getCurrentUser(ctx)`
- ✅ Role-based authorization checks

**Authorization:**
- ✅ Role checks in all protected functions
- ✅ Admin vs Superadmin separation in Convex functions

**Input Validation:**
- ✅ All functions use `v.validator()` for args
- ✅ Server-side validation only

**Data Protection:**
- ✅ Convex validates JWT tokens automatically
- ✅ Cannot bypass server-side checks
- ✅ RouteGuard provides UX layer (data already protected)

**Recommendations:**
- ✅ Current security is solid
- ✅ No changes needed for security

---

## Files to Create/Modify

### New Files:
- `src/routes/superadmin/dashboard.tsx`
- `src/routes/superadmin/residents.tsx`
- `src/routes/superadmin/residents.$id.tsx`
- `src/routes/superadmin/statistics.tsx`
- `src/routes/superadmin/settings.tsx`
- `src/routes/superadmin/settings/users.tsx`
- `src/routes/superadmin/transactions.tsx`
- `src/components/SuperadminSidebar.tsx` (or update AdminSidebar)

### Files to Modify:
- `src/routes/admin/dashboard.tsx` - Remove sales stats, Admin only
- `src/routes/__root.tsx` - Update redirect logic
- `src/lib/auth.ts` - Update redirect helpers
- `src/components/AdminSidebar.tsx` - Update navigation

### Convex Functions to Optimize:
- `convex/residents.ts:generateNextResidentId` - Optimize query
- `convex/queue.ts:getByRequestId` - Add index if missing

---

## Next Steps

**Before implementing, please confirm:**
1. ✅ Proceed with Option 2 (separate routes)?
2. ✅ Use shared components approach (Option A)?
3. ✅ Optimize the Convex queries mentioned above?
4. ✅ Update root redirect (`/` → `/admin/dashboard` for Admin, `/superadmin/dashboard` for Superadmin)?

**Ready to proceed?** I'll:
1. Create separate routes structure
2. Optimize Convex queries
3. Update navigation and guards
4. Ensure security best practices
