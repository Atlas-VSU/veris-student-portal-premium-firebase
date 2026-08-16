# VERIS Student Portal — Backend Architecture

This document defines the architectural standards that govern **every line of backend code** in the VERIS Student Portal. These are not suggestions — they are constraints. Deviations require explicit justification.

> **Scope:** This repo is the **student-facing portal only**. Students view their own fees, fines, attendance, and clearance. There is no officer dashboard, no org-scoped data browsing, and no access level system here.

> **For Backend Leads:** This is your ground truth. Every Server Action, service, and use case you write must follow these patterns exactly.
>
> **For Frontend Leads:** You own `src/components/` and the page files inside `src/app/`. Feature-specific UI lives in `src/features/<feature>/components/`. Do not create actions, services, or use cases — those belong to the backend.

---

## 1. Why Feature-Driven Architecture

VERIS manages student profiles, event attendance, fee collection, fine tracking, and semester clearance. A traditional horizontal structure:

```
src/
├── hooks/
├── services/
├── components/
└── utils/
```

fails at scale because **coupling increases**, **discoverability drops**, and **deletion is dangerous**. Removing one feature means hunting the entire tree.

**The solution:** isolate every domain into its own `features/` module. A single folder is the complete, self-contained unit of functionality for a business domain.

---

## 2. Directory Structure

### 2.1 Top-Level Layout

```text
src/
├── app/                            # Next.js App Router — routes ONLY, no logic
│   ├── (student)/                  # Protected: authenticated student pages
│   │   ├── fees/                   # View my fees & payment status
│   │   ├── fines/                  # View my fines
│   │   ├── clearance/              # View my clearance status
│   │   ├── attendance/             # View my attendance records
│   │   ├── events/                 # View upcoming events
│   │   └── profile/               # View/edit my profile
│   ├── (public)/                   # Public: /login, /
│   └── api/
│       ├── auth/session/           # POST → create session cookie
│       └── auth/signout/           # POST → revoke session cookie
│
├── components/                     # Shared UI — owned by Frontend Lead
│   ├── ui/                         # ShadCN primitives
│   ├── layout/                     # Shell, Header, Footer
│   └── shared/                     # Cross-feature composed components (Rule of Three)
│
├── features/                       # 🚀 THE CORE OF THE APP
│   ├── auth/
│   ├── terms/              # Active term lookup — used by clearance and fees
│   ├── events/
│   ├── attendance/
│   ├── fees/
│   ├── fines/
│   ├── clearance/
│   └── profile/
│
├── types/                          # Shared TypeScript types (cross-feature)
│   └── index.ts                    # ActionResult<T> and other shared types
│
└── lib/                            # Global server-side infrastructure
    └── firebase/
        ├── admin.ts                # Firebase Admin SDK — server-side ONLY
        ├── client.ts               # Firebase Client SDK — browser auth/UI
        └── with-auth.ts            # withAuth() HOF — handles auth cookie + error catch
```

### 2.2 Inside a Feature Module

```text
features/clearance/
├── components/         # Feature-specific UI — owned by Frontend Lead
├── hooks/              # React Query hooks — owned by Frontend Lead
├── actions.ts          # 'use server' — calls withAuth(); stays flat when < 4 actions
├── services.ts         # Only present if there is real orchestration or business logic
├── usecases/           # One file per Firestore operation
│   ├── get-my-clearance.usecase.ts
│   └── get-clearance-requirements.usecase.ts
└── types.ts            # Feature-specific interfaces only — imports ActionResult from @/types
```

For a feature with **4+ actions** (e.g., `fees/`), graduate to a folder:

```text
features/fees/
├── actions/            # folder form — used because fees/ has 4+ distinct actions
│   ├── get-my-fees.ts
│   ├── submit-fee.ts
│   ├── upload-proof.ts
│   └── get-payment-history.ts
├── services.ts
├── usecases/
└── types.ts
```

