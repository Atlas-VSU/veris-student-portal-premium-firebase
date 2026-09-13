# VERIS Student Portal & Backend System Guide
> **Unified Architectural Reference, Domain Schema & Execution Playbook**  
> *Synthesized from VERIS Architecture Guidelines & CORAL-USSC Backend System Documentation.*

---

## Quick Navigation

```
├── 1. System Overview & Scope Matrix
├── 2. Feature-Driven Architecture & Layering
├── 3. Authentication & Security Model (AAA)
├── 4. Complete Firestore Data Dictionary
├── 5. Core Business Engines & State Machines
│    ├── 5.1 Events & Attendance Engine
│    ├── 5.2 Fine Generation Engine
│    ├── 5.3 Fee Management Engine
│    ├── 5.4 Clearance State Machine
│    └── 5.5 Payment & Verification Flow
├── 6. Caching & Performance Architecture
├── 7. Audit Logging (Tiered Accounting)
├── 8. Engineering Standards & Code Patterns
└── 9. Firestore Composite Index Reference
```

---

## 1. System Overview & Scope Matrix

The VERIS platform consists of two distinct applications interacting over a shared Google Cloud Firestore database:

```
┌──────────────────────────────────────┐          ┌──────────────────────────────────────┐
│       VERIS Student Portal           │          │       CORAL-USSC Admin Portal        │
│       (This Repository)              │          │       (Officer / Admin System)       │
├──────────────────────────────────────┤          ├──────────────────────────────────────┤
│ • Student Self-Service & Status      │          │ • Officer Operations & Audits        │
│ • View Fees, Fines & Balances (L2-3) │          │ • Create Events & Generate Fines     │
│ • Multi-Term & Historical Lookup     │  Shared  │ • Fee Generation & Batch Rosters     │
│ • Built-In Payment Portal (/clearance│ Firestore│ • Payment Verification & Cashiering  │
│ • Submit Payment Proofs (GCash/Bank) │ ◄──────► │ • Clearance Recalculation Engine     │
│ • Check Attendance & History (L1-3)  │          │ • Access Level Scoping (L1 / L2 / L3)│
│ • Monitor Semester Clearance (L2-3)  │          │ • Role-Based Access Control (RBAC)   │
│ • Submit Fine Infraction Appeals     │          │ • Physical Payment Recording         │
└──────────────────────────────────────┘          └──────────────────────────────────────┘
```

### Operational Capability Levels & Data Scoping

In the VERIS system, **Access Levels (1, 2, and 3)** define an organization's overall operational capability within the system (not the scope of its student population):

| Domain Module | Applicable Organization Levels | Scope Behavior for Student Portal |
|---|---|---|
| **Events & Attendance** (`/events`, `/attendance`) | **Access Levels 1, 2, and 3** | Aggregates event schedules, attendance scans, and participation stats across all affiliated organizations (Level 1 basic, Level 2 plus, Level 3 premium). |
| **Fees & Ledgers** (`/fees`) | **Access Levels 2 and 3 ONLY** | Displays assessed fees issued by Level 2 and Level 3 organizations. Unpaid fee callouts redirect internally to `/clearance`. |
| **Fines & Infractions** (`/fines`) | **Access Levels 2 and 3 ONLY** | Displays infraction records, fine balances, and appeal triggers for Level 2 and Level 3 organizations. |
| **Clearance & Built-In Payment Portal** (`/clearance`) | **Access Levels 2 and 3 ONLY** | Tracks clearance blockers across all Level 2 and Level 3 organizations. Houses the built-in payment portal for settling obligations. |

### Architectural Separation of Concerns

| Dimension | Student Portal (`veris-student-portal`) | Admin Portal (`coral-ussc`) |
|---|---|---|
| **Primary Audience** | Enrolled Students | Organization Officers, Faculty Admins, Super Admins |
| **Auth Model** | Session Cookie + **Ownership Key (`userId`)** | Session Cookie + **Access Level (1=Prog, 2=Fac, 3=Org)** |
| **Data Scope** | Strict Self-Access (`where("userId", "==", userId)`) across active & historical terms | Multi-tenant Org Scoped (`buildBaseConstraints`) |
| **Database SDK** | **Firebase Admin SDK** inside Server Actions & Use Cases | **Client SDK + Admin SDK** |
| **Payment Flow** | **Built-in Payment Hub on `/clearance`**: Students submit proofs for unpaid obligations | **In-App Cashiering**: Verifies submitted proofs & logs over-the-counter payments |
| **Deletion Policy** | No physical deletes (Soft-delete / `isArchived`) | Soft-delete with cascading archival |

