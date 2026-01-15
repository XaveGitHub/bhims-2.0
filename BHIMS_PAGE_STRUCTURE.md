# BHIMS - Complete Page Structure & Functions

This document outlines all pages, routes, and functions for each user type in the BHIMS system.

**Tech Stack:** TanStack Start + Clerk + Convex + Shadcn(UI)

**See also:** `BHIMS_PROJECT_PROMPT.md` for complete project details, database schema, and optimization notes.

---

## 0. ROOT PAGE

### `/` - Landing Page
**Access:** Public (no authentication required)

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

**Purpose:** 
- Keep system low-profile for public visitors
- Automatically route authenticated users to their dashboard
- Kiosk access remains at `/kiosk` (bookmark-able for tablets)

---

## 1. PUBLIC/KIOSK USERS (No Login Required)

### `/kiosk` - Kiosk Interface (Fullscreen for Tablets)
**Access:** Public (no authentication)

**Mode A: Resident ID Lookup (Existing Residents)**
- Scan barcode (physical scanner - acts as keyboard input)
- OR manually enter Resident ID (sequential format: `BH-00001`)
- System auto-fills and displays resident information (read-only)
- Select multiple certificate types (checkboxes)
- Enter purpose for each certificate separately
- Show total price (sum of selected certificates)
- Submit request
- Display queue number after submission
- Auto-return to start after X seconds (10-15 seconds)
- "Close" or "Next" button to return immediately

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
- Submit request → Creates guest/pending resident record
- Duplicate check: Prevent duplicates during entry
- Display queue number after submission
- Auto-return to start after X seconds or close button

**Guest Records Workflow:**
- Guest records appear in Admin dashboard as "Pending Resident Confirmations"
- Admin can review, complete missing fields, approve/convert to full resident, or reject if duplicate

### `/queue-display` - Queue Display (TV Screen)
**Access:** Public (no authentication)

**Functions:**
- Display all pending and serving requests
- Show queue numbers (Q-001, Q-002, etc.)
- Show status (waiting, serving)
- Large, readable format for TV screens
- **Real-time updates via Convex subscriptions** (no polling needed!)
- No user interaction needed

**Optimization Note:** Uses Convex real-time subscriptions with `by_status` index for efficient updates.

---

## 2. LOGIN PAGE

### `/login` - Login Page
**Access:** All authenticated users (Staff, Admin, Superadmin)

**Functions:**
- Clerk authentication UI (pre-built components)
- Email/Password or social login options
- Authentication via Clerk
- Redirects after login based on role:
  - Staff → `/staff/queue`
  - Admin → `/admin/dashboard`
  - Superadmin → `/admin/dashboard`

---

## 3. STAFF PAGES (Login Required - Role: `staff`)

### `/staff/queue` - Staff Queue Dashboard (Main Page)
**Access:** Staff only

**Functions:**
- View queue list:
  - All queue items (waiting, serving, claim)
  - Items assigned to their counter
- "Process Next" button (serves next in queue)
- **Real-time updates via Convex subscriptions** (no polling needed!)
- Filter by counter number (if multiple counters)

**No recent requests history needed**

**Optimization Note:** Uses Convex real-time subscriptions with `by_status` index for efficient queue updates.

### `/staff/process/[requestId]` - Process Request
**Access:** Staff only

**Layout:**
- Split view or side-by-side:
  - Left/Above: Editable form fields
  - Right/Below: Live preview of certificate (updates in real-time as staff edits)

**Functions:**
- View request details:
  - Resident information (editable)
  - Selected certificates
  - Purpose for each certificate (editable)
  - Total price
- Edit fields before printing:
  - Resident info (name, address, purok, etc.)
  - Purpose for each certificate
  - Any fields that appear on certificate template
- Live preview updates as fields are edited
- Print certificates:
  - "Print" button generates PDF
  - Downloads PDF with current data
- Mark as done:
  - "Mark as Done" button (only enabled after successful print)
  - Changes status to `claim` (ready for resident to claim)
- Reprint option (if needed later)

**Workflow:**
1. Staff opens process page
2. Staff edits fields (preview updates live)
3. Staff clicks "Print" → PDF downloads
4. After successful print → "Mark as Done" button becomes enabled
5. Staff clicks "Mark as Done" → Status changes to `claim`

**No payment recording:**
- Payment handled by cashier (not recorded in system)
- No payment fields on this page

---

## 4. ADMIN PAGES (Login Required - Role: `admin`)

