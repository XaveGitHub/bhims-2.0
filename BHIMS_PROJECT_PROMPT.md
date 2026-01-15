# BHIMS System - Complete Project Prompt

Use this prompt to recreate the entire BHIMS (Barangay Health Information Management System) from scratch.

**See also:** `BHIMS_PAGE_STRUCTURE.md` for detailed page-by-page breakdown of all routes, functions, and user access levels.

## Project Overview

Build a complete Barangay Health Information Management System (BHIMS) for Barangay Handumanan. The system manages resident records, processes certificate requests through a queue system, auto-fills certificate templates, and provides comprehensive admin tools for statistics and reporting.

## Tech Stack

- **Frontend/Backend**: TanStack Start (React, TypeScript, Vite)
- **Database**: Convex (Real-time, serverless backend)
- **Authentication**: Clerk (Pre-built auth with role management)
- **Styling**: Tailwind CSS 4
- **Table Component**: TanStack Table (React Table)
- **PDF Generation**: Puppeteer or Playwright
- **Excel Parsing**: xlsx library
- **Validation**: Zod
- **Package Manager**: npm (or pnpm)

**Why This Stack?**
- **TanStack Start**: Faster dev server, smaller bundles, better real-time performance
- **Convex**: Real-time subscriptions (no polling needed), automatic scaling, built-in Clerk integration
- **Clerk**: Pre-built auth UI, role management, simpler than custom auth

## User Types (4 Total)

### 1. Public/Residents (No Login Required)
- Access kiosk interface only (`/kiosk` route)
- Scan barcode or manually enter Resident ID
- Select one or multiple certificate types per request
- Enter purpose for each certificate separately
- Submit certificate requests
- View queue number after submission
- Cannot access admin/staff pages or resident data

### 2. Staff (Login Required - Role: `staff`)
**Queue Management:**
- View all queue items and items assigned to their counter
- Process next item in queue (serve resident)
- Mark requests as done after successful printing (status: claim)

**Certificates:**
- Print certificates (generate PDF)
- Edit resident information and purposes before printing
- Live preview of certificate while editing
- Reprint certificates if needed
- View full request details (resident info, purpose, etc.)

**Payment:**
- **NO payment recording** - Payment handled by cashier (offline, not recorded in system)
- No payment fields on staff pages

**Cannot do**: Manage residents, view statistics, configure settings, manage users, search residents (not needed - info already on process page)

### 3. Admin (Login Required - Role: `admin`)
**Resident Management:**
- Add, edit, delete residents manually
- Import residents via Excel with duplicate review (auto-generates sequential Resident IDs)
- View all residents with sorting/filtering (by zone, gender, name, etc.)
- Each sort shows: population count + gender breakdown
- Filter by status: `resident`, `deceased`, `moved`
- Export resident data (CSV)
- View individual resident profiles with transaction history
- Review and approve guest records from kiosk manual entry

**Statistics & Reports:**
- View dashboard statistics (demographics, population breakdown, documents issued)
- **NO sales statistics** (only Superadmin sees sales)
- Filter statistics by zone, gender, date range
- Export reports as CSV/PDF
- View transaction history per resident (on resident profile page)

**Cannot do**: 
- Manage users (Admin/Staff accounts)
- Configure system settings (barangay officials, document types, prices)
- View transaction logs (Superadmin only)
- Process queue (Staff handles queue)
- Print certificates (Staff only, Admin can only view)

### 4. Superadmin (Login Required - Role: `superadmin`)
**All Admin permissions, plus:**

**User Management:**
- Create, edit, delete Admin and Staff user accounts
- Manage user roles and permissions
- Activate/deactivate users

**System Configuration:**
- Configure barangay officials (names, positions)
- Manage document types (add/edit/delete, set prices)
- Configure system-wide settings

**Statistics:**
- **Sales statistics** (total sales/revenue from printed certificates)
- All Admin statistics features