---

## 2. Feature-Driven Architecture & Layering

The codebase abandons horizontal slicing (`/components`, `/hooks`, `/services`) in favor of **Domain-Driven Feature Modules**. Every business domain is a self-contained vertical module.

```
src/
├── app/                                 # Next.js App Router (Routes & Page Shells ONLY)
│   ├── (student)/                       # Protected Student Route Group
│   │   ├── attendance/                  # /attendance
│   │   ├── clearance/                   # /clearance
│   │   ├── events/                      # /events
│   │   ├── fees/                        # /fees
│   │   ├── fines/                       # /fines
│   │   └── profile/                     # /profile
│   ├── (public)/                        # Public Route Group (/login, /)
│   └── api/auth/                        # Lightweight Session Endpoints
│
├── features/                            # 🚀 VERTICAL FEATURE MODULES
│   ├── attendance/                      # Attendance tracking & participation stats
│   ├── auth/                            # Session, cookie & audit logging
│   ├── clearance/                       # Semester clearance status & blockers
│   ├── events/                          # Event schedule, catalog & requirements
│   ├── fees/                            # Fee ledger & payment portal redirect
│   ├── fines/                           # Infraction records, fine balances & appeals
│   ├── profile/                         # Student identity details
│   └── terms/                           # Active & historical academic term lookup
│
├── components/                          # Cross-feature shared UI (Owned by Frontend)
│   ├── ui/                              # Primitive UI components (ShadCN)
│   ├── layout/                          # App shell, Navbar, Sidebar
│   └── shared/                          # Composed components (Rule of Three)
│
├── lib/firebase/                        # Server & Client Firebase Infrastructure
│   ├── admin.ts                         # Firebase Admin SDK (Server-only)
│   ├── client.ts                        # Firebase Client SDK (Browser-only)
│   └── with-auth.ts                     # withAuth Higher-Order Function
│
└── types/                               # Global cross-cutting TypeScript definitions
    └── index.ts                         # Standard ActionResult<T>
```

### Strict 3-Tier Layering Contract

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. SERVER ACTIONS  [ features/<domain>/actions.ts ]                    │
│    • Entry point marked 'use server'                                   │
│    • Wrapped in withAuth() for authentication & ownership extraction   │
│    • Never queries Firestore directly; never contains business rules   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                     ┌─────────────┴─────────────┐
                     ▼                           ▼
┌──────────────────────────────────┐ ┌──────────────────────────────────┐
│ 2. SERVICES                      │ │ 3. USE CASES                     │
│    [ features/<domain>/services ]│ │    [ features/<domain>/usecases ]│
│    • Pure TypeScript (no server  │ │    • ONE file = ONE operation    │
│      directive)                  │ │    • The ONLY layer importing    │
│    • Orchestrates multiple use   │ │      adminDb                     │
│      cases                       │ │    • Accepts plain arguments;    │
│    • Enforces business logic     │ │      never re-fetches user       │
│      (e.g., clearance rules)     │ │    • Enforces DB-level ownership │
└─────────────────┬────────────────┘ └──────────────────────────────────┘
                  │                              ▲
                  └──────────────────────────────┘
```

> [!TIP]
> **Pragmatic Layering Rule:** If an action calls a single use case with zero business validation or multi-model orchestration, it may call the use case directly inside `withAuth`. Introduce a `service` when orchestrating multiple operations or evaluating domain policies.

---

## 3. Authentication & Security Model (AAA)

The Student Portal enforces a strict **AAA (Authentication, Authorization, Accounting)** pipeline on every request.

```
Client (Browser)
   │
   ├─ 1. Next.js Server Action Call
   │
   ▼
withAuth(actionName, callback)
   │
   ├─► [AUTH]  Read HTTP-only '__session' cookie
   │           Verify cryptographic signature via Firebase Admin SDK
   │           Claims extract: claims.uid
   │
   ├─► [AUTHZ] Inject userId into action callback
   │           Use case scopes Firestore query by: studentId == userId
   │
   └─► [ACCT]  void logAction({ userId, action, success, error })
               • High security signal (failures): Always logged
               • Mutations (writes): Always logged
               • Safe reads: Log skipped (zero noise / zero write cost)