**`actions.ts` vs `actions/` folder:** Start with `actions.ts`. Upgrade to a folder only when the feature has **4 or more distinct actions** (e.g., `fees/`, `fines/`).

**There are no controllers.** Pages call actions. Actions call use cases directly, or through services when there is business logic to enforce. Pages never import use cases or services.

### 2.3 Request Flow

```
app/(student)/fees/page.tsx
  │
  └─▶ features/fees/actions/get-my-fees.ts   ← 'use server'
          │
          └─▶ withAuth('fees:list', async (userId) => {
                  │   1. AUTH  — withAuth() verifies the session cookie
                  │   2. AUTHZ — userId from verified cookie (ownership key)
                  ├─▶ features/fees/usecases/get-my-fees.usecase.ts
                  │       3. EXEC  — Firestore query filtered by studentId == userId
                  └─▶ logAction(...)  (failures + mutations only)
                          4. ACCT  — fire-and-forget; never blocks response
              })
```

> `withAuth` is not a layer in the call stack between the action and the use case. It is a wrapper that the action calls. The use case is called **from inside the action's callback**, not from inside `with-auth.ts`.

---

## 3. Layer Definitions

### Actions — the only entry point

- Marked `'use server'`.
- Every **protected** action wraps its body in `withAuth()` from `lib/firebase/with-auth.ts`. Auth, cookie verification, and error catching are handled there — actions only write what's unique to them.
- **Auth actions** (`createSessionAction`, `destroySessionAction`) **skip `withAuth`** — the user is not yet authenticated.
- Never query Firestore directly. Never contain business logic.

### Services — orchestration

- Plain TypeScript — no `'use server'`.
- Compose use cases. Contain business rules (e.g., "a student cannot submit a fee after the deadline").
- Called only by actions.
- Never query Firestore directly.

> **Pragmatic exception:** if a feature's action has a single use case to call and zero business logic to enforce, the action may call the use case directly — skip the service. Add the service when you have rules to enforce or multiple use cases to compose. Don't create a pass-through service just for ceremony.

### Use Cases — single Firestore operation

- One file = one operation. No exceptions.
- The **only layer** that imports `adminDb` and queries Firestore.
- Receive all context as arguments — never re-fetch the current user inside a use case.
- Never imported by pages or components.

### Types — result shape and interfaces

- Feature-specific interfaces only. `ActionResult<T>` lives in `src/types/index.ts` — import it from `@/types`, never re-define it per feature.
- In the student portal there is no permission map — authorization is ownership-based (see §10).

---

## 4. The `withAuth` Wrapper

All auth boilerplate lives in one place: `lib/firebase/with-auth.ts`. Actions call it instead of repeating the cookie check, session verification, and catch block in every file.

### The wrapper itself

```typescript
// lib/firebase/with-auth.ts
import 'server-only'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { logAction } from '@/features/auth/usecases/log-action.usecase'
import type { ActionResult } from '@/types'

export async function withAuth<T>(
  action: string,
  fn: (userId: string) => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    // 1. AUTHENTICATION
    const sessionCookie = (await cookies()).get('__session')?.value

    if (!sessionCookie) {
      void logAction({ userId: 'anonymous', action, success: false, error: 'Authentication required.' })
      return { ok: false, error: 'Authentication required.' }
    }

    const claims = await adminAuth.verifySessionCookie(sessionCookie, true)

    // 2. AUTHORIZATION (ownership)
    // userId comes from the verified cookie — it cannot be spoofed by the client.
    // Passes userId to the action's callback; use cases filter by studentId == userId.

    return await fn(claims.uid)

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    void logAction({ userId: 'unknown', action, success: false, error: message })
    return { ok: false, error: message }
  }
}
```

### Read action template