**Transactions:**
- View all document request transactions (all residents, all requests)
- Filter by date, resident, status, certificate type
- Export transaction data (CSV, PDF)

**Full system access**: Complete control over all features and data

## Database Schema (Convex)

### Core Tables with Indexes

**IMPORTANT**: All tables include optimized indexes for common query patterns. See "Optimization Notes" section below for details.

#### `residents` (Master Data)
**IMPORTANT: Schema is extensible - more fields will be added in the future. Design for extensibility.**

Core required fields:
- `_id` (PK, Convex ID - internal database identifier)
- `residentId` (unique, string, format: 'BH-00001', 'BH-00002' - sequential, used for barcode/typing)
- `firstName` (required, string)
- `middleName` (required, string)
- `lastName` (required, string)
- `sex` (required, 'male' | 'female' | 'other')
- `birthdate` (required, number - timestamp)
- `zone` (required, string)
- `purok` (required, string)
- `address` (required, string)
- `disability` (boolean, default: false)
- `status` (required, 'resident' | 'deceased' | 'moved' | 'pending')
  - 'resident' = active resident (default)
  - 'deceased' = archived but searchable
  - 'moved' = archived but searchable
  - 'pending' = guest record from kiosk (pending admin approval)
- `createdAt` (number - timestamp)
- `updatedAt` (number - timestamp)

**Indexes:**
- `by_residentId` on `residentId` (unique) - for barcode lookup
- `by_status` on `status` - for filtering by status
- `by_zone` on `zone` - for zone-based queries
- `by_name` on `lastName`, `firstName` - for alphabetical sorting
- `by_status_zone` on `status`, `zone` - composite for filtered zone queries

#### `documentTypes`
- `_id` (PK, Convex ID)
- `name` (required, unique, e.g., "Barangay Clearance", "Barangay Certificate", "Indigency")
- `templateKey` (required, string, references template file name)
- `price` (required, number - decimal stored as cents)
- `requiresPurpose` (boolean, default: false)
- `isActive` (boolean, default: true)
- `createdAt` (number - timestamp)
- `updatedAt` (number - timestamp)

**Indexes:**
- `by_isActive` on `isActive` - for filtering active document types
- `by_name` on `name` - for name lookups

#### `documentRequests`
- `_id` (PK, Convex ID)
- `residentId` (FK to residents._id, required)
- `requestNumber` (unique, string, auto-generated)
- `status` ('pending' | 'queued' | 'serving' | 'completed' | 'cancelled')
- `totalPrice` (number - decimal stored as cents, sum of all document_request_items)
- `requestedAt` (number - timestamp)
- `completedAt` (number - timestamp, nullable)

**Indexes:**
- `by_residentId` on `residentId` - for resident transaction history
- `by_status` on `status` - for queue filtering
- `by_requestedAt` on `requestedAt` - for date range queries
- `by_status_requestedAt` on `status`, `requestedAt` - composite for queue sorting

#### `documentRequestItems` (Junction Table for Multiple Certificates)
- `_id` (PK, Convex ID)
- `documentRequestId` (FK to documentRequests._id, required)
- `documentTypeId` (FK to documentTypes._id, required)
- `purpose` (string, required if documentType.requiresPurpose is true)
- `status` ('pending' | 'printed')
- `printedAt` (number - timestamp, nullable)
- `createdAt` (number - timestamp)

**Indexes:**
- `by_documentRequestId` on `documentRequestId` - for request details
- `by_status` on `status` - for filtering printed items
- `by_documentRequestId_status` on `documentRequestId`, `status` - composite for request status

#### `queue`
- `_id` (PK, Convex ID)
- `documentRequestId` (FK to documentRequests._id, unique, required)
- `queueNumber` (string, format: 'Q-001', 'Q-002', resets daily)
- `serviceType` (string, default: 'certificate')
- `status` ('waiting' | 'serving' | 'done' | 'skipped')
- `counterNumber` (number, nullable - assigned when serving)
- `servedBy` (string, nullable - Clerk user ID)
- `createdAt` (number - timestamp)
- `startedAt` (number - timestamp, nullable - when status becomes serving)
- `completedAt` (number - timestamp, nullable)