```

### Session Lifecycle

```
[Login]
Client: signInWithEmailAndPassword() ──► Returns idToken
Client: POST /api/auth/session { idToken }
Server: adminAuth.createSessionCookie(idToken, { expiresIn: 14 Days })
Server: Set-Cookie: __session=<jwt>; HttpOnly; Secure; SameSite=Strict; Path=/

[Sign Out]
Client: POST /api/auth/signout
Server: adminAuth.revokeRefreshTokens(claims.uid)
Server: Clear-Cookie: __session
```

---

## 4. Complete Firestore Data Dictionary

### Core Collections Matrix

```
                          ┌────────────────────────┐
                          │         users          │
                          │   (id: Firebase UID)   │
                          └───────────┬────────────┘
                                      │ 1:N
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
┌───────────────┐             ┌───────────────┐             ┌───────────────┐
│     fees      │             │     fines     │             │eventAttendees │
│ (id: autoGen) │             │ (id: autoGen) │             │ (id: autoGen) │
└───────┬───────┘             └───────┬───────┘             └───────▲───────┘
        │ 1:N                         │ 1:N                         │
        ▼                             ▼                             │ N:1
┌───────────────┐             ┌───────────────┐             ┌───────┴───────┐
│paymentHistory │             │   fineItems   │             │    events     │
│(subcollection)│             │(subcollection)│             │ (id: autoGen) │
└───────────────┘             └───────┬───────┘             └───────────────┘
                                      │ 1:N
                                      ▼
                              ┌───────────────┐
                              │paymentHistory │
                              │(subcollection)│
                              └───────────────┘
