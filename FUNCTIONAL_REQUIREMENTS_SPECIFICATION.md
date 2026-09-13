# VERIS Student Portal — Functional Requirements Specification (FRS)

> **Document Version:** 1.2.0  
> **Status:** Approved / Active  
> **Scope:** Student-Facing Web Application (`veris-student-portal`)  
> **Source Baseline:** `VERIS Task List - Student Portal Tracker.csv` & `SYSTEM_ARCHITECTURE_GUIDE.md`

---

## 1. Document Overview & Scope

This Functional Requirements Specification (FRS) establishes the authoritative technical and functional criteria for all features in the **VERIS Student Portal**. The student portal is a dedicated, self-service web interface enabling university students to monitor their fees, track attendance, manage fine records, verify semester clearance, and settle financial obligations through the built-in payment portal located on the Clearance page.

> [!IMPORTANT]
> ### 💳 Built-In Payment Portal Location
> The student portal features a **built-in payment portal housed directly on the Clearance page (`/clearance`)**. Unpaid fee and fine callouts across the portal (such as on `/fees` and the Dashboard) redirect students internally to `/clearance` to select items and submit payments for verification.

> [!NOTE]
> ### 🏢 Organization Operational Capability Levels (Access Levels 1, 2, and 3)
> In the VERIS ecosystem, an organization's **Access Level (1, 2, or 3)** defines its overall operational capability within the system:
> - **Events & Attendance Views (`/events`, `/attendance`)**: Encompass records from **all organizations (Access Levels 1 to 3)** the student is affiliated with.
> - **Fees, Fines, and Clearance Views (`/fees`, `/fines`, `/clearance`)**: Encompass records from **Access Levels 2 and 3 ONLY** (since Level 1 organizations do not have payment-related or financial operations).

> [!NOTE]
> ### 🎨 UI/UX Governance & Frontend Discretion Notice
> All ASCII wireframes, visual layouts, widget arrangements, modal diagrams, and UI representations in this document are **functional suggestions and structural guides**. The **Frontend Lead** owns `src/components/`, `src/app/`, and all feature-specific UI in `src/features/<feature>/components/`, and holds **final authority and discretion** over all UI/UX design decisions, component aesthetics, design tokens, micro-interactions, and visual layouts. Backend implementation contracts (actions, types, data schemas) remain strictly governed by this specification and `SYSTEM_ARCHITECTURE_GUIDE.md`.

---

### 1.1 Requirements Traceability Matrix

| Tracker Feature | Tracker Module | Requirement ID | Functional Summary |
|---|---|---|---|
| **Cross-Page** | Auth Login | **FR-AUTH-01** | Student Sign-In & Session Establishment via Cookie |
| **Cross-Page** | Auth Sign Out | **FR-AUTH-02** | Student Sign-Out & Session Token Revocation |
| **Cross-Page** | NavBar | **FR-NAV-01** | Global Header Navigation & Profile Snippet |
| **Cross-Page** | Term Selector | **FR-TERM-01** | Global / Page-Level Term & Semester Selector (Defaults to Active Term) |
| **Dashboard** | Active Term Header | **FR-DASH-01** | Current Academic Term Banner Resolution |
| **Dashboard** | Student Greeting | **FR-DASH-02** | Personalized Identity & Academic Profile Header |
| **Dashboard** | Events Summary Card | **FR-DASH-03** | Semester Events Attended Counter (Levels 1–3, Term-Scoped) |
| **Dashboard** | Fees Summary Card | **FR-DASH-04** | Total Outstanding Fee Balance Metric (₱) (Levels 2–3, Term-Scoped) |
| **Dashboard** | Fines Summary Card | **FR-DASH-05** | Total Outstanding Fine Balance Metric (₱) (Levels 2–3, Term-Scoped) |
| **Dashboard** | Clearance Summary Card | **FR-DASH-06** | Clearance Status Badge Indicator (Levels 2–3, Term-Scoped) |
| **Dashboard** | Clearance Requirements Widget | **FR-DASH-07** | Blocking Items Snapshot with Direct Redirect to `/clearance` |
| **Dashboard** | Event Attendance Widget | **FR-DASH-08** | Recent 2–3 Attendance Records Mini-Feed (Levels 1–3) |
| **Events** | Attendance Stats | **FR-EVT-01** | Aggregate Attendance Counters (Levels 1–3) with Term Filter |
| **Events** | Attendance History List | **FR-EVT-02** | Chronological Event Attendance History Ledger (Levels 1–3) with Term Lookup |
| **Events** | Events Catalog | **FR-EVT-03** | View Active & Historical Events by Term across Levels 1–3 |
| **Fees** | Fee List | **FR-FEE-01** | Term Assessed Fee Ledger across Levels 2–3 (Active Term default & Term Lookup) |
| **Fees** | Unpaid Fee Clearance Redirect | **FR-FEE-02** | Call-to-Action Link Redirecting to Built-In Payment Portal on `/clearance` |
| **Fines** | Fines Summary Stats | **FR-FINE-01** | Fine Balance KPIs across Levels 2–3 with Term Filter |
| **Fines** | Fine History Table | **FR-FINE-02** | Itemized Infraction & Fine Items Ledger (Levels 2–3) with Term Lookup |
| **Fines** | Appeal Fine | **FR-FINE-03** | Fine Infraction Appeal Submission Modal |
| **Clearance** | Clearance Status | **FR-CLR-01** | Official Clearance Status Banner & Progress across Levels 2–3 with Term Switcher |
| **Clearance** | Requirements List | **FR-CLR-02** | Categorized Clearance Checklist (Fees & Fines Blockers from Levels 2–3) |
| **Clearance** | Built-In Payment Portal | **FR-CLR-03** | Multi-Item Payment Submission & Proof Upload Workflow |

