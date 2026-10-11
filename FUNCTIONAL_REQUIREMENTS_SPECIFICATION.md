# VERIS Student Portal — Functional Requirements Specification

> **Document Version:** 2.2.1
>
> **Status:** For Review
>
> **Scope:** Student-facing web application
>
> **Last Revised:** 2026-10-11

---

## 1. Purpose and Document Ownership

VERIS Student Portal is the student-facing part of the VERIS ecosystem. It allows enrolled students to view organization events, review attendance, monitor fees and fines, track semester clearance, submit payment proofs, and maintain permitted profile fields.

This document defines:

- what students must be able to do;
- the business rules that determine what students see;
- expected success, empty, and failure behavior; and
- acceptance criteria for the student-facing product.

This document does not define Firestore fields, Firebase calls, file placement, or backend implementation. Those belong to:

- `SYSTEM_ARCHITECTURE_GUIDE.md` for system policies, authentication, shared data contracts, and Firestore access; and
- `ARCHITECTURE.md` for frontend/backend ownership and the Action → Service → Use Case flow.

### 1.1 Product Goals

The portal must:

1. Give each student a trustworthy view of their own institutional records.
2. Combine records from the organizations relevant to the student.
3. Make outstanding financial and clearance obligations understandable.
4. Provide a single student-facing payment-proof workflow.
5. Support current and historical academic-term review.

### 1.2 In Scope

- Student authentication and sign-out.
- Dashboard summaries.
- Academic-term selection.
- Events catalog.
- Attendance history and statistics.
- Student fee ledger.
- Student fine and infraction ledger.
- Clearance status and blocking requirements.
- Organization-scoped payment-proof submission.
- Student profile display and limited profile editing.

### 1.3 Out of Scope

The following operations belong to the separate CORAL-USSC admin portal:

- creating organizations, programs, faculties, or terms;
- creating events and recording attendance scans;
- generating or assigning fees and fines;
- approving student registrations;
- waiving fines;
- verifying or rejecting payment proofs;
- recording cashier payments; and
- performing administrative clearance recalculation.

Student fine appeals are not part of the current product. No appeal submission or review workflow is defined at this time.

---

## 2. Actors, Eligibility, and Scope

### 2.1 Primary Actor: Enrolled Student

The portal is for a student whose account is approved and active and who belongs to the population served by at least one Premium-subscribed organization.

An authenticated student may:

- read only their own student-specific records;
- browse records for supported academic terms;
- submit payment proofs for their own outstanding obligations.

### 2.2 Connected Actor: Organization Officer

Organization officers, treasurers, cashiers, and administrators operate through the separate CORAL-USSC administrative portal. Their actions—including fine waivers and payment verification—create or update records later shown in the Student Portal.

### 2.3 Organization Scope

Organization visibility follows institutional population scope:

| Level | Meaning | Student visibility |
|---|---|---|
| Level 1 | Program organization | Students in the matching program |
| Level 2 | Faculty or college organization | Students in the matching faculty/college |
| Level 3 | University or apex organization | All eligible university students |

Population scope and Premium entitlement are separate rules. An organization contributes data to this portal only when it:

1. matches the student’s Level 1, Level 2, or Level 3 population scope; and
2. has an active Premium subscription.

When an organization does not have an active Premium subscription, none of its events, attendance, fees, fines, clearance requirements, payment options, or summary contributions appear in the Premium Student Portal. The System Architecture Guide defines how this entitlement is represented and enforced in the shared data model.

---

## 3. Shared Product Rules

### BR-01: Student Ownership

A student must never see or modify another student’s private records. The system determines ownership from the authenticated account rather than from an identifier supplied by the browser.

### BR-02: Academic Terms

- The active term is the default context.
- Students may select a supported historical term.
- A term selection must be applied consistently to events, attendance, fees, fines, and clearance.
- If no active term is available, the portal must show a clear unavailable state instead of silently choosing another term.

### BR-03: Organization Names

The interface displays human-readable organization names. Internal identifiers must not be exposed as substitutes for missing display names.

### BR-04: Financial Organization Separation

Fees, fines, clearance, and payments remain separated by issuing organization. A payment submission must not combine obligations from different organizations.

### BR-05: Money

- Monetary totals must never display negative balances.
- Displayed totals must be derived from the obligations visible in the selected term.
- Currency formatting must be consistent throughout the portal.

### BR-06: Failure Is Not Empty Data

A failed request must produce an error or unavailable state. The portal must not represent a failed request as a valid zero balance, empty history, or cleared status.

### BR-07: Premium Organization Gate

Every organization-derived list, detail, total, status, and payment operation must apply the Premium subscription gate. A student must not reach a non-subscribed organization’s data through direct navigation, stale client state, or a crafted request.

---

## 4. Authentication, Navigation, and Terms

### FR-AUTH-01: Student Sign-In

**Outcome:** An eligible student can establish a secure authenticated session.

**Requirements:**