### `/admin/dashboard` - Admin Dashboard
**Access:** Admin only

**Functions:**
- Statistics overview:
  - Total residents count
  - Population breakdown (male/female counts)
  - Documents issued statistics
  - **NO sales statistics** (only Superadmin sees sales)
- Quick links to other pages
- **No recent activity section**

### `/admin/residents` - Resident Management
**Access:** Admin only

**Functions:**
- List all residents with advanced sorting:
  - By gender (male/female)
  - Alphabetical (name)
  - By location/zone/purok
  - Each sort shows: population count + gender breakdown
- Filter by status: `resident`, `deceased`, `moved`
- Excel import:
  - Upload Excel file (.xlsx)
  - Duplicate detection (Resident ID first, then name + birthdate)
  - Review interface for duplicates (Skip, Update, or Review each)
  - Auto-generate sequential Resident IDs (BH-00001 format)
- "Add Resident" button (manual form):
  - Create new resident manually
  - All fields required
- "Pending Resident Confirmations" section:
  - Guest records from kiosk manual entry
  - Admin can review, complete missing fields, approve/convert to full resident, or reject
- Edit/Delete residents
- Export CSV
- View individual resident profile (click on resident)

### `/admin/residents/[id]` - Individual Resident Profile
**Access:** Admin only

**Functions:**
- View full resident information:
  - Resident ID: Sequential `BH-00001` format (for barcode)
  - All resident fields
  - Status: `resident`, `deceased`, `moved` (can be updated)
- Edit resident info
- Transaction history section:
  - All requests made by this resident
  - What certificates were requested
  - When requested
  - Status (queued, serving, printed, claim)
  - Queue numbers
  - View transaction details (if needed)

### `/admin/statistics` - Statistics & Reports
**Access:** Admin only

**Functions:**
- Detailed statistics with filtering:
  - By zone (e.g., Zone 7 shows male/female counts)
  - By gender
  - By date range
- Population demographics:
  - Overall Barangay Handumanan statistics (default view)
  - Zone-specific statistics
  - Gender breakdowns
- Documents issued statistics:
  - Total documents issued
  - Documents per month
  - Documents by type
- Export reports:
  - CSV format
  - PDF format
- **NO sales statistics** (only Superadmin sees sales)

**Admin has NO queue page** (Staff handles queue)  
**Admin CANNOT print certificates** (only view)

---

## 5. SUPERADMIN PAGES (Login Required - Role: `superadmin`)

### `/admin/dashboard` - Superadmin Dashboard
**Access:** Superadmin only