---

## 2. User Personas & System Actors

```
┌──────────────────────────┐
│     Enrolled Student     │ ──► Authenticates via university credentials
│      (Role: "user")      │ ──► Strict ownership authorization (userId == studentId)
└──────────────────────────┘ ──► Read access to own records across all terms; writes for payments/appeals
```

---

## 3. Module 1: Authentication, Global Shell & Term Selection (Cross-Page)

### FR-AUTH-01: Student Sign-In & Session Establishment
* **Description:** Allows an enrolled student to authenticate using university credentials (Firebase Email/Password only; third-party SSO/OAuth providers are not supported) and establishes a secure, HTTP-only session cookie.
* **Preconditions:** Student has an active, non-deleted account in the `users` collection with `isDeleted == false`.
* **Execution Flow:**
  1. Student enters email address and password on `/login`.
  2. Client Firebase SDK executes `signInWithEmailAndPassword(auth, email, password)`.
  3. Client retrieves raw JWT `idToken` from `auth.currentUser.getIdToken()`.
  4. Client invokes Server Action `createSessionAction(idToken)` or `POST /api/auth/session`.
  5. Server validates token via `adminAuth.createSessionCookie(idToken, { expiresIn: 14 days })`.
  6. Server sets HTTP-only `__session` cookie (`SameSite: Strict`, `Secure: true`, `Path: /`).
  7. Client redirects student to `/` (Dashboard).
* **Error Handling:** Invalid credentials display inline toast error *"Invalid student credentials"*. Expired or revoked accounts are denied.

---

### FR-AUTH-02: Student Sign-Out & Session Invalidation
* **Description:** Safely terminates the student session and revokes authentication tokens server-side.
* **Execution Flow:**
  1. Student clicks **Sign Out** in the navigation bar.
  2. Client calls `destroySessionAction()` or `POST /api/auth/signout`.
  3. Server extracts `__session` cookie, verifies `uid`, and calls `adminAuth.revokeRefreshTokens(uid)`.
  4. Server clears `__session` cookie (`Max-Age: 0`).
  5. Client calls `signOut(clientAuth)` and redirects to `/login`.

---

### FR-NAV-01: Global Navigation Bar & Student Profile Snippet
* **Description:** Persistent header across all authenticated views.
* **Functional Requirements:**
  - Displays portal branding and active route highlighting:
    - **Dashboard** (`/`)
    - **Events & Attendance** (`/events`, `/attendance`)
    - **Fees** (`/fees`)
    - **Fines** (`/fines`)
    - **Clearance & Payments** (`/clearance`)
    - **Profile** (`/profile`)
  - Displays authenticated student avatar / initials and full name.
  - Houses the **Sign Out** action trigger.

---

