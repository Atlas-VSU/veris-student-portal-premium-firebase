# VERIS Student Portal — System Architecture Guide

> **Document Version:** 2.2.2
>
> **Status:** For Review — live schema verification pending
>
> **Last Revised:** 2026-10-12

---

## 1. Purpose, Ownership, and Sources

This guide defines the technical contracts shared by the VERIS Student Portal and CORAL-USSC:

- authentication and authorization policy;
- Firestore collection and field contracts;
- ownership, organization, and term invariants;
- query and transaction patterns;
- cross-application workflows; and
- unresolved schema migrations.

Document ownership is intentionally separated:

| Document | Owns |
|---|---|
| FUNCTIONAL_REQUIREMENTS_SPECIFICATION.md | Student behavior, business outcomes, and acceptance criteria |
| SYSTEM_ARCHITECTURE_GUIDE.md | System policies, Firestore contracts, authentication, integration, and data workflows |
| ARCHITECTURE.md | Repository placement and the Action → Service → Use Case dependency flow |

### 1.1 Source Precedence

This guide was reconciled from:

1. the student portal source code;
2. the CORAL-USSC backend document;
3. the functional requirements; and
4. the previous system guide.

The live shared Firestore database has not been inspected during this revision. Therefore:

- fields confirmed by CORAL and current student code are marked as the current contract;
- target additions are marked optional or migration fields;
- unresolved conflicts are listed in Section 10; and
- no destructive schema migration should be performed solely from this document.

---

## 2. System Context

VERIS consists of two applications using a shared Firestore database.

| Responsibility | Student Portal | CORAL-USSC |
|---|---|---|
| Primary users | Enrolled students | Officers, cashiers, administrators |
| Reads | Own attendance, events, fees, fines, clearance, payment status | Organization-scoped operational records |
| Writes | Payment submissions and permitted profile updates | Events, attendance, fees, fines, waivers, verification, clearance |
| Authorization | Authenticated student ownership | Role, organization, and access-level scope |
| Database access | Server-side Firebase Admin | Existing admin application access model |

### 2.1 Institutional Scope

| Access level | Scope field | Meaning |
|---|---|---|
| 1 | programId | Program-specific |
| 2 | facultyId | Faculty or college-specific |
| 3 | none beyond university eligibility | University-wide or apex |

Population scope and product entitlement are independent checks. Levels 1–3 determine which students belong to an organization’s population. The `organizations.subscribed` flag is the current Premium entitlement: only documents belonging to an active organization with `subscribed === true` may appear anywhere in this Premium Student Portal.

This gate applies to events, attendance, fees, fines, clearance, payment submissions, dashboards, totals, histories, and direct record access. Optional `subscriptionId` and `subscriptionTier` properties found in a TypeScript type are not part of the active persistence contract and must not be used for authorization until an explicit migration replaces the boolean flag.

---

## 3. Application and Security Boundary

The canonical feature flow is:

    Frontend → Action → Service → Use Case → Firebase Admin / Firestore

- Frontend code calls Server Actions and consumes serializable DTOs.
- Actions authenticate, validate request-shaped input, and call services.
- Services enforce business and visibility rules and orchestrate use cases.
- Use cases perform Firestore reads, writes, batches, and transactions.
- Domain Firestore access through adminDb remains inside use cases.
- Authentication services may use adminAuth.

ARCHITECTURE.md is the canonical source for file placement and import rules.

### 3.1 Firebase Admin Security Rule

Firebase Admin bypasses Firestore Security Rules. Server authorization is therefore mandatory:

1. Verify the session with revocation checking.
2. Revalidate that the user record exists, is approved, is not deleted, and has the student role.
3. Obtain the Firebase UID from the verified session.
4. Resolve the active Premium-subscribed organizations whose population scope includes the student.
5. Pass the UID and resolved eligible organization IDs through the action and service boundary.
6. Scope every student-owned query or mutation with the UID and verify that its organization belongs to that eligible set.