```

---

### 4.1 `users`
* **Doc ID:** Firebase Auth `UID`  
* **Purpose:** Core student profile and academic program linking.

| Field | Type | Description |
|---|---|---|
| `studentId` | `string` | Official University Student ID (Format: `XX-X-XXXXX`) |
| `email` | `string` | Student institutional / primary email address |
| `firstName` | `string` | Student given name |
| `lastName` | `string` | Student surname |
| `programId` | `string` | FK → `programs` collection |
| `facultyId` | `string` | FK → `faculties` collection |
| `orgId` | `string` | FK → `organizations` collection |
| `role` | `"user" \| "admin" \| "super-admin"` | Portal role (Students are `"user"`) |
| `yearLevel` | `number` | Academic year level (`1`–`6`) |
| `status` | `"pending" \| "approved"` | Account approval state |
| `corURL` | `string?` | Firebase Storage URL for Certificate of Registration |
| `isDeleted` | `boolean` | Soft-delete flag (excludes record from queries) |
| `createdAt` | `Timestamp` | Registration timestamp |
| `updatedAt` | `Timestamp` | Last profile update timestamp |

---

### 4.2 `terms`
* **Doc ID:** Auto-generated  
* **Rule:** **Exactly one** term document has `isActive = true` globally.

| Field | Type | Description |
|---|---|---|
| `AY` | `string` | Academic Year format `YYYY-YYYY` (e.g. `"2025-2026"`) |
| `semester` | `"1st" \| "2nd"` | Active semester indicator |
| `isActive` | `boolean` | Active flag (partition key for current fees, fines, clearance) |
| `isDeleted` | `boolean` | Soft-delete flag |
| `metadata.createdAt` | `Timestamp` | Creation timestamp |
| `metadata.updatedAt` | `Timestamp` | Last modification timestamp |

---

### 4.3 `events`
* **Doc ID:** Auto-generated  
* **Purpose:** Academic, institutional, and student organization events.

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Event title |
| `date` | `Timestamp` | Event scheduled date & start time |
| `location` | `string` | Physical or virtual venue |
| `note` | `string?` | Guidelines or special instructions |
| `majorEvent` | `boolean` | High-importance flag (often determines fine severity) |
| `fineTypeId` | `string` | FK → `fineTypes` (Fine policy applied on non-attendance) |
| `orgId` | `string` | FK → `organizations` |
| `programId` | `string?` | Program scope (null for campus-wide events) |
| `facultyId` | `string?` | Faculty scope (null for campus-wide events) |
| `accessLevelEvent` | `1 \| 2 \| 3` | Scope level (`1`: Program, `2`: Faculty, `3`: University) |
| `status` | `"upcoming" \| "ongoing" \| "completed" \| "archived"` | Dynamic event lifecycle status |
| `attendees` | `number` | Atomic running count of checked-in attendees |
| `academicYear` | `string` | Linked Academic Year (e.g. `"2025-2026"`) |
| `semester` | `string` | Linked Semester (`"1st"` or `"2nd"`) |
| `finesGenerated` | `boolean` | `true` once fine generation batch has executed |
| `manuallyCompleted`| `boolean` | Locks status against auto-calculation |
| `timeInStart` / `End` | `string?` | Check-in window time format (`"HH:MM"`) |
| `timeOutStart` / `End`| `string?` | Check-out window time format (`"HH:MM"`) |
| `isDeleted` | `boolean` | Soft-delete flag |

---

### 4.4 `eventAttendees`
* **Doc ID:** Auto-generated  
* **Purpose:** Individual student attendance log per event.

| Field | Type | Description |
|---|---|---|
| `eventId` | `string` | FK → `events` |
| `userId` | `string` | FK → `users` (Auth UID) |
| `studentId` | `string` | Denormalized university student ID |
| `student` | `object?` | Profile snapshot at check-in time |
| `timeIn` | `Timestamp?` | Time-in scan timestamp |
| `timeOut` | `Timestamp?` | Time-out scan timestamp |
| `status` | `"partially present" \| "present"` | `"present"` only if both `timeIn` & `timeOut` exist |
| `remark` | `string?` | System note (e.g., cross-program attendance) |
| `orgId` | `string` | FK → `organizations` |

---

### 4.5 `feeItems` (Templates) & `fees` (Student Ledger)

#### `feeItems` (Catalog)
* **Doc ID:** Auto-generated  
* **Purpose:** Organization fee definitions for a specific academic term.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Document ID |
| `title` | `string` | Fee title (e.g. `"Org Membership Fee"`) |
| `amount` | `number` | Assessment amount |
| `feeType` | `string` | Categorization tag |
| `description` | `string?` | Fee breakdown description |
| `dueDate` | `Timestamp?` | Payment deadline |
| `isRequiredForClearance` | `boolean` | If `true`, unpaid balance blocks clearance |
| `orgId` | `string` | FK → `organizations` |
| `academicYear` / `semester`| `string` | Term linkage |
| `totalStudents` | `number` | Running count of assigned students |
| `isArchived` | `boolean` | Archive status |

#### `fees` (Student Instances)
* **Doc ID:** Auto-generated  
* **Purpose:** Individual student fee obligation.

| Field | Type | Description |
|---|---|---|
| `orgId` | `string` | FK → `organizations` |
| `userId` | `string` | FK → `users` (Student UID) |
| `studentId` | `string` | Denormalized Student ID |
| `userName` | `string` | Denormalized student full name |
| `feeItemId` | `string` | FK → `feeItems` template |
| `title` | `string` | Copied fee title |
| `amount` | `number` | Total assessed fee |
| `paidAmount` | `number` | Total verified payments |
| `balance` | `number` | `amount - paidAmount` |
| `status` | `"unpaid" \| "partial" \| "paid" \| "pending"` | Current payment status |
| `dueDate` | `Timestamp?` | Due date |
| `isRequiredForClearance` | `boolean` | Clearance blocker indicator |
| `academicYear` / `semester`| `string` | Term linkage |
| `isArchived` | `boolean` | Archival flag |

#### Subcollection: `fees/{feeId}/paymentHistory`
* **Doc ID:** Auto-generated  
* **Fields:** `paymentNumber` (`number`), `amount` (`number`), `paymentMethod` (`"gcash" | "cash" | "bank_transfer" | "waiver"`), `paymentProofId` (`string`), `status` (`"verified" | "rejected" | "pending"`), `paidAt` (`Timestamp`), `verifiedBy` (`string?`), `notes` (`string?`).

---

### 4.6 `fineTypes`, `fines` & `fineItems`

```
┌────────────────────────────────────────────────────────┐
│ fines (Parent Envelope Doc per Student per Term)       │
│ • accumulatedAmount, paidAmount, waivedAmount, balance │
│ • status: "unpaid" | "partial" | "paid" | "waived"     │
└──────────────────────────┬─────────────────────────────┘
                           │ 1:N Subcollection
                           ▼
