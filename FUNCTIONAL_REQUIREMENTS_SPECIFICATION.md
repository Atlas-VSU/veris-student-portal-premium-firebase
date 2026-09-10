# VERIS Student Portal — Functional Requirements Specification (FRS)

> **Document Version:** 1.0.0  
> **Status:** Approved / Active  
> **Scope:** Student-Facing Web Application (`veris-student-portal`)  
> **Source Baseline:** `VERIS Task List - Student Portal Tracker.csv` & `SYSTEM_ARCHITECTURE_GUIDE.md`

---

## 1. Document Overview & Scope

This Functional Requirements Specification (FRS) establishes the authoritative technical and functional criteria for all features in the **VERIS Student Portal**. The student portal is a dedicated, self-service web interface enabling university students to monitor their fees, track attendance, manage fine records, submit payment proofs, and verify semester clearance.

> [!NOTE]
> ### 🎨 UI/UX Governance & Frontend Discretion Notice
> All ASCII wireframes, visual layouts, widget arrangements, modal diagrams, and UI representations in this document are **functional suggestions and structural guides**. The **Frontend Lead** owns `src/components/`, `src/app/`, and all feature-specific UI in `src/features/<feature>/components/`, and holds **final authority and discretion** over all UI/UX design decisions, component aesthetics, design tokens, micro-interactions, and visual layouts. Backend implementation contracts (actions, types, data schemas) remain strictly governed by this specification and `ARCHITECTURE.md`.


### 1.1 Requirements Traceability Matrix

| Tracker Feature | Tracker Module | Requirement ID | Functional Summary |
|---|---|---|---|
| **Cross-Page** | Auth Login | **FR-AUTH-01** | Student Sign-In & Session Establishment via Cookie |
| **Cross-Page** | Auth Sign Out | **FR-AUTH-02** | Student Sign-Out & Session Token Revocation |
| **Cross-Page** | NavBar | **FR-NAV-01** | Global Header Navigation & Profile Snippet |
| **Dashboard** | Active Term Header | **FR-DASH-01** | Current Academic Term Banner Resolution |
| **Dashboard** | Student Greeting | **FR-DASH-02** | Personalized Identity & Academic Profile Header |
| **Dashboard** | Events Summary Card | **FR-DASH-03** | Semester Events Attended Counter |
| **Dashboard** | Fees Summary Card | **FR-DASH-04** | Total Outstanding Fee Balance Metric (₱) |
| **Dashboard** | Fines Summary Card | **FR-DASH-05** | Total Outstanding Fine Balance Metric (₱) |
| **Dashboard** | Clearance Summary Card | **FR-DASH-06** | Clearance Status Badge Indicator |
| **Dashboard** | Clearance Requirements Widget | **FR-DASH-07** | Blocking Items Snapshot (Fees & Fines) |
| **Dashboard** | Event Attendance Widget | **FR-DASH-08** | Recent 2–3 Attendance Records Mini-Feed |
| **Events** | Attendance Stats | **FR-EVT-01** | Aggregate Attendance Counters (Attended / Absent / Excused) |
| **Events** | Attendance History List | **FR-EVT-02** | Chronological Event Attendance History Ledger |
| **Fees** | Fee List | **FR-FEE-01** | Current Term Assessed Fee Ledger |
| **Fees** | Unpaid Fee Redirect | **FR-FEE-02** | Unpaid Fee Direct Payment / Clearance Call-to-Action |
| **Fines** | Fines Summary Stats | **FR-FINE-01** | Fine Balance KPIs (Outstanding, Waived, Total) |
| **Fines** | Fine History Table | **FR-FINE-02** | Itemized Infraction & Fine Items Ledger |
| **Fines** | Appeal Fine | **FR-FINE-03** | Fine Infraction Appeal Submission Modal |
| **Clearance** | Clearance Status | **FR-CLR-01** | Official Clearance Status Banner & Progress Indicator |
| **Clearance** | Requirements List | **FR-CLR-02** | Categorized Clearance Checklist (Fees & Fines Blockers) |
| **Clearance** | Make Payment Button | **FR-CLR-03** | Multi-Item Payment Submission & Proof Upload Workflow |

---

## 2. User Personas & System Actors

```
┌──────────────────────────┐
│     Enrolled Student     │ ──► Authenticates via university credentials
│      (Role: "user")      │ ──► Operates under strict ownership authorization (userId == studentId)
└──────────────────────────┘ ──► Read access to own records; write access restricted to payment/appeals
```

---

## 3. Module 1: Authentication & Global Shell (Cross-Page)

### FR-AUTH-01: Student Sign-In & Session Establishment