Never authorize a request using a browser-supplied studentId or userId.

### 3.2 Identity Invariants

| Name | Meaning | Security use |
|---|---|---|
| userId | Firebase Authentication UID | Authoritative ownership key |
| studentId | University-issued student number | Display and institutional lookup only |
| orgId | Organization document ID | Authoritative organization relationship |
| orgName | Denormalized display snapshot | Display only; never authorization |

### 3.3 Session Policy

- Only approved, non-deleted users with role "user" may establish or continue a student session.
- Premium features require at least one active, subscribed organization whose population scope includes the student.
- Session verification checks revocation.
- A user’s current Firestore account state is revalidated for protected operations.
- Sign-out clears the local session even when remote revocation fails.
- Authentication failures and student mutations are auditable.

---

## 4. Firestore Conventions

### 4.1 Document IDs

- Firestore document IDs are read from DocumentSnapshot.id.
- An id field is stored only where the shared schema already requires one.
- users documents use the Firebase UID as the document ID.
- clearanceStatus uses a deterministic ID based on student, organization, and term.
- Most other documents use auto-generated IDs.

### 4.2 Time and Serialization

- Stored dates use Firestore Timestamp unless a field is explicitly an epoch number.
- Use cases convert Timestamp values into ISO strings or other serializable DTO values before returning data through a Server Action.
- Frontend-facing contracts must not expose Firebase Admin classes.

### 4.3 Soft Deletion

| Record | Archive field |
|---|---|
| users, terms, events | isDeleted |
| feeItems, fees, clearanceStatus, proofOfPayments | isArchived |
| fines parent | metadata.isArchived |
| fineItems | isArchived and, in some legacy records, metadata.isArchived |

Normal application workflows do not physically delete business records.

### 4.4 Denormalized Fields

Firestore has no server-side joins. Student and organization names may be copied into operational documents for display and historical stability.

New organization-issued `events`, `eventAttendees`, `feeItems`, `fees`, `fines`, `clearanceStatus`, and `proofOfPayments` documents store `orgName` as a display snapshot. Fine items inherit the organization from their parent fine. Authorization always uses `orgId`, never `orgName`.

Existing records may not contain `orgName`. During migration, readers resolve a missing snapshot through one controlled organization lookup or a bounded preloaded organization map. Existing records may be backfilled separately; normal reads must not perform an unbounded N+1 lookup.

### 4.5 Atomicity

Use a Firestore transaction or batch when one business operation must update multiple records consistently. Examples include:

- activating one term while deactivating another;
- submitting a proof and marking selected obligations pending;
- verifying a payment and updating balances, history, and clearance; and
- generating fines and their corresponding clearance blockers.

---

## 5. Shared Firestore Collections

Question marks indicate optional or migration fields. Fields not listed here may exist in CORAL for admin-only workflows.

### 5.1 users

**Document ID:** Firebase UID

| Field | Type | Notes |
|---|---|---|
| studentId | string | University student number |
| email | string | Unique account email |
| firstName | string | Student given name |
| lastName | string | Student surname |
| programId | string | Reference to programs |
| facultyId | string | Reference to faculties |
| orgId | string | Primary organization reference |
| role | "user" / "admin" / "super-admin" | Student Portal accepts "user" only |
| accessLevel | 1 / 2 / 3 | Present in CORAL; not yet exposed by the student session type |
| status | "pending" / "approved" | Account eligibility |
| yearLevel | integer | Student value from 1 through 6 |
| isDeleted | boolean | Account soft-delete flag |
| corURL? | string | Registration document URL |
| createdAt | Timestamp | Creation time |
| updatedAt | Timestamp | Last update |
| registrationAt? | Timestamp | Registration submission time |

When a user is soft-deleted, related unpaid fees, fines, and clearance records are archived by the administrative system.

The Student Portal may update only `firstName`, `lastName`, `programId`, and `yearLevel`. The server validates the selected program and derives the corresponding `facultyId` and primary `orgId`; the browser cannot directly assign either derived identifier.

