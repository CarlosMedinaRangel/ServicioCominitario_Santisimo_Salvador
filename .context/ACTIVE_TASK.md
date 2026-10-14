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

- [ ] **D-30:** Move Swagger from `/api` to `/docs` in `main.ts`
- [ ] **D-04:** Remove test routes (`/private`, `/private2`, `/private3`) from `auth.controller.ts`
- [ ] **D-10:** Remove `EmpleadosModule` from exports in `empleados.module.ts`
- [ ] **D-03:** Remove JWT token from login response body (keep only in cookie)
- [ ] **D-26:** Add proper types for `start_date` in `empleados.service.ts`

### Phase 3: Test Bootstrap

- [ ] Verify Jest config works: `bun test`
- [ ] Add first unit test: `crypto.service.spec.ts`
- [ ] Add first unit test: `documents.service.spec.ts`

### Phase 4: Verification

- [ ] Run lint: `bunx eslint "src/**/*.ts" --fix`
- [ ] Run tests: `bun test`
- [ ] Run build: `bun run build`

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
