# ACTIVE_TASK.md — Backend Current Checklist

> **⚠️ Only ONE active task file at a time. When starting new feature, copy tasks here. When done, clear or archive.**

---

## Current Task: Critical Backend Fixes

**Started:** 2026-10-05
**Milestone:** Fix critical debt before feature work

**Roles:** Planner → Coder → Tester

---

### Phase 1: Infrastructure

- [x] Create `.context/` folder structure
- [x] Create `ARCHITECTURE.md`
- [x] Create `DECISIONS.md`
- [x] Create `ROADMAP.md`
- [x] Create `ACTIVE_TASK.md`

### Phase 2: Critical Fixes

- [x] **D-30:** Move Swagger from `/api` to `/docs` in `main.ts`
- [x] **D-04:** Remove test routes (`/private`, `/private2`, `/private3`) from `auth.controller.ts`
- [x] **D-10:** Remove `EmpleadosModule` from exports in `empleados.module.ts`
- [x] **D-03:** Remove JWT token from login & `/auth/me` response body (httpOnly cookie only). Apply universal `{ select: false }` and `toSafeUser` allowlist projection.
- [x] **D-26:** Add proper types for `start_date` in `seed.service.ts` / `employees.canonical.ts`
- [x] **D-27:** Change all `bcrypt.hashSync` calls to async `await bcrypt.hash()` in request paths

### Phase 3: Test Bootstrap & Infrastructure

- [x] Verify Jest config works: `bun run test`
- [x] Add pure unit tests: `crypto.service.spec.ts`, `qr-generator.service.spec.ts`, `turnstile.service.spec.ts`
- [x] Add guard & strategy tests: `user-role.guard.spec.ts`, `jew.strategy.spec.ts`
- [x] Add exhaustive Supertest HTTP integration suites: `auth.http.spec.ts`, `empleados.http.spec.ts`, `documents.http.spec.ts`, `seed.http.spec.ts`
- [x] Implement deterministic canonical fixtures (`test/fixtures/`) with `satisfies EntityData<T>` tripwires
- [x] Build standalone Seeder CLI (`bun run seed`) with 20 users, 19 employees, 16 schedules, 16 groups, 6 activities, 24 documents

### Phase 4: Verification

- [x] Run lint: `bunx eslint "src/**/*.ts" --fix`
- [x] Run tests: `bun run test` (27 suites, 180 tests, 100% passing)
- [x] Run build: `bun run build`
- [x] Merge PRs #15 (Seeder), #16 (Auth & Security), #17 (Tests) into `origin/develop`

---

### Phase 4: Dynamic Documents & Query Integration

- [x] Wire `GET /documents` to real TypeORM database query with pagination, search, status, type, and date filters
- [x] Wire `GET /documents/recipient/:id` to real TypeORM database query with recipient self-access security and filtering
- [x] Standardize document titles in pdfmake (`employementLetterByID.report.ts`, `constanciaMensual.report.ts`)
- [x] Standardize HTTP response `Content-Disposition` header filenames with UTF-8 encoding support
- [x] Verify all 40 unit and Supertest integration tests in `src/documents` pass (`bun test src/documents`)

---

## Next Active Milestone: Frontend Vitest Test Bootstrap & Period Management

**Goal:** Bootstrap Vitest test suites (`auth.schema.test.ts`, `empleado.schema.test.ts`) and prepare AcademicPeriod domain architecture.

---

## Notes

- All commands use PowerShell syntax
- Use `bun` as package manager
- Follow conventional commits
- Document unrelated findings in `ROADMAP.md`

---

## Completed Tasks Archive

### 2026-10-05: Initial Setup
- Created `.context/` folder structure
- Created all memory bank files
- Identified critical debt items