```typescript
// features/fines/actions.ts
'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { getMyFinesUseCase } from './usecases/get-my-fines.usecase'
import type { ActionResult } from '@/types'
import type { Fine } from './types'

export async function getMyFinesAction(): Promise<ActionResult<Fine[]>> {
  return withAuth('fines:list', async (userId) => {
    const fines = await getMyFinesUseCase({ userId })
    // ✅ READ: do NOT log success — high-volume noise, no audit value.
    return { ok: true, data: fines }
  })
}
```

### Mutation (write) action template

Always log success for writes — every data change must be auditable. Both read and write actions live in the same `actions.ts` (or `actions/` folder).

```typescript
// features/fees/actions/submit-fee.ts
'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { logAction } from '@/features/auth/usecases/log-action.usecase'
import { submitFeeUseCase } from '../usecases/submit-fee.usecase'
import type { ActionResult } from '@/types'

export async function submitFeeAction(feeId: string): Promise<ActionResult> {
  return withAuth('fees:submit', async (userId) => {
    await submitFeeUseCase({ userId, feeId })
    // ✅ MUTATION: always log success — auditable data change.
    void logAction({ userId, action: 'fees:submit', success: true })
    return { ok: true, data: undefined }
  })
}
```

### AAA steps

| Step | Where | Purpose |
|------|-------|---------|
| **Authentication** | `withAuth()` | Verify the HTTP-only session cookie; reject if missing or expired |
| **Authorization** | `withAuth()` → `userId` arg | `userId` from the verified cookie is the ownership key; use cases filter by `studentId == userId` |
| **Accounting** | Action callback | `void logAction(...)` — fire-and-forget; failures logged in `withAuth`, mutations logged in the action |

> **`void` not `await`:** `logAction` is fire-and-forget. Never `await` it — a Firestore write should never block the student's response.

---

## 5. Types — Shared vs Feature-Specific

### Shared types — `src/types/index.ts`

`ActionResult<T>` is used by every feature's actions. It lives in `src/types/` (shared by Rule of Three — used everywhere immediately) and is never re-defined per feature.

```typescript
// src/types/index.ts

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }
```

### Feature types — `features/<name>/types.ts`

Each feature's `types.ts` only contains interfaces specific to that feature. It imports `ActionResult` from `@/types`.

> There is no `hasPermission` or role-permission map in this repo. The student portal uses **ownership authorization** — `userId` from the verified cookie is the only check. Business rules (e.g., fee submission after a deadline) belong in the **service**, not as a permission system.

```typescript
// features/clearance/types.ts

import type { ActionResult } from '@/types'

export type { ActionResult }  // re-export for convenience

export interface ClearanceStatus {
  id: string
  studentId: string
  termId: string
  status: 'pending' | 'approved' | 'rejected'
  updatedAt: FirebaseFirestore.Timestamp
}
```

---

## 6. Services — Orchestration

Services compose use cases and enforce business rules. They have no `'use server'`. Only add a service when there is real logic — see the §3 pragmatic exception.

**Example: clearance requires the active term** — the service fetches the term first, then queries the student's clearance for that specific term. Two use cases, composed here.

```typescript
// features/clearance/services.ts

import { getActiveTermUseCase } from '../terms/usecases/get-active-term.usecase'
import { getMyClearanceUseCase } from './usecases/get-my-clearance.usecase'
import type { ClearanceStatus } from './types'

interface GetMyClearanceInput {
  userId: string
}

export async function getMyClearanceService(
  input: GetMyClearanceInput
): Promise<ClearanceStatus | null> {
  const term = await getActiveTermUseCase()
  if (!term) return null  // ← business rule: no active term = no clearance to show

  return getMyClearanceUseCase({ userId: input.userId, termId: term.id })
}
```

---

## 7. Use Cases — Single Firestore Operation

One file, one operation. The only layer that touches `adminDb`.

Ownership is enforced here: every query that returns student data filters by `studentId` (or `userId`). This makes it structurally impossible to return another student's data even if the action were miscoded.