A valid student-submitted program change takes effect immediately and currently requires no administrative approval. The profile mutation must update `programId`, derived `facultyId`, derived primary `orgId`, and `updatedAt` as one controlled operation, then invalidate all student-affiliation and organization-entitlement caches. Subsequent reads use the new affiliation. Historical snapshots in already-issued attendance and financial records are not rewritten.

Keep approval policy in the profile service rather than in the component, action, or Firestore use case. The current policy authorizes an immediate update after validation. A later policy may create a pending change request instead, while preserving the same Action → Service → Use Case boundary and the existing profile field contract.

### 5.2 organizations

**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| name | string | Unique display name |
| shortName | string | Abbreviation |
| facultyId? | string | Used for Level 2 |
| programId? | string | Used for Level 1 |
| accessLevel | 1 / 2 / 3 | Population scope |
| subscribed | boolean | Current Premium Student Portal entitlement flag |
| isArchived | boolean | Archive flag |
| users? | string[] | Admin user UIDs |
| orgLogoUrl? | string | Logo URL |
| metadata.createdAt | Timestamp | Creation time |
| metadata.updatedAt | Timestamp | Last update |

`subscribed === true` means the organization has Premium access and may expose its eligible records in this portal. `subscribed === false` excludes all of its records and actions from this portal. Optional `subscriptionId` and `subscriptionTier` properties found in a TypeScript type are not used by the current authorization contract.

### 5.3 programs and faculties

**programs**

| Field | Type |
|---|---|
| name | string |
| acronym? | string |
| facultyId | string |

**faculties**

| Field | Type |
|---|---|
| name | string |
| acronym | string |

### 5.4 terms

**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| AY | string | Format YYYY-YYYY |
| semester | "1st" / "2nd" | Academic semester |
| isActive | boolean | Exactly one active term is intended |
| isDeleted | boolean | Soft-delete flag |
| metadata.createdAt | Timestamp | Creation time |
| metadata.updatedAt | Timestamp | Last update |

Activating a term must deactivate the previous active term atomically.

### 5.5 events

**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| name | string | Event title |
| date | Timestamp | Event date and start |
| location | string | Venue |
| note? | string | Instructions |
| majorEvent | boolean | Significance flag |
| fineTypeId? | string | Required only when the event can generate fines; absent for non-fining events |
| orgId | string | Organization reference |
| orgName | string | Required on new writes; may be absent in legacy data |
| programId? | string | Level 1 scope |
| facultyId? | string | Level 2 scope |
| accessLevelEvent | 1 / 2 / 3 | Event population scope |
| status | "upcoming" / "ongoing" / "completed" / "archived" | Lifecycle state |
| attendees | number | Attendance counter |
| academicYear | string | Term linkage |
| semester | string | Term linkage |
| isDeleted | boolean | Soft-delete flag |
| finesGenerated | boolean | Fine-generation lock |
| manuallyCompleted | boolean | Manual completion lock |
| timeInStart? | string | HH:MM |
| timeInEnd? | string | HH:MM |
| timeOutStart? | string | HH:MM |
| timeOutEnd? | string | HH:MM |
| createdAt | Timestamp | Creation time |

### 5.6 eventAttendees

**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| eventId | string | Reference to events |
| userId | string | Firebase UID ownership key |
| studentId | string | Student-number snapshot |
| student? | object | Profile snapshot at attendance time |
| timeIn? | Timestamp | Check-in |
| timeOut? | Timestamp | Check-out |
| status | "partially present" / "present" | Stored attendance state |
| remark? | string | Attendance note |
| orgId | string | Organization reference |
| orgName | string | Required on new writes; may be absent in legacy data |

An absence is not stored as an eventAttendees status. The Student Portal derives an absent history item from an eligible fine item connected to the event.

### 5.7 feeItems

**Document ID:** Auto-generated