┌────────────────────────────────────────────────────────┐
│ fines/{fineId}/fineItems (Individual Infraction Docs)  │
│ • fineTypeId, eventId, amount, reason, itemNumber      │
│ • isPaid, isWaived, isPending                          │
└────────────────────────────────────────────────────────┘
```

#### `fineTypes`
* **Doc ID:** Auto-generated  
* **Fields:** `name` (`string`), `description` (`string`), `defaultAmount` (`number`), `requiresTimeIn` (`boolean`), `requiresTimeOut` (`boolean?`), `majorEventsOnly` (`boolean`), `orgId` (`string`).

#### `fines` (Parent Document)
* **Doc ID:** Auto-generated (One per student per org per term)

| Field | Type | Description |
|---|---|---|
| `orgId` | `string` | Organization ID |
| `userId` | `string` | Student Auth UID |
| `studentId` | `string` | University Student ID |
| `academicYear` / `semester` | `string` | Academic term |
| `accumulatedAmount` | `number` | Sum of all child `fineItems.amount` |
| `paidAmount` | `number` | Verified payments applied |
| `waivedAmount` | `number` | Total excused fine amount |
| `balance` | `number` | `accumulatedAmount - paidAmount - waivedAmount` |
| `status` | `"unpaid" \| "partial" \| "paid" \| "pending" \| "waived"` | Fine status |
| `fineItemsCount` | `number` | Total number of infractions |
| `firstFineIssuedAt` / `lastFineIssuedAt` | `Timestamp?` | Infraction timeline markers |

#### Subcollection: `fines/{fineId}/fineItems`
* **Fields:** `itemNumber` (`number`), `fineTypeId` (`string`), `fineTypeName` (`string`), `eventId` (`string`), `eventName` (`string`), `eventDate` (`Timestamp`), `amount` (`number`), `reason` (`string`), `issuedBy` (`string`), `isWaived` (`boolean`), `isPaid` (`boolean`), `isPending` (`boolean`), `parentFineId` (`string`).

---

### 4.7 `clearanceStatus`
* **Doc ID:** Deterministic Compound Key: `${userId}${orgId}:${AY}-${semester}` (e.g. `usr_123org_456:2025-2026-1st`)
* **Purpose:** Single source of truth for student semester clearance per organization.
* **Per-Org Partitioning:** Because a student can belong to multiple organizations (e.g. College Org [Level 2] and Central Apex [Level 3]), each organization maintains an independent `clearanceStatus` record for the student per term. Querying `clearanceStatus` where `userId == userId` provides the full set of organization clearance states and their corresponding `blockingItems` checklists.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Compound deterministic document ID |
| `userId` | `string` | Student Auth UID |
| `orgId` | `string` | Organization ID |
| `studentId` | `string` | University Student ID |
| `userName` | `string` | Student Full Name |
| `academicYear` / `semester` | `string` | Academic term |
| `status` | `"cleared" \| "not_cleared" \| "pending"` | Calculated clearance status |
| `blockingItems` | `Record<string, BlockingItem>` | Keyed map of unresolved fees and fine items |
| `clearanceDate` | `Timestamp?` | Timestamp when status became `"cleared"` |
| `lastCalculatedAt` | `Timestamp?` | Last calculation run timestamp |
| `isArchived` | `boolean` | Archival status |

#### Structure of `blockingItems` Map:

```typescript
interface BlockingItem {
  type: "fees" | "fines"
  referenceId: string            // feeId or fineItemId
  parentFineId?: string          // Required for fineItems
  title: string                  // e.g. "College Night Fee" / "Absent: General Assembly"
  balance: number                // Outstanding balance for this item
  status: "unpaid" | "paid"
  pendingReview: boolean         // true when student has submitted proof under review
  isRequiredForClearance: boolean
  academicYear: string
  semester: string
}
```

---

### 4.8 `proofOfPayments`
* **Doc ID:** Auto-generated  
* **Purpose:** Payment submissions uploaded by students or logged by cashiers.

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Document ID |
| `orgId` | `string` | Organization ID |
| `userId` | `string` | Student Auth UID |
| `studentId` | `string` | University Student ID |
| `userName` | `string` | Student full name |
| `paymentType` | `"fees" \| "fines" \| "bulk"` | Payment allocation category |
| `referenceId` | `string` | Target `feeId`, `fineId`, or `"bulk_transaction"` |
| `amount` | `number` | Transaction amount |
| `paymentMethod` | `"gcash" \| "cash" \| "bank_transfer" \| "waiver"` | Payment channel |
| `referenceNumber` | `string?` | GCash / Bank reference code |
| `senderNumber` | `string?` | GCash mobile sender number (`09XXXXXXXXX`) |
| `imageUrl` | `string?` | Firebase Storage screenshot link |
| `status` | `"pending" \| "verified" \| "rejected"` | Verification workflow status |
| `submittedAt` | `Timestamp` | Submission timestamp |
| `verifiedBy` / `verifiedByName` | `string?` | Admin identifier who processed the proof |
| `verifiedAt` | `Timestamp?` | Verification timestamp |
| `rejectionReason` | `string?` | Mandatory note if rejected |
| `itemKeys` | `string[]` | Array of `feeItemIds` covered (enables `array-contains` queries) |

---

### 4.9 `audit_logs`
* **Doc ID:** Auto-generated  
* **Purpose:** Immutable, append-only security and operational audit trail.

| Field | Type | Description |
|---|---|---|
| `userId` | `string` | Auth UID, `"anonymous"`, or `"unknown"` |
| `action` | `string` | Standardized `feature:verb` (e.g. `'fees:submit'`, `'auth:signout'`) |
| `success` | `boolean` | Execution outcome |
| `error` | `string?` | Sanitized error message if failed |
| `timestamp` | `number` | Epoch millisecond timestamp |

---

## 5. Core Business Engines & State Machines

### 5.1 Events & Attendance Engine

```
[Event Date Check] ──► Status Auto-Determination:
    ├── date < today                ──► "completed"
    ├── date == today               ──► "ongoing"
    └── date > today                ──► "upcoming"
        * "archived" and "manuallyCompleted" events are preserved.