* **Description:** Allows an enrolled student to authenticate using university credentials (Firebase Email/Password or Google SSO) and establishes a secure, HTTP-only session cookie.
* **Preconditions:** Student has an active, non-deleted account in the `users` collection with `isDeleted == false`.
* **Execution Flow:**
  1. Student enters credentials on `/login`.
  2. Client Firebase SDK executes `signInWithEmailAndPassword` or `signInWithPopup`.
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
    - **Clearance** (`/clearance`)
    - **Profile** (`/profile`)
  - Displays authenticated student avatar / initials and full name.
  - Houses the **Sign Out** action trigger.

---

## 4. Module 2: Student Dashboard

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [FR-DASH-01] Active Term: 2025-2026 • 1st Semester                         │
│ [FR-DASH-02] Welcome back, Juan Dela Cruz (BSCS - 3rd Year)                │
├────────────────────────────────────────────────────────────────────────────┤
│ [FR-DASH-03..06] KPI Summary Cards:                                        │
│ ┌───────────────┐ ┌───────────────┐ ┌───────────────┐ ┌──────────────────┐ │
│ │ Events: 4     │ │ Unpaid Fees:  │ │ Unpaid Fines: │ │ Clearance:       │ │
│ │ Attended      │ │ ₱ 250.00      │ │ ₱ 100.00      │ │ NOT CLEARED ⚠️   │ │
│ └───────────────┘ └───────────────┘ └───────────────┘ └──────────────────┘ │
├──────────────────────────────────────┬─────────────────────────────────────┤
│ [FR-DASH-07] Clearance Requirements  │ [FR-DASH-08] Recent Attendance Feed │
│ • Org Membership Fee: ₱250 (Unpaid)  │ • University Convocation [Present]  │
│ • General Assembly: ₱100 (Unpaid)    │ • College Assembly [Present]        │
│ [ Pay Now Button ──► /clearance ]    │ [ View All History ──► /attendance] │
└──────────────────────────────────────┴─────────────────────────────────────┘
```

### FR-DASH-01: Active Academic Term Header
* **Description:** Queries the `terms` collection where `isActive == true` and displays the current Academic Year and Semester.
* **Output Format:** `"A.Y. [AY] • [semester] Semester"` (e.g., `"A.Y. 2025-2026 • 1st Semester"`).

### FR-DASH-02: Student Identity Greeting
* **Description:** Displays the student's full name, registered academic program abbreviation, and current year level.
* **Data Sources:** `users/{userId}` doc (`firstName`, `lastName`, `programId`, `yearLevel`).

### FR-DASH-03..06: Quick Metric Summary Cards
* **FR-DASH-03 (Events Count):** Total count of events marked `status == "present"` or `"partially present"` in `eventAttendees` for the active term.
* **FR-DASH-04 (Fees Outstanding):** Sum of `balance` field across all non-archived `fees` documents for `studentId == userId` in the active term. Formatted as Philippine Peso (`₱ #,##0.00`).
* **FR-DASH-05 (Fines Outstanding):** Sum of `balance` from student's parent `fines` document for the active term.
* **FR-DASH-06 (Clearance Status Card):** Visual status pill (`CLEARED` [Emerald] / `NOT CLEARED` [Rose] / `PENDING REVIEW` [Amber]) derived from `clearanceStatus` document.

### FR-DASH-07: Clearance Requirements Widget
* **Description:** Previews all unresolved items currently registered in `clearanceStatus.blockingItems`.
* **Action:** Includes a direct CTA button *"Resolve in Clearance"* navigating to `/clearance`.

### FR-DASH-08: Event Attendance Widget
* **Description:** Displays the 2–3 most recent attendance records sorted by `timeIn desc`.

---

## 5. Module 3: Events & Attendance Ledger

### FR-EVT-01: Attendance Aggregate Statistics

* **Description:** Computes lifetime or active semester participation statistics for the student.
* **Metrics Displayed:**
  - **Total Events Attended**: Count of attendance records with `status == "present"`.
  - **Partial Attendance**: Count of attendance records with `status == "partially present"`.
  - **Infractions / Absences**: Count of fine items in `fines/{fineId}/fineItems` tied to non-attendance.

---

### FR-EVT-02: Event Attendance History Ledger

* **Description:** Full chronological tabular view of all student attendance records.
* **Columns:**
  1. **Event Name:** Title from referenced `events` doc.
  2. **Event Date:** Scheduled date and time.
  3. **Venue / Location:** Physical location or online link.
  4. **Time-In:** Exact timestamp of arrival scan.
  5. **Time-Out:** Exact timestamp of departure scan.
  6. **Attendance Status:**
     - `Present` (Both time-in and time-out logged)
     - `Partially Present` (Time-in only, time-out missed)
  7. **Remarks:** Optional note (e.g., cross-program attendance).

