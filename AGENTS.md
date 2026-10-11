<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.


# Project Guidelines & Mandatory Specifications

## 1. Mandatory Specification & Architecture Consultation
For every inquiry, task, plan, code modification, or architectural decision in this workspace, you MUST:
- **Consult Functional Requirements**: Review [`FUNCTIONAL_REQUIREMENTS_SPECIFICATION.md`](FUNCTIONAL_REQUIREMENTS_SPECIFICATION.md) to ensure all features, business logic, workflows, validation rules, user roles, and UI/UX flows strictly align with the documented requirements.
- **Consult System Architecture Guide**: Review [`SYSTEM_ARCHITECTURE_GUIDE.md`](SYSTEM_ARCHITECTURE_GUIDE.md) for architectural patterns, backend data contracts, Firebase/Firestore schema conventions, state management, caching, security rules, and integration standards.
- **Maintain Consistency & Alignment**: Ensure all proposed solutions, code changes, and responses remain consistent with the architecture and requirements specified in these documents. Reference and verify against them before taking action.

## 2. Mandatory Implementation Plan & Open Questions
- **Implementation Plan Required**: For every user inquiry or task request, you MUST first respond with a structured implementation plan prior to executing major code changes.
- **Open Questions & Suggestions**: Every response / implementation plan MUST include an **Open Questions / Suggestions** section asking for clarification, design decisions, edge-case considerations, or alternative suggestions.
<!-- END:nextjs-agent-rules -->