[Attendance Logging]
    ├── Time-In Only                ──► status = "partially present"
    └── Time-In + Time-Out          ──► status = "present"
        * Event attendee counter incremented atomically: increment(1)
```

---

### 5.2 Fine Generation Engine

When an event is finalized, non-attending students receive itemized fines based on the event's `fineType`:

```
Admin executes generateFinesOnEvent(event):
   │
   ├─► 1. Query absent members (no record in eventAttendees)
   │      Query partial members (timeIn present, timeOut missing)
   │
   ├─► 2. Compute Infraction Amounts:
   │      • Full Absence: fineType.defaultAmount * (requiresTimeOut ? 2 : 1)
   │      • Partial Absence: fineType.defaultAmount
   │
   ├─► 3. Batch Writes (20 students / batch):
   │      a. Create doc in fines/{fineId}/fineItems
   │      b. Upsert clearanceStatus with fineItem added to blockingItems
   │      c. Recalculate parent fine totals (accumulatedAmount & balance)
   │
   ├─► 4. Lock Event: set event.finesGenerated = true
   └─► 5. Trigger Clearance Recalculation for all affected students
```

---

### 5.3 Clearance State Machine

The clearance engine computes a 3-state resolution from the student's `blockingItems` map:

```
                            ┌────────────────────────┐
                            │ Evaluate blockingItems │
                            └───────────┬────────────┘
                                        │
             ┌──────────────────────────┴──────────────────────────┐
             ▼                                                     ▼
   All required items have                               Any required item has
   balance == 0 or paid                                  balance > 0 & unpaid
             │                                                     │
             ▼                                                     ▼
     ┌───────────────┐                               ┌───────────────────────────┐
     │  "cleared"    │                               │ Check pendingReview flag  │
     └───────────────┘                               └─────────────┬─────────────┘
                                                                   │
                                                ┌──────────────────┴──────────────────┐
                                                ▼                                     ▼
                                       At least 1 item has                   No item in review
                                       pendingReview == true                 (pure unpaid balance)
                                                │                                     │
                                                ▼                                     ▼
                                       ┌─────────────────┐                   ┌─────────────────┐
                                       │   "pending"     │                   │  "not_cleared"  │
                                       └─────────────────┘                   └─────────────────┘
