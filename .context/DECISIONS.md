# DECISIONS.md — Architectural Decision Records

> Last updated: 2026-10-05
> Scope: ServicioComunitario_Santisimo_Salvador + Servicio_Comunitario_Frontend

---

## ADR-001: Use TypeORM with synchronize:true for Prototype

**Date:** 2026-06-29
**Status:** Accepted (Prototype Phase)

**Context:**
The school's data structure is unknown. We don't have the real XLS export yet. Need to iterate quickly on schema.

**Decision:**
Use TypeORM with `synchronize: true` to auto-create tables from entities. No migrations for now.

**Consequences:**
- ✅ Fast iteration on schema changes
- ✅ No migration files to manage during prototype
- ❌ Schema changes are not tracked in version control
- ❌ Destructive changes possible on restart
- ⚠️ Must migrate to proper migrations before production (D-01)

**Related Debt:** D-01

---

## ADR-002: AES-256-GCM QR Seals for Document Verification

**Date:** 2026-09-22
**Status:** Accepted (Permanent)

**Context:**
Documents are printed and physically distributed. Need tamper-proof verification that doesn't require online database lookup for basic authenticity.

**Decision:**
Use AES-256-GCM encryption for QR code payloads with format:
`INSTITUTION-SUBTYPE:VERSION:iv.authTag.cipher`

**Consequences:**
- ✅ Tamper-proof (auth tag detects modification)
- ✅ Self-contained verification (no DB needed for authenticity check)
- ✅ Supports multiple document types (DOC, EDID, DID, SDID)
- ❌ Key management is critical — secret must be secure
- ⚠️ Format is a public contract — printed documents depend on it

**Related Debt:** None

---

## ADR-003: Cookie-Based JWT Authentication

**Date:** 2026-09-24
**Status:** Accepted (Permanent)

**Context:**
XSS attacks can steal tokens from localStorage. Need secure token storage.

**Decision:**
Store JWT in httpOnly cookie with `__Host-` prefix in production. Cookie is automatically sent by browser, not accessible via JavaScript.

**Consequences:**
- ✅ Protected from XSS token theft
- ✅ Automatic on subsequent requests
- ✅ `sameSite` attribute provides CSRF protection
- ❌ Requires CORS configuration with `credentials: true`
- ❌ Cross-origin requests need proper `sameSite: none; secure: true`

**Related Debt:** D-03 (JWT also in response body — should remove)

---

## ADR-004: Single Canonical Axios Instance (Frontend)

**Date:** 2026-10-05
**Status:** Accepted

**Context:**
Two axios instances existed: `SantisimoApi.ts` (bare) and `services/api.ts` (with interceptor). Created confusion and inconsistent error handling.

**Decision:**
Use only `services/api.ts` as canonical axios instance. Deprecate `SantisimoApi.ts`. All API calls go through typed objects with Zod validation.

**Consequences:**
- ✅ Consistent 401 handling across all requests
- ✅ Zod validation at API layer
- ✅ Single source of truth for API configuration
- ❌ Migration required for existing code using SantisimoApi

**Related Debt:** D-08

---

## ADR-005: TanStack Query + Zustand for State Management

**Date:** 2026-07-03
**Status:** Accepted (Permanent)

**Context:**
Need clear separation between server state (API data) and client state (UI, auth, theme).

**Decision:**
- TanStack React Query for server state (data fetching, caching, invalidation)
- Zustand for client state (auth, theme, UI preferences)

**Consequences:**
- ✅ Clear separation of concerns
- ✅ Automatic caching and revalidation for server data
- ✅ Minimal boilerplate for client state
- ❌ Two state management patterns to learn
- ❌ Must be careful not to mix server/client state incorrectly

**Related Debt:** None

---

## ADR-006: Column-Mapping Import UI for Unknown XLS

**Date:** 2026-08-09
**Status:** Accepted (Temporary — replace when real data arrives)

**Context:**
School's legacy software can export XLS, but we don't have the actual file yet. Schema is unknown.

**Decision:**
Build flexible import UI with column mapping. Admin uploads XLS, maps columns to system fields, imports data.

**Consequences:**
- ✅ Can handle any XLS schema
- ✅ No assumptions about column names/order
- ✅ Validates data during import
- ❌ Extra UI complexity
- ❌ Must be updated when real schema is known

**Related Debt:** None

---

## ADR-007: TypeScript Classes for pdfmake Reports

**Date:** 2026-07-17
**Status:** Accepted (Permanent)

**Context:**
Document templates not finalized. Need ability to swap layouts without changing business logic.

