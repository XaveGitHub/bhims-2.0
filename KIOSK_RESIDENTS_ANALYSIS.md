# Kiosk-Residents Connection Analysis & Fixes

## Issues Found

### 1. **Type Mismatch: residentId (String vs ID)**
**Problem:**
- Kiosk mutation expects: `residentId: v.optional(v.id("residents"))` (Convex ID)
- Kiosk UI uses: `getByResidentId` which takes `string` (BH-00001 format)
- Mismatch: UI passes string, mutation expects Convex ID

**Current Flow:**
1. User scans barcode → Gets string "BH-00001"
2. UI calls `getByResidentId("BH-00001")` → Returns resident with `_id` (Convex ID)
3. UI should pass `resident._id` to mutation, but might be passing `resident.residentId` (string)

**Fix Needed:**
- Ensure kiosk UI passes `resident._id` (Convex ID) to mutation
- Or update mutation to accept both string and ID

### 2. **Guest Resident ID Issue**
**Problem:**
- Guest residents get `residentId: "GUEST-TEMP"` 
- This violates the BH-00001 format
- Admin needs to convert guest to full resident with proper ID

**Fix Needed:**
- Admin should be able to approve guest and assign proper BH-00001 ID
- Or generate temporary ID in format that can be converted

### 3. **Index Optimization Issues**

#### Issue A: `generateNextResidentId` uses `.collect()`
```typescript
// ❌ BAD: Fetches ALL residents
const allResidents = await ctx.db.query("residents").collect()
```

**Fix:** Use index to find max residentId
- Option 1: Add index `by_residentId` (already exists, but need to query efficiently)
- Option 2: Store max residentId in separate table
- Option 3: Query by pattern using index (if possible)

#### Issue B: Request number generation uses `.collect()`
```typescript
// ❌ BAD: Fetches ALL requests
const allRequests = await ctx.db.query("documentRequests").collect()
```

**Fix:** Add index `by_requestedAt` and filter by date range

#### Issue C: Queue number generation uses `.collect()`
```typescript
// ❌ BAD: Fetches ALL queue items
const allQueueItems = await ctx.db.query("queue").collect()
```

**Fix:** Add index `by_createdAt` and filter by date range

## Recommended Fixes

### Priority 1: Fix Type Mismatch
- Ensure kiosk UI passes `resident._id` (Convex ID) not `resident.residentId` (string)

### Priority 2: Optimize Index Usage
- Fix `generateNextResidentId` to use index
- Fix request number generation to use date index
- Fix queue number generation to use date index

### Priority 3: Guest Resident Workflow
- Admin can approve guest and assign proper BH-00001 ID
- Update mutation to handle guest conversion
