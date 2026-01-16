# Admin Dashboard - Residents Management Implementation Plan

## Overview
Merge residents management into `/admin/dashboard` page. The dashboard will have:
1. Statistics cards at the top (✅ already done)
2. Residents Management section below (needs implementation)

## Features to Implement

### Phase 1: Basic Residents Table (Current Priority)
- ✅ Residents list/table with pagination
- ✅ Search by name (uses `residents.search()`)
- ✅ Filter by status (resident, deceased, moved, pending)
- ✅ Filter by zone
- ✅ Sort by name, zone, status
- ✅ View resident details (navigate to `/admin/residents/[id]` - to be created)
- ✅ Basic actions (View, Edit, Delete)

### Phase 2: Add/Edit/Delete (Next)
- ✅ Add Resident dialog/form
- ✅ Edit Resident dialog/form
- ✅ Delete Resident (with confirmation)
- ✅ Form validation

### Phase 3: Excel Import (Later)
- Excel upload
- Duplicate detection
- Review interface
- Auto-generate Resident IDs

### Phase 4: Pending Resident Confirmations (Later)
- Section for guest records (status: pending)
- Review and approve workflow

## Convex Functions Available

### Queries:
- `api.residents.list({ status?, zone?, limit? })` - List with filtering
- `api.residents.search({ searchTerm, limit? })` - Search by name
- `api.residents.listByStatus({ status, limit? })` - Filter by status
- `api.residents.listByZone({ zone, status?, limit? })` - Filter by zone
- `api.residents.get({ id })` - Get single resident

### Mutations:
- `api.residents.create({ ... })` - Create resident
- `api.residents.update({ id, ... })` - Update resident
- `api.residents.remove({ id })` - Delete resident

## Optimizations

### Convex Query Optimization:
- ✅ Use indexed queries (`withIndex`)
- ✅ Use `.take()` for pagination (limit results)
- ✅ Filter server-side (not client-side)
- ✅ Use composite indexes for multi-field filters

### UI Optimization:
- ✅ Pagination (limit to 50-100 per page)
- ✅ Debounced search (wait for user to stop typing)
- ✅ Loading states
- ✅ Error handling

## Implementation Steps

1. **Replace placeholder with Residents Table component**
2. **Add search and filter controls**
3. **Implement table with pagination**
4. **Add Add/Edit/Delete dialogs**
5. **Add Excel import (later)**
6. **Add Pending Confirmations section (later)**

## Security

- ✅ All queries check `getCurrentUser(ctx)` server-side
- ✅ Role checks in Convex mutations
- ✅ Input validation with `v.validator()`
- ✅ RouteGuard protects route (client-side UX)