**Indexes:**
- `by_status` on `status` - for queue filtering (CRITICAL for real-time updates)
- `by_queueNumber` on `queueNumber` - for queue number lookups
- `by_status_createdAt` on `status`, `createdAt` - composite for queue ordering
- `by_counterNumber_status` on `counterNumber`, `status` - for counter-specific queues

#### `printedDocuments`
- `_id` (PK, Convex ID)
- `documentRequestItemId` (FK to documentRequestItems._id, required)
- `printedBy` (string, required - Clerk user ID)
- `printedAt` (number - timestamp)
- `reprintCount` (number, default: 0)
- `pdfPath` (string, nullable - path to saved PDF file)

**Indexes:**
- `by_documentRequestItemId` on `documentRequestItemId` - for item history
- `by_printedAt` on `printedAt` - for date range queries
- `by_printedBy` on `printedBy` - for staff statistics

#### `users` (Clerk Integration)
**Note**: Primary user data stored in Clerk. This table stores additional BHIMS-specific metadata.

- `_id` (PK, Convex ID)
- `externalId` (unique, string - Clerk user ID, stored in JWT `subject` field)
- `name` (required, string - full name from Clerk)
- `email` (string - user's email)
- `role` ('superadmin' | 'admin' | 'staff')
- `isActive` (boolean, default: true)
- `createdAt` (number - timestamp)
- `updatedAt` (number - timestamp)
- `lastLoginAt` (number - timestamp, nullable)

**Indexes:**
- `byExternalId` on `externalId` (unique) - for Clerk integration (matches JWT `subject`)
- `by_role` on `role` - for role-based queries
- `by_isActive` on `isActive` - for filtering active users

**Important:** 
- Use `externalId` field (not `clerkUserId`) to match Convex database auth pattern
- `externalId` stores the Clerk user ID which is available in JWT `subject` field
- This allows `ctx.auth.getUserIdentity().subject` to directly query users

**Reference:** [Convex Database Auth Schema](https://docs.convex.dev/auth/database-auth#optional-users-table-schema)

#### `barangayOfficials`
- `_id` (PK, Convex ID)
- `position` (string, unique, e.g., 'captain', 'secretary', 'treasurer')
- `name` (required, string)
- `title` (string, e.g., 'Barangay Captain')
- `isActive` (boolean, default: true)
- `createdAt` (number - timestamp)
- `updatedAt` (number - timestamp)

**Indexes:**
- `by_position` on `position` (unique) - for position lookups
- `by_isActive` on `isActive` - for filtering active officials

#### `auditLogs`
- `_id` (PK, Convex ID)
- `userId` (string, nullable - Clerk user ID)
- `action` (string, e.g., 'create_resident', 'delete_user', 'update_price')
- `resourceType` (string, e.g., 'resident', 'user', 'documentType')
- `resourceId` (string, nullable)
- `details` (object, stores additional context)
- `ipAddress` (string, nullable)
- `createdAt` (number - timestamp)

**Indexes:**
- `by_userId` on `userId` - for user activity logs
- `by_resourceType` on `resourceType` - for resource filtering
- `by_createdAt` on `createdAt` - for date range queries
- `by_resourceType_resourceId` on `resourceType`, `resourceId` - composite for resource history

## Optimization Notes

### Database Indexes Strategy

**Why Indexes Matter:**
- Convex indexes dramatically improve query performance
- Without indexes, queries scan entire tables (slow for large datasets)
- Indexes enable real-time subscriptions to work efficiently

**Index Best Practices:**

1. **Index Frequently Queried Fields**
   - Queue status (used constantly for real-time updates)
   - Resident ID (barcode lookups)
   - Status fields (filtering)
   - Date fields (range queries)

2. **Composite Indexes for Multi-Field Queries**
   - `by_status_createdAt` - for queue sorted by status and date
   - `by_status_zone` - for filtered zone statistics
   - Use when filtering/sorting on multiple fields together

3. **Unique Indexes for Data Integrity**
   - `residentId` - prevents duplicate resident IDs
   - `clerkUserId` - ensures one BHIMS user per Clerk account
   - `queueNumber` - prevents duplicate queue numbers

4. **Avoid Over-Indexing**
   - Don't index every field (wastes storage and slows writes)
   - Only index fields used in WHERE, ORDER BY, or JOIN clauses
   - Monitor query patterns and add indexes as needed

### Real-Time Subscriptions Optimization

**Queue System (Critical for Performance):**
```typescript
// ✅ GOOD: Use index for real-time queue updates
const queueItems = useQuery(api.queue.listByStatus, { 
  status: 'waiting' 
});

// ❌ BAD: Don't fetch all and filter client-side
const allItems = useQuery(api.queue.listAll);
const filtered = allItems?.filter(item => item.status === 'waiting');
```

**Benefits:**
- Real-time updates without polling (saves function calls)
- Only subscribed to relevant data
- Automatic re-renders when data changes
- Efficient server-side filtering

### Query Optimization

1. **Use Indexes in Queries**
   ```typescript
   // ✅ GOOD: Uses index
   .withIndex("by_status", (q) => q.eq("status", "waiting"))
   
   // ❌ BAD: Full table scan
   .collect().then(items => items.filter(i => i.status === "waiting"))
   ```

2. **Limit Result Sets**
   ```typescript
   // ✅ GOOD: Pagination
   .withIndex("by_createdAt")
   .order("desc")
   .take(20)
   
   // ❌ BAD: Fetching all records
   .collect()
   ```

3. **Use Composite Indexes for Complex Queries**
   ```typescript
   // ✅ GOOD: Uses composite index
   .withIndex("by_status_zone", (q) => 
     q.eq("status", "resident").eq("zone", "Zone 7")
   )
   ```

### Data Modeling Best Practices

1. **Store Numbers as Integers (Cents)**
   - Store prices as cents (e.g., 5000 = ₱50.00)
   - Avoids floating-point precision issues
   - Easier to calculate totals

2. **Store Timestamps as Numbers**
   - Use `Date.now()` or `Date.getTime()`
   - Easier to query and sort
   - More efficient than string dates

3. **Denormalize for Performance**
   - Store `residentId` string in requests (not just reference)
   - Enables faster lookups without joins
   - Trade-off: More storage, better performance

4. **Use Convex File Storage for PDFs**
   - Store PDFs in Convex file storage (not database)
   - Reference file ID in `printedDocuments.pdfPath`
   - More efficient than base64 in database

### Function Call Optimization

**Minimize Function Calls:**
- Use real-time subscriptions instead of polling
- Batch operations when possible
- Cache frequently accessed data client-side
- Use Convex's built-in caching

**Example: Queue Updates**
```typescript
// ✅ GOOD: Real-time subscription (1 function call, auto-updates)
const queue = useQuery(api.queue.listByStatus, { status: 'waiting' });

// ❌ BAD: Polling every 5 seconds (17280 calls/day)
useEffect(() => {
  const interval = setInterval(() => {
    fetchQueue();
  }, 5000);
  return () => clearInterval(interval);
}, []);
```

### Cost Optimization

**Convex Free Tier Limits:**
- 1,000,000 function calls/month
- 0.5 GiB database storage
- 1 GiB bandwidth/month

**Optimization Strategies:**
1. **Real-time Subscriptions** - Replace polling (saves ~260K calls/month per staff)
2. **Efficient Indexes** - Faster queries = fewer function calls
3. **Pagination** - Don't fetch all records at once
4. **Client-side Caching** - Cache static data (document types, officials)
5. **Batch Operations** - Combine multiple operations when possible

**Estimated Monthly Usage (Optimized):**
- Queue subscriptions: ~50K calls/month (real-time, not polling)
- Admin operations: ~100K calls/month
- Resident queries: ~200K calls/month
- **Total: ~350K calls/month** (well within free tier)

## Key Features & Requirements

### Authentication (Clerk)
- Use Clerk for authentication and user management
- Configure three roles: `superadmin`, `admin`, `staff`
- Store role in Convex `users` table (synced with Clerk)
- Use Clerk's role-based access control
- Reference: https://clerk.com/docs

### Root Page (`/` route)
**Behavior (Role-Based):**
- **If NOT logged in (public):**
  - Show simple logo page (just barangay logo)
  - No system information visible
  - No navigation or links
  - Clean, minimal design
  
- **If logged in (authenticated users):**
  - Redirect based on role:
    - Staff → `/staff/queue`
    - Admin → `/admin/dashboard`
    - Superadmin → `/admin/dashboard`

**Purpose:** Keep system low-profile for public visitors, automatically route authenticated users to their dashboard

### Kiosk Interface (`/kiosk` route)
- Fullscreen mode for tablets (auto-start fullscreen, separate route)
- Barcode scanner support (physical scanner acts as keyboard input)

**Mode A: Resident ID Lookup (Existing Residents)**
- Scan barcode OR manually enter Resident ID (sequential format: BH-00001)
- System auto-fills and displays resident information (read-only)
- Select multiple certificate types (checkboxes)
- Enter purpose for each certificate separately
- Show total price (sum of selected certificates)
- Submit request
- Display queue number after submission
- Auto-return to start after 10-15 seconds OR "Close" button to return immediately

**Mode B: Manual Entry (Guest/New Residents)**
- Button: "New Resident" or "Don't have ID?"
- Manual form fields:
  - Name (first, middle, last)
  - Purok/Zone
  - Birthday (age calculated automatically)
  - Birthplace
  - Status
  - Gender
  - Purpose (main purpose)
  - Years of residency
  - Contact No.
  - Date of request (auto-filled, not editable)
- Select certificate types
- Enter purpose for each certificate (if different from main purpose)
- Show total price
- Submit request → Creates guest/pending resident record (status: 'pending')
- Duplicate check: Prevent duplicates during entry (Resident ID first, then name + birthdate)
- Display queue number after submission
- Auto-return to start after 10-15 seconds OR "Close" button

**Guest Records Workflow:**
- Guest records appear in Admin dashboard as "Pending Resident Confirmations"
- Admin can review, complete missing fields, approve/convert to full resident, or reject if duplicate

### Queue System
- Queue numbers: Prefixed format (Q-001, Q-002, ...) resets daily
- One queue number per request (even if multiple certificates)
- Multiple counter support (Counter 1, Counter 2, etc.)
- **Real-time updates using Convex subscriptions** (no polling needed!)

**Queue Workflow:**
1. Request submitted (kiosk) → Status: `queued`
2. Staff clicks "Process Next" → Status: `serving`
3. Staff prints certificates → Status: `printed`
4. After printing → Status: `claim` (ready for resident to claim)

**Queue Display Page (`/queue-display`) for TV screen:**
- Public access (no login required)
- Shows all pending and serving requests
- Large, readable format
- **Real-time updates via Convex subscription** (no polling)
- No user interaction needed

### Excel Import
- Support `.xlsx` format
- Expected columns: first_name, middle_name, last_name, sex, birthdate, zone/purok, address, disability, status
- **Auto-generate sequential Resident IDs** (BH-00001, BH-00002, etc.) during import
- Duplicate detection:
  - Check Resident ID first (if provided in Excel)
  - Then check name + birthdate combination
  - Show review interface with options: Skip, Update, Review each duplicate
- Bulk import with transaction rollback on errors
- All fields are required for import

### Certificate Templates
- Store templates as HTML files in `/templates/certificates/` directory
- Template files: `clearance.html`, `residency.html`, `indigency.html`, etc.
- Use simple string replacement: `{{variable_name}}`
- Variables include:
  - Resident data: `{{full_name}}`, `{{address}}`, `{{birthdate}}`, etc.
  - Request data: `{{purpose}}`, `{{date_issued}}`, etc.
  - Barangay officials: `{{barangay_captain}}`, `{{barangay_secretary}}`, etc.
- Generate PDF from rendered HTML using Puppeteer/Playwright
- Download PDF for printing
- Store PDF in Convex file storage (optional, for reprints)

### Payment System
- Each document type has a price (set by Superadmin)
- Total price = sum of all selected document types in request
- **NO payment recording in system** - Payment handled by cashier (offline, not recorded)
- Cashier handles payment separately (not part of system)
- Superadmin sees total sales (sum of all printed certificates' prices) for statistics only
- No individual payment records or payment status tracking

### Statistics & Reporting
**Admin Dashboard Statistics:**
- Total residents count
- Population breakdown (male/female counts)
- Documents issued per month
- Daily queue volume
- **NO sales statistics** (only Superadmin sees sales)

**Superadmin Dashboard Statistics:**
- All Admin statistics, **PLUS:**
- Total sales/revenue (sum of all printed certificates' prices)
- Sales by period (daily, monthly)

**Filtering:**
- By zone (e.g., Zone 7 shows male/female counts for that zone)
- By gender
- By date range
- Default view: Overall Barangay Handumanan statistics

**Export:** Reports available in CSV and PDF formats

### Resident Management (Admin/Superadmin)
- List all residents with sorting/filtering:
  - By gender (male/female)
  - Alphabetical (name)
  - By location/zone/purok
  - Each sort shows: population count + gender breakdown
- Add/edit/delete residents manually
- Excel import with duplicate review (auto-generates sequential Resident IDs)
- Export resident data (CSV)
- Filter by: zone, gender, name, status (`resident`, `deceased`, `moved`, `pending`)
- Default view: All residents
- View individual resident profiles with transaction history
- Review and approve guest records (status: `pending`) from kiosk manual entry

### Document Types Management (Superadmin)
- Create/edit/delete document types
- Set price for each document type
- Link to template file (templateKey)
- Set if purpose is required

### Barangay Officials Management (Superadmin)
- Store in database (editable via admin panel)
- Can also have initial config file
- Positions: captain, secretary, treasurer (and others as needed)
- Used for certificate template auto-fill

### Resident ID System
- **Internal ID**: Convex ID (database primary key)
- **Resident ID**: Sequential format (BH-00001, BH-00002, BH-00003...)
  - Used for display, barcode, and manual typing (all the same)
  - Auto-generates during Excel import
  - Auto-generates for new residents (manual add)
  - Sequential counter starts from BH-00001
- Barcode uses the same sequential Resident ID
- Format supports up to 40K+ residents (BH-00001 to BH-40000+)

### Transactions (Superadmin Only)
- View all document request transactions
- Filter by date, resident, status, certificate type
- Export transaction data (CSV, PDF)
- Shows all document requests (not system action logs)

## File Structure

```
bhims-2.0/
├── app/
│   ├── routes/
│   │   ├── index.tsx                    # Landing page (role-based redirect)
│   │   ├── kiosk.tsx                    # Kiosk interface (fullscreen)
│   │   ├── queue-display.tsx            # Queue display for TV screen
│   │   ├── login.tsx                    # Login page (Clerk)
│   │   ├── staff/
│   │   │   ├── queue.tsx                # Staff queue dashboard
│   │   │   └── process.$requestId.tsx   # Process request (print, mark done)
│   │   └── admin/
│   │       ├── dashboard.tsx            # Admin dashboard with statistics
│   │       ├── residents.tsx            # Residents list with filtering
│   │       ├── residents.$id.tsx        # Resident detail/edit page
│   │       ├── statistics.tsx           # Statistics and reports
│   │       ├── settings.tsx              # System settings
│   │       ├── settings.users.tsx        # User management (superadmin)
│   │       └── transactions.tsx         # All transactions (superadmin)
│   ├── root.tsx                         # Root component with providers
│   └── entry.client.tsx                 # Client entry point
├── convex/
│   ├── schema.ts                        # Convex schema definitions with indexes
│   ├── residents.ts                     # Resident queries/mutations
│   ├── documentTypes.ts                 # Document type queries/mutations
│   ├── documentRequests.ts              # Request queries/mutations
│   ├── queue.ts                         # Queue queries/mutations (real-time)
│   ├── users.ts                         # User queries/mutations
│   ├── statistics.ts                   # Statistics queries
│   └── _generated/                      # Auto-generated Convex files
├── lib/
│   ├── convex/
│   │   └── client.ts                   # Convex client setup
│   ├── clerk/
│   │   └── client.ts                    # Clerk client setup
│   ├── utils/
│   │   ├── excel.ts                     # Excel parsing utilities
│   │   ├── queue.ts                     # Queue number generation
│   │   ├── template.ts                  # Template rendering utilities
│   │   ├── pdf.ts                       # PDF generation utilities
│   │   └── validation.ts                # Validation schemas (Zod)
│   └── types/
│       └── index.ts                     # TypeScript types
├── templates/
│   └── certificates/
│       ├── clearance.html               # Barangay Clearance template
│       ├── residency.html               # Barangay Certificate template
│       └── indigency.html               # Indigency template
├── components/
│   ├── ui/                              # Reusable UI components
│   ├── kiosk/
│   │   ├── id-scanner.tsx
│   │   ├── certificate-selector.tsx
│   │   ├── purpose-input.tsx
│   │   └── queue-confirmation.tsx
│   ├── queue/
│   │   ├── queue-list.tsx
│   │   ├── queue-item.tsx
│   │   └── queue-display-tv.tsx
│   ├── residents/
│   │   ├── residents-table.tsx
│   │   ├── resident-form.tsx
│   │   └── excel-import.tsx
│   ├── certificates/
│   │   ├── certificate-preview.tsx
│   │   └── certificate-print.tsx
│   └── admin/
│       ├── stats-dashboard.tsx
│       └── settings-panel.tsx
└── public/
    └── fonts/
```

## Environment Variables

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Convex
CONVEX_DEPLOYMENT=your-deployment-url
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Dependencies

```json
{
  "dependencies": {
    "@tanstack/start": "^1.0.0",
    "@tanstack/react-router": "^1.0.0",
    "@tanstack/react-table": "^8.11.0",
    "react": "^19.3.1",
    "react-dom": "^19.3.1",
    "@clerk/clerk-react": "^5.0.0",
    "convex": "^1.0.0",
    "xlsx": "^0.18.5",
    "zod": "^3.22.0",
    "date-fns": "^3.0.0",
    "puppeteer": "^21.5.0"
  },
  "devDependencies": {
    "@types/xlsx": "^0.0.36",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "typescript": "^5",
    "tailwindcss": "^4",
    "@tailwindcss/postcss": "^4",
    "vite": "^5.0.0"
  }
}
```

## Implementation Priority

1. **Phase 1**: Project setup, Convex schema, and Clerk authentication
2. **Phase 2**: Core data models and queries (residents, document types, barangay officials)
3. **Phase 3**: Kiosk interface and queue system (with real-time subscriptions)
4. **Phase 4**: Certificate templates and PDF generation
5. **Phase 5**: Admin dashboard and statistics
6. **Phase 6**: Staff interface and processing
7. **Phase 7**: Settings, user management, and audit logs
8. **Phase 8**: Excel import and export functionality
9. **Phase 9**: Testing, error handling, and polish

## Important Notes

1. **Residents Schema Extensibility**: The residents table schema is NOT final. Design for extensibility. More fields will be added in the future.

2. **Resident ID System**: 
   - Internal ID: Convex ID (database primary key)
   - Resident ID: Sequential format (BH-00001, BH-00002, etc.)
   - Used for display, barcode, and manual typing (all the same)
   - Auto-generates during Excel import and manual add
   - Sequential counter starts from BH-00001

3. **Resident Status**: Enum values: `resident` (default), `deceased` (archived but searchable), `moved` (archived but searchable), `pending` (guest records from kiosk, pending admin approval)

4. **Clerk Roles**: Three distinct authenticated roles (superadmin, admin, staff) with completely separate permission sets. Store role in Convex `users` table synced with Clerk.

5. **Queue Numbers**: Format is Q-001, Q-002, etc. Resets daily. One queue number per request (even if multiple certificates).

6. **Queue Workflow**: Request submitted → `queued` → Staff processes → `serving` → Staff prints → `printed` → Staff marks done → `claim` (ready for resident to claim)

7. **Certificate Templates**: Store as HTML files in `/templates/certificates/`. Use simple `{{variable}}` replacement. Generate PDF using Puppeteer/Playwright.

8. **Kiosk Manual Entry**: Creates guest records (status: `pending`) → Admin reviews and approves/convert to full resident or rejects

9. **Excel Import**: Support duplicate detection (Resident ID first, then name+birthdate). Show review interface for duplicates. Auto-generates sequential Resident IDs during import.

10. **Multiple Counters**: System supports multiple service counters working simultaneously.

11. **Kiosk Mode**: Fullscreen mode on tablets, separate `/kiosk` route. Auto-return to start after 10-15 seconds or "Close" button.

12. **Payment System**: **NO payment recording in system** - Payment handled by cashier (offline, not recorded). Superadmin sees total sales (sum of all printed certificates' prices) for statistics only. No individual payment records.

13. **Statistics**: 
    - Admin: NO sales statistics (only sees residents, population, documents issued)
    - Superadmin: Includes sales statistics (total sales/revenue from printed certificates)

14. **Staff Workflow**: Edit resident info and purposes before printing → Live preview updates → Print PDF → Mark as done (only enabled after successful print) → Status changes to `claim`

15. **Admin Limitations**: Admin does NOT have queue page (Staff handles queue), Admin CANNOT print certificates (only view), Admin does NOT see sales statistics

16. **Superadmin Features**: All Admin features PLUS user management, system settings (document types, barangay officials), sales statistics, transactions page (all document requests)

17. **Transaction History**: Per-resident transaction history shown on individual resident profile page (Admin/Superadmin)

18. **Statistics Filtering**: Default shows overall Barangay Handumanan stats. Can filter by zone, gender, date range. Each sort shows population count + gender breakdown.

19. **Starting from Scratch**: No existing data. Start with empty database. Create initial superadmin user via Clerk dashboard.

20. **Transactions Page (Superadmin)**: Shows all document request transactions (NOT system action logs). Filterable by date, resident, status, certificate type. Exportable (CSV, PDF).

21. **Root Page (`/`)**: Role-based behavior - Shows simple logo page (barangay logo only) if not logged in, redirects to appropriate dashboard if logged in (Staff → `/staff/queue`, Admin/Superadmin → `/admin/dashboard`). Kiosk access remains at `/kiosk` (bookmark-able for tablets).

22. **Real-Time Updates**: Use Convex subscriptions for queue updates instead of polling. This saves function calls and provides instant updates.

23. **Index Optimization**: All tables include optimized indexes. Monitor query patterns and add indexes as needed. See "Optimization Notes" section for details.