---

## 6. Module 4: Fees Management

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Semester Fees (A.Y. 2025-2026 • 1st Semester)                              │
├────────────────────────────────────────────────────────────────────────────┤
│ Item                     Type          Due Date     Amount    Status       │
│ ────────────────────────────────────────────────────────────────────────── │
│ Org Membership Fee 2025  Membership    Oct 15, 2025 ₱ 250.00  UNPAID ⚠️    │
│ College T-Shirt          Merchandise   Nov 01, 2025 ₱ 350.00  PAID ✅      │
├────────────────────────────────────────────────────────────────────────────┤
│ ⚠️ You have 1 unpaid fee requirement. [ Head to Clearance to Pay ──► ]     │
└────────────────────────────────────────────────────────────────────────────┘
```

### FR-FEE-01: Semester Fee Ledger (Active Term)

* **Description:** Displays all assessed student fees for the active academic term.
* **Data Fields:**
  - `title`: Fee template name
  - `feeType`: Categorization (e.g., `"Membership"`, `"Insurance"`, `"Merchandise"`)
  - `dueDate`: Formatted deadline date
  - `amount`: Original assessed amount
  - `paidAmount`: Total verified payments applied
  - `balance`: Remaining balance (`amount - paidAmount`)
  - `status`: Badge indicator:
    - `PAID` (Balance = 0)
    - `PARTIAL` (Paid amount > 0 and balance > 0)
    - `UNPAID` (Paid amount = 0)
    - `PENDING REVIEW` (Proof uploaded by student, awaiting admin approval)

---

### FR-FEE-02: Unpaid Fee Redirect & Payment Link

* **Description:** If any fee document has `status == "unpaid"` or `balance > 0`, the UI displays a callout banner prompting the student to proceed to the clearance payment workflow (`/clearance`).

---

## 7. Module 5: Fines & Infractions Ledger

```
┌────────────────────────────────────────────────────────────────────────────┐
│ Fines & Infractions Summary                                                │
│ Total Assessed: ₱ 300.00  •  Waived: ₱ 100.00  •  Outstanding: ₱ 200.00    │
├────────────────────────────────────────────────────────────────────────────┤
│ Infraction / Event          Date Issued   Amount    Status      Action     │
│ ────────────────────────────────────────────────────────────────────────── │
│ Absent: General Assembly    Sep 12, 2025  ₱ 100.00  UNPAID      [ Appeal ] │
│ Partial: College Night      Sep 20, 2025  ₱ 100.00  PENDING ⏳  (In Review)│
│ Absent: Leadership Seminar  Aug 28, 2025  ₱ 100.00  WAIVED ✨   (Excused)  │
└────────────────────────────────────────────────────────────────────────────┘
```

### FR-FINE-01: Fine Summary & Financial KPIs
* **Description:** Aggregates parent fine totals for the active term from `fines` document:
  - **Total Accumulated Fines** (`accumulatedAmount`)
  - **Total Waived Fines** (`waivedAmount`)
  - **Total Paid Amount** (`paidAmount`)
  - **Net Outstanding Balance** (`balance = accumulatedAmount - paidAmount - waivedAmount`)

---

### FR-FINE-02: Itemized Fine Infraction History Table
* **Description:** Lists all individual fine records from subcollection `fines/{fineId}/fineItems`.
* **Data Fields:**
  - `fineTypeName`: Name of fine category
  - `eventName`: Event where infraction occurred
  - `eventDate`: Date of event
  - `reason`: System/officer reason string
  - `amount`: Assessment fee for infraction
  - `issuedAt`: Issue timestamp
  - `status`: `Unpaid` | `Paid` | `Waived` | `Pending Appeal`

---

### FR-FINE-03: Fine Appeal Submission Workflow

* **Description:** Allows a student to contest an infraction (e.g., medical emergency, official academic excuse).
* **Execution Flow:**
  1. Student clicks **Appeal** button on an eligible unpaid fine item.
  2. Modal opens with fine details, event name, and required textarea: `"Reason for Appeal / Justification"`.
  3. Optional attachment field (excuse letter / medical slip image).
  4. Student clicks **Submit Appeal**.
  5. Action executes `submitFineAppealAction(fineItemId, appealNotes)`:
     - Updates `fineItems/{fineItemId}`: `isPending = true`, `appealNotes = string`, `appealSubmittedAt = now()`.
     - Updates `clearanceStatus.blockingItems[fineItemId].pendingReview = true`.
     - Triggers clearance recalculation.
  6. Toast displays *"Appeal submitted successfully. Awaiting officer review."*

---

## 8. Module 6: Semester Clearance & Payment Submission

```
┌────────────────────────────────────────────────────────────────────────────┐
│ SEMESTER CLEARANCE STATUS                                                  │
│ Status: NOT CLEARED ❌                Progress: 2 of 4 Requirements Cleared│
│ [█████████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░] 50%                  │
├────────────────────────────────────────────────────────────────────────────┤
│ Clearance Checklist                                                        │
│ 1. 📋 Fees Clearance                                                       │
│    • Org Membership Fee: ₱ 250.00 [ UNPAID ❌ ]                            │
│    • College T-Shirt: ₱ 350.00 [ PAID ✅ ]                                 │
│ 2. ⚖️ Fines Clearance                                                      │
│    • General Assembly Absence: ₱ 100.00 [ UNPAID ❌ ]                      │
│    • Leadership Seminar: ₱ 100.00 [ WAIVED ✅ ]                            │
├────────────────────────────────────────────────────────────────────────────┤
│ [ 💳 Make Payment / Upload Proof (2 Unpaid Items Selected) ]               │
└────────────────────────────────────────────────────────────────────────────┘
```

### FR-CLR-01: Official Clearance Status Indicator & Progress Metric

* **Description:** Displays the student's official clearance state determined by the 3-state evaluation engine.
* **States:**
  - **`CLEARED`** (Green): All required fee and fine blocking items have `balance == 0` or `status == "paid"`.
  - **`NOT CLEARED`** (Red): At least one required blocking item has `balance > 0` with no proof in review.
  - **`PENDING REVIEW`** (Yellow/Amber): All outstanding items have submitted payment proofs currently awaiting officer verification.
* **Progress Bar:** Calculated as `(Cleared Items Count / Total Required Items Count) * 100%`.

---

### FR-CLR-02: Categorized Clearance Checklist (Requirements List)

* **Description:** Categorizes all blocking items from `clearanceStatus.blockingItems` into two distinct groups:
  1. **Fee Requirements:** Group of all fee items with individual balances and review statuses.
  2. **Fine Requirements:** Group of all infraction items with individual balances and appeal statuses.

---

### FR-CLR-03: Multi-Item Payment Submission & Proof Upload Workflow

* **Description:** End-to-end payment submission drawer/modal allowing students to self-pay outstanding obligations via GCash or Bank Transfer.
* **Execution Flow:**
  1. Student clicks **Make Payment** on the clearance page.
  2. Modal presents a checklist of all unpaid fees and fines.
  3. Student selects items to pay (checkboxes update dynamic `"Total Amount to Pay"`).
  4. Student selects **Payment Method**:
     - `GCash`: Requires `senderNumber` (`09XXXXXXXXX`) and `referenceNumber`.
     - `Bank Transfer`: Requires `referenceNumber` and `bankName`.
     - `Cash (Over-the-Counter)`: Informational instructions.
  5. Student uploads screenshot proof image to Firebase Storage (`/proofOfPayments/{userId}/{timestamp}.png`).
  6. Student clicks **Submit Payment Proof**.
  7. Server Action `submitPaymentProofAction` executes:
     - Creates `proofOfPayments` document with `status = "pending"`, `itemKeys = [selectedIds]`.
     - For each selected item, sets `clearanceStatus.blockingItems[id].pendingReview = true`.
     - Calls `recalculateClearanceStatus(userId)`.
  8. Clearance status immediately updates to `PENDING REVIEW ⏳`.

---

## 9. Non-Functional & Security Requirements

| Concern | Constraint / Standard |
|---|---|
| **Data Ownership** | Every read/write query filters by `userId` extracted from the cryptographically verified session cookie. Client-supplied student IDs are never trusted. |
| **Silent Audit Logging** | All mutations (payment uploads, appeals, profile updates) and security failures are logged fire-and-forget (`void logAction`) to `audit_logs`. |
| **Response Latency** | Read use cases utilize Next.js Server Function caching (`'use cache'`) with user-scoped tags (`fees-${userId}`, `fines-${userId}`). |
| **Resilience & Soft Deletes** | No physical document deletion occurs; records are soft-deleted with `isDeleted: true` or `isArchived: true`. |
| **Security Boundaries** | Firebase Admin SDK (`adminDb`, `adminAuth`) is restricted to server-side code (`usecases/` and `src/lib/firebase/admin.ts`). |