| Field | Type |
|---|---|
| id | string |
| title | string |
| amount | number |
| feeType | string |
| description? | string |
| dueDate? | Timestamp |
| isRequiredForClearance | boolean |
| orgId | string |
| orgName | string display snapshot; required on new writes, may be absent in legacy data |
| academicYear | string |
| semester | string |
| totalStudents | number |
| isArchived | boolean |
| createdAt | Timestamp |
| updatedAt | Timestamp |

### 5.8 fees

**Document ID:** Auto-generated; one student instance per assigned fee item

| Field | Type |
|---|---|
| orgId | string |
| orgName | string display snapshot; required on new writes, may be absent in legacy data |
| userId | string |
| userName | string |
| studentId | string |
| feeItemId | string |
| feeType | string |
| title | string |
| amount | number |
| paidAmount | number |
| balance | number |
| status | "unpaid" / "partial" / "paid" / "pending" |
| dueDate? | Timestamp |
| isRequiredForClearance | boolean |
| eventId? | string |
| description? | string |
| createdBy | string |
| academicYear | string |
| semester | string |
| isArchived | boolean |
| createdAt | Timestamp |
| updatedAt | Timestamp |

**Subcollection:** fees/{feeId}/paymentHistory

| Field | Type |
|---|---|
| id | string |
| paymentNumber | number |
| amount | number |
| paymentMethod | "gcash" / "cash" / "bank_transfer" / "waiver" |
| paymentProofId | string |
| status | "verified" / "rejected" / "pending" |
| paidAt | Timestamp |
| verifiedBy? | string |
| verifiedByName? | string |
| verifiedAt? | Timestamp |
| rejectionReason? | string |
| notes? | string |
| createdAt | Timestamp |

### 5.9 fineTypes

| Field | Type |
|---|---|
| name | string |
| description | string |
| defaultAmount | number |
| requiresTimeIn | boolean |
| requiresTimeOut? | boolean |
| majorEventsOnly | boolean |
| orgId | string |

### 5.10 fines

**Document ID:** Auto-generated parent per student, organization, and term

| Field | Type |
|---|---|
| orgId | string |
| orgName | string display snapshot; required on new writes, may be absent in legacy data |
| userId | string |
| userName | string |
| studentId | string |
| academicYear | string |
| semester | string |
| accumulatedAmount | number |
| paidAmount | number |
| balance | number |
| status | "unpaid" / "partial" / "paid" / "pending" / "waived" |
| fineItemsCount | number |
| firstFineIssuedAt? | Timestamp |
| lastFineIssuedAt? | Timestamp |
| dueDate? | Timestamp |
| waivedAmount? | number |
| waivedBy? | string |
| waivedReason? | string |
| waivedAt? | Timestamp |
| remarks? | string |
| metadata.createdAt | Timestamp |
| metadata.updatedAt | Timestamp |
| metadata.isArchived | boolean |

**Subcollection:** fines/{fineId}/fineItems

| Field | Type |
|---|---|
| itemNumber | number |
| fineTypeId | string |
| fineTypeName | string |
| eventId | string |
| eventName | string |
| eventDate | Timestamp |
| amount | number |
| reason | string |
| issuedBy | string |
| issuedAt | Timestamp |
| isWaived | boolean |
| waivedBy? / waivedReason? / waivedAt? | corresponding types |
| isPaid | boolean |
| isPending | boolean |
| isArchived | boolean |
| parentFineId | string |
| userId | string |
| studentId | string |
| academicYear | string |
| semester | string |
| metadata.createdAt? | Timestamp |
| metadata.updatedAt? | Timestamp |
| metadata.isArchived? | boolean |

Fine appeals are not supported by the current Student Portal. Legacy appeal-like fields, if present, are read-only historical data and must not be used to infer a supported workflow. Administrative fine waivers remain supported through `isWaived` and the corresponding waiver metadata.

**Subcollection:** fines/{fineId}/paymentHistory uses the same payment-history contract as fees.

### 5.11 clearanceStatus

**Document ID:** Deterministic student + organization + term key.