**Functions:**
- Same as Admin dashboard, **PLUS:**
- **Sales statistics:**
  - Total sales/revenue (sum of all printed certificates' prices)
  - Sales by period (daily, monthly)
  - **Note:** Individual payments not recorded (cashier handles), but total sales calculated from document prices

### `/admin/residents` - Resident Management (Same as Admin)
**Access:** Superadmin (Full Access)

**Functions:**
- All Admin resident management features (same as Admin)
- Full access to all resident functions

### `/admin/residents/[id]` - Individual Resident Profile (Same as Admin)
**Access:** Superadmin (Full Access)

**Functions:**
- All Admin resident profile features (same as Admin)
- Full access to resident details and transaction history

### `/admin/statistics` - Statistics & Reports (Same as Admin)
**Access:** Superadmin (Full Access)

**Functions:**
- All Admin statistics features (same as Admin)
- **PLUS:** Sales statistics (as mentioned in dashboard)

### `/admin/settings` - System Settings
**Access:** Superadmin only

**Functions:**
- Manage document types:
  - Add new document types
  - Edit existing document types
  - Delete document types
  - Set price for each document type
  - Link to template file (template_key)
  - Set if purpose is required
- Manage barangay officials:
  - Add/edit barangay official names and positions
  - Positions: captain, secretary, treasurer (and others as needed)
  - Used for certificate template auto-fill
- System configuration:
  - Other system-wide settings

### `/admin/settings/users` - User Management
**Access:** Superadmin only

**Functions:**
- List all users:
  - Staff users
  - Admin users
  - Superadmin users
- Create new users:
  - Create Staff accounts
  - Create Admin accounts
  - Cannot create other Superadmin accounts (security)
- Edit users:
  - Change user role (Staff ↔ Admin)
  - Activate/Deactivate users
  - Update user information
- Delete users:
  - Delete Staff accounts
  - Delete Admin accounts
  - Cannot delete Superadmin accounts (security)
- Reset passwords (if needed)

**User Management via Clerk:**
- Clerk handles authentication and user accounts
- Roles stored in Convex `users` table (synced with Clerk)
- Use Clerk's role-based access control
- Reference: https://clerk.com/docs

### `/admin/transactions` - All Document Requests
**Access:** Superadmin only

**Functions:**
- View all document request transactions:
  - All requests from all residents
  - Request details (resident, certificates, purposes, dates)
  - Status (queued, serving, printed, claim)
  - Queue numbers
- Filter transactions:
  - By date range
  - By resident
  - By status
  - By certificate type
- View transaction details
- Export transaction data (CSV, PDF)

**Note:** Shows transaction records (document requests), NOT system action logs

---

## RESIDENT ID SYSTEM

**Format:** Sequential `BH-00001`, `BH-00002`, `BH-00003`... format

**Implementation:**
- Internal ID: Convex ID (database primary key)
- Resident ID: Sequential `BH-XXXXX` format (used for display, barcode, and typing - all the same)
- Auto-generate during Excel import
- Auto-generate for new residents (manual add)
- Sequential counter starts from `BH-00001`
- **Indexed**: `by_residentId` index for fast barcode lookups

**Resident Status:**
- `resident` (default - active resident)
- `deceased` (archived but searchable, marked as "Deceased")
- `moved` (archived but searchable, marked as "Moved")

---

## QUEUE SYSTEM WORKFLOW

**Queue Status Flow:**
1. Request submitted (kiosk) → Status: `queued`
2. Staff clicks "Process Next" → Status: `serving`
3. Staff prints certificates → Status: `printed`
4. After printing → Status: `claim` (ready for resident to claim)

**Queue Number Format:**
- Prefix format: `Q-001`, `Q-002`, `Q-003`...
- Resets daily
- One queue number per request (even if multiple certificates)

**Real-Time Updates:**
- Uses Convex subscriptions (not polling)
- Indexed by `by_status` and `by_status_createdAt` for efficient queries
- Automatic updates when queue status changes
- Saves ~260K function calls/month per staff member

**Payment:**
- **No payment recording in system**
- Cashier handles payment separately (offline)
- Superadmin sees total sales (sum of all printed certificates' prices) for statistics only
- No individual payment records

---

## PAGE ACCESS SUMMARY

| Page | Public | Staff | Admin | Superadmin |
|------|--------|-------|-------|------------|
| `/` | ✅ (logo) | 🔄 (redirect) | 🔄 (redirect) | 🔄 (redirect) |
| `/kiosk` | ✅ | ❌ | ❌ | ❌ |
| `/queue-display` | ✅ | ❌ | ❌ | ❌ |
| `/login` | ✅ | ✅ | ✅ | ✅ |
| `/staff/queue` | ❌ | ✅ | ❌ | ❌ |
| `/staff/process/[id]` | ❌ | ✅ | ❌ | ❌ |
| `/admin/dashboard` | ❌ | ❌ | ✅ | ✅ (with sales) |
| `/admin/residents` | ❌ | ❌ | ✅ | ✅ |
| `/admin/residents/[id]` | ❌ | ❌ | ✅ | ✅ |
| `/admin/statistics` | ❌ | ❌ | ✅ | ✅ (with sales) |
| `/admin/settings` | ❌ | ❌ | ❌ | ✅ |
| `/admin/settings/users` | ❌ | ❌ | ❌ | ✅ |
| `/admin/transactions` | ❌ | ❌ | ❌ | ✅ |

---

## KEY CLARIFICATIONS

1. **Kiosk Manual Entry:** Creates guest records → Admin reviews and approves
2. **Resident ID:** Sequential `BH-00001` format (not UUID for barcode)
3. **Resident Status:** `resident`, `deceased`, `moved` (not active/inactive/dead)
4. **Payment:** Not recorded in system (cashier handles offline)
5. **Sales Statistics:** Only Superadmin sees (Admin does NOT see sales)
6. **Queue Management:** Staff handles queue (Admin does NOT have queue page)
7. **Certificate Printing:** Staff only (Admin cannot print)
8. **Staff Search:** Removed (not needed - info already on process page)
9. **Transaction History:** Per-resident history on resident profile page
10. **Superadmin Transactions:** Shows all document requests (not system action logs)
11. **Root Page (`/`)**: Shows logo if not logged in, redirects to dashboard if logged in (role-based)