```

---

### 5.4 Payment & Clearance Settlement Workflow (Per-Organization Hub on `/clearance`)

```
[Student Action in Student Portal]
Student navigates to /clearance (Built-In Payment Portal):
   1. Reviews clearance checklist segmented by affiliated Level 2 & 3 Organizations
   2. Clicks "Pay [Org Name] Obligations" on the specific organization card
   3. Selects unpaid fee/fine items belonging exclusively to that orgId
   4. Selects payment method (GCash, Bank Transfer, Cash)
   5. Enters reference number & uploads receipt image to Firebase Storage (/proofOfPayments/{orgId}/{userId}/{ts}.png)
   6. Action executes submitPaymentProofAction({ orgId, selectedItemKeys, amount, ... }):
      • Creates proofOfPayments doc with matching orgId (status: "pending", itemKeys: selectedItemKeys)
      • Sets clearanceStatus.blockingItems[id].pendingReview = true for selected items in that org's clearance
      • Updates corresponding fees docs (status = "pending") and fineItems docs (isPending = true)
      • Executes recalculateClearanceStatus(userId, orgId, term) ──► transitions org status to "PENDING REVIEW ⏳"

[Officer Action in CORAL-USSC Admin Portal (Scoped per Org)]
Officers/Treasurers of that specific orgId verify the transaction:
   1. Firestore Transaction:
      • proofOfPayments.status = "verified" (or cash receipt issued)
      • fees/{feeId}.paidAmount += payment.amount
      • fees/{feeId}.balance = amount - paidAmount
      • Append fees/{feeId}/paymentHistory record
      • clearanceStatus.blockingItems[feeId].balance = newBalance
      • clearanceStatus.blockingItems[feeId].pendingReview = false
   2. Recalculate clearance for that organization ──► If all balances 0 in that org, that org becomes "CLEARED"
   3. Invalidate caches (clearance & fee records)

[Student Portal Refresh]
Student portal reflects verified payment history, 0 balance for that org, and updates overall clearance progress.
```

---

## 6. Caching & Performance Architecture

### Next.js Caching in the Student Portal

The Student Portal utilizes Next.js Server Function Caching (`'use cache'`) placed exclusively inside **read use cases**:

```typescript
// features/fees/usecases/get-my-fees.usecase.ts
import { adminDb } from '@/lib/firebase/admin'
import { cacheTag, cacheLife } from 'next/cache'

interface GetMyFeesInput {
  userId: string
  academicYear?: string
  semester?: string
}

export async function getMyFeesUseCase({ userId, academicYear, semester }: GetMyFeesInput) {
  'use cache'
  cacheTag(academicYear && semester ? `fees-${userId}-${academicYear}-${semester}` : `fees-${userId}`)
  cacheLife('minutes') // Short TTL for financial records

  let query = adminDb
    .collection('fees')
    .where('userId', '==', userId)
    .where('isArchived', '==', false)

  if (academicYear) query = query.where('academicYear', '==', academicYear)
  if (semester) query = query.where('semester', '==', semester)

  const snapshot = await query.get()
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}
```

### Domain Caching Strategy

| Domain | Cache Lifetime | Tag Pattern | Revalidation Trigger |
|---|---|---|---|
| **Active Term** | `hours` / Long | `active-term` | Admin updates active semester |
| **All Terms List** | `hours` / Long | `terms-all` | Admin creates/archives term |
| **Events Catalog** | `hours` / Long | `events-${academicYear}-${semester}` | New event published |
| **Student Fees** | `minutes` / Short | `fees-${userId}` | Payment verified or fee assigned |
| **Student Fines** | `minutes` / Short | `fines-${userId}` | Event fines generated or fine waived |
| **Clearance Status**| `minutes` + Webhook | `clearance-${userId}` | Admin clearance update / payment review |
| **Write Use Cases**| ❌ Never Cached | — | — |

---

## 7. Audit Logging (Tiered Accounting)

To eliminate unnecessary Firestore write costs while preserving compliance, logging is strictly tiered:

```typescript
// features/auth/usecases/log-action.usecase.ts
import { adminDb } from '@/lib/firebase/admin'

export interface LogEntry {
  userId: string
  action: string      // Format: 'domain:verb' (e.g. 'fines:appeal')
  success: boolean
  error?: string
}

