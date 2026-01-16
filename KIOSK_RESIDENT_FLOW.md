# Kiosk-Resident Flow Verification

## ✅ Confirmed: Everything is Connected Correctly

### 1. **Barcode Scanning → Database Lookup** ✅

**Flow:**
1. User scans barcode OR manually enters Resident ID (e.g., "BH-00001")
2. Kiosk UI calls: `api.residents.getByResidentId({ residentId: "BH-00001" })`
3. Convex query uses `by_residentId` index for fast lookup
4. Returns resident data if found

**Code Location:**
- `src/routes/kiosk.tsx` line 128-133
- `convex/residents.ts` line 100-108

**Index Used:** ✅ `by_residentId` (optimized)

---

### 2. **Resident Info Prefilled** ✅

**Flow:**
1. When resident is found, UI displays resident information card
2. Shows: Name, Zone, Purok, Address (read-only)
3. User can then select certificates

**Code Location:**
- `src/routes/kiosk.tsx` line 426-445
- Displays: `{resident.firstName} {resident.middleName} {resident.lastName}`
- Shows: Zone, Purok, Address

---

### 3. **Certificate Selection & Submission** ✅

**Flow:**
1. User selects certificate types (checkboxes)
2. User enters purpose for each certificate (if required)
3. System calculates total price
4. On submit, calls `api.kiosk.submitRequest()`
5. Creates:
   - `documentRequest` (linked to `residentId`)
   - `documentRequestItems` (certificates selected)
   - `queue` item (for staff processing)

**Code Location:**
- `src/routes/kiosk.tsx` line 184-193
- `convex/kiosk.ts` line 114-138

**Key Point:** ✅ `residentId` is passed as Convex ID (`resident._id`)

---

### 4. **Transaction History Saved** ✅

**Flow:**
1. `documentRequest` is created with `residentId: finalResidentId`
2. This links the request to the resident
3. Can query all requests for a resident using `by_residentId` index

**Code Location:**
- `convex/kiosk.ts` line 116: `residentId: finalResidentId`
- `convex/schema.ts` line 81: `.index("by_residentId", ["residentId"])` ✅

**Query Available:**
- `api.documentRequests.listByResident({ residentId })` - Gets all requests for a resident

---

### 5. **Kiosk Residents = Regular Residents** ✅

**Confirmed:**
- ✅ Both use the **same `residents` table**
- ✅ Guest residents (from kiosk manual entry) are created with `status: "pending"`
- ✅ Regular residents have `status: "resident"`
- ✅ Same schema, same indexes, same queries

**Code Location:**
- `convex/kiosk.ts` line 52-66: Creates guest resident in `residents` table
- `convex/residents.ts`: All queries work for both regular and guest residents

**Guest Resident Flow:**
1. User selects "Manual Entry" in kiosk
2. Fills out form (name, zone, etc.)
3. Creates resident with:
   - `residentId: "GUEST-TEMP"` (temporary)
   - `status: "pending"` (needs admin approval)
4. Admin can later approve and assign proper BH-00001 ID

---

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    KIOSK FLOW                                │
└─────────────────────────────────────────────────────────────┘

Mode A: Barcode Scanning
├─ 1. Scan/Enter Resident ID (BH-00001)
├─ 2. Query: getByResidentId("BH-00001") 
│   └─ Uses: by_residentId index ✅
├─ 3. Display Resident Info (prefilled) ✅
├─ 4. Select Certificates
├─ 5. Enter Purposes
├─ 6. Submit Request
│   └─ Creates: documentRequest (residentId linked) ✅
│   └─ Creates: documentRequestItems (certificates) ✅
│   └─ Creates: queue item ✅
└─ 7. Show Queue Number

Mode B: Manual Entry (Guest)
├─ 1. Fill Guest Form
├─ 2. Create Guest Resident (status: "pending") ✅
│   └─ Same residents table ✅
├─ 3. Select Certificates
├─ 4. Submit Request
│   └─ Creates: documentRequest (guest residentId linked) ✅
└─ 5. Show Queue Number

┌─────────────────────────────────────────────────────────────┐
│              TRANSACTION HISTORY                             │
└─────────────────────────────────────────────────────────────┘

Query: api.documentRequests.listByResident({ residentId })
├─ Uses: by_residentId index ✅
├─ Returns: All document requests for that resident
└─ Includes: Request number, certificates, dates, status

┌─────────────────────────────────────────────────────────────┐
│              RESIDENT MANAGEMENT                             │
└─────────────────────────────────────────────────────────────┘

Admin Dashboard:
├─ Shows all residents (regular + pending guests) ✅
├─ Filter by status: resident, pending, deceased, moved ✅
├─ Can approve guest → assign BH-00001 ID ✅
└─ Can view transaction history per resident ✅
```

---

## Verification Checklist

- ✅ Barcode scanning checks database (uses index)
- ✅ Resident info prefilled when found
- ✅ Certificates selected and saved
- ✅ Requests saved with residentId link
- ✅ Transaction history queryable via by_residentId index
- ✅ Kiosk residents and regular residents use same table
- ✅ Guest residents properly handled (status: pending)

---

## Indexes Used (All Optimized) ✅

1. **`by_residentId`** - Barcode lookup (fast)
2. **`by_residentId`** (documentRequests) - Transaction history (fast)
3. **`by_status`** - Filter residents by status
4. **`by_status_zone`** - Filter by status + zone
5. **`by_name`** - Search by name

---

## Summary

**Everything is connected correctly!** ✅

- Kiosk barcode scanning → Database lookup ✅
- Resident info prefilled ✅
- Certificates saved with resident link ✅
- Transaction history saved ✅
- Same residents table for all ✅
- All using optimized indexes ✅