```typescript
// features/events/usecases/get-my-events.usecase.ts

import { adminDb } from '@/lib/firebase/admin'
import type { Event } from '../types'

interface GetMyEventsInput {
  userId: string
}

export async function getMyEventsUseCase(input: GetMyEventsInput): Promise<Event[]> {
  const snapshot = await adminDb
    .collection('eventAttendees')
    .where('studentId', '==', input.userId)   // ← ownership enforced at the DB layer
    .where('isDeleted', '==', false)
    .orderBy('date', 'desc')
    .get()

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Event[]
}
```

---

## 8. Audit Logging Use Case

`logAction` is itself a use case at `features/auth/usecases/log-action.usecase.ts`.

### Tiered logging strategy

Not every action outcome is worth logging. Logging everything generates massive Firestore write volume (9,000 students × N page loads × N actions = enormous cost). Log selectively:

| Outcome | Log? | Why |
|---------|------|-----|
| Auth failure (no session) | ✅ Always | Security signal — someone hit a protected endpoint without a session |
| Authz failure (wrong role) | ✅ Always | Security signal — someone tried to do something they shouldn't |
| Catch block (unexpected error) | ✅ Always | Operational signal — something broke |
| Successful **mutation** (write) | ✅ Always | Audit trail — any data change must be recorded |
| Successful **read** | ❌ Skip | High-volume noise, zero audit value, costs Firestore writes |

### Always fire-and-forget

Use `void logAction(...)` — never `await`. The response should not wait for an audit log write to Firestore.

```typescript
// features/auth/usecases/log-action.usecase.ts

import { adminDb } from '@/lib/firebase/admin'

export interface LogEntry {
  userId: string
  action: string    // Format: 'feature:verb' e.g. 'fees:submit'
  success: boolean
  error?: string
}

export async function logAction(entry: LogEntry): Promise<void> {
  // Wrap in try/catch — a failed log write must never surface as a user-facing error
  try {
    await adminDb.collection('audit_logs').add({
      ...entry,
      timestamp: Date.now(),
    })
  } catch {
    // Intentionally silent — logging failure is not a user concern
  }
}
```

---

## 9. Session Creation & Destruction

Auth actions skip `withAuth` — the user is not yet authenticated. They live in `features/auth/actions.ts`.

```typescript
// features/auth/actions.ts
'use server'

import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import type { ActionResult } from './types'

const SESSION_DURATION_MS = 60 * 60 * 24 * 14 * 1000 // 14 days

// Called after client-side signInWithEmailAndPassword() returns an idToken
export async function createSessionAction(idToken: string): Promise<ActionResult> {
  try {
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_DURATION_MS,
    })
    const cookieStore = await cookies()

    cookieStore.set('__session', sessionCookie, {
      maxAge:   SESSION_DURATION_MS / 1000,
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path:     '/',
    })

    return { ok: true, data: undefined }
  } catch {
    return { ok: false, error: 'Failed to create session.' }
  }
}

// Called on sign-out — revokes refresh tokens so cookie cannot be reused
export async function destroySessionAction(): Promise<ActionResult> {
  const cookieStore = await cookies()
  const session = cookieStore.get('__session')?.value

  if (session) {
    try {
      const claims = await adminAuth.verifySessionCookie(session)
      await adminAuth.revokeRefreshTokens(claims.uid)
    } catch { /* already expired — still clear the cookie */ }
  }

  cookieStore.delete('__session')
  return { ok: true, data: undefined }
}
```

---

## 10. Authorization in the Student Portal

**There is no access level system in this repo.** Access levels (`1=Program`, `2=Faculty`, `3=Organization`) are an officer/admin concern that belong in the officer dashboard — not here.

In the student portal, authorization is **ownership-based**:

