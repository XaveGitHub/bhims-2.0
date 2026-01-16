# Admin Navigation & Optimization Plan

## Current Situation
- ✅ Everything is on `/admin/dashboard` (statistics + residents management)
- ❌ Sidebar has unnecessary links (Statistics, Residents) that go to non-existent pages
- ⚠️ Need to optimize for future filters (gender, purok, etc.)

## Recommended Navigation Structure

### For Admin:
- **Dashboard** - Everything (statistics + residents management)
- **Settings** (Superadmin only) - System settings
- **Transactions** (Superadmin only) - All transactions

### Remove:
- ❌ Statistics (already on dashboard)
- ❌ Residents (already on dashboard)

## Optimization Strategy for Future Filters

### Current Filters:
- Status (resident, deceased, moved, pending)
- Zone
- Search (name)

### Planned Future Filters:
- Gender (male, female, other)
- Purok
- Date range (createdAt)
- Age range (calculated from birthdate)
- Disability status

### Optimization Approach:

#### Option A: Server-Side Filtering (Recommended) ✅
**Pros:**
- Efficient for large datasets (40k+ residents)
- Uses Convex indexes
- Low bandwidth
- Fast queries

**Cons:**
- Need to update Convex queries for each filter
- More complex query logic

**Implementation:**
```typescript
// Convex query with all filters
api.residents.list({
  status?: 'resident' | 'deceased' | 'moved' | 'pending',
  zone?: string,
  gender?: 'male' | 'female' | 'other',
  purok?: string,
  limit: 50,
  offset: 0
})
```

#### Option B: Client-Side Filtering
**Pros:**
- Simple to implement
- No query changes needed

**Cons:**
- ❌ Inefficient for large datasets
- ❌ High bandwidth (fetch all, filter client-side)
- ❌ Slow with 40k residents

### Recommended: Hybrid Approach ✅

1. **Primary Filters → Server-Side** (Status, Zone, Gender)
   - Use Convex indexes
   - Efficient queries
   - Low cost

2. **Secondary Filters → Client-Side** (Purok, Date range)
   - Applied after fetching
   - Less common filters
   - Acceptable performance

3. **Search → Server-Side** (Name search)
   - Uses by_name index
   - Optimized query

## Implementation Plan

### Phase 1: Simplify Navigation ✅
- Remove Statistics and Residents links from sidebar
- Keep only Dashboard, Settings (superadmin), Transactions (superadmin)

### Phase 2: Optimize Filter System
- Add gender filter to Convex query
- Update UI to support gender filter
- Ensure server-side filtering works properly

### Phase 3: Future Filters
- Add purok filter (server-side if common, client-side if rare)
- Add date range filter (client-side)
- Add age range filter (client-side calculation)

## Cost Optimization

### Current (with future filters):
- **Server-side filters**: ~$0.0001 per query (efficient)
- **Client-side filters**: ~$0.0001 per query (fetch once, filter multiple times)
- **Search**: ~$0.00005 per query (optimized)

### With 40k residents:
- **100 queries/day**: ~$0.01/day = ~$0.30/month ✅
- **1000 queries/day**: ~$0.10/day = ~$3/month ✅

## Next Steps

1. ✅ Simplify sidebar navigation
2. ✅ Add gender filter support (server-side)
3. ✅ Optimize query structure for multiple filters
4. ⏳ Add remaining filters as needed
