# ROADMAP.md — Project Backlog & Technical Debt

> Last updated: 2026-10-05
> Scope: Both projects (Backend + Frontend)

---

## Debt Tag Legend

| Tag | Meaning |
|-----|---------|
| `prototype-ok` | Acceptable now, remove before production |
| `fix-now` | Should fix in next milestone |
| `pre-student-blocker` | MUST resolve before student module |
| `remove-on-real-data` | Remove when real XLS/API data arrives |
| `defer` | Low priority, document but don't fix yet |

---

## Backend Debt

| ID | Description | Tag | Notes |
|----|-------------|-----|-------|
| D-01 | `synchronize: true` — no migrations | `prototype-ok` | Migrate to migrations before production |
| D-02 | Default crypto secret fallback | `prototype-ok` | Set QR_SECRET_KEY in production env |
| D-03 | JWT returned in JSON body + cookie | `fix-now` | Remove token from response body |
| D-04 | Test/private routes in controller | `fix-now` | Remove `/private`, `/private2`, `/private3` |
| D-05 | Seed/demo logic in production service | `prototype-ok` | Remove seedActivities before deploy |
| D-07 | God service (empleados.service.ts, 530 lines) | `pre-student-blocker` | Split into 4 services |
| D-09 | Orchestration + PDF entangled | `pre-student-blocker` | Extract ConstanciaService |
| D-10 | `exports: [EmpleadosModule]` self-export | `fix-now` | Remove invalid export |
| D-11 | No unit tests (0 spec files) | `pre-student-blocker` | Add Jest tests |
| D-12 | No migrations despite config | `prototype-ok` | Deferred until schema final |
| D-13 | Misleading docs (explanation.md) | `fix-now` | Update or archive |
| D-17 | Hardcoded defaults (employer names) | `remove-on-real-data` | Move to config/env |
| D-20 | No Dockerfile | `fix-now` | Create for Render deploy |
| D-26 | `as any` casts in start_date | `fix-now` | Add proper types |
| D-27 | bcrypt.hashSync in request path | `pre-student-blocker` | Change to async |
| D-28 | Excel upload N+1, no transaction | `pre-student-blocker` | Use QueryRunner transaction |
| D-29 | No repository abstraction | `pre-student-blocker` | Create custom repositories |
| D-30 | Swagger at /api conflicts | `fix-now` | Move to /docs |

---

## Frontend Debt

| ID | Description | Tag | Notes |
|----|-------------|-----|-------|
| D-08 | Dual axios instances | `fix-now` | Consolidate to services/api.ts |
| D-21 | authStatus always "checking" on reload | `prototype-ok` | Acceptable UX for now |
| D-22 | RegisterAction in wrong layer | `fix-now` | Move to stores/actions |
| D-23 | 4 QR libraries | `defer` | All kept (3 purposes) |
| D-25 | Very new majors (React 19, Vite 8) | `monitor` | Watch for breakage |

---

## God Pattern Inventory

### Backend
| File | Lines | Decomposition Plan |
|------|-------|-------------------|
| `empleados.service.ts` | 530 | Split into CRUD, Constancia, Upload, Seed services |

### Frontend Hooks
| File | Lines | Decomposition Plan |
|------|-------|-------------------|
| `useAdminEmployees.ts` | 158 | Split into query, filters, mutations |
| `useWorkerConstancias.ts` | 143 | Split into comprobantes, dialog, remove mock |
| `useAdminConstancias.ts` | 102 | Split into admin comprobantes, stats |

### Frontend Pages
| File | Lines | Decomposition Plan |
|------|-------|-------------------|
| `AdministracionPage.tsx` | 383 | Extract modal controllers |
| `VerificarDocumentoPage.tsx` | 389 | Extract useVerification, useClipboardPaste |
| `AdminConstanciasPage.tsx` | 266 | Extract upload flow controller |
| `LoginPage.tsx` | ~350 | Extract turnstile hook |

---

## Feature Specs

| Spec | File | Cross-Repo |
|------|------|------------|
| Employee Management | `.context/SPEC-employee-management.md` | Yes (backend + frontend) |
| Document Generation | `.context/SPEC-document-generation.md` | Yes (backend + frontend) |

**Rule:** Read the relevant SPEC file before implementing feature-related changes.

---

## Feature Backlog

### Phase 1: Core Stabilization (Current)

- [ ] Fix D-03: Remove JWT from response body
- [ ] Fix D-04: Remove test routes from controller
- [ ] Fix D-10: Remove invalid module export
- [ ] Fix D-20: Create Dockerfile for backend
- [ ] Fix D-26: Add proper types for start_date
- [ ] Fix D-30: Move Swagger to /docs
- [ ] Fix D-08: Consolidate axios instances
- [ ] Bootstrap test infrastructure (Jest + Vitest)

### Phase 2: Architecture Cleanup

- [ ] Fix D-07: Decompose empleados.service.ts
- [ ] Fix D-27: Change bcrypt.hashSync to async
- [ ] Fix D-28: Add transaction to Excel upload
- [ ] Fix D-29: Create custom repositories
- [ ] Fix D-09: Extract ConstanciaService

### Phase 3: Real Data Integration

- [ ] Receive real XLS from school
- [ ] Update column mapping based on actual schema
- [ ] Fix D-17: Move hardcoded defaults to config
- [ ] Remove mock data (D-18)
- [ ] Remove seed logic from production (D-05)

### Phase 4: Document Templates

- [ ] Receive real document templates from school
- [ ] Update pdfmake report definitions
- [ ] Test QR generation with real data

### Phase 5: Deployment

- [ ] Set up Vercel (frontend)
- [ ] Set up Render (backend + database)
- [ ] Configure environment variables
- [ ] Test CORS with production URLs
- [ ] Remove prototype shortcuts (D-01, D-02)

### Phase 6: Student Module (Future)

- [ ] Resolve all `pre-student-blocker` debt
- [ ] Design Student/Representative entities
- [ ] Create AcademicPeriod entity
- [ ] Add student document types
- [ ] Build student registration flow

---

## Unrelated Findings

> Log issues discovered during milestones that are out of scope.

| Date | Finding | Discovered In | Status |
|------|---------|---------------|--------|
| 2026-10-05 | Initial audit completed | overview.md | Logged |

---

## Ideas & Future

- Template engine for documents (JSON-driven layouts)
- Worker threads for Excel parsing
- Streaming XLSX import for large files
- Employee career history table
- Monthly activities breakdown table in constancia report (Protected in `src/reports/constanciaMensual.report.ts` via `AI_PRESERVE_FEATURE` until historical activity recording is fully standardized)
- Academic period management
- Payroll receipts module