| Check | Where | How |
|-------|-------|-----|
| Is the user logged in? | `withAuth()` (Authentication) | `adminAuth.verifySessionCookie(sessionCookie, true)` |
| Can the user access this data? | Use case (Execute step) | Every query filters by `studentId == userId` from the verified session |

There is no `hasPermission`, no role map, and no `accessLevel` field to check. The `userId` extracted from the verified cookie is both the identity and the authorization key — it cannot be spoofed by the client. Ownership is enforced structurally at the database query level, not as an application-layer conditional.

---

## 11. Global Firebase Setup

### `src/lib/firebase/admin.ts`

```typescript
import * as admin from 'firebase-admin'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:   process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // .env stores \n as literal backslash-n — restore real newlines
      privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  })
}

export const adminAuth    = admin.auth()
export const adminDb      = admin.firestore()
export const adminStorage = admin.storage()
```

---

## 12. Environment Variables

### Client-Side (`NEXT_PUBLIC_*`)

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=      # Dev only
```

### Server-Side Only

```bash
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
MAINTENANCE_MODE=false
```

> **Private Key Gotcha:** `.env` stores `\n` as a literal backslash-n. The Admin SDK init must call `.replace(/\\n/g, '\n')`.

---

## 13. Firestore Collections Reference

| Collection | Document ID | Purpose |
|---|---|---|
| `users` | Firebase Auth UID | Student's own profile (name, studentId, programId…) |
| `terms` | Auto-generated | Academic terms — student needs the active term for clearance/fee context |
| `events` | Auto-generated | Events the student can view |
| `eventAttendees` | Auto-generated | Student's attendance records per event |
| `feeItems` | Auto-generated | Fee templates — student reads these to see what fees apply to them |
| `fees` | Auto-generated | Student's own fee submissions and payment status |
| `fineTypes` | Auto-generated | Fine category labels — student reads for display |
| `fines` | Auto-generated | Student's own fine records |
| `clearanceStatus` | Auto-generated | Student's semester clearance status |
| `proofOfPayments` | Auto-generated | Student's uploaded payment proof images |
| `paymentHistory` | Auto-generated | Student's verified payment history |
| `audit_logs` | Auto-generated | Written by `logAction()` on auth failures, errors, and mutations |

> `organizations`, `programs`, and `faculties` are officer/admin concerns. The student portal never queries them directly.

> See `.docs/coral-ussc backend doc.md §9` for the complete field-level schema.

---

## 14. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Feature folders | `kebab-case` | `src/features/clearance/` |
| Action file (flat) | always `actions.ts` | `features/fees/actions.ts` |
| Action files (folder) | `kebab-case.ts` | `get-my-fees.ts`, `submit-fee.ts` |
| Service files | always `services.ts` | `features/clearance/services.ts` |
| Use case files | `kebab-case.usecase.ts` | `get-my-clearance.usecase.ts` |
| Type files | always `types.ts` | `features/clearance/types.ts` |
| Audit action strings | `feature:verb` | `'fees:submit'`, `'fines:list'` |

---

## 15. Non-Negotiable Rules

### Layer Rules

| Rule | Violation | Correct |
|------|-----------|---------|
| Actions are the only entry point | Page imports from `usecases/` directly | Page calls action; action calls `withAuth()` |
| Services have no `'use server'` | Adding `'use server'` to a service file | `'use server'` belongs in `actions.ts` only |
| Use cases are single-responsibility | One use case queries two collections | Split into two files; compose in `services.ts` |
| Use cases receive `userId`, never re-fetch the user | Calling `adminDb.collection('users')...` inside a use case | Receive `userId` as an argument from the action |
| `adminDb` is server-only | Importing `admin.ts` in a Client Component | Import only in server-side files |
| Auth actions skip `withAuth` | Adding a session check to `createSessionAction` | Auth actions authenticate the user; there is no existing session to verify |
| Never throw from an action | `throw new Error(...)` in `actions.ts` | Return `{ ok: false, error: message }` |

### Security Rules

| Rule |
|------|
| Log auth failures, unexpected errors, and all mutations. Skip successful reads — see §8 for the tiered strategy. |
| Never physically delete a Firestore document from the UI — set `isDeleted = true` |
| Never trust client-supplied IDs for scoping — always extract `userId` from the verified session in `withAuth()` |
| `actions.ts` vs `actions/` — use a flat file until 4+ actions; then graduate to a folder |

### Shared Code — Rule of Three

Move code to `src/lib/`, `src/components/shared/`, or `src/types/` only when used by **3 or more features**. Until then, co-locate.

| Feature count | Action |
|---|---|
| 1 feature | Keep inside `features/<name>/` |
| 2 features | Duplicate — do not prematurely abstract |
| 3+ features | Move to the shared location |

---

## 16. Caching (Add When Needed)

> **Rule:** Build features first without caching. Add it later when you can see the actual slowdown. Don't pre-optimize.

### What is caching here?

When a student loads their fees page, the app fetches from Firestore. With 9,000 students during a peak period (clearance season, fee deadlines), that's thousands of simultaneous Firestore reads — which costs money and can slow things down.

Caching saves the result of a fetch for a short time. If 100 students check the same event list in the same minute, only the first one hits Firestore — the rest get the saved copy.

### Where caching lives — use cases only

You add `'use cache'` to **read use cases only**. Never to actions, services, or mutation use cases.

```typescript
// features/fees/usecases/get-my-fees.usecase.ts
import { adminDb } from '@/lib/firebase/admin'
import { cacheTag, cacheLife } from 'next/cache'