### FR-TERM-01: Multi-Term & Semester Selector
* **Description:** Standard dropdown/filter selector allowing students to query records from historical Academic Years and Semesters.
* **Behavior:**
  - Automatically resolves and defaults to the **Active Term** (`isActive == true`) on initial load.
  - Fetches list of all non-deleted terms from `terms` collection via `getAllTermsAction()`.
  - When term selection changes, queries update data views (Events, Attendance, Fees, Fines, Clearance) for the selected `academicYear` and `semester`.

---

## 4. Module 2: Student Dashboard

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [FR-DASH-01] Active Term: 2025-2026 • 1st Semester  [ Term Selector ▼ ]     │
│ [FR-DASH-02] Welcome back, Juan Dela Cruz (BSCS - 3rd Year)                │
├────────────────────────────────────────────────────────────────────────────┤
│ [FR-DASH-03..06] KPI Summary Cards (Active Term):                          │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────────┐ │
│ │ Events (L1-3) │ │ Unpaid Fees:  │ │ Unpaid Fines: │ │ Clearance:       │ │
│ │ 4 Attended    │ │ ₱ 250.00 (L2-3│ │ ₱ 100.00 (L2-3│ │ NOT CLEARED ⚠️   │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ └──────────────────┘ │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ [FR-DASH-07] Clearance Requirements  │ [FR-DASH-08] Recent Attendance Feed │
│ • Org Membership Fee: ₱250 (Unpaid)  │ • University Convocation [Present]  │
│ • General Assembly: ₱100 (Unpaid)    │ • College Assembly [Present]        │
│ [ Pay Now Button ──► /clearance ]    │ [ View All History ──► /attendance] │
└──────────────────────────────────────┴─────────────────────────────────────┘
```

### FR-DASH-01: Active Academic Term Header
* **Description:** Queries `terms` collection where `isActive == true` and displays current Academic Year and Semester.
* **Output Format:** `"A.Y. [AY] • [semester] Semester"`.

### FR-DASH-02: Student Identity Greeting
* **Description:** Displays student full name, program, and year level from `users/{userId}`.

### FR-DASH-03..06: Quick Metric Summary Cards
* **FR-DASH-03 (Events Count):** Total count of events marked `status == "present"` or `"partially present"` in `eventAttendees` for the active term across **Levels 1 to 3**.
* **FR-DASH-04 (Fees Outstanding):** Sum of `balance` across non-archived `fees` documents for the student in the active term across **Levels 2 and 3**.
* **FR-DASH-05 (Fines Outstanding):** Sum of `balance` from student's parent `fines` documents for the active term across **Levels 2 and 3**.
* **FR-DASH-06 (Clearance Status Card):** Visual status badge (`CLEARED` / `NOT CLEARED` / `PENDING REVIEW`) derived from `clearanceStatus` documents across **Levels 2 and 3**.

### FR-DASH-07: Clearance Requirements Widget
* **Description:** Previews unresolved blocking items from `clearanceStatus.blockingItems`. Includes a direct CTA button *"Resolve in Clearance"* navigating to `/clearance`.

### FR-DASH-08: Event Attendance Widget
* **Description:** Displays the 2–3 most recent attendance records sorted by `timeIn desc` across all Level 1–3 organizations.

---

## 5. Module 3: Events & Attendance Ledger (Access Levels 1–3)

### FR-EVT-01: Attendance Aggregate Statistics (Multi-Term Capable)
* **Description:** Computes participation statistics across all affiliated organizations (Access Levels 1, 2, and 3), with support for term filtering.
* **Metrics Displayed:**
  - **Total Events Attended**: Attendance records with `status == "present"`.
  - **Partial Attendance**: Attendance records with `status == "partially present"`.
  - **Infractions / Absences**: Fine items in `fines/{fineId}/fineItems` tied to non-attendance (from L2 & L3 orgs).

---

### FR-EVT-02: Event Attendance History Ledger (Multi-Term Capable)
* **Description:** Chronological tabular view of student attendance records across Access Levels 1 to 3, filterable by Term or viewable in full history.
* **Columns:** Event Name, Event Date, Venue, Time-In, Time-Out, Status (`Present` | `Partially Present`), Remarks.

---

### FR-EVT-03: Events Catalog (Active & Historical, Levels 1–3)
* **Description:** Allows students to view events scheduled for the active term or browse past events by selecting previous terms, covering Level 1 (Program), Level 2 (College), and Level 3 (Apex) organizations.

---

## 6. Module 4: Fees Management (Access Levels 2–3)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Semester Fees (A.Y. 2025-2026 • 1st Semester)       [ Term Selector ▼ ]     │
├────────────────────────────────────────────────────────────────────────────┤
│ Organization          Item               Due Date     Amount    Status     │
│ ────────────────────────────────────────────────────────────────────────── │
│ CET Council (L2)      Org Membership Fee Oct 15, 2025 ₱ 250.00  UNPAID ⚠️  │
│ USSC Apex (L3)        University Fee     Nov 01, 2025 ₱ 100.00  PAID ✅    │
├────────────────────────────────────────────────────────────────────────────┤
│ ⚠️ You have 1 unpaid fee obligation. [ Pay in Clearance ──► /clearance ]   │
└────────────────────────────────────────────────────────────────────────────┘
```

### FR-FEE-01: Semester Fee Ledger (Active & Historical Term Lookup, Levels 2–3)
* **Description:** Displays assessed student fees issued by Level 2 (Plus) and Level 3 (Premium) organizations for the selected term (defaulting to active term).
* **Data Fields:** `organizationName`, `title`, `feeType`, `dueDate`, `amount`, `paidAmount`, `balance`, `status` (`PAID` | `PARTIAL` | `UNPAID` | `PENDING REVIEW`).

---

### FR-FEE-02: Unpaid Fee Redirect to Clearance Payment Portal
* **Description:** When outstanding balances exist on `/fees`, renders a banner prompting the student to proceed to the built-in payment portal on `/clearance` (`/clearance`) to settle their obligations.

---

## 7. Module 5: Fines & Infractions Ledger (Access Levels 2–3)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Fines & Infractions Summary (2025-2026 • 1st Sem)   [ Term Selector ▼ ]     │
│ Total Assessed: ₱ 300.00  •  Waived: ₱ 100.00  •  Outstanding: ₱ 200.00    │
├────────────────────────────────────────────────────────────────────────────┤
│ Organization  Infraction / Event        Date Issued   Amount    Status     │
│ ────────────────────────────────────────────────────────────────────────── │
│ CET Council   Absent: General Assembly  Sep 12, 2025  ₱ 100.00  UNPAID     │
│ USSC Apex     Absent: Leadership Summit Aug 28, 2025  ₱ 100.00  WAIVED ✨  │
└────────────────────────────────────────────────────────────────────────────┘
```

### FR-FINE-01: Fine Summary & Financial KPIs (Levels 2–3, Multi-Term Capable)
* **Description:** Aggregates fine totals for the selected term across all affiliated Level 2 and Level 3 organizations (`accumulatedAmount`, `waivedAmount`, `paidAmount`, `balance`).

---

### FR-FINE-02: Itemized Fine Infraction History Table (Levels 2–3, Multi-Term Capable)
* **Description:** Lists individual fine records from `fines/{fineId}/fineItems` for the selected term across Level 2 and Level 3 organizations.

---

### FR-FINE-03: Fine Appeal Submission Workflow
* **Description:** Allows a student to submit an appeal/justification for an eligible fine item, updating `fineItems/{fineItemId}.isPending = true` and flagging the item under review.

---

## 8. Module 6: Semester Clearance & Built-In Payment Portal (Access Levels 2–3)

> [!IMPORTANT]
> ### 🏛️ Per-Organization Independent Payment Submission Rule
> Because payment proofs are manually audited and verified by student officers and cashiers **independently per organization** in `coral-ussc`, **payments for fees and fines must be processed separately per organization**. A student cannot combine obligations from different organizations into a single payment proof. The clearance interface provides a dedicated payment flow per organization.

```
┌────────────────────────────────────────────────────────────────────────────┐
│ SEMESTER CLEARANCE & PAYMENT PORTAL (2025-2026 • 1st Sem) [ Term ▼ ]       │
│ Overall Status: NOT CLEARED ❌        Progress: 2 of 4 Requirements Cleared│
│ [█████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░] 50%                  │
├────────────────────────────────────────────────────────────────────────────┤
│ Clearance Checklist by Organization:                                       │
│                                                                            │
│ 🏛️ College Organization (CET Student Council - Level 2)   [ NOT CLEARED ❌]│
│    • Org Membership Fee: ₱ 250.00 [ UNPAID ❌ ]                            │
│    • General Assembly Absence: ₱ 100.00 [ UNPAID ❌ ]                      │
│    [ 💳 Pay CET Council Obligations (₱ 350.00) ──► Opens Org Payment Flow ]│
│                                                                            │
│ 👑 University Central Body (USSC Apex - Level 3)           [ CLEARED ✅ ]  │
│    • University Clearance Fee: ₱ 100.00 [ PAID ✅ ]                        │
│    (No outstanding obligations for USSC)                                   │
└────────────────────────────────────────────────────────────────────────────┘
```

### FR-CLR-01: Official Clearance Status Indicator & Progress Metric (Levels 2–3, Multi-Term)
* **Description:** Displays overall and per-organization clearance statuses evaluated across all affiliated Level 2 (Plus) and Level 3 (Premium) organizations for the selected term.
* **Overall Status:** `CLEARED` (Green) only if all affiliated organizations are cleared; `NOT CLEARED` (Red) if at least one organization has unresolved obligations; `PENDING REVIEW` (Yellow/Amber) if all remaining obligations are awaiting officer review.

---

### FR-CLR-02: Categorized Clearance Checklist (Per-Organization Grouping)
* **Description:** Groups and displays blocking items from `clearanceStatus.blockingItems` strictly segmented by issuing Organization (e.g. College Org vs Apex Council) and categorized by Type (Fees & Fines).

---

### FR-CLR-03: Per-Organization Built-In Payment & Proof Submission Flow
* **Description:** Enables students to settle outstanding fee and fine obligations with a specific organization through dedicated, organization-scoped payment submissions.
* **Execution Flow:**
  1. Student clicks **"Pay [Org Name] Obligations"** on the specific organization's clearance card.
  2. The payment drawer/modal opens **strictly scoped to that organization (`orgId`)**, listing only the unpaid fee and fine items belonging to that organization.
  3. Student selects items to pay within that organization (dynamic total calculation for that org).
  4. Student selects **Payment Method** (`GCash`, `Bank Transfer`, or `Cash/Over-the-Counter`).
  5. Student enters payment reference / sender number and uploads receipt proof image to Firebase Storage (`/proofOfPayments/{orgId}/{userId}/{timestamp}.png`).
  6. Server Action `submitPaymentProofAction` executes with `{ orgId, selectedItemKeys, amount, ... }`:
     - Creates `proofOfPayments` document with `orgId: selectedOrgId`, `status: "pending"`, `itemKeys: selectedItemKeys`.
     - Updates `clearanceStatus.blockingItems[id].pendingReview = true` for each selected item under that organization.
     - Updates corresponding `fees` documents to `status = "pending"` and `fineItems` documents to `isPending = true`.
     - Calls `recalculateClearanceStatus(userId, orgId, term)` to update the organization's clearance status to `"pending"`.
  7. That organization's clearance status immediately transitions to `PENDING REVIEW ⏳` awaiting verification by that organization's officers in `coral-ussc`.


---

## 9. Non-Functional & Security Requirements

| Concern | Constraint / Standard |
|---|---|
| **Data Ownership** | Every read/write query filters by `userId` extracted from the cryptographically verified session cookie. Client-supplied student IDs are never trusted. |
| **Operational Scoping** | Events & Attendance span Access Levels 1 to 3; Fees, Fines, and Clearance span Access Levels 2 and 3 only. |
| **Silent Audit Logging** | All mutations (payment uploads, fine appeals, profile updates) and security failures are logged fire-and-forget (`void logAction`) to `audit_logs`. |
| **Response Latency** | Read use cases utilize Next.js Server Function caching (`'use cache'`) with user-scoped and term-scoped tags (`fees-${userId}`, `fines-${userId}`, `terms-all`). |
| **Resilience & Soft Deletes** | No physical document deletion occurs; records are soft-deleted with `isDeleted: true` or `isArchived: true`. |
| **Security Boundaries** | Firebase Admin SDK (`adminDb`, `adminAuth`) is restricted to server-side code (`usecases/` and `src/lib/firebase/admin.ts`). |


