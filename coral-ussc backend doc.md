# coral-ussc — Complete Backend Documentation

> **Purpose:** Exhaustive technical reference for every backend system, data flow, and pattern in this codebase. Covers every exported function, data shape, and business rule discovered by reading the actual source files.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [Project Structure](#2-project-structure)
3. [Environment Variables](#3-environment-variables)
4. [Firebase SDK Configuration](#4-firebase-sdk-configuration)
5. [Authentication System](#5-authentication-system)
6. [Route Guard & Middleware](#6-route-guard--middleware)
7. [Access Level System](#7-access-level-system)
8. [CacheService](#8-cacheservice)
9. [Firestore Collections — Complete Schema](#9-firestore-collections--complete-schema)
10. [Firebase Module API Reference](#10-firebase-module-api-reference)
    - [users.ts](#101-usersts)
    - [members.ts](#102-membersts)
    - [organization.ts](#103-organizationts)
    - [term.ts](#104-termts)
    - [events.ts](#105-eventsts)
    - [attendance.ts](#106-attendancets)
    - [clearance.ts](#107-clearancets)
    - [fees.ts](#108-feests)
    - [fines/](#109-fines)
    - [payment/](#1010-payment)
    - [stats/](#1011-stats)
    - [dashboard.ts](#1012-dashboardts)
    - [bulkImport.ts](#1013-bulkimportts)
    - [programs.ts / faculties.ts](#1014-programsts--facultiests)
11. [API Route Handlers](#11-api-route-handlers)
12. [Zod Validation Schemas](#12-zod-validation-schemas)
13. [TypeScript Types & Constants](#13-typescript-types--constants)
14. [Core Data-Flow Patterns](#14-core-data-flow-patterns)
15. [Business Logic — Critical Flows](#15-business-logic--critical-flows)
16. [Firestore Index Requirements](#16-firestore-index-requirements)

---

## 1. Tech Stack

| Concern | Technology | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | TypeScript, SSR + CSR mix |
| Database | Cloud Firestore (Firebase) | Client SDK + Admin SDK |
| Auth | Firebase Authentication | Email/password |
| Edge Auth Guard | Firebase Admin SDK | Session cookie verification |
| App Security | Firebase App Check | reCAPTCHA v3 in prod |
| File Storage | Firebase Storage | Proof-of-payment images |
| Email | Nodemailer | Registration status emails |
| Validation | Zod v4 + React Hook Form | Client + server forms |
| State | Zustand | Client-side store |
| Caching | Custom CacheService | In-memory + localStorage |
| Analytics | Firebase Analytics | Client-only |

---

## 2. Project Structure

```
src/
├── app/
│   ├── (admin)/               # Protected: super-admin pages
│   ├── (organization)/        # Protected: org-admin pages
│   ├── (public)/              # Public: /login, /
│   ├── api/
│   │   ├── auth/session/      # POST: create session cookie
│   │   ├── auth/signout/      # POST: revoke session cookie
│   │   └── public/send-registration-status/  # POST: email
│   ├── maintenance/
│   └── coming-soon/
├── firebase/
│   ├── firebase.config.ts     # Client SDK init
│   ├── firebase-admin.config.ts # Admin SDK init
│   ├── index.ts               # Re-exports all modules
│   ├── users.ts               # users collection CRUD
│   ├── members.ts             # Paginated member queries
│   ├── organization.ts        # organizations CRUD
│   ├── programs.ts            # programs read
│   ├── faculties.ts           # faculties read
│   ├── term.ts                # terms CRUD + active term
│   ├── events.ts              # events CRUD
│   ├── attendance.ts          # eventAttendees CRUD
│   ├── clearance.ts           # clearanceStatus CRUD
│   ├── fees.ts                # feeItems + fees + payments (1559 lines)
│   ├── dashboard.ts           # dashboard aggregation
│   ├── bulkImport.ts          # CSV import
│   ├── programBatch.ts        # program-level batch ops
│   ├── fees/update/recalculate.ts
│   ├── fines/
│   │   ├── create/fines.ts    # createFinePerStudent, createBulkFines, generateFinesOnEvent
│   │   ├── create/fineType.ts
│   │   ├── read/fines.ts
│   │   ├── read/fineType.ts
│   │   ├── update/fines.ts    # timestamp updates
│   │   ├── update/recalculate.ts  # recalculateFines
│   │   ├── update/fineItemsStatus.ts
│   │   └── update/updateFineItemCount.ts
│   ├── payment/
│   │   ├── create/proofOfPayment.ts
│   │   ├── create/paymentHistory.ts
│   │   ├── read/proofOfPayment.ts
│   │   ├── read/paymentHistory.ts
│   │   └── update/proofOfPayment.ts
│   └── stats/
│       ├── create/addStats.ts
│       ├── read/getStats.ts
│       └── update/updateStats.ts
├── services/
│   └── cacheService.ts        # Singleton in-memory + localStorage cache
├── middleware.ts              # Edge route guard
├── context/AuthContext.tsx    # Firebase Auth provider
├── hooks/useAuth.ts           # Auth state hook
├── lib/validators.ts          # Zod schemas
└── constants/
    ├── types.ts               # Shared TypeScript types
    └── status.ts              # Enum-style status constants
```

---

## 3. Environment Variables

### Client-Side (`NEXT_PUBLIC_*` — safe to ship to browser)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=         # reCAPTCHA v3 site key for App Check
NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=       # Dev only — injected via self.FIREBASE_APPCHECK_DEBUG_TOKEN
NEXT_PUBLIC_NODE_ENV=                   # "development" | "production"
```

### Server-Side Only (never expose, API routes only)

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=                  # Service account email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

> **Private Key Gotcha:** When stored in `.env`, newlines are encoded as `\n` literals. The Admin SDK init must call `.replace(/\\n/g, "\n")` to restore real newlines.

### Feature Flags

```bash
MAINTENANCE_MODE=false    # Set to "true" to redirect all routes to /maintenance
```

---

## 4. Firebase SDK Configuration

### 4.1 Client SDK — `src/firebase/firebase.config.ts`

Initializes the browser-side Firebase app. Exports three objects used across all client-side modules.

```ts
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);     // Used for all client-side Firestore reads/writes
export const auth = getAuth(app);         // Used for Auth state + sign-in/out
export const analytics = getAnalytics(app); // Used only in browser, guarded by typeof window
```

**App Check Setup:**
```ts
if (typeof window !== "undefined") {
  if (process.env.NEXT_PUBLIC_NODE_ENV === "development") {
    // @ts-ignore
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = process.env.NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
    isTokenAutoRefreshEnabled: true,
  });
}
```

### 4.2 Admin SDK — `src/firebase/firebase-admin.config.ts`

Used exclusively in Next.js API Route Handlers (`/api/*`). Never imported by client-side code.

```ts
import { initializeApp, getApps, cert } from "firebase-admin/app";

// Re-initialization guard — critical for Next.js hot reload
let app;
if (getApps().length === 0) {
  app = initializeApp({
    credential: cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
} else {
  app = getApps()[0];
}

export const adminAuth    = getAuth(app);
export const adminDb      = getFirestore(app);
export const adminStorage = getStorage(app);
```

---

## 5. Authentication System

### 5.1 Login Flow (step-by-step)

```
User submits email/password
  → Firebase Auth (client): signInWithEmailAndPassword()
  → On success: auth.currentUser.getIdToken()  → raw JWT idToken
  → POST /api/auth/session  { idToken }
    → Admin SDK: adminAuth.verifyIdToken(idToken)
    → Admin SDK: adminAuth.createSessionCookie(idToken, { expiresIn: 14 days })
    → Response: Set-Cookie: session=<cookie>; HttpOnly; Secure; SameSite=Strict
  → Set-Cookie: userRole=<role>  (non-httpOnly, read by middleware)
  → Redirect to dashboard
```

### 5.2 Sign-out Flow

```
User clicks sign out
  → POST /api/auth/signout
    → Admin SDK: adminAuth.revokeRefreshTokens(uid)
    → Response: Clear-Cookie: session; Clear-Cookie: userRole
  → Firebase Auth (client): signOut(auth)
  → cacheService.clearAllOnLogout()  ← clears all cache except "theme"
  → Redirect to /login
```

### 5.3 Session Cookie Verification (Middleware)

Every protected request goes through `middleware.ts` which reads the raw session cookie and verifies it using the Admin SDK. See §6 for the full middleware flow.

### 5.4 `useAuth` Hook — `src/hooks/useAuth.ts`

The primary client-side auth hook. Merges Firebase Auth state with Firestore user profile.

```ts
// What it does:
onAuthStateChanged(auth, async (firebaseUser) => {
  if (firebaseUser) {
    // Fetch full user profile from Firestore
    const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));
    const userData = { ...firebaseUser, ...docSnap.data() } as UserData;
    setUser(userData);
  } else {
    setUser(null);
  }
});

// Exposes:
{
  user: UserData | null,        // Full merged profile
  loading: boolean,
  error: Error | null,
  isAuthenticated: boolean,
  signOut: () => Promise<void>  // Calls POST /api/auth/signout + client signOut
}
```

`UserData` shape:
```ts
{
  uid: string;
  name: string;
  email: string;
  avatar: string;
  firstName: string;
  lastName: string;
  role: "user" | "admin" | "super-admin";
  facultyId: string;
  accessLevel: 1 | 2 | 3;
  orgId: string;
}
```

### 5.5 `AuthContext` — `src/context/AuthContext.tsx`

A simpler provider that tracks only the raw Firebase `User | null`. Used by components that only need to know if someone is signed in (not their full profile).

```tsx
<AuthProvider>
  {children}
</AuthProvider>

// Consumer:
const { user } = useAuth(); // returns raw Firebase User | null
```

---

## 6. Route Guard & Middleware

**File:** `src/middleware.ts`  
**Runtime:** Edge (Vercel/Next.js edge runtime)

### Route Categories

```ts
const publicRoutes  = ["/login", "/"];
const orgRoutes     = ["/org-dashboard", "/org-events", "/org-members", 
                       "/org-fines", "/org-fees", "/org-payments"];
const adminRoutes   = ["/admin-dashboard", "/admin-students", "/admin-organization"];
```

### Decision Tree (executed on every request)

```
Request arrives
  ├── Is path excluded? (api/*, _next/*, favicon.ico) → pass through
  ├── Read cookies: session, userRole
  ├── If MAINTENANCE_MODE=true → redirect /maintenance (except /maintenance itself)
  ├── If session cookie valid AND on publicRoute → redirect to dashboard by role
  │     super-admin → /admin-dashboard
  │     default     → /org-dashboard
  ├── If on protected route AND no session → redirect /login
  ├── If on adminRoute AND userRole !== "super-admin" → redirect /org-dashboard
  └── Pass through
```

### Matcher Config

```ts
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## 7. Access Level System

Every Firestore query that involves user-scoped data is filtered by `accessLevel`. This is the most pervasive pattern in the entire codebase.

| `accessLevel` | Scope | What Firestore filter is added |
|---|---|---|
| `1` | Program | `where("programId", "==", org.programId)` |
| `2` | Faculty | `where("facultyId", "==", org.facultyId)` |
| `3` | Organization | No additional filter (sees everything in org) |
| `super-admin` role | System | Unrestricted across all orgs |

**Standard Resolution Pattern (used in every module):**
```ts
const currentUser = await getCurrentUserData() as Member;
const org = await getOrgById(currentUser.orgId!);

// Apply access-level scoping
if (currentUser.accessLevel === 1 && org?.programId) {
  baseQuery = query(baseQuery, where("programId", "==", org.programId));
} else if (currentUser.accessLevel === 2 && org?.facultyId) {
  baseQuery = query(baseQuery, where("facultyId", "==", org.facultyId));
}
// accessLevel 3 → no filter added
```

**`buildBaseConstraints` helper** (defined in `members.ts`, reused across modules):
```ts
const buildBaseConstraints = (
  currentUser: Member,
  org: Organization,
  programId?: string
): QueryConstraint[] => {
  const constraints: QueryConstraint[] = [
    where("isDeleted", "==", false),
    where("role", "==", "user"),
    where("orgId", "==", currentUser.orgId),
  ];
  if (programId && programId !== "all") {
    constraints.push(where("programId", "==", programId));
  } else if (currentUser.accessLevel === 1 && org?.programId) {
    constraints.push(where("programId", "==", org.programId));
  } else if (currentUser.accessLevel === 2 && org?.facultyId) {
    constraints.push(where("facultyId", "==", org.facultyId));
  }
  return constraints;
};
```

---

## 8. CacheService

**File:** `src/services/cacheService.ts`  
**Pattern:** Browser-only singleton; SSR-safe with `typeof window === "undefined"` guard.

### Architecture

```ts
class CacheService {
  private static instance: CacheService;
  private cache: Map<string, CacheEntry<any>> = new Map();
  
  static getInstance(): CacheService { ... }
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  lastAccessedAt: number;
}
```

### localStorage Persistence

- On every `set()`, non-expired entries are serialized to `localStorage["app_cache"]`
- Sorted LRU (oldest last accessed first)
- Max total size: 4.5MB; max per entry: 1MB
- Emergency purge: clears oldest 50% on `QuotaExceededError`
- Timestamp hydration: on load, `{ seconds, nanoseconds }` objects are reconstructed as Firestore `Timestamp` instances

### Primary API

| Method | Signature | Description |
|---|---|---|
| `getOrFetch` | `getOrFetch<T>(key, fetchFn, ttl)` | **Main method.** Returns cached data or calls fetchFn and caches the result |
| `set` | `set(key, data, ttl)` | Manually store with TTL in ms |
| `get` | `get<T>(key): CacheEntry<T> \| null` | Returns entry or null if expired/missing |
| `invalidate` | `invalidate(key)` | Remove single key |
| `invalidateByPrefix` | `invalidateByPrefix(prefix)` | Remove all keys starting with prefix |
| `clear` | `clear()` | Wipe entire cache |
| `clearAllOnLogout` | `clearAllOnLogout()` | Clear all except `"theme"` key |
| `updateInList` | `updateInList<T>(key, id, updater)` | Mutate a single item in a cached array without re-fetching |

### TTL Constants (`CACHE_DURATIONS`)

```ts
const CACHE_DURATIONS = {
  TERMS: 5 * 60 * 1000,           // 5 min
  EVENTS: 15 * 60 * 1000,         // 15 min
  FEES: 20 * 60 * 1000,           // 20 min
  FINES: 20 * 60 * 1000,          // 20 min
  PAYMENTS: 10 * 60 * 1000,       // 10 min
  PAYMENT_HISTORY: 10 * 60 * 1000,// 10 min
  CLEARANCE: 10 * 60 * 1000,      // 10 min
  USERS: 60 * 60 * 1000,          // 1 hour
  PROGRAMS: 24 * 60 * 60 * 1000,  // 24 hours
  DASHBOARD: 5 * 60 * 1000,       // 5 min
  COUNTS: 5 * 60 * 1000,          // 5 min
};
```

### Cache Key Helpers (`CACHE_KEYS`)

```ts
CACHE_KEYS.activeTerm()
CACHE_KEYS.feesForOrg(orgId)
CACHE_KEYS.feeDoc(feeId)
CACHE_KEYS.feeLogs(feeId)
CACHE_KEYS.feesCount(orgId, feeItemId, status, search)
CACHE_KEYS.feeSubmissionCount(orgId, feeId, status, search)
CACHE_KEYS.feeStatusForClearance(userId, orgId)
CACHE_KEYS.totalPaidAmountCount(feeItemId)
CACHE_KEYS.totalUnpaidAmountCount(feeItemId)
CACHE_KEYS.totalPendingAmountCount(feeItemId)
CACHE_KEYS.totalRejectedAmountCount(feeItemId)
CACHE_KEYS.clearanceAll(orgId)
CACHE_KEYS.clearanceDoc(id)
CACHE_KEYS.proofOfPayment(id)
CACHE_KEYS.proofOfPayments(orgId)
CACHE_KEYS.proofOfPaymentByUser(userId, orgId)
```

### Usage Pattern

```ts
// Pattern used in every module:
const data = await cacheService.getOrFetch<FeeItem[]>(
  `fees:org:${orgId}:${term.AY}-${term.semester}`,
  async () => {
    // Actual Firestore read — only runs on cache miss
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  },
  CACHE_DURATIONS.FEES
);
```

---

## 9. Firestore Collections — Complete Schema

### `users`
**Document ID:** Firebase Auth UID  
**Purpose:** All member accounts

| Field | Type | Notes |
|---|---|---|
| `studentId` | `string` | Format: `XX-X-XXXXX` (regex enforced by Zod) |
| `email` | `string` | Unique |
| `firstName` | `string` | Title-cased on write |
| `lastName` | `string` | |
| `programId` | `string` | FK → `programs` |
| `facultyId` | `string` | FK → `faculties` |
| `orgId` | `string` | FK → `organizations` |
| `role` | `"user" \| "admin" \| "super-admin"` | |
| `accessLevel` | `1 \| 2 \| 3` | |
| `status` | `"pending" \| "approved"` | `pending` = awaiting admin approval |
| `yearLevel` | `number` | 0–6 |
| `isDeleted` | `boolean` | Soft-delete flag — never physically deleted from UI |
| `corURL` | `string?` | Certificate of Registration URL |
| `createdAt` | `Timestamp` | |
| `updatedAt` | `Timestamp` | |
| `registrationAt` | `Timestamp?` | Self-registration submission time |

**Soft Delete Cascade:** When `isDeleted = true`:
- All `fees` with `status=unpaid` → `isArchived=true`
- All `fines` with `status=unpaid` → `metadata.isArchived=true`
- `clearanceStatus` → `isArchived=true`

---

### `organizations`
**Document ID:** Auto-generated  
**Purpose:** Student orgs (each user belongs to one)

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | Unique org name |
| `shortName` | `string` | Abbreviation |
| `facultyId` | `string?` | For level-2 orgs |
| `programId` | `string?` | For level-1 orgs |
| `accessLevel` | `1 \| 2 \| 3` | Mirrors member access level |
| `subscribed` | `boolean` | Feature flag for premium features |
| `isArchived` | `boolean` | |
| `users` | `string[]?` | Array of admin user UIDs |
| `orgLogoUrl` | `string?` | Firebase Storage URL |
| `metadata.createdAt` | `Timestamp` | |
| `metadata.updatedAt` | `Timestamp` | |

---

### `programs`
**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | e.g., "Bachelor of Science in Computer Science" |
| `acronym` | `string?` | e.g., "BSCS" |
| `facultyId` | `string` | FK → `faculties` |

---

### `faculties`
**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | e.g., "College of Computer Studies" |
| `acronym` | `string` | e.g., "CCS" |

---

### `terms`
**Document ID:** Auto-generated  
**Business Rule:** Exactly one document has `isActive = true` at any time. Creating a new active term deactivates the previous one via Firestore transaction.

| Field | Type | Notes |
|---|---|---|
| `AY` | `string` | Academic year e.g., `"2025-2026"` (regex: `XXXX-XXXX`) |
| `semester` | `"1st" \| "2nd"` | |
| `isActive` | `boolean` | Only one true at a time |
| `isDeleted` | `boolean` | |
| `metadata.createdAt` | `Timestamp` | |
| `metadata.updatedAt` | `Timestamp` | |

---

### `events`
**Document ID:** Auto-generated

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | |
| `date` | `Timestamp` | Must be ≥ today on create |
| `location` | `string` | |
| `note` | `string?` | |
| `majorEvent` | `boolean` | Flag for attendance significance |
| `fineTypeId` | `string` | FK → `fineTypes` (fine to issue for non-attendance) |
| `orgId` | `string` | FK → `organizations` |
| `programId` | `string?` | Set for level-1 events |
| `facultyId` | `string?` | Set for level-2 events |
| `accessLevelEvent` | `1 \| 2 \| 3` | Mirrors the creator's accessLevel |
| `status` | `"upcoming" \| "ongoing" \| "completed" \| "archived"` | Auto-determined by date |
| `attendees` | `number` | Running counter — incremented via `increment(1)` on each time-in |
| `academicYear` | `string` | Copied from active term at creation |
| `semester` | `string` | Copied from active term at creation |
| `isDeleted` | `boolean` | |
| `finesGenerated` | `boolean` | Set to `true` after `generateFinesOnEvent` runs — prevents re-generation |
| `manuallyCompleted` | `boolean` | Prevents auto status-change back to upcoming/ongoing |
| `timeInStart` | `string?` | `"HH:MM"` — window start for time-in |
| `timeInEnd` | `string?` | |
| `timeOutStart` | `string?` | |
| `timeOutEnd` | `string?` | |
| `createdAt` | `Timestamp` | |

**Status auto-determination logic (`determineEventStatus`):**
- Date < today → `"completed"`
- Date = today → `"ongoing"`
- Date > today → `"upcoming"`
- Never changes `"archived"` or `"manuallyCompleted"` events

---

### `eventAttendees`
**Document ID:** Auto-generated  
**Purpose:** One record per student per event

| Field | Type | Notes |
|---|---|---|
| `eventId` | `string` | FK → `events` |
| `userId` | `string` | FK → `users` |
| `studentId` | `string` | Denormalized studentId |
| `student` | `object?` | Snapshot of user data at time of logging |
| `timeIn` | `Timestamp?` | |
| `timeOut` | `Timestamp?` | |
| `status` | `"partially present" \| "present"` | Both timeIn+timeOut = `"present"` |
| `remark` | `string?` | e.g., `"registered in different program"` |
| `orgId` | `string` | |

---

### `feeItems`
**Document ID:** Auto-generated  
**Purpose:** Fee "templates" — one per fee type per term

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Same as doc ID |
| `title` | `string` | Fee name |
| `amount` | `number` | Amount in currency |
| `feeType` | `string` | Fee category |
| `description` | `string?` | |
| `dueDate` | `Timestamp?` | |
| `isRequiredForClearance` | `boolean` | If true, unpaid blocks clearance |
| `orgId` | `string` | |
| `academicYear` | `string` | |
| `semester` | `string` | |
| `totalStudents` | `number` | Count of assigned students — incremented via `increment(1)` on assignment |
| `isArchived` | `boolean` | |
| `createdAt` | `Timestamp` | |
| `updatedAt` | `Timestamp` | |

---

### `fees`
**Document ID:** Auto-generated  
**Purpose:** Per-student fee instance (one per student per feeItem)

| Field | Type | Notes |
|---|---|---|
| `orgId` | `string` | |
| `userId` | `string` | FK → `users` |
| `userName` | `string` | Denormalized `firstName + lastName` |
| `studentId` | `string` | Denormalized |
| `feeItemId` | `string` | FK → `feeItems` |
| `feeType` | `string` | Copied from feeItem |
| `title` | `string` | Copied from feeItem |
| `amount` | `number` | Original amount |
| `paidAmount` | `number` | Running paid total |
| `balance` | `number` | `amount - paidAmount` |
| `status` | `"unpaid" \| "partial" \| "paid" \| "pending"` | |
| `dueDate` | `Timestamp?` | |
| `isRequiredForClearance` | `boolean` | |
| `eventId` | `string?` | If fee is tied to an event |
| `description` | `string?` | |
| `createdBy` | `string` | Admin UID who created it |
| `academicYear` | `string` | |
| `semester` | `string` | |
| `isArchived` | `boolean` | |
| `createdAt` | `Timestamp` | |
| `updatedAt` | `Timestamp` | |

**Subcollection:** `fees/{feeId}/paymentHistory`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `paymentNumber` | `number` | `Date.now()` — used as sort key |
| `amount` | `number` | |
| `paymentMethod` | `"gcash" \| "cash" \| "bank_transfer" \| "waiver"` | |
| `paymentProofId` | `string` | FK → `proofOfPayments` |
| `status` | `"verified" \| "rejected" \| "pending"` | |
| `paidAt` | `Timestamp` | |
| `verifiedBy` | `string?` | Admin UID |
| `verifiedByName` | `string?` | |
| `verifiedAt` | `Timestamp?` | |
| `rejectionReason` | `string?` | |
| `notes` | `string?` | |
| `createdAt` | `Timestamp` | |

---

### `fines`
**Document ID:** Auto-generated  
**Purpose:** Parent fine record per student per term (envelope for fineItems)

| Field | Type | Notes |
|---|---|---|
| `orgId` | `string` | |
| `userId` | `string` | FK → `users` |
| `userName` | `string` | Denormalized |
| `studentId` | `string` | Denormalized |
| `academicYear` | `string` | |
| `semester` | `string` | |
| `accumulatedAmount` | `number` | Sum of all fineItems |
| `paidAmount` | `number` | Running paid total |
| `balance` | `number` | `accumulatedAmount - paidAmount - waivedAmount` |
| `status` | `"unpaid" \| "partial" \| "paid" \| "pending" \| "waived"` | |
| `fineItemsCount` | `number` | Incremented via `increment(1)` |
| `firstFineIssuedAt` | `Timestamp?` | Set on first fineItem |
| `lastFineIssuedAt` | `Timestamp?` | Updated on each new fineItem |
| `dueDate` | `Timestamp?` | |
| `waivedAmount` | `number?` | |
| `waivedBy` | `string?` | Admin name |
| `waivedReason` | `string?` | |
| `waivedAt` | `Timestamp?` | |
| `remarks` | `string?` | |
| `metadata.createdAt` | `Timestamp` | |
| `metadata.updatedAt` | `Timestamp` | |
| `metadata.isArchived` | `boolean` | |

**Subcollection:** `fines/{fineId}/fineItems`

| Field | Type | Notes |
|---|---|---|
| `itemNumber` | `number` | Sequential: count+1 of existing fineItems |
| `fineTypeId` | `string` | FK → `fineTypes` |
| `fineTypeName` | `string` | Denormalized |
| `eventId` | `string` | FK → `events` |
| `eventName` | `string` | Denormalized |
| `eventDate` | `Timestamp` | |
| `amount` | `number` | |
| `reason` | `string` | e.g., "Fine for being absent in event X" |
| `issuedBy` | `string` | Admin name |
| `issuedAt` | `Timestamp` | |
| `isWaived` | `boolean` | |
| `waivedBy/Reason/At` | various | Waiver fields |
| `appealNotes/Status/etc.` | various | Appeal fields |
| `isPaid` | `boolean` | |
| `isArchived` | `boolean` | |
| `isPending` | `boolean` | |
| `parentFineId` | `string` | FK → parent `fines` doc |
| `userId` | `string` | Denormalized |
| `studentId` | `string` | Denormalized |
| `academicYear` | `string` | |
| `semester` | `string` | |
| `metadata.createdAt/updatedAt/isArchived` | various | |

**Subcollection:** `fines/{fineId}/paymentHistory` — same schema as fees/paymentHistory

---

### `fineTypes`
**Document ID:** Auto-generated  
**Purpose:** Fine templates (e.g., "Absent from Major Event")

| Field | Type | Notes |
|---|---|---|
| `name` | `string` | |
| `description` | `string` | |
| `defaultAmount` | `number` | 1–10000 (Zod validated) |
| `requiresTimeIn` | `boolean` | |
| `requiresTimeOut` | `boolean?` | If true, partial-absent gets a separate fine |
| `majorEventsOnly` | `boolean` | |
| `orgId` | `string` | |

---

### `clearanceStatus`
**Document ID:** Deterministic compound key (see below)  
**Purpose:** One clearance record per student per org per term

**Document ID formula:**
```ts
const buildClearanceId = (userId, orgId, accessLevel, term) => {
  const termSuffix = `:${term.AY}-${term.semester}`.replace(/\s/g, '_');
  if (orgId) return `${userId}${orgId}${termSuffix}`;
  return `${userId}${termSuffix}`;
};
// Example: "abc123xyz789:2025-2026-1st"
```

This enables `setDoc(..., { merge: true })` (upsert) — no query needed to find the document.

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Same as document ID |
| `userId` | `string` | FK → `users` |
| `orgId` | `string` | FK → `organizations` |
| `studentId` | `string` | Denormalized |
| `userName` | `string` | Denormalized |
| `academicYear` | `string` | |
| `semester` | `string` | |
| `status` | `"cleared" \| "not_cleared" \| "pending"` | |
| `isArchived` | `boolean` | |
| `visibility` | `"public" \| "private"` | |
| `blockingItems` | `Record<string, BlockingItem>` | Map of feeId/fineItemId → item info |
| `clearanceDate` | `Timestamp?` | Set when status = "cleared" |
| `lastCalculatedAt` | `Timestamp?` | |
| `startDate` | `Timestamp` | |
| `dueDate` | `Timestamp` | |
| `createdAt` | `Timestamp` | |
| `updatedAt` | `Timestamp` | |

**`blockingItems` entry shape:**
```ts
{
  [feeId or fineItemId]: {
    type: "fees" | "fines",
    referenceId: string,
    parentFineId?: string,       // Only for fines
    title: string,               // Fee/fine name
    balance: number,             // Remaining unpaid balance
    status: "unpaid" | "paid",
    paymentHistory: [],          // For fees only
    pendingReview: boolean,      // true when a proof of payment is pending
    isRequiredForClearance: boolean,
    academicYear: string,
    semester: string,
  }
}
```

**`recalculateClearanceStatus` logic:**
```ts
// 3-state machine:
let status = "cleared";
const items = Object.values(clearance.blockingItems || {});

const hasUnpaidRequired = items.some(i => 
  (i.status === "unpaid" || i.balance > 0) && i.isRequiredForClearance
);

if (hasUnpaidRequired) {
  const hasPending = items.some(i =>
    (i.status === "unpaid" || i.balance > 0) && i.isRequiredForClearance && i.pendingReview
  );
  status = hasPending ? "pending" : "not_cleared";
}

await updateDoc(clearanceRef, {
  status,
  updatedAt: serverTimestamp(),
  clearanceDate: status === "cleared" ? serverTimestamp() : null,
});
```

---

### `proofOfPayments`
**Document ID:** Auto-generated  
**Purpose:** User-uploaded payment proofs (student self-pay) + admin-recorded manual payments

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Same as doc ID |
| `orgId` | `string` | |
| `userId` | `string` | FK → `users` |
| `studentId` | `string` | Denormalized |
| `userName` | `string` | Denormalized |
| `paymentType` | `"fees" \| "fines" \| "bulk"` | |
| `referenceId` | `string` | Fee/fine ID or `"bulk_transaction"` |
| `paymentHistoryId` | `string \| string[]` | FK → paymentHistory subcollection |
| `amount` | `number` | |
| `paymentMethod` | `"gcash" \| "cash" \| "bank_transfer" \| "waiver"` | |
| `referenceNumber` | `string?` | GCash ref / bank ref |
| `senderNumber` | `string?` | GCash sender |
| `imageUrl` | `string?` | Firebase Storage URL |
| `status` | `"pending" \| "verified" \| "rejected"` | |
| `submittedAt` | `Timestamp` | |
| `verifiedBy` | `string?` | Admin UID |
| `verifiedByName` | `string?` | |
| `verifiedAt` | `Timestamp?` | |
| `rejectionReason` | `string?` | |
| `notes` | `string?` | |
| `metadata.items` | `array` | Detail breakdown for bulk payments |
| `itemKeys` | `string[]` | Array of feeItemIds — used for `array-contains` queries |
| `receiptCode` | `string?` | Manual receipt number |
| `isArchived` | `boolean` | |
| `academicYear` | `string` | |
| `semester` | `string` | |
| `updatedAt` | `Timestamp` | |

---

### `stats`
**Document ID:** `{AY}-{semester}-{orgId}`  
**Purpose:** Running financial totals per org per term

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Same as doc ID |
| `orgId` | `string` | |
| `totalStudents` | `number` | |
| `totalFees` | `number` | Sum of all fee amounts issued |
| `totalCollectedFees` | `number` | Sum of all verified fee payments |
| `totalUnpaidFees` | `number` | `totalFees - totalCollectedFees` |
| `totalFines` | `number` | Sum of all fine amounts issued |
| `totalCollectedFines` | `number` | Sum of verified fine payments |
| `totalUnpaidFines` | `number` | |

---

## 10. Firebase Module API Reference

### 10.1 `users.ts`

Core CRUD for the `users` collection.

| Function | Description |
|---|---|
| `getCurrentUserData()` | Get the current auth user's Firestore document. Uses `auth.currentUser.uid`. |
| `getUserById(uid)` | Get any user by UID |
| `getAllUsers()` | **EXPENSIVE — 9000+ reads.** Use only for bulk operations. Returns all non-deleted `role=user` records |
| `searchUserByStudentId(studentId)` | Exact match by studentId field |
| `addUser(userData)` | Create a new user document with `auth.currentUser.uid` as doc ID |
| `updateUser(uid, data)` | Partial update with `updatedAt: Timestamp.now()` |
| `deleteUser(uid)` | Soft delete: `isDeleted=true` + cascade to fees/fines/clearance |
| `approveUser(uid)` | Set `status="approved"` |
| `getCurrentUserCount()` | `getCountFromServer` — no document reads |

---

### 10.2 `members.ts`

Paginated member queries. This is the UI-facing read path for member lists.

| Function | Signature | Description |
|---|---|---|
| `getPaginatedUsers(options)` | `{ pageSize, lastDoc, searchQuery, programId, sortBy, needCount }` | Primary paginated read. Cursor-based, server-side prefix search |
| `getMembersOfAnOrg(currentUser, pageSize, lastDoc, needCount)` | — | Scoped paginated read for org-level fee generation |
| `getAllMembersOfAnOrg(currentUser)` | — | **No pagination.** Only for bulk fee generation |
| `getAllStudents()` | — | **EXPENSIVE.** All students, no pagination. Use only for exports |
| `getPendingUsers(currentUser)` | — | Real-time listener for pending members. Returns `unsubscribe` fn |

**Sort parameter resolution (`resolveSortParams`):**
```ts
const sortMap = {
  "name-asc":  { sortField: "firstName",  sortDirection: "asc" },
  "name-desc": { sortField: "firstName",  sortDirection: "desc" },
  "id-asc":    { sortField: "studentId",  sortDirection: "asc" },
  "id-desc":   { sortField: "studentId",  sortDirection: "desc" },
  "date-asc":  { sortField: "createdAt",  sortDirection: "asc" },
  "date-desc": { sortField: "createdAt",  sortDirection: "desc" },
};
```

---

### 10.3 `organization.ts`

| Function | Description |
|---|---|
| `getOrgById(orgId)` | Fetch org by ID — called heavily (in every access-level check) |
| `getAllOrgs()` | All non-archived orgs (super-admin use) |
| `createOrg(orgData)` | Create new org |
| `updateOrg(orgId, data)` | Update org fields |
| `archiveOrg(orgId)` | Set `isArchived=true` |

---

### 10.4 `term.ts`

| Function | Description |
|---|---|
| `getActiveTerm()` | Fetch term where `isActive=true`. **Cached 5 min.** Called by almost every other function |
| `getAllTerms()` | All non-deleted terms |
| `createTerm(termData)` | Create term + deactivate previous active term in a transaction |
| `updateTerm(termId, data)` | Update term fields |
| `setActiveTerm(termId)` | Set one term active, deactivate all others (transaction) |
| `deleteTerm(termId)` | Soft delete |

**Active term is the axis of all data partitioning.** Almost every query appends:
```ts
where("academicYear", "==", term.AY),
where("semester", "==", term.semester)
```

---

### 10.5 `events.ts`

| Function | Signature | Description |
|---|---|---|
| `getPaginatedEvents(status, sortField, sortDirection, pageSize, startAfterDoc, searchQuery, skip, filterDate, selectedTerm)` | — | Full-featured paginated events. Uses offset-based paging on client after fetching all matching docs (because events are typically small: <1000) |
| `getEvents(status?, selectedTerm?)` | — | Get all events (non-paginated) for a term |
| `getEventById(eventId)` | — | Fetch single event |
| `addEvent(eventData)` | — | Create event. Validates: date not past, time ranges logical. Sets `finesGenerated=false`, `attendees=0`, `status=auto` |
| `updateEvent(eventId, eventData)` | — | Update event. Re-validates time ranges. Preserves `"archived"` status |
| `deleteEvent(eventId)` | — | Soft delete |
| `archiveEvent(eventId)` | — | Set `status="archived"` |
| `incrementEventAttendees(eventId)` | — | Atomic `increment(1)` |
| `disableFineGeneration(eventId)` | — | Set `finesGenerated=true` — call after running `generateFinesOnEvent` |
| `updateEventStatuses(events)` | — | Batch update statuses for events whose date has passed. Runs automatically inside `getPaginatedEvents` |
| `getEventsNeedingStatusUpdate(events)` | — | Filter events whose computed status differs from stored status |

**Auto status detection:**
- Events paginated query checks if any returned events need a status update and auto-corrects them in a batch if so.

---

### 10.6 `attendance.ts`

| Function | Description |
|---|---|
| `logAttendance(eventId, studentId, type)` | `type = "time-in" \| "time-out"`. Creates new attendance record or updates existing. Adds `remark` if student is from different program/faculty. Calls `incrementEventAttendees` on new record |
| `getRecentAttendance(eventId, type)` | Last 9 attendance records for an event, sorted by timeIn/timeOut desc. **Cached 30 min** |
| `checkLogAttendanceExist(eventId, studentId, type)` | Check if student already has timeIn or timeOut logged. **Cached 5 min** |
| `getPaginatedAttendees(eventId, pageSize, lastDoc)` | Paginated attendee list with cursor |
| `getNonAttendeesForEvent(eventId)` | Returns all org members who have no attendance record for an event. Used by `generateFinesOnEvent` |
| `getPartialAttendeesForEvent(eventId)` | Returns members with timeIn but no timeOut. Used when `fineType.requiresTimeOut=true` |
| `searchStudentIdsByName(name)` | Client-side full-name search (expensive — fetches all users). **Cached 2 hours** |

---

### 10.7 `clearance.ts`

| Function | Description |
|---|---|
| `buildClearanceId(userId, orgId, accessLevel, term)` | Deterministic ID builder. All clearance functions call this |
| `fetchClearanceDocumentsPaginated(orgId, pageSize, lastVisibleDoc, searchTerm, statusFilter, needCount, forManualPayment, selectedTerm)` | Main paginated clearance list. Cursor-based. Supports search by name (prefix) or studentId (prefix). **Caches each doc individually** |
| `getClearanceCount(orgId, statusFilter, searchTerm, selectedTerm)` | Count via `getCountFromServer`. **Cached 5 min** |
| `fetchClearanceStatus(userId, term?)` | Single student's clearance document. **Cached 10 min** |
| `recalculateClearanceStatus(userId, term?)` | Re-reads clearance doc, re-evaluates blockingItems, writes new status. Invalidates caches |
| `addStudentWithClearance(studentId, studentData, orgId)` | Create initial clearance doc for a new student with empty blockingItems |
| `fetchAllClearanceForExport(orgId, term, excludeIdPrefix?)` | **Unbounded read — export only** |
| `getCountOfUnclearedDocuments(orgId, selectedTerm?)` | `getCountFromServer` — not_cleared count |

---

### 10.8 `fees.ts`

The largest module (1559 lines). Handles the entire fee lifecycle.

| Function | Description |
|---|---|
| `createFee(feeData, currentUserData, term)` | Create one feeItem template. Returns new doc ID |
| `generateFeesForAllStudentsInAnOrg(feeData, currentUserData, onProgress?, eventId?)` | **Bulk operation.** Creates one feeItem + one `fees` doc per student + updates clearance. CHUNK_SIZE=200, CONCURRENCY=5. Each student = 2 writes (fee + clearance). Calls `recalculateClearanceStatus` per chunk in parallel |
| `assignExistingFeesToStudent(userId, studentData, orgContext, currentUser)` | Called when a new student is added to an org that already has fees. Backfills all current-term feeItems for the student. CHUNK_SIZE=100 |
| `fetchFeesForOrg(orgId, selectedTerm?)` | All feeItems for org+term. **Cached 20 min** |
| `fetchFee(feeId)` | Single fee doc. **Cached 20 min** |
| `fetchFeeItem(orgId, feeItemId)` | Single feeItem by orgId+feeItemId query |
| `fetchFeesPaginated(orgId, feeItemId, pageSize, lastVisibleDoc, searchTerm, statusFilter)` | Paginated per-student fees for a specific feeItem. Cursor-based |
| `getFeesCount(orgId, feeItemId, statusFilter, searchTerm)` | Count via aggregation. **Cached 5 min** |
| `fetchPaymentLogs(feeId)` | Subcollection read: `fees/{feeId}/paymentHistory`. **Cached 20 min** |
| `fetchFeeSubmissionsPaginated(orgId, feeItemId, ...)` | Read proofOfPayments filtered by `itemKeys array-contains feeItemId` |
| `getFeeByStudentId(studentId)` | Fetch all fees for a student in active term |
| `archiveFeeDocuments(feeItemId)` | Archive feeItem + all child fees + remove from clearance blockingItems + trigger recalculation. Uses `in` query chunks of 30 (Firestore limit) |
| `recordManualPaymentAndUpdateClearance(feeId, amount, method, ...)` | **Firestore Transaction.** Single fee payment: 1. Read fee doc 2. Calculate new balance 3. Write: paymentHistory log + proofOfPayments + update fee doc + update clearance blockingItems. Then `recalculateClearanceStatus` |
| `recordBulkManualPaymentAndUpdateClearance(studentId, items, totalAmount, method, ...)` | **Firestore Transaction.** Multi-item bulk payment (fees + fines). Reads all items first, then writes all logs + proofOfPayments + updates all docs + clearance in one transaction |
| `getTotalPaidAmountCount(feeItemId, orgId)` | `getCountFromServer` for paid fees. **Cached** |
| `getTotalUnpaidAmountCount(feeItemId, orgId)` | `getCountFromServer` for unpaid. **Cached** |
| `getTotalPendingAmountCount(feeItemId, orgId)` | **Cached** |
| `getTotalRejectedAmountCount(feeItemId, orgId)` | **Cached** |

---

### 10.9 `fines/`

#### `fines/create/fines.ts`

| Function | Description |
|---|---|
| `createFinePerStudent(userId, user)` | Create one parent `fines` doc for a single student. Calls `recalculateClearanceStatus` |
| `createBulkFines(onProgress?)` | Create parent `fines` docs for ALL members. Guard: if docs already exist for term, returns early. batchSize=20 |
| `generateFinesOnEvent(event, onProgress?)` | **Main fine generation flow.** 5 phases: preflight → absent users → partial users → `disableFineGeneration` → clearance recalculation. Gets absent list via `getNonAttendeesForEvent`, partial list via `getPartialAttendeesForEvent`. Writes fineItems under each student's fine doc + updates clearanceStatus via `setDoc merge`. batchSize=20, concurrency=parallel per batch. Absent users get `fineType.defaultAmount * 2` if `requiresTimeOut`, otherwise `defaultAmount`. Partial users always get `defaultAmount` |
| `assignExistingFinesToStudent(userId, studentData, orgContext, currentUser)` | Backfills all past events (where `finesGenerated=true`) for a newly added student. Creates fineItems for each event |

#### `fines/update/recalculate.ts`

```ts
recalculateFines(fineId, addedAmount?, payment?, waived?, waivedAmount?)
```
Re-reads the fine doc and updates `accumulatedAmount`, `paidAmount`, `balance`, and `status`. Status logic:
- `balance <= 0` → `"paid"`
- `waived && balance <= 0` → `"waived"`
- Any `fineItems` with `isPending=true` → `"pending"` (overrides all)
- Partial payment → `"partial"`

#### `fines/create/fineType.ts`

| Function | Description |
|---|---|
| `createFineType(data)` | Create new fineType |
| `getFineTypeById(id)` | Cached read |
| `getAllFineTypes(orgId)` | All fineTypes for org |

---

### 10.10 `payment/`

#### `payment/create/proofOfPayment.ts`

| Function | Description |
|---|---|
| `createProofOfPayment(data)` | Student-side proof upload — saves to proofOfPayments with `status="pending"` |

#### `payment/read/proofOfPayment.ts`

| Function | Description |
|---|---|
| `getProofOfPaymentById(id)` | Cached fetch. Checks `!isArchived` |
| `getProofOfPaymentsPaginated(orgId, pageSize, lastVisibleDoc, searchTerm, statusFilter, needCount, selectedTerm)` | Full paginated list. Cursor-based. Caches each doc on read |
| `getProofOfPaymentByUserId(userId, orgId?)` | Latest proof for a user. **Cached 10 min** |
| `getPendingProofOfPaymentsByUserId(userId, orgId?)` | Only `status=pending` proofs for current term |
| `getProofOfPaymentsCount(orgId, statusFilter, selectedTerm?)` | Count via aggregation. **Cached 5 min** |

#### `payment/update/proofOfPayment.ts`

| Function | Description |
|---|---|
| `verifyPayment(proofId, adminId, adminName, ...)` | Approve a proof of payment. Runs Firestore transaction: update proofOfPayments status + update fee/fine doc + paymentHistory + clearanceStatus |
| `rejectPayment(proofId, reason)` | Reject proof. Resets `pendingReview=false` on clearance blockingItem |

---

### 10.11 `stats/`

#### `stats/update/updateStats.ts`

Stats documents use a custom ID: `{AY}-{semester}-{orgId}`.

| Function | Params | Effect |
|---|---|---|
| `updateFeeStats(customId, toAdd?, toDeduct?)` | `toAdd` = new fee amount issued; `toDeduct` = payment received | Updates `totalFees`, `totalUnpaidFees`, `totalCollectedFees` |
| `updateFineStats(customId, toAdd?, toDeduct?, toWaive?)` | | Updates fine running totals. `toWaive` deducts from both `totalFines` and `totalUnpaidFines` |
| `updateStudentStats(customId, toAdd?, toDeduct?)` | | Updates `totalStudents` |

**When called:**
- `generateFeesForAllStudentsInAnOrg` → `updateFeeStats(toAdd)`
- `recordManualPaymentAndUpdateClearance` → `updateFeeStats(toDeduct)`
- `generateFinesOnEvent` → `updateFineStats(toAdd)`
- `recordBulkManualPaymentAndUpdateClearance` → `updateFineStats(toDeduct)` + `updateFeeStats(toDeduct)`

---

### 10.12 `dashboard.ts`

All functions are cached and access-level scoped.

| Function | Description |
|---|---|
| `getDashboardAttendeeCount(selectedTerm?)` | Sum `attendees` field across all events for current term. **Cached 15 min** |
| `getDashboardUpcomingEvents(count, selectedTerm?)` | Next N events ordered by date asc. **Cached 15 min** |
| `getDashboardOngoingEvents(count, selectedTerm?)` | Events happening today (date in today's range). **Cached 1 min** (very short — ongoing changes frequently) |
| `getDashboardEvents(count, selectedTerm?)` | Recent events. **Cached 15 min** |
| `getDashboardClearanceStats(orgId, selectedTerm?)` | Cleared/not-cleared/pending counts via `getCountFromServer`. **Cached 5 min** |

---

### 10.13 `bulkImport.ts`

Handles CSV-based student bulk import.

- Parses CSV, validates each row against member schema
- Creates Firebase Auth users + Firestore `users` docs
- Calls `assignExistingFeesToStudent` and `assignExistingFinesToStudent` for each imported student
- Emits progress events for UI

---

### 10.14 `programs.ts` / `faculties.ts`

Simple read-only modules.

| Function | Description |
|---|---|
| `getAllPrograms(facultyId?)` | All programs, optionally scoped to faculty. **Cached 24 hours** |
| `getProgramById(id)` | Cached single program |
| `getAllFaculties()` | All faculties. **Cached 24 hours** |
| `getFacultyById(id)` | Cached single faculty |

---

## 11. API Route Handlers

Only 3 route groups exist. All other data operations are direct Firestore Client SDK calls.

### `POST /api/auth/session`

```ts
// Body: { idToken: string }
const decodedToken = await adminAuth.verifyIdToken(idToken);
const sessionCookie = await adminAuth.createSessionCookie(idToken, {
  expiresIn: 14 * 24 * 60 * 60 * 1000, // 14 days
});
// Response:
Set-Cookie: session=<sessionCookie>; HttpOnly; Secure; SameSite=Strict; Max-Age=1209600
Set-Cookie: userRole=<role>; SameSite=Strict; Max-Age=1209600
```

### `POST /api/auth/signout`

```ts
const sessionCookie = cookies().get("session")?.value;
const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie);
await adminAuth.revokeRefreshTokens(decodedClaims.sub); // Invalidate all tokens
// Response:
Set-Cookie: session=; Max-Age=0  (clear cookie)
Set-Cookie: userRole=; Max-Age=0
```

### `POST /api/public/send-registration-status`

```ts
// Body: { email, firstName, lastName, status: "approved" | "rejected" }
// Sends transactional email via Nodemailer with registration outcome
```

---

## 12. Zod Validation Schemas

**File:** `src/lib/validators.ts`

### `eventSchema`
```ts
{
  name: z.string().min(1),
  date: z.date().min(new Date(today)), // must be >= today
  location: z.string().min(1),
  fineTypeId: z.string().min(1),
  note: z.string().optional(),
  majorEvent: z.boolean(),
  timeInStart: z.string().optional(),   // "HH:MM"
  timeInEnd: z.string().optional(),
  timeOutStart: z.string().optional(),
  timeOutEnd: z.string().optional(),
}
```

### `memberSchema`
```ts
{
  studentId: z.string().regex(/^\d{2}-\d-\d{5}$/), // "XX-X-XXXXX"
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  programId: z.string().min(1),
  role: z.enum(["user", "admin", "super-admin"]),
  yearLevel: z.number().min(0).max(6),
}
```

### `fineTypeSchema`
```ts
{
  name: z.string().min(1),
  description: z.string(),
  defaultAmount: z.number().min(1).max(10000),
  requiresTimeIn: z.boolean(),
  requiresTimeOut: z.boolean().optional(),
  majorEventsOnly: z.boolean(),
  // At least one of requiresTimeIn or requiresTimeOut must be true (superRefine)
}
```

### `paymentSchema`
```ts
{
  amount: z.number().positive(),
  paymentMethod: z.enum(["gcash", "cash", "bank_transfer", "waiver"]),
  // Conditional:
  senderNumber: z.string().regex(/^09\d{9}$/).optional(), // GCash only
  referenceNumber: z.string().min(1).optional(),          // Required for gcash/bank
  imageUrl: z.string().url().optional(),
  notes: z.string().optional(),
}
```

### `orgSchema`
```ts
{
  name: z.string().min(1),
  shortName: z.string().min(1),
  subscribed: z.boolean(),
  accessLevel: z.number().min(1).max(3),
  facultyId: z.string().optional(),
  programId: z.string().optional(),
}
```

### `termSchema`
```ts
{
  AY: z.string().regex(/^\d{4}-\d{4}$/), // "2025-2026"
  semester: z.enum(["1st", "2nd"]),
}
```

---

## 13. TypeScript Types & Constants

### `PaymentType` (`src/constants/types.ts`)
```ts
enum PaymentType {
  FEES  = "fees",
  FINES = "fines",
  BULK  = "bulk",
}
```

### `PaymentStatus`
```ts
enum PaymentStatus {
  PENDING  = "pending",
  VERIFIED = "verified",
  REJECTED = "rejected",
}
```

### `FineStatus` (`src/constants/status.ts`)
```ts
enum FineStatus {
  UNPAID  = "unpaid",
  PARTIAL = "partial",
  PAID    = "paid",
  PENDING = "pending",
  WAIVED  = "waived",
}
```

### `Member` type (from `features/organization/members/types.ts`)
Key fields read throughout:
```ts
{
  id?: string;        // Firestore doc ID = Firebase Auth UID
  studentId: string;
  firstName: string;
  lastName: string;
  email: string;
  programId: string;
  facultyId: string;
  orgId: string;
  role: "user" | "admin" | "super-admin";
  accessLevel: 1 | 2 | 3;
  status: "pending" | "approved";
  isDeleted: boolean;
  yearLevel: number;
}
```

---

## 14. Core Data-Flow Patterns

### Pattern 1: Centralized Error Handler
Every module defines this at the top:
```ts
const handleFirestoreError = (error: any, context: string) => {
  console.error(`Error ${context}:`, error);
  throw new Error(`Failed to ${context}.`); // Always re-throws
};
```
Callers catch at the UI layer and set error state.

### Pattern 2: Cursor-Based Pagination

Never use offset. Always use `startAfter(lastDocumentSnapshot)`:
```ts
// First page:
const q = query(col, orderBy("firstName"), limit(pageSize));
const snapshot = await getDocs(q);
const lastDoc = snapshot.docs[snapshot.docs.length - 1]; // save cursor

// Next page:
const q2 = query(col, orderBy("firstName"), limit(pageSize), startAfter(lastDoc));

// Return shape:
return {
  members: snapshot.docs.map(d => ({ id: d.id, member: d.data() })),
  total,
  lastDoc: snapshot.docs.at(-1) ?? null,
  hasMore: snapshot.size === pageSize,
};
```

### Pattern 3: Efficient Count (never fetch docs just to count)
```ts
// WRONG (fetches all docs):
const snap = await getDocs(q);
const count = snap.size;

// RIGHT (1 billing operation regardless of document count):
const snap = await getCountFromServer(q);
const count = snap.data().count;
```
Only called when `needCount = true` (first load, filter change) to save billing.

### Pattern 4: Server-Side Prefix Search
```ts
const isIdSearch = /\d/.test(searchQuery); // detect numeric → studentId search
const normalizedSearch = isIdSearch
  ? searchQuery.trim()
  : searchQuery.trim().split(" ")
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");

const searchField = isIdSearch ? "studentId" : "firstName";
constraints.push(where(searchField, ">=", normalizedSearch));
constraints.push(where(searchField, "<=", normalizedSearch + "\uf8ff"));
constraints.push(orderBy(searchField, direction));
// "\uf8ff" is the last Unicode character — effectively means "any suffix"
```
⚠️ Requires composite Firestore indexes (see §16).

### Pattern 5: Firestore Batch Writes (max 500 ops per batch)
```ts
const BATCH_SIZE = 200; // Each student = 2 writes → 400 ops total per batch
const chunks = [];
for (let i = 0; i < docs.length; i += BATCH_SIZE) {
  chunks.push(docs.slice(i, i + BATCH_SIZE));
}

// For concurrency:
const CONCURRENCY = 5;
for (let i = 0; i < chunks.length; i += CONCURRENCY) {
  await Promise.all(
    chunks.slice(i, i + CONCURRENCY).map(async (chunk) => {
      const batch = writeBatch(db);
      chunk.forEach(item => batch.set(doc(col), data));
      await batch.commit();
    })
  );
}
```

### Pattern 6: Firestore Transactions (for atomic multi-doc reads+writes)
```ts
await runTransaction(db, async (transaction) => {
  // RULE: ALL reads must happen before ANY writes in a transaction
  const feeDoc = await transaction.get(feeRef);       // 1. Read
  const clearanceDoc = await transaction.get(clearRef); // 2. Read
  
  const newBalance = feeDoc.data().amount - payment;   // 3. Compute
  
  transaction.update(feeRef, { balance: newBalance }); // 4. Write
  transaction.set(logRef, logData);                    // 5. Write
  transaction.update(clearRef, { ...updates });        // 6. Write
});
```

### Pattern 7: Cache Invalidation After Mutations
Every write function ends with targeted cache invalidation:
```ts
// Granular — invalidate only what changed:
cacheService.invalidate(CACHE_KEYS.feeDoc(feeId));
cacheService.invalidate(CACHE_KEYS.feeLogs(feeId));
cacheService.invalidate(CACHE_KEYS.clearanceDoc(clearanceId));

// Prefix — wipe all related paginated lists:
cacheService.invalidateByPrefix(`fees:count:${orgId}`);
cacheService.invalidateByPrefix(`clearance:stats:${orgId}`);
cacheService.invalidateByPrefix(`clearance:count:${orgId}`);
```

### Pattern 8: Real-time Listeners (used sparingly)
```ts
const unsubscribe = onSnapshot(q, async (snapshot) => {
  const data = await Promise.all(
    snapshot.docs.map(async doc => ({
      id: doc.id,
      ...doc.data()
    }))
  );
  callback(data);
});

// In React:
useEffect(() => {
  const unsub = subscribeToX(callback);
  return () => unsub(); // cleanup
}, []);
```

---

## 15. Business Logic — Critical Flows

### Flow A: New Student Onboarding

```
Admin adds a new student (role = "user")
  1. users.ts: addUser(userData) → creates users/{uid} doc
  2. clearance.ts: addStudentWithClearance(uid, data, orgId)
      → builds clearanceId = buildClearanceId(uid, orgId, accessLevel, term)
      → setDoc clearanceStatus/{id} with empty blockingItems
  3. fees.ts: assignExistingFeesToStudent(uid, data, orgContext, currentUser)
      → queries all feeItems for org+term where isArchived=false
      → batch creates fees/{newId} per feeItem
      → updates clearanceStatus.blockingItems for required fees
      → calls recalculateClearanceStatus(uid)
  4. fines/create/fines.ts: assignExistingFinesToStudent(uid, data, orgContext, currentUser)
      → queries all events where finesGenerated=true for org+term
      → creates fineItems for each event under the student's fines doc
      → updates clearanceStatus.blockingItems for each fine
      → calls recalculateClearanceStatus(uid)
```

### Flow B: Generating Fines for an Event

```
Admin clicks "Generate Fines" on a completed event
  1. generateFinesOnEvent(event, onProgress)
     a. Preflight: fetch fineType + getNonAttendeesForEvent(eventId)
     b. Preflight: getOrCreateFinesForStudents(absentUsers, term, issuer, orgId)
        → checks for existing fines docs, creates any missing ones
     c. For each batch of 20 absent students:
        → prepareFineItem: count existing fineItems to get next itemNumber
        → writeBatch:
           - set fineItems/{newId} under each student's fine doc
           - set clearanceStatus/{id} with { merge: true } adding the fineItem as blockingItem
        → await batch.commit()
        → postCommitUpdates: updateFineItemCount + recalculateFines + update timestamps
     d. If requiresTimeOut: same process for partial users (half fine amount)
     e. disableFineGeneration(event.id) → sets finesGenerated=true
     f. updateFineStats(toAdd)
     g. Clearance phase: recalculateClearanceStatus for all processed users in chunks of 20
```

### Flow C: Admin Records Manual Payment

```
Admin records cash/GCash payment from clearance page
  recordBulkManualPaymentAndUpdateClearance(studentId, items, totalAmount, method, ...)
    1. Get studentData from users/{studentId}
    2. Build clearanceId = buildClearanceId(studentId, orgId, accessLevel, term)
    3. runTransaction:
       a. READ PHASE:
          - For each item: get fees/{refId} or fines/{parentFineId}/fineItems/{refId}
          - Stage all reads
       b. WRITE PHASE:
          - For each item:
            * Set paymentHistory log under fees/{id}/paymentHistory or fines/{id}/paymentHistory
            * Compute newBalance = amount - paidAmount - paymentAmount
            * Stage fee/fine doc update: paidAmount, balance, status
            * Stage clearance update: blockingItems.{refId}.balance, status, pendingReview=false
          - Set proofOfPayments/{newId} with full receipt details
          - Update clearanceStatus with all blockingItem changes
    4. After transaction:
       - recalculateClearanceStatus(studentId)
       - updateFeeStats or updateFineStats
       - Invalidate caches
```

### Flow D: Student Self-Pay (Proof Upload)

```
Student uploads payment proof
  1. payment/create/proofOfPayment.ts: createProofOfPayment(data)
     → sets proofOfPayments/{newId} with status="pending"
     → updates clearanceStatus blockingItem: pendingReview=true
     → recalculateClearanceStatus → status becomes "pending" (not "not_cleared")
  
Admin reviews and approves
  2. payment/update/proofOfPayment.ts: verifyPayment(proofId, ...)
     → runTransaction:
        - Read: fee doc + clearance doc
        - Write: proofOfPayments status=verified
        - Write: fees/{id} paidAmount, balance, status
        - Write: fees/{id}/paymentHistory log
        - Write: clearanceStatus blockingItem balance, status, pendingReview=false
     → recalculateClearanceStatus → status becomes "cleared" if balance=0
     → updateFeeStats(toDeduct)
     → cache invalidation
```

---

## 16. Firestore Index Requirements

Composite indexes are required for any query that combines `where` clauses with `orderBy` on different fields, or uses multiple `where` clauses with range operators.

**Required index patterns (based on actual queries):**

```
Collection: users
  isDeleted + role + orgId + firstName (asc) [getMembersOfAnOrg]
  isDeleted + role + orgId + programId + firstName (asc) [level-1 scoped]
  isDeleted + role + orgId + facultyId + firstName (asc) [level-2 scoped]
  isDeleted + role + orgId + studentId (asc) [studentId search]
  isDeleted + role + orgId + status + firstName (asc) [approved filter]

Collection: events
  isDeleted + orgId + academicYear + semester + accessLevelEvent + programId + date
  isDeleted + orgId + academicYear + semester + status + date
  isDeleted + orgId + finesGenerated + academicYear + semester

Collection: clearanceStatus
  orgId + isArchived + academicYear + semester + userName (asc)
  orgId + isArchived + academicYear + semester + studentId (asc)
  orgId + isArchived + academicYear + semester + status + updatedAt (desc)

Collection: fees
  orgId + feeItemId + isArchived + userName (asc)
  orgId + feeItemId + isArchived + studentId (asc)
  orgId + feeItemId + isArchived + status + updatedAt (desc)

Collection: proofOfPayments
  orgId + isArchived + academicYear + semester + userName (asc)
  orgId + isArchived + academicYear + semester + status + updatedAt (desc)

Collection: fineItems (subcollection group)
  isPending == true
```

> The production `firestore.indexes.json` file (111KB) contains all 150+ deployed indexes. Deploy them with: `firebase deploy --only firestore:indexes`