export async function logAction(entry: LogEntry): Promise<void> {
  try {
    await adminDb.collection('audit_logs').add({
      ...entry,
      timestamp: Date.now(),
    })
  } catch {
    // Intentionally silent — logging failure must never block user operations
  }
}
```

### Logging Rules Matrix

| Event Category | Log Policy | Rationale |
|---|---|---|
| **Session / Auth Failure** | ✅ Always | Security signal (unauthenticated intrusion attempt) |
| **System Exception / Error**| ✅ Always | Operational monitoring and triage |
| **Data Mutation (Write)** | ✅ Always | Non-repudiation audit trail for all changes |
| **Successful Read Query** | ❌ Skip | High-volume query noise; costs unnecessary writes |

---

## 8. Engineering Standards & Code Patterns

### Standard 1: Server Action Template (with Term Filter)

```typescript
// features/fines/actions.ts
'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { getMyFinesUseCase } from './usecases/get-my-fines.usecase'
import type { ActionResult } from '@/types'
import type { FineParent, TermFilter } from './types'

export async function getMyFinesAction(filter?: TermFilter): Promise<ActionResult<FineParent | null>> {
  return withAuth('fines:getSummary', async (userId) => {
    const fines = await getMyFinesUseCase({ userId, ...filter })
    return { ok: true, data: fines }
  })
}
```

### Standard 2: Mutation Action with Audit (e.g. Fine Appeal)

```typescript
// features/fines/actions/submit-appeal.ts
'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { logAction } from '@/features/auth/usecases/log-action.usecase'
import { submitFineAppealUseCase } from '../usecases/submit-fine-appeal.usecase'
import type { ActionResult } from '@/types'

export async function submitFineAppealAction(fineItemId: string, reason: string): Promise<ActionResult> {
  return withAuth('fines:appeal', async (userId) => {
    await submitFineAppealUseCase({ userId, fineItemId, reason })
    
    // Log mutation asynchronously (fire-and-forget)
    void logAction({ userId, action: 'fines:appeal', success: true })
    
    return { ok: true, data: undefined }
  })
}
```

### Standard 3: Use Case Implementation Template

```typescript
// features/events/usecases/get-my-attendance.usecase.ts
import { adminDb } from '@/lib/firebase/admin'
import type { AttendanceRecord } from '../types'

interface GetMyAttendanceInput {
  userId: string
}

export async function getMyAttendanceUseCase(
  input: GetMyAttendanceInput
): Promise<AttendanceRecord[]> {
  const snapshot = await adminDb
    .collection('eventAttendees')
    .where('userId', '==', input.userId)
    .orderBy('timeIn', 'desc')
    .get()

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as AttendanceRecord[]
}
```

### Standard 4: Shared Result Type

```typescript
// src/types/index.ts
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }
```

---

## 9. Firestore Composite Index Reference

The following compound indexes are required in `firestore.indexes.json` to support multi-field querying and sorting:

```json
{
  "indexes": [
    {
      "collectionGroup": "events",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "isDeleted", "order": "ASCENDING" },
        { "fieldPath": "orgId", "order": "ASCENDING" },
        { "fieldPath": "academicYear", "order": "ASCENDING" },
        { "fieldPath": "semester", "order": "ASCENDING" },
        { "fieldPath": "date", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "eventAttendees",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "timeIn", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "fees",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isArchived", "order": "ASCENDING" },
        { "fieldPath": "academicYear", "order": "ASCENDING" },
        { "fieldPath": "semester", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "fines",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "metadata.isArchived", "order": "ASCENDING" },
        { "fieldPath": "academicYear", "order": "ASCENDING" },
        { "fieldPath": "semester", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "proofOfPayments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "isArchived", "order": "ASCENDING" },
        { "fieldPath": "submittedAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 10. Summary of Architectural Commandments

1. **Strict Ownership Scoping**: Never accept a student ID from client payload parameters. Always extract `userId` from the verified session in `withAuth()` and scope DB queries with `where("userId", "==", userId)`.
2. **Server-Side Isolation**: `adminDb` and `adminAuth` are exclusively imported inside server-side code (`usecases/` and `lib/firebase/admin.ts`). Never leak Admin SDK to components.
3. **Soft-Deletes Only**: Documents are never physically deleted via standard application flows; flag them with `isDeleted: true` or `isArchived: true`.
4. **Fire-and-Forget Logging**: Always invoke `void logAction(...)` without `await` to avoid blocking user response latency.
5. **No Pass-Through Boilerplate**: Keep simple 1-to-1 operations lean (Action directly calls Use Case). Only introduce a Service when coordinating business rules or multiple use cases.