**Decision:**
Define pdfmake document structures as TypeScript functions/classes in `src/reports/`. Business logic calls these to generate PDFs.

**Consequences:**
- ✅ Templates are type-safe
- ✅ Easy to swap layouts
- ✅ Business logic separated from presentation
- ❌ Must maintain TypeScript types for pdfmake

**Related Debt:** None

---

## ADR-008: Bun as Primary Package Manager

**Date:** 2026-09-22
**Status:** Accepted

**Context:**
Need faster installs and modern tooling. Team has mixed preferences.

**Decision:**
Use Bun as primary package manager. Keep npm lockfile for teammates who prefer npm.

**Consequences:**
- ✅ Faster installs
- ✅ Built-in test runner
- ✅ Modern tooling
- ❌ Teammates must install Bun
- ❌ Two lockfiles to maintain

**Related Debt:** D-14

---

## ADR-009: Testing Stack — Jest + Vitest + Playwright

**Date:** 2026-10-05
**Status:** Accepted

**Context:**
Need testing strategy for both backend and frontend. Backend uses NestJS (Jest standard), frontend uses Vite (Vitest native).

**Decision:**
- Backend: Jest + ts-jest + supertest
- Frontend: Vitest + React Testing Library
- E2E: Playwright (browser-based critical paths)

**Consequences:**
- ✅ Each framework fits its ecosystem
- ✅ Fast feedback loops
- ✅ Good tooling support
- ❌ Three test frameworks to maintain
- ❌ Must write different test syntax for each

**Related Debt:** D-11

---

## ADR-010: Deploy to Free Tiers (Vercel + Render)

**Date:** 2026-10-05
**Status:** Accepted (Planned)

**Context:**
School cannot spend money on hosting. Need free tier deployment.

**Decision:**
- Frontend: Vercel (static build from Vite)
- Backend: Render (Node.js service)
- Database: Render PostgreSQL (free tier)

**Consequences:**
- ✅ No hosting costs
- ✅ Good developer experience
- ✅ Auto-deploy from Git
- ❌ Limited resources on free tier
- ❌ Cold starts on Render
- ❌ Need Dockerfile for Render (D-20)

**Related Debt:** D-20

---

## ADR-011: Strict Allowlist Projection (toSafeUser) & Universal Column Exclusions

**Date:** 2026-10-25
**Status:** Accepted (Permanent)

**Context:**
Entities accumulate sensitive columns over time (`password`, `failedLoginAttempts`, `lockedUntil`, `lastFailedAttemptAt`, `publicId`). Blacklist destructuring (`const { password, ...rest } = user`) leaks newly added sensitive columns to clients by default.

**Decision:**
1. Universal Sensitive Column Rule: All security, credential, and internal state columns declare `{ select: false }` and omit `@ApiProperty`.
2. Strict Allowlist Projection: Service and controller response paths must explicitly map entities through an explicit projection function (`toSafeUser`), guaranteeing newly added database columns are never leaked.
3. Standardized session check at `/auth/me` without infinite sliding-window token renewal.

**Consequences:**
- ✅ Dual-layer defense: database-level exclusion + API allowlist mapping
- ✅ Zero risk of leaking newly added sensitive entity columns
- ✅ Conforms to OWASP data exposure guidelines
- ❌ New public profile fields must be explicitly added to `toSafeUser`

**Related Debt:** D-03

---

## ADR-012: Deterministic Canonical Seeders with Schema Drift Tripwires

**Date:** 2026-10-25
**Status:** Accepted (Permanent)

**Context:**
Randomized mock data in seeders caused unstable test assertions, unique constraint collisions (empty string vs null), and drifted silently when entity definitions changed.

**Decision:**
1. Single Source of Truth: Canonical user and employee archetypes defined in `src/seed/data/*.canonical.ts`.
2. Tripwires: All archetypes strongly bound via `satisfies EntityData<T>`. TypeScript compilation immediately fails if an entity column is added, renamed, or deleted without updating canonical data.
3. Standalone CLI: Independent executable `bun run seed` (`src/seed/run-seed.ts`) alongside Swagger endpoint.
4. Cascade-safe topological deletion order (`groups` before `schedules`).

**Consequences:**
- ✅ 100% deterministic local and test environment data
- ✅ Compile-time schema drift tripwires prevent silent entity rot
- ✅ Fast, repeatable database resets via CLI and HTTP
- ❌ Mock data fixtures must be maintained in sync with entity changes

**Related Debt:** D-05, D-11