Current CORAL construction concatenates userId, orgId when present, and an AY-semester suffix. All applications must use the shared ID builder rather than reproducing the string ad hoc.

| Field | Type |
|---|---|
| id | string |
| userId | string |
| orgId | string |
| orgName | string display snapshot; required on new writes, may be absent in legacy data |
| studentId | string |
| userName | string |
| academicYear | string |
| semester | string |
| status | "cleared" / "not_cleared" / "pending" |
| isArchived | boolean |
| visibility | "public" / "private" |
| blockingItems | Record<string, BlockingItem> |
| clearanceDate? | Timestamp |
| lastCalculatedAt? | Timestamp |
| startDate | Timestamp |
| dueDate | Timestamp |
| createdAt | Timestamp |
| updatedAt | Timestamp |

**BlockingItem**

| Field | Type |
|---|---|
| type | "fees" / "fines" |
| referenceId | string |
| parentFineId? | string |
| title | string |
| balance | number |
| status | "unpaid" / "paid" |
| paymentHistory? | array |
| pendingReview | boolean |
| isRequiredForClearance | boolean |
| academicYear | string |
| semester | string |

### 5.12 proofOfPayments

**Document ID:** Auto-generated

| Field | Type |
|---|---|
| id | string |
| orgId | string |
| orgName | string display snapshot; required on new writes, may be absent in legacy data |
| userId | string |
| studentId | string |
| userName | string |
| paymentType | "fees" / "fines" / "bulk" |
| referenceId | string |
| paymentHistoryId | string or string[] |
| amount | number |
| paymentMethod | "gcash" / "cash" / "bank_transfer" / "waiver" |
| referenceNumber? | string |
| senderNumber? | string |
| storagePath | string private Storage object path for new receipt uploads |
| imageUrl? | string legacy receipt location; new writes must not store a permanent public URL |
| status | "pending" / "verified" / "rejected" |
| submittedAt | Timestamp |
| verifiedBy? | string |
| verifiedByName? | string |
| verifiedAt? | Timestamp |
| rejectionReason? | string |
| notes? | string |
| metadata.items? | array |
| itemKeys | string[] lookup keys for the selected obligations |
| receiptCode? | string |
| isArchived | boolean |
| academicYear | string |
| semester | string |
| updatedAt | Timestamp |

For compatibility with the existing administrative portal, `itemKeys` contains:

- `fees.feeItemId` for each selected fee; and
- the parent `fines` document ID for each selected fine item.

`itemKeys` is a coarse lookup aid, not the authoritative allocation ledger. Exact selected records are stored in `metadata.items`, where each entry includes `paymentType`, the selected record `refId`, `parentFineId` for a fine item, the applied amount, and its payment-history reference. Duplicate lookup keys should be removed before writing the proof.

Receipt upload is write-only from the student’s perspective after submission; student re-download is not supported. The Storage object is not public. Retrieval must pass through a backend operation that verifies the requester is an authorized administrator or payment verifier for the proof’s `orgId`; only then may the server stream the object or issue a short-lived signed URL. The Student Portal shows proof status and payment metadata without returning the raw receipt or its Storage path.

### 5.13 audit_logs

| Field | Type | Notes |
|---|---|---|
| userId | string | Firebase UID, "anonymous", or "unknown" |
| action | string | feature:verb naming |
| success | boolean | Outcome |
| error? | string | Sanitized failure |
| timestamp | number | Epoch milliseconds in current implementation |

### 5.14 stats

**Document ID:** AY-semester-orgId

This CORAL-owned aggregate contains organization and term totals for students, fees, fines, and collections. The Student Portal should derive student-specific values from owned records unless an explicitly student-scoped aggregate is introduced.

---

## 6. Firestore Access Patterns

### 6.1 Calling Firestore from a Feature

Frontend files do not call Firestore directly.

    Component
      → getFeatureAction(input)
      → withAuth verifies the student
      → getFeatureService(authenticated context, input)
      → getFeatureUseCase(authenticated UID, validated filters)
      → adminDb query

