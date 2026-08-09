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
│   ├── (admin)/                    # Protected: super-admin pages
│   ├── (organization)/             # Protected: officer/org-admin pages
│   │   ├── attendance/
│   │   ├── members/
│   │   ├── financials/
│   │   ├── clearance/
│   │   └── settings/
│   ├── (public)/                   # Public: /login, /
│   └── api/
│       ├── auth/session/           # POST → create session cookie
│       └── auth/signout/           # POST → revoke session cookie
│
├── components/                     # Shared UI — owned by Frontend Lead
│   ├── ui/                         # ShadCN primitives
│   ├── layout/                     # Shell, Sidebar, Header, Footer
│   └── shared/                     # Cross-feature composed components (Rule of Three)
│
├── features/                       # 🚀 THE CORE OF THE APP
│   ├── auth/
│   ├── members/
│   ├── events/
│   ├── attendance/
│   ├── fees/
│   ├── fines/
│   ├── clearance/
│   ├── terms/
│   ├── organizations/
│   └── programs/
│
└── lib/                            # Global server-side infrastructure
    └── firebase/
        ├── admin.ts                # Firebase Admin SDK — server-side ONLY
        └── client.ts               # Firebase Client SDK — browser auth/UI
```

### 2.2 Inside a Feature Module

```text
features/events/
├── components/         # Feature-specific UI — owned by Frontend Lead
├── hooks/              # React Query hooks — owned by Frontend Lead
├── actions.ts          # 'use server' — AAA-enforced entry point
│   OR
├── actions/            # Use a folder when the feature has 4+ distinct actions
│   ├── create-event.ts
│   └── update-event.ts
├── services.ts         # Orchestration — no 'use server'; composes use cases
├── usecases/           # One file per Firestore operation
│   ├── get-events.usecase.ts
│   ├── create-event.usecase.ts
│   └── update-event-status.usecase.ts
└── types.ts            # Types, role constants, hasPermission(), ActionResult
```

**`actions.ts` vs `actions/` folder:** Start with `actions.ts`. Upgrade to a folder only when the feature has **4 or more distinct actions** (e.g., `fees/`, `fines/`).

**There are no controllers.** Pages import actions. Actions call services. Services call use cases. Nothing skips a layer.

### 2.3 Request Flow

```
app/(organization)/org-events/page.tsx
  │
  └─▶ features/events/actions.ts          ← 'use server'; AAA inline
          │   1. AUTH    — verify session cookie
          │   2. AUTHZ   — hasPermission(role, PERMISSION)
          │   3. EXEC    — call service
          │   4. ACCT    — logAction() on every outcome
          └─▶ features/events/services.ts  ← orchestration; no 'use server'
                  └─▶ features/events/usecases/*.ts  ← Firestore (adminDb only)
```

---

## 3. Layer Definitions

### Actions — the only entry point

- Marked `'use server'`.
- Every **protected** action follows the **AAA template inline** inside a `try/catch`. No shared wrapper — the template is repeated intentionally so the security flow stays visible in every file.
- Parse arguments, call the matching **service**, return `ActionResult`.
- **Auth actions** (`createSessionAction`, `destroySessionAction`) **skip AAA** — the user is not yet authenticated.
- Never query Firestore directly. Never contain business logic.

### Services — orchestration

- Plain TypeScript — no `'use server'`.
- Compose use cases. Contain business rules (e.g., "an event cannot be created in the past").
- Called only by actions.
- Never query Firestore directly.

### Use Cases — single Firestore operation

- One file = one operation. No exceptions.
- The **only layer** that imports `adminDb` and queries Firestore.
- Receive all context (orgId, accessLevel, etc.) as arguments — never re-fetch the current user inside a use case.
- Never imported by pages or components.

### Types — permissions live here, not in actions

- Define `ActionResult<T>`, feature types, role permission constants, and `hasPermission()`.
- The action calls `hasPermission(role, PERMISSION)` — the logic itself lives in `types.ts`.

---

## 4. The AAA Template (copy into every protected action)

```typescript
'use server'

import { cookies } from 'next/headers'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { logAction } from '../auth/usecases/log-action.usecase'
import { getEventsService } from './services'
import { hasPermission, EVENT_PERMISSION, type ActionResult, type Event } from './types'

export async function getMyEventsAction(): Promise<ActionResult<Event[]>> {
  const action = 'events:list'

  try {
    // 1. AUTHENTICATION
    const sessionCookie = (await cookies()).get('__session')?.value

    if (!sessionCookie) {
      await logAction({ userId: 'anonymous', action, success: false, error: 'Authentication required.' })
      return { ok: false, error: 'Authentication required.' }
    }

    const claims = await adminAuth.verifySessionCookie(sessionCookie, true)
    const userId = claims.uid

    // 2. AUTHORIZATION
    // In the student portal, authorization = ownership.
    // Students can only read their own data — no role or access-level check needed.
    // The userId extracted from the verified session is passed directly to the service.
    // The use case filters by studentId == userId, making it impossible to read another student's data.

    // 3. EXECUTE
    const events = await getMyEventsService({ userId })

    // 4. ACCOUNTING
    await logAction({ userId, action, success: true })

    return { ok: true, data: events }

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected error.'
    await logAction({ userId: 'unknown', action, success: false, error: message })
    return { ok: false, error: message }
  }
}
```

### AAA Steps

| Step | Code | Purpose |
|------|------|---------|
| **Authentication** | `adminAuth.verifySessionCookie(...)` | Verify the HTTP-only session cookie; reject if missing or expired |
| **Authorization** | Ownership check — `userId` from session | Students can only access their own data. Pass `userId` to the service; use cases filter by `studentId == userId`. No role or access-level check needed in the student portal. |
| **Accounting** | `logAction({...})` | Audit log on **every** outcome — success, auth failure, authz failure, and catch |

> **Critical:** `logAction` must be called on every code path. A missing `logAction` call is a bug.

---

## 5. Types File — Result Shape

Every feature's `types.ts` defines the `ActionResult` type and feature-specific interfaces.

> **Note:** There is no `hasPermission` or role-permission map in this repo. The student portal uses **ownership authorization** — the `userId` from the verified session is the only check. If a future feature needs role-based authorization (e.g., a student cannot submit a fee after a deadline set by an admin), that logic belongs in the **service**, not as a permission system.

```typescript
// features/events/types.ts

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export interface Event {
  id: string
  name: string
  date: FirebaseFirestore.Timestamp
  orgId: string
  status: 'upcoming' | 'ongoing' | 'completed' | 'archived'
  isDeleted: boolean
}
```

---

## 6. Services — Orchestration

Services compose use cases. They contain business rules. They have no `'use server'`.

```typescript
// features/events/services.ts

import { getMyEventsUseCase } from './usecases/get-my-events.usecase'

interface GetMyEventsInput {
  userId: string
}

export async function getMyEventsService(input: GetMyEventsInput) {
  return getMyEventsUseCase({ userId: input.userId })
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

`logAction` is itself a use case. It lives in `features/auth/usecases/log-action.usecase.ts` because it belongs to the auth/accounting domain and is imported by every other feature's actions.

```typescript
// features/auth/usecases/log-action.usecase.ts

import { adminDb } from '@/lib/firebase/admin'

export interface LogEntry {
  userId: string
  action: string       // Format: 'feature:verb' e.g. 'events:list'
  success: boolean
  error?: string
}

export async function logAction(entry: LogEntry): Promise<void> {
  await adminDb.collection('audit_logs').add({
    ...entry,
    timestamp: Date.now(),
  })
}
```

---

## 9. Session Creation & Destruction

Auth actions skip AAA — the user is not yet authenticated. They live in `features/auth/actions.ts`.

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
| Is the user logged in? | Action (step 1 — Authentication) | `adminAuth.verifySessionCookie(...)` |
| Can the user access this data? | Use case (step 3 — Execute) | Filter query by `studentId == userId` from the verified session |

There is no `hasPermission`, no role map, and no `accessLevel` field to check. The student's `userId` (extracted from the verified cookie) is both the identity and the authorization key. Ownership is enforced structurally at the database query level — not as a conditional in application code.

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
| `users` | Firebase Auth UID | All member accounts (role, accessLevel, orgId…) |
| `organizations` | Auto-generated | Student orgs — each user belongs to one |
| `programs` | Auto-generated | Academic programs |
| `faculties` | Auto-generated | Colleges / faculties |
| `terms` | Auto-generated | Academic terms — exactly one `isActive=true` at a time |
| `events` | Auto-generated | Events with status lifecycle |
| `eventAttendees` | Auto-generated | Attendance records per event per student |
| `feeItems` | Auto-generated | Fee templates per org/term |
| `fees` | Auto-generated | Per-student fee submissions |
| `fineTypes` | Auto-generated | Fine categories |
| `fines` | Auto-generated | Per-student fine records |
| `clearanceStatus` | Auto-generated | Per-student semester clearance |
| `proofOfPayments` | Auto-generated | Payment images + verification status |
| `paymentHistory` | Auto-generated | Verified payment history |
| `audit_logs` | Auto-generated | Written by `logAction()` in every protected action |

> See `.docs/coral-ussc backend doc.md §9` for the complete field-level schema.

---

## 14. Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Feature folders | `kebab-case` | `src/features/clearance/` |
| Action files | `camelCase.ts` | `actions.ts` or `create-event.ts` |
| Service files | `camelCase.ts` | `services.ts` |
| Use case files | `kebab-case.usecase.ts` | `get-events.usecase.ts` |
| Type files | `camelCase.ts` | `types.ts` |
| Audit action strings | `feature:verb` | `'events:create'`, `'fines:list'` |

---

## 15. Non-Negotiable Rules

### Layer Rules

| Rule | Violation | Correct |
|------|-----------|---------|
| Actions are the only entry point | Page imports from `usecases/` directly | Page calls action; action calls service |
| Services have no `'use server'` | Adding `'use server'` to a service file | `'use server'` belongs in `actions.ts` only |
| Use cases are single-responsibility | One use case queries two collections | Split into two files; compose in `services.ts` |
| Use cases receive context, never re-fetch user | `adminDb.collection('users')...` inside a use case | Fetch user in the action; pass `orgId`, `accessLevel` as args |
| `adminDb` is server-only | Importing `admin.ts` in a Client Component | Import only in `'use server'` files |
| Auth actions skip AAA | Adding auth check to `createSessionAction` | Auth actions authenticate the user; they cannot check an existing session |
| Never throw from an action | `throw new Error(...)` in `actions.ts` | Return `{ ok: false, error: message }` |

### Security Rules

| Rule |
|------|
| `logAction` must be called on **every** code path — success, auth failure, authz failure, and catch |
| Never physically delete a Firestore document from the UI — set `isDeleted = true` |
| Never pass `organization_id` from the client as a query param — extract it from the verified session |
| Never disable or skip access-level filtering on user-scoped list queries |
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