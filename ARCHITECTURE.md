# VERIS Student Portal — Code Architecture

> **Document Version:** 2.1.0
>
> **Last Normalized:** 2026-09-30
>
> **Purpose:** Define frontend/backend file ownership and the Actions → Services → Use Cases flow

This document explains **where code belongs** and **how the frontend reaches backend data**. It is intentionally narrow.

For product behavior and business requirements, use `FUNCTIONAL_REQUIREMENTS_SPECIFICATION.md`. For authentication policy, Firestore schemas, access levels, subscriptions, caching, security, and integration rules, use `SYSTEM_ARCHITECTURE_GUIDE.md`.

This structure is adapted from `.docs/RND-ARCHITECTURE-WELA.md` for VERIS's feature-driven folders and Firebase backend.

---

## 1. The Architecture in One Diagram

```text
┌──────────────────────────── FRONTEND ────────────────────────────┐
│                                                                  │
│  Page → Component → UI Hook                                      │
│    │          │         │                                        │
│    └──────────┴─────────┴── calls a Server Action ──────────┐    │
│                                                             │    │
└─────────────────────────────────────────────────────────────┼────┘
                                                              │
                                                    frontend/backend boundary
                                                              │
┌──────────────────────────── BACKEND ─────────────────────────▼────┐
│                                                                  │
│  Action → Service → Use Case → Firebase / Firestore              │
│                                                                  │
│  entry     business    one persistence                           │
│  point     flow        operation                                 │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

The required backend flow is:

```text
Action → Service → Use Case
```

- Frontend files call **actions**.
- Actions call **services**.
- Services call **use cases**.
- Use cases access Firebase/Firestore.
- Results return through the same layers to the frontend.

There are no controllers. Services are mandatory because they are the stable backend boundary between actions and persistence. A service may begin small, but the action still calls it instead of reaching directly into a use case.

---

## 2. Frontend and Backend Ownership

### 2.1 Repository map

```text
src/
├── app/                                      # FRONTEND — routes and page composition
│   ├── page.tsx
│   ├── (public)/
│   ├── (student)/
│   └── api/                                  # BACKEND transport when HTTP is required
│
├── components/                               # FRONTEND — shared UI
│   ├── ui/
│   ├── layout/
│   └── shared/
│
├── features/
│   └── <feature>/
│       ├── components/                       # FRONTEND — feature UI
│       ├── hooks/                            # FRONTEND — interaction and UI state
│       ├── actions.ts                        # BACKEND boundary — Server Actions
│       ├── services.ts                       # BACKEND — orchestration and rules
│       ├── usecases/                         # BACKEND — Firebase operations
│       ├── calculations.ts                   # BACKEND — pure domain calculations, optional
│       └── types.ts                          # SHARED — serializable feature contracts
│
├── lib/
│   ├── firebase/
│   │   ├── client.ts                         # FRONTEND infrastructure
│   │   ├── admin.ts                          # BACKEND infrastructure
│   │   └── with-auth.ts                      # BACKEND action guard
│   └── date-format.ts                        # SHARED pure helper
│
└── types/
    └── index.ts                              # SHARED cross-feature contracts
```

### 2.2 Ownership table

| Area | Owns | Does not own |
|---|---|---|
| `src/app/` | Routes, layouts, metadata, page composition | Firestore queries and business rules |
| `src/components/` | Reusable presentation and layout | Feature persistence and services |
| `features/*/components/` | Feature-specific presentation | Backend rules and Firebase access |
| `features/*/hooks/` | UI state, events, loading/error handling | Domain rules and persistence |
| `features/*/actions.ts` | Authenticated backend entry points | UI state and direct Firestore queries |
| `features/*/services.ts` | Business flow and use-case orchestration | React UI and direct Firestore queries |
| `features/*/usecases/` | Firebase/Firestore operations | UI and transport concerns |
| `features/*/types.ts` | Serializable feature contracts | Runtime orchestration |

---

## 3. Frontend Structure

### 3.1 Pages

Pages live in `src/app/`. A page:

- defines the route, metadata, and top-level layout;
- composes feature components;
- may call a read action when server-rendered data is needed; and
- never imports a service, use case, or Firebase Admin module.

```tsx
// src/app/(student)/attendance/page.tsx
import { AttendanceLedgerView } from '@/features/attendance/components/attendance-ledger-view'

export default function AttendancePage() {
  return <AttendanceLedgerView />
}
```

### 3.2 Components

Components render the interface. They receive serializable props and may call actions for data or mutations.

- Shared primitives and layout belong in `src/components/`.
- UI used by one feature belongs in `src/features/<feature>/components/`.
- A component must not import services, use cases, `adminDb`, or `adminAuth`.
- A component using browser state or events declares `'use client'`.

### 3.3 UI hooks

Hooks handle frontend interaction:

- component state;
- loading and error state;
- form and click handlers;
- calling a Server Action; and
- adapting an `ActionResult` into UI state.

Hooks do not contain backend business rules. A hook may be placed in `features/<feature>/hooks/` when shared within the feature, or co-located with a component when it only serves that component.

```typescript
const result = await getMyAttendanceOverviewAction(filter)

if (!result.ok) {
  setError(result.error)
  return
}

setHistory(result.data.history)
setStats(result.data.stats)
```

Do not convert a failed action into a believable empty or zero-valued success state. The frontend must show an error, unavailable state, or retry state.

### 3.4 Frontend import rule

Frontend files may import:

- components;
- hooks;
- Server Actions;
- feature/shared types; and
- browser-safe pure helpers.

Frontend files must not import:

- services;
- use cases;
- `src/lib/firebase/admin.ts`;
- `src/lib/firebase/with-auth.ts`; or
- any module marked `server-only`.

---

## 4. Backend Flow

### 4.1 Actions — backend entry points

Location: `src/features/<feature>/actions.ts`

Actions are the only feature backend functions called by pages, components, and hooks.

An action:

- declares `'use server'`;
- validates request-shaped input;
- uses `withAuth` when protected;
- calls one service;
- converts the service result into `ActionResult<T>`; and
- contains no Firestore query or domain calculation.

Cross-cutting authentication and audit helpers may wrap the action, but feature work still enters through the feature service rather than a domain use case.

```typescript
'use server'

import { withAuth } from '@/lib/firebase/with-auth'
import { getMyAttendanceOverviewService } from './services'
import type { ActionResult, AttendanceOverview, TermFilter } from './types'

export async function getMyAttendanceOverviewAction(
  filter?: TermFilter
): Promise<ActionResult<AttendanceOverview>> {
  return withAuth('attendance:getOverview', async (userId, student) => {
    const overview = await getMyAttendanceOverviewService({
      userId,
      student,
      filter,
    })

    return { ok: true, data: overview }
  })
}
```

Auth actions do not use `withAuth` because they establish or destroy the session. They still call auth services rather than Firebase Admin directly.

### 4.2 Services — business flow and orchestration

Location: `src/features/<feature>/services.ts`

Every action delegates to a service. The service is the feature's backend API.

A service:

- receives the authenticated context and validated input from the action;
- applies business and visibility rules;
- calls one or more use cases;
- combines results from multiple operations;
- calls pure calculations; and
- returns a domain result or DTO.

A service does not:

- declare `'use server'`;
- import React components or hooks;
- read cookies or request headers; or
- import/query `adminDb` directly.

```typescript
export async function getMyAttendanceOverviewService(
  input: GetAttendanceOverviewInput
): Promise<AttendanceOverview> {
  const [attendance, absenceFines] = await Promise.all([
    getMyAttendanceUseCase({ userId: input.userId }),
    getMyAttendanceFinesUseCase({
      userId: input.userId,
      filter: input.filter,
    }),
  ])

  const history = await buildAttendanceHistory({
    attendance,
    absenceFines,
    student: input.student,
    filter: input.filter,
  })

  return {
    history,
    stats: calculateAttendanceStats(history),
  }
}
```

### 4.3 Use cases — persistence operations

Location: `src/features/<feature>/usecases/<operation>.usecase.ts`

A use case performs one cohesive Firebase/Firestore operation.

- One file represents one query, lookup, write, batch, or transaction.
- Use cases are the only feature layer that imports `adminDb`.
- They receive all required context as arguments.
- Student-owned queries use the authenticated Firebase UID in `userId` filters.
- They map Firestore documents into explicit, serializable objects.
- They do not call actions or services.

```typescript
import { adminDb } from '@/lib/firebase/admin'
import { mapAttendanceRecord } from './mappers'
import type { AttendanceRecord } from '../types'

export async function getMyAttendanceUseCase(
  input: { userId: string }
): Promise<AttendanceRecord[]> {
  const snapshot = await adminDb
    .collection('eventAttendees')
    .where('userId', '==', input.userId)
    .get()

  return snapshot.docs.map(mapAttendanceRecord)
}
```

A Firestore transaction may update multiple documents when those writes form one atomic operation. “One use case” means one persistence responsibility, not necessarily one collection.

### 4.4 Calculations and pure domain helpers

Pure calculations live beside the feature, for example `calculations.ts`.

They:

- contain no Firebase, React, cookies, or request access;
- receive all values through arguments;
- return deterministic results; and
- are called by services, not components.

Examples include attendance statistics, term matching, balance calculations, and status derivation.

### 4.5 Types

Feature contracts live in `features/<feature>/types.ts`. Cross-feature contracts live in `src/types/`.

Types crossing from backend to frontend must be serializable. Convert Firestore `Timestamp` values before returning them to actions/components.

```typescript
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string }
```

---

## 5. Dependency Rules

### 5.1 Allowed dependencies

| Layer | May import/call |
|---|---|
| Page | Components, actions, shared/feature types |
| Component or UI hook | Components, hooks, actions, browser-safe types/helpers |
| Action | `withAuth`, audit helpers, its feature service, types, input validators |
| Service | Its feature use cases, other feature services, pure calculations, and types; auth services may also use server-only auth infrastructure |
| Use case | Firebase Admin database infrastructure (`adminDb`), types, persistence mappers |
| Calculation/helper | Types and other pure helpers |

### 5.2 Forbidden dependencies

```text
Frontend ─X─► Service
Frontend ─X─► Use Case
Frontend ─X─► Firebase Admin

Action   ─X─► Firestore
Action   ─X─► Domain Use Case

Service  ─X─► Firestore
Use Case ─X─► Service or Action
```

Dependency direction moves inward only:

```text
Frontend → Action → Service → Use Case → Firebase
```

### 5.3 Cross-feature calls

Each feature service is that feature's public backend API. When one feature needs another feature's policy-aware behavior, its service calls the other feature's service.

```text
Attendance Service → Events Service → Events Use Case
```

Do not import another feature's private use case merely to bypass its service rules. Shared low-level infrastructure belongs in `src/lib/`, while shared contracts belong in `src/types/` or a clearly owning feature.

Avoid circular feature dependencies. If two services need each other, extract the shared concept or reconsider feature ownership.

---

## 6. Standard Feature Layout

Every domain follows the same shape:

```text
src/features/events/
├── components/
│   ├── event-card.tsx
│   ├── event-details-modal.tsx
│   └── events-catalog-view.tsx
├── hooks/
├── actions.ts
├── services.ts
├── usecases/
│   ├── get-active-events.usecase.ts
│   └── get-event-by-id.usecase.ts
└── types.ts
```

| File/folder | Question it answers |
|---|---|
| `components/` | How is the feature displayed? |
| `hooks/` | How does the user interact with it? |
| `actions.ts` | What backend operations can the frontend call? |
| `services.ts` | What business flow happens for each operation? |
| `usecases/` | What individual persistence operations are needed? |
| `calculations.ts` | What pure domain calculations are needed? |
| `types.ts` | What data crosses the feature's boundaries? |

Do not create controllers or route-local action files for feature behavior. Keep the complete vertical slice discoverable under `src/features/<feature>/`.

---

## 7. End-to-End Attendance Example

The attendance feature demonstrates the intended flow:

```text
FRONTEND

src/app/(student)/attendance/page.tsx
  └─► AttendanceLedgerView
        └─► getMyAttendanceOverviewAction(filter)

BACKEND

src/features/attendance/actions.ts
  └─► withAuth(...)
        └─► getMyAttendanceOverviewService(...)

src/features/attendance/services.ts
  ├─► getMyAttendanceUseCase(...)
  ├─► getMyAttendanceFinesUseCase(...)
  ├─► getAttendanceFineItemsUseCase(...)
  ├─► Events Service → event lookup use case
  └─► calculateAttendanceStats(history)

src/features/attendance/usecases/*.usecase.ts
  └─► Firebase / Firestore

RETURN

AttendanceOverview
  └─► ActionResult<AttendanceOverview>
        └─► loading / success / empty / error UI
```

The frontend knows only the action and returned types. It does not know how many queries or calculations the service performs.

The action knows only the service. It does not know Firestore collection names.

The service knows the business flow. It does not know cookies, React state, or Firestore SDK syntax.

Each use case knows one persistence operation. It does not know how the page renders the result.

---

## 8. How to Add a Feature

### Backend

1. Define serializable contracts in `features/<feature>/types.ts`.
2. Create one use-case file for each required persistence operation.
3. Create `services.ts` and compose those use cases into business operations.
4. Create `actions.ts`; authenticate, validate input, and call the service.

### Frontend

5. Add feature components under `features/<feature>/components/`.
6. Add UI hooks under `features/<feature>/hooks/` when interaction logic should be extracted or shared.
7. Add the page under `src/app/` and compose the feature UI.
8. Handle loading, success, empty, and error states explicitly.

### Verification

9. Unit-test pure calculations and service orchestration.
10. Integration-test use cases with the Firebase Emulator.
11. Test actions for authentication, validation, and safe errors.
12. Run lint, tests, type checking, and the production build.

### Quick checklist

```text
[ ] Page/component imports actions, never services or use cases
[ ] Action calls a service, never a use case or Firestore
[ ] Service contains orchestration/rules, never Firestore access
[ ] Use case contains one persistence operation
[ ] Shared values cross layers through typed, serializable contracts
[ ] UI distinguishes errors from valid empty data
[ ] No circular feature dependency was introduced
```

---

## 9. Naming Conventions

| Item | Convention | Example |
|---|---|---|
| Feature folder | `kebab-case` | `features/attendance/` |
| Action file | `actions.ts` | `features/events/actions.ts` |
| Service file | `services.ts` | `features/events/services.ts` |
| Use case file | `<verb>-<subject>.usecase.ts` | `get-event-by-id.usecase.ts` |
| Feature type file | `types.ts` | `features/events/types.ts` |
| Pure calculation file | Descriptive plural/singular name | `calculations.ts` |
| Component | `kebab-case.tsx` | `attendance-ledger-view.tsx` |
| React hook | `use-<name>.ts` | `use-auth.ts` |
| Action function | `<verb><Subject>Action` | `getEventsAction` |
| Service function | `<verb><Subject>Service` | `getEventsService` |
| Use-case function | `<verb><Subject>UseCase` | `getEventByIdUseCase` |

Keep `actions.ts` and `services.ts` flat while they remain readable. Split them into folders only when navigation materially improves; preserve the same layer boundary after splitting.

---

## 10. Short Cross-Cutting Rules

These rules protect the layer boundaries without duplicating the System Architecture Guide:

- Every protected action uses `withAuth`.
- Auth actions call auth services even though they skip `withAuth`.
- The authenticated Firebase UID is the `userId` ownership key; the university `studentId` is not an auth key.
- Actions validate untrusted input before service execution.
- Use cases return explicitly mapped, serializable data.
- Errors are converted to safe `ActionResult` failures at the action boundary.
- The frontend never turns a failed result into a fake successful empty/zero state.
- Domain Firestore access through `adminDb` stays in use cases; `adminAuth` stays in auth services and backend infrastructure.
- Business requirements, access levels, subscription rules, schemas, soft deletes, auditing, and caching follow `FUNCTIONAL_REQUIREMENTS_SPECIFICATION.md` and `SYSTEM_ARCHITECTURE_GUIDE.md`.

---

## 11. Architecture Review Checklist

When reviewing a feature, follow the imports from the frontend inward:

```text
Page / Component / Hook
        ↓
Action
        ↓
Service
        ↓
Use Case
        ↓
Firebase
```

Reject the change if it skips a layer, reverses the dependency direction, places domain Firestore access outside a use case, or places business rules in the frontend/action. Server-only authentication infrastructure remains the explicit auth-service exception.

The architecture is successful when a developer can answer these questions immediately:

1. Is this presentation or interaction code? Put it in the frontend files.
2. Is this a frontend-callable backend operation? Put it in an action.
3. Is this business flow or orchestration? Put it in a service.
4. Is this one Firebase/Firestore operation? Put it in a use case.
5. Is this data shared across layers? Put a serializable contract in `types.ts`.

---

## Version History

| Version | Date | Change |
|---|---|---|
| 2.1.0 | 2026-09-30 | Refocused the document on frontend/backend separation and the mandatory Actions → Services → Use Cases flow |