### 6.2 Document Read

    const snapshot = await adminDb
      .collection('users')
      .doc(authenticatedUserId)
      .get()

### 6.3 Student-Owned Query

    const snapshot = await adminDb
      .collection('fees')
      .where('userId', '==', authenticatedUserId)
      .where('isArchived', '==', false)
      .where('academicYear', '==', academicYear)
      .where('semester', '==', semester)
      .get()

Every owned query uses the verified UID. studentId is never substituted for userId.

Before returning results, the service resolves the organization IDs that are both:

- active and `subscribed === true`; and
- within the student’s current program, faculty, or university population scope.

Every organization-derived record must match that eligible set. This check applies even when a record is loaded directly by document ID. Centralize this resolution in one organization-capability service so events, attendance, fees, fines, clearance, payments, and dashboard summaries cannot interpret Premium eligibility differently.

### 6.4 Nested Subcollection

    const snapshot = await adminDb
      .collection('fines')
      .doc(fineId)
      .collection('fineItems')
      .get()

Before using a parent document ID supplied by a request, the service/use case must prove that the parent belongs to the authenticated student.

### 6.5 Write and Transaction

    await adminDb.runTransaction(async transaction => {
      // Re-read authoritative records.
      // Validate ownership, organization, term, status, and amount.
      // Apply all dependent writes atomically.
    })

Payment and clearance mutations must not rely on values calculated only in the browser.

### 6.6 Query Design Rules

- Filter student-owned data by userId before applying term filters.
- Exclude soft-deleted or archived data.
- Apply the active Premium-organization set in every organization-derived read and write.
- Avoid issuing one Firestore request per result document.
- Prefer bulk reads, bounded parallelism, or denormalized display fields for related records.
- Add composite indexes for production query shapes.
- Map all returned fields explicitly; do not spread raw Firestore data into frontend DTOs.

### 6.7 Required Query Shapes and Indexes

At minimum, the intended portal needs indexes supporting:

| Collection | Query shape |
|---|---|
| events | isDeleted + academicYear + semester + date |
| eventAttendees | userId + timeIn |
| fees | userId + isArchived + academicYear + semester |
| fines | userId + metadata.isArchived + academicYear + semester |
| clearanceStatus | userId + isArchived + academicYear + semester |
| proofOfPayments | userId + isArchived + submittedAt |

The repository currently has no confirmed deployed Firestore index manifest. Required indexes must be validated against actual queries before release.

---

## 7. Domain State Rules

### 7.1 Attendance

- timeIn and timeOut present → present.
- only part of the required attendance present → partially present.
- no attendance record plus a recognized event fine → absent in the unified student ledger.

### 7.2 Clearance

For required blocking items:

1. If no unresolved item remains, status is cleared.
2. If at least one unresolved item has `pendingReview` true, status is pending.
3. Otherwise, status is not_cleared.

Across organizations:

1. Any not_cleared organization makes the overall result not_cleared.
2. Otherwise, any pending organization makes the overall result pending.
3. Otherwise, the result is cleared.

This intentionally matches the existing USSC Connect Student Portal and administrative implementation. In a mixed case—one item pending and another still unpaid—the organization roll-up is pending, while both item-level states remain visible.

### 7.3 Payment Submission

A student payment submission is organization-scoped:

1. Verify the authenticated student.
2. Load selected obligations from Firestore.
3. Verify ownership, organization, term, outstanding state, and eligibility for every selected item.
4. Reject a selected item if it is settled or already has a pending proof.
5. Use each selected item’s current outstanding balance and recalculate the total on the server.
6. Create the proof record.
7. Mark only the selected obligations as pending review.
8. Recalculate the organization clearance state.
9. Write an audit event.

Students may select only a subset of payable obligations. This is a partial settlement of the organization’s overall balance, but each selected item contributes its full current outstanding balance. The student does not supply an arbitrary allocation, and the server-calculated total prevents overpayment.

One obligation may belong to only one pending proof at a time. The availability check, proof creation, payment-history creation, and pending-state updates must be atomic so simultaneous or retried submissions cannot create duplicate active proofs.

On rejection, the workflow must:

- mark the proof and corresponding payment-history records rejected;
- clear pending state only from the items carried by that proof;
- preserve their outstanding balances;
- store the rejection reason when supplied;
- make the still-outstanding items payable again; and
- recalculate clearance.

On verification, a selected fine item becomes paid and a selected fee balance is reduced by the verified amount. A fee with a remaining balance stays partial and may be selected again when no proof is pending.

Receipt uploads accept `image/jpeg`, `image/png`, `image/webp`, or `image/gif` and have a 5 MB maximum. File type and size are validated on the server. The server stores a private object path, not a permanent public download URL. Only an authorized administrator or verifier for the matching organization may retrieve the raw receipt through the protected backend flow defined in Section 5.12.

Steps that must succeed or fail together belong in a transaction or controlled idempotent workflow.

---

## 8. Caching, Audit, and Integration

### 8.1 Caching

- Only read use cases may be cached.
- Cache keys and tags containing student data are scoped by authenticated UID and, where relevant, term.
- Write workflows invalidate every affected base and term-specific tag.
- Until cross-application invalidation exists, financial, proof-status, waiver, and clearance reads must be uncached or revalidated against Firestore on each page refresh.
- Realtime listeners are not required; the next successful refresh must show completed administrative changes.
- A cache miss or invalidation failure must not bypass authorization.

### 8.2 Audit

Always audit:

- invalid or revoked sessions, eligibility failures, and other security-significant authentication events;
- payment submissions and profile mutations;
- system exceptions; and
- other student-initiated writes.

The routine absence of a session cookie is not persisted to `audit_logs`; it returns an authentication-required response without creating a Firestore write.

Successful high-volume reads need not create audit documents.

Audit failure must not expose internals to the student, but operational monitoring must make repeated audit failures visible to maintainers.

### 8.3 Cross-Application Integration

The separate CORAL-USSC administrative portal remains authoritative for:

- event and attendance administration;
- fee and fine creation;
- fine waivers;
- payment verification;
- cashiering; and
- administrative clearance updates.

The Student Portal is authoritative only for the student request that initiates a payment-proof submission or permitted profile update. Both applications must use compatible field names, status transitions, IDs, and archive semantics.

---

## 9. Current Student Portal Implementation Coverage

Implemented Firestore reads:

- authenticated user lookup;
- active and historical terms;
- event lists and event details;
- student attendance;
- attendance-related fine parents and fine items;
- student affiliation; and
- audit-log writes.

Not yet implemented as complete Action → Service → Use Case flows:

- student fee ledger;
- general fine ledger and waiver visibility;
- clearance retrieval;
- proof-of-payment submission;
- subscription/capability resolution; and
- student profile mutation.

Existing implementation gaps must be resolved against ARCHITECTURE.md before these modules are considered complete.

---

## 10. Open Architecture and Schema Decisions

| ID | Decision needed |
|---|---|
| AD-10 | Confirm the live Firestore schema and deployed composite indexes before implementing remaining writes. |

---

## 11. Architecture Commandments

1. Authenticate first and derive ownership from the verified Firebase UID.
2. Keep Firestore access in use cases and business policy in services.
3. Never trust browser-supplied ownership, balance, status, or clearance values.
4. Map Firestore documents explicitly into serializable DTOs.
5. Preserve documented archive fields; they differ by collection.
6. Use transactions or idempotent workflows for multi-document financial changes.
7. Avoid N+1 reads and document required composite indexes.
8. Treat CORAL and the Student Portal as one shared data contract.
9. Enforce the Premium organization gate on every organization-derived read, total, detail, and mutation.
10. Record unresolved schema choices explicitly rather than silently supporting two meanings.
11. Verify the live schema before migration or production write implementation.