export async function getMyFeesUseCase({ userId }: { userId: string }) {
  'use cache'
  cacheTag(`fees-${userId}`)  // tag this cached result with the student's ID
  cacheLife('minutes')        // expire after a few minutes

  const snapshot = await adminDb
    .collection('fees')
    .where('studentId', '==', userId)
    .get()
  return snapshot.docs.map(d => ({ id: d.id, ...d.data() }))
}
```

> **Why `adminDb` works here:** `'use cache'` only requires the function's *parameters* to be serializable (they form the cache key). `adminDb` is a module-level import — not a parameter — so it does not affect serialization. Do **not** refactor use cases to receive `adminDb` as a parameter; keep it as a module import.

### Throwing away the saved copy after a mutation

When an admin updates a student's fee (from the admin portal), that student's cached fees are now wrong. The admin portal calls `revalidateTag('fees-{studentId}')` after the write — this tells Next.js to throw away the saved copy so the student gets fresh data on their next load.

### The cross-portal problem (simple version)

The student portal and admin portal are two separate apps with **separate caches**. When the admin portal throws away a cached result, it only affects the admin portal's own cache — it can't reach the student portal's cache directly.

**Practical solution — choose based on how time-sensitive the data is:**

| Data | Approach |
|------|----------|
| Fees, fines, attendance | Short TTL (5–10 min expiry). Slightly stale is acceptable — a student checking their balance a few minutes after an update seeing old data is fine. |
| Clearance status | Call the student portal's `/api/revalidate` route from the admin portal after each clearance update. Students are actively checking this and need it real-time. |
| Events, active term, org info | Long TTL (1 hour+). Almost never changes mid-session. |

### What to cache — quick reference

| Use case | Cache? | Tag example |
|----------|--------|-------------|
| `get-my-fees.usecase.ts` | ✅ Short TTL | `fees-${userId}` |
| `get-my-fines.usecase.ts` | ✅ Short TTL | `fines-${userId}` |
| `get-my-clearance.usecase.ts` | ✅ Short TTL + webhook invalidation | `clearance-${userId}` |
| `get-my-attendance.usecase.ts` | ✅ Short TTL | `attendance-${userId}` |
| `get-active-term.usecase.ts` | ✅ Long TTL | `active-term` |
| Any write use case | ❌ Never | — |