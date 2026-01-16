# Statistics Query Optimization for 40k Residents

## Current Implementation

### Optimizations Applied

1. **Indexed Queries**
   - All queries use indexes (`by_status`, `by_status_zone`, `by_status_createdAt`)
   - Fast lookup time: O(log n) instead of O(n) full table scan
   - Example: `query("residents").withIndex("by_status", ...)`

2. **Single Query for Residents**
   - Fetches all residents once, then counts in memory
   - Avoids duplicate queries for male/female counts
   - More efficient than 3 separate queries

3. **Parallel Queries**
   - Documents and queue queries run in parallel
   - Reduces total query time

4. **Minimal Data Return**
   - Returns only counts/numbers, not full records
   - Response size: ~1KB (just numbers)

5. **Efficient Date Filtering**
   - Uses indexed queries first, then filters by date in memory
   - Queue items are small in number (hundreds, not thousands)

## Bandwidth Analysis

### Current Approach (Per Dashboard Load)

**Residents Query:**
- Fetches: ~40,000 records (status: 'resident')
- Record size: ~200 bytes average
- Total: ~8MB per query
- Query time: Fast (indexed lookup)

**Documents Query:**
- Fetches: All printed items (typically thousands, not 40k)
- Record size: ~150 bytes average
- Total: ~500KB - 2MB (depends on printed items count)

**Queue Query:**
- Fetches: All queue items (typically hundreds per day)
- Record size: ~200 bytes average
- Total: ~100KB - 500KB

**Total Bandwidth per Dashboard Load:**
- ~8-10MB (mostly from residents query)
- Query count: 4 queries total
- Query time: Fast (all indexed)

### Convex Free Tier Limits

- **Function calls**: 1M/month
- **Bandwidth**: 1GB/month
- **Storage**: 1GB

**Estimated Usage:**
- Dashboard loads: ~100/month (admin checks dashboard)
- Bandwidth: 100 × 10MB = 1GB/month (at the limit)
- Function calls: 100 × 4 = 400 calls/month (well under limit)

## Potential Issues

### Bandwidth Concern

For 40k residents, fetching all records just to count is bandwidth-intensive:
- **Current**: ~8MB per dashboard load
- **If dashboard is accessed frequently**: Could exceed 1GB/month bandwidth limit

### Query Time

- **Indexed lookup**: Fast (O(log n))
- **Data transfer**: The bottleneck (not query time)
- **Total time**: ~1-2 seconds for 40k records (acceptable)

## Future Optimization Options

### Option 1: Cached Counters (Recommended if bandwidth becomes an issue)

**Approach:**
- Create a `statisticsCache` table with pre-computed counts
- Update counters on mutations (create/update/delete residents)
- Query cached counters instead of counting records

**Benefits:**
- Bandwidth: ~1KB per query (just numbers)
- Query time: Instant (single record lookup)
- Function calls: Same (1 query)

**Trade-offs:**
- More complex: Need to update counters on every mutation
- Potential inconsistency: Counters might be slightly out of sync
- Additional mutations: Each resident create/update/delete needs counter update

**Implementation:**
```typescript
// statisticsCache table
{
  _id: "stats",
  totalResidents: 40000,
  maleResidents: 20000,
  femaleResidents: 20000,
  lastUpdated: timestamp
}

// Update on mutation
export const create = mutation({
  // ... create resident
  // Then update counter
  await ctx.db.patch("stats", {
    totalResidents: increment(1),
    [sex + "Residents"]: increment(1)
  })
})
```

### Option 2: Sampling (Not Recommended)

**Approach:**
- Sample first 1000 residents, extrapolate
- Inaccurate counts

**Not recommended:** Statistics should be accurate

### Option 3: Pagination with Count (Not Possible)

**Approach:**
- Convex doesn't support COUNT aggregation
- Can't get count without fetching records

## Recommendations

### For Current Scale (40k residents)

**Current implementation is acceptable:**
- Dashboard is not accessed frequently (admin checks occasionally)
- Bandwidth usage is within limits if dashboard is accessed <100 times/month
- Query time is fast (indexed)
- Simple to maintain

### If Bandwidth Becomes an Issue

**Implement cached counters:**
- Monitor bandwidth usage in Convex dashboard
- If approaching 1GB/month, implement Option 1
- Trade-off: More complex, but reduces bandwidth by 99%

### Monitoring

**Track in Convex Dashboard:**
- Function calls per month
- Bandwidth usage per month
- Query execution time
- If bandwidth > 800MB/month, consider implementing cached counters

## Current Query Breakdown

### `getDashboardStats` Query

**Queries executed:**
1. Residents query (1 query, ~40k records)
2. Documents query (1 query, ~thousands records)
3. Queue queries (3 queries, ~hundreds records each)

**Total: 5 queries, ~8-10MB bandwidth**

**Optimizations:**
- ✅ All queries use indexes
- ✅ Parallel execution where possible
- ✅ Single query for residents (counts in memory)
- ✅ Returns only numbers (minimal response size)

## Conclusion

**Current implementation is optimized for:**
- Fast query time (indexed)
- Minimal response size (just numbers)
- Efficient query pattern (single query, parallel execution)

**Bandwidth consideration:**
- Acceptable for occasional dashboard access (<100 loads/month)
- If dashboard is accessed frequently, consider implementing cached counters

**Recommendation:**
- Start with current implementation
- Monitor bandwidth usage
- Implement cached counters only if bandwidth becomes an issue