- The student signs in using supported university credentials.
- Only approved, active student accounts may enter the portal.
- Invalid credentials, ineligible accounts, and expired sessions receive understandable messages.
- Successful sign-in directs the student to the dashboard.

**Acceptance criteria:**

- An approved student reaches the dashboard after valid authentication.
- A pending, deactivated, missing, or non-student account is denied.
- Authentication failures do not expose sensitive system information.

### FR-AUTH-02: Student Sign-Out

**Outcome:** The student can terminate the current session.

**Acceptance criteria:**

- Protected pages are no longer accessible after sign-out.
- The student is returned to the sign-in page.
- A local session is cleared even if remote invalidation cannot be completed.

### FR-NAV-01: Global Navigation

Authenticated pages provide access to:

- Dashboard;
- Events;
- Attendance;
- Fees;
- Fines;
- Clearance and payments; and
- Profile.

Navigation identifies the current section and provides access to sign-out.

### FR-TERM-01: Academic-Term Selection

**Outcome:** Students can switch between the active term and supported historical terms.

**Acceptance criteria:**

- The active term is selected on first load when available.
- Changing the term refreshes every term-dependent view.
- Deleted or unavailable terms are not selectable.
- The selected term is visibly identifiable.

---

## 5. Dashboard

### FR-DASH-01: Student and Term Context

The dashboard displays:

- the selected academic year and semester;
- the student’s name;
- program;
- faculty or college, when available; and
- year level.

### FR-DASH-02: Summary Metrics

For the selected term, the dashboard displays:

- number of fully attended events;
- outstanding fee balance;
- outstanding fine balance; and
- overall clearance status.

Partial attendance is not included in the fully attended count.

### FR-DASH-03: Clearance Preview

The dashboard previews unresolved clearance requirements and provides navigation to the Clearance page.

### FR-DASH-04: Recent Attendance

The dashboard displays the three most recent attendance-history entries available to the student.

### Dashboard acceptance criteria

- Dashboard summaries include only Premium-subscribed organizations that match the student’s population scope.
- A student with no eligible obligations sees a clear “no outstanding obligations” state.
- Missing or failed data is not displayed as a valid zero or cleared state.
- Each summary provides navigation to its detailed module where appropriate.

---

## 6. Events and Attendance

### FR-EVT-01: Events Catalog

Students can browse events for the selected term from Premium-subscribed organizations that match their program, faculty/college, or university scope.

Each event presents, when available:

- event name;
- organizing organization;
- date and time;
- venue;
- current status;
- major-event indicator; and
- attendance instructions or notes.

### FR-EVT-02: Attendance History

The attendance ledger combines recorded attendance and recognized absence infractions into one chronological history.

Each entry presents:

- organization;
- event;
- event date;
- venue;
- time-in and time-out;
- attendance status;
- remarks; and
- related fine or waiver information when applicable.

### FR-EVT-03: Attendance Statistics

For the selected term, students can see:

- fully present count;
- partially present count;
- absence or infraction count.

### Attendance business rules

- **Present:** the required time-in and time-out are recorded.
- **Partially present:** only part of the required attendance is recorded.
- **Absent:** a recognized non-attendance infraction exists.
- Attendance history is ordered from newest to oldest.
- Empty terms display a “no attendance records” state.

---

## 7. Fees

### FR-FEE-01: Student Fee Ledger

Students can view fee obligations issued by eligible organizations for the selected term.

Each fee presents:

- issuing organization;
- title and category;
- due date when applicable;
- assessed amount;
- verified paid amount;
- outstanding balance; and
- status.

Supported display statuses are:

- Unpaid;
- Partially paid;
- Pending review; and
- Paid.

### FR-FEE-02: Fee Resolution

When an outstanding fee exists, the portal directs the student to the organization-specific payment flow on the Clearance page.

### Fee acceptance criteria

- Archived obligations are excluded.
- Totals equal the sum of visible outstanding balances.
- A paid fee is not presented as an outstanding requirement.
- An empty ledger has a distinct non-error state.

---

## 8. Fines and Waivers

### FR-FINE-01: Fine Summary

For the selected term, students can view:

- total assessed;
- total paid;
- total waived; and
- outstanding balance.

### FR-FINE-02: Fine and Infraction History

Each fine item presents:

- issuing organization;
- event or infraction;
- issue date;
- reason;
- amount;
- payment status;
- waiver status.

Archived fine records are excluded from active totals and lists.

### FR-FINE-03: Fine Waiver Visibility

Students cannot submit or manage fine appeals in the current product.

When an administrator waives a fine in the administrative portal:

- the fine item is visibly identified as waived;
- the waived amount is excluded from the outstanding balance; and
- the related clearance status is updated after administrative recalculation.

---

## 9. Clearance and Payments

### FR-CLR-01: Clearance Status

Students can view overall and per-organization clearance for the selected term.

Per-organization status is calculated as follows:

- **Cleared:** all required obligations are resolved.
- **Pending review:** at least one unresolved required obligation is awaiting officer review.
- **Not cleared:** unresolved required obligations remain and none is awaiting officer review.

This follows the existing USSC Connect Student Portal and administrative calculation. If an organization has both pending and unpaid requirements, its organization-level status is Pending review while the individual unpaid requirements remain visibly identified.

Overall status uses this precedence:

1. Not cleared if any organization is not cleared.
2. Otherwise pending review if at least one organization is pending.
3. Otherwise cleared.

### FR-CLR-02: Clearance Requirements

Students can inspect unresolved requirements grouped by issuing organization and by fee or fine type.

Each requirement shows:

- title;
- type;
- outstanding balance;
- current state; and
- whether officer review is pending.

### FR-CLR-03: Organization-Scoped Payment Submission

Students can submit payment information and proof for selected obligations belonging to one organization.

The flow must:

1. Identify the organization being paid.
2. Show only that organization’s eligible outstanding items.
3. Let the student select applicable items.
4. Display the calculated submission amount.
5. Collect the selected payment method and required reference information.
6. Accept required supporting proof.
7. Confirm successful submission.
8. Mark the relevant items as awaiting review.

### Payment acceptance criteria

- Items from different organizations cannot be combined.
- The server revalidates ownership, organization, term, state, and amount before accepting a submission.
- A successful submission appears as pending review.
- A rejected submission displays the rejection reason when one is supplied.
- Verification performed in CORAL-USSC eventually updates balances and clearance.
- Failure to submit does not place obligations into a pending state.
- Students may make a partial settlement by selecting only some of the currently payable obligations.
- Each selected item contributes its full current outstanding balance; students do not enter an arbitrary amount for an item.
- The server recalculates the total from the selected current records, so a submission cannot exceed the selected outstanding amount.
- An obligation with a pending proof cannot be included in another submission.
- A settled obligation cannot be submitted again.
- A rejected proof removes the pending state from its selected obligations, preserves their outstanding balances, and makes them selectable again.
- Required proof images may be JPEG, PNG, WebP, or GIF and must not exceed 5 MB.

---

## 10. Profile

### FR-PRO-01: Student Profile Display and Editing

Students can view their available identity and affiliation information:

- full name;
- university student number;
- email;
- program;
- faculty or college;
- organization affiliation;
- year level; and
- registration document link when available.

Students may edit only:

- first name;
- last name;
- program; and
- year level, using an integer from 1 through 6.

Student number, email, faculty or college, organization affiliation, account role, account status, and registration documents are read-only in the Student Portal. A program change must use a supported program and must not allow the student to directly choose derived faculty or organization identifiers.

A valid student-submitted program change takes effect immediately and does not require administrator approval in the current product. Subsequent authorization and visibility checks use the newly derived faculty and organization affiliation. This immediate-update rule is provisional; the implementation must permit an approval step to be introduced later without changing which profile fields students may edit.

---

## 11. Cross-Cutting Quality Requirements

### NFR-01: Security and Privacy

- Protected information is available only after authentication.
- Students can access only their own private records.
- Sensitive implementation details are not exposed in user-facing errors.
- Payment proofs and registration documents are treated as private student data.
- A payment receipt may be uploaded by the student but must not receive a permanent public URL.
- After submission, the raw receipt is retrievable only by the backend and an authorized administrator or verifier for the issuing organization. Students cannot reopen or download their submitted receipt. The student-facing portal displays the submission status and related payment information without exposing the stored file.

### NFR-02: Accessibility and Responsive Use

- Core workflows must be usable with a keyboard.
- Status is communicated with text and not color alone.
- Pages must support common mobile and desktop viewport sizes.
- The formal accessibility conformance target remains to be approved.

### NFR-03: Reliability

- Loading, empty, error, and unavailable states are distinct.
- Failed reads do not appear as successful empty results.
- Failed writes do not appear as successful submissions.
- Retrying a request must not create unintended duplicate financial records.

### NFR-04: Auditability

Authentication security events, profile changes, and payment submissions must produce an operational audit record without exposing audit internals to the student.

### NFR-05: Performance and Freshness

The portal must communicate progress during data retrieval. A completed administrative verification, rejection, waiver, or clearance update must appear on the student’s next successful page refresh; realtime push updates are not required. Numeric response-time targets remain to be approved.

---

## 12. Open Product Decisions

| ID | Decision needed |
|---|---|
| OD-09 | What accessibility standard is required? |
| OD-10 | What numeric response-time target is required for normal page loads and student-initiated actions? |

---

## 13. Requirements Traceability

| Area | Requirement IDs |
|---|---|
| Authentication | FR-AUTH-01, FR-AUTH-02 |
| Navigation and terms | FR-NAV-01, FR-TERM-01 |
| Dashboard | FR-DASH-01 through FR-DASH-04 |
| Events and attendance | FR-EVT-01 through FR-EVT-03 |
| Fees | FR-FEE-01, FR-FEE-02 |
| Fines and waivers | FR-FINE-01 through FR-FINE-03 |
| Clearance and payments | FR-CLR-01 through FR-CLR-03 |
| Profile | FR-PRO-01 |
| Cross-cutting quality | NFR-01 through NFR-05 |
