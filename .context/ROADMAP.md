# ROADMAP.md — Project Backlog & Technical Debt

> Last updated: 2026-10-25
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
| D-03 | JWT returned in JSON body + cookie | `resolved` | Token stripped from response body across login and /auth/me (cookie only). Strict allowlist projection (toSafeUser) & universal { select: false } sensitive columns |
| D-04 | Test/private routes in controller | `resolved` | Removed /private* test routes from auth.controller |
| D-05 | Prototype seedActivities generator in production service | `prototype-ok` | Remove `seedActivities` method & `POST /:id/seed-activities` endpoint. Note: The activities table in `constanciaMensual.report.ts` was commented out with `AI_PRESERVE_FEATURE`, making this generator orphaned and safe to deprecate/remove |
| D-07 | God service (`empleados.service.ts`, now 851 lines) | `pre-student-blocker` | Decompose into 4 focused domain services: `EmpleadosCrudService`, `ConstanciaService`, `ExcelUploadService`, and `EmployeeActivityService` to comply with the 200-line service target |
| D-09 | Orchestration + PDF generation entangled in employee CRUD | `pre-student-blocker` | Extract `ConstanciaService` to isolate pdfmake document definitions, cryptographic QR seal issuance, and employer signatory metadata out of `empleados.service.ts` |
| D-10 | `exports: [EmpleadosModule]` self-export | `resolved` | Cleaned exports array in EmpleadosModule |
| D-11 | No unit tests (0 spec files) | `resolved` | 27 test suites, 180 unit & Supertest integration tests (100% passing) |
| D-12 | No migrations despite config | `prototype-ok` | Deferred until schema final |
| D-13 | Misleading docs (explanation.md) | `fix-now` | Update or archive |
| D-17 | Hardcoded employer signatory defaults (`Carlos Medina`, `Director`) | `remove-on-real-data` | Move default signatories to config/environment variables (`EMPLOYER_NAME`, `EMPLOYER_POSITION`, `EMPLOYER_COMPANY`) once formal school representatives are designated |
| D-20 | No Dockerfile | `fix-now` | Create for Render deploy |
| D-26 | `as any` casts in start_date | `resolved` | Removed redundant casts in seed.service.ts |
| D-27 | bcrypt.hashSync in request path | `resolved` | Migrated to async await bcrypt.hash() across all services and seeders |
| D-28 | Excel upload executes N+1 queries without atomic transaction | `pre-student-blocker` | Wrap `uploadFile` batch processing in `dataSource.transaction` / `QueryRunner`. Roll back all user/employee mutations atomically on error; optimize lookups with bulk/batch queries |
| D-29 | Direct generic Repository injection instead of custom repository classes | `pre-student-blocker` | Implement dedicated repository classes extending `Repository<T>` (`EmployeeRepository`, `UserRepository`, etc.) to encapsulate domain queries away from services. Execute in Phase 2 alongside D-07 decomposition to avoid invalidating test mocks prematurely |
| D-30 | Swagger at /api conflicts | `resolved` | Mounted at /docs in main.ts |

---

## Frontend Debt

| ID | Description | Tag | Notes |
|----|-------------|-----|-------|
| D-08 | Dual axios instances | `resolved` | Centralized to src/api/client.ts |
| D-21 | authStatus always "checking" on reload | `prototype-ok` | Acceptable UX for now |
| D-22 | RegisterAction in wrong layer | `resolved` | Centralized to authApi.register() in src/api/auth.api.ts |
| D-23 | 4 QR libraries | `defer` | All kept (3 purposes) |
| D-25 | Very new majors (React 19, Vite 8) | `monitor` | Watch for breakage |
| D-31 | Missing backward navigation / return button in Edit Employee flow | `resolved` | Added return controls and back arrows in edit/register views |
| D-32 | Comprehensive responsive design deficit: UI adapted solely for mobile, missing desktop & tablet adaptations across all pages | `fix-now` | Global platform views (`pages/`) |
| D-33 | Paginated API Response Zod Schemas | `fix-now` | Adapt frontend Zod schemas in `src/schemas/` to handle structured paginated wrapper (`{ data: T[], total, page, totalPages }`) for `/empleados` and `/documents` |

---

## God Pattern Inventory

### Backend
| File | Lines | Decomposition Plan |
|------|-------|-------------------|
| `empleados.service.ts` | 851 | Split into `EmpleadosCrudService`, `ConstanciaService`, `ExcelUploadService`, `EmployeeActivityService` |

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
| Backend Test Suite Inventory | `.context/TEST_SUITE_INVENTORY.md` | Backend (Jest/Supertest Reference) |

**Rule:** Read the relevant SPEC file before implementing feature-related changes.

---

## Feature Backlog

### Phase 1: Core Stabilization (Current)

- [x] Fix D-03: Remove JWT from response body & enforce allowlist projection (`toSafeUser`)
- [x] Fix D-04: Remove test routes from controller
- [x] Fix D-10: Remove invalid module export
- [x] Fix D-26: Add proper types for start_date (Removed redundant as any in seed.service.ts)
- [x] Fix D-30: Move Swagger to /docs
- [x] Fix D-08: Consolidate axios instances (Resolved in src/api/client.ts)
- [x] Fix D-22: Move RegisterAction to correct layer (Resolved in src/api/auth.api.ts)
- [x] Fix D-31: Add backward options/arrows in Edit Employee and Profile flows (Resolved in frontend)
- [ ] Fix D-32: Adapt platform UI for desktop/tablet screens (currently mobile-only focused)
- [x] Fix D-33: Adapt frontend Zod schemas (`src/schemas/`) to handle structured paginated wrapper (`{ data: T[], total, page, totalPages }`) for `/empleados` and `/documents`
- [x] Dynamic Documents & Queries: Endpoints `/documents` and `/documents/recipient/:id` wired to real PostgreSQL server-side queries with pagination, text search (`recipientName`/`recipientIdentifier` and `issuedByName`), filters (`status`, `documentType`), and date ranges (`from`/`to`)
- [x] Dynamic Document Naming & Metadata: Standardized document title and download file naming convention `<Tipo de Doc> (<Dia Mes Año>) - <Nombre Destinatario> <Cedula Parseada>` across pdfmake reports, backend Content-Disposition headers, and client programmatic downloads
- [x] Fix D-11: Bootstrap backend test infrastructure (27 Jest & Supertest suites, 180 tests covering Crypto, Documents, Turnstile, Auth, Roles, Cookies, Employees soft-delete/carnet/schedules/reports/pagination/Excel)
- [x] Standalone Seeder CLI: Deterministic canonical data (`satisfies EntityData<T>`), CLI script `bun run seed`, schema drift tripwires, and null-safe unique column constraints
- [x] Auth Endpoint Refactoring: Standardized `/auth/check-status` to `/auth/me` without sliding cookie renewal, synced with frontend `auth.api.ts`
- [x] Universal Sensitive Column Rule: Enforced `{ select: false }` and omitted `@ApiProperty` on internal security/audit fields across entities

### Phase 2: Architecture Cleanup & Historical Foundations

- [ ] Fix D-07: Decompose `empleados.service.ts` (851 lines -> 4 focused services: CRUD, Constancias, ExcelUpload, Activities)
- [x] Fix D-27: Change bcrypt.hashSync to async (Fully verified across auth, empleados, and seeders)
- [ ] Fix D-28: Add atomic transaction (`dataSource.transaction` / `QueryRunner`) and bulk optimization to Excel `uploadFile`
- [ ] Fix D-29: Create custom repository classes extending `Repository<T>` for domain queries (aligned with D-07 decomposition)
- [ ] Fix D-09: Extract `ConstanciaService` (isolate pdfmake reports and cryptographic QR seal issuance from employee CRUD)
- [ ] Implement `AcademicPeriod` entity (Year/Lapso) to historically bind `schedules` and `groups` (Advanced from Phase 6 to establish clean relational foundations before real XLS data arrival)

### Phase 3: Real Data Integration

- [ ] Receive real XLS from school
- [ ] Update column mapping based on actual schema
- [ ] Fix D-17: Move hardcoded employer signatories (`Carlos Medina`, `Director`) to config/environment variables
- [ ] Remove mock data (D-18: Mock payroll data in frontend and mock doc templates in backend)
- [ ] Remove prototype seed logic from production (D-05: Remove `seedActivities` generator & `POST /:id/seed-activities` endpoint; activities table is already preserved in `constanciaMensual.report.ts` comment block)

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
- [x] Create AcademicPeriod entity (Advanced to Phase 2)
- [ ] Add student document types
- [ ] Build student registration flow

---

## Unrelated Findings

> Log issues discovered during milestones that are out of scope.

| Date | Finding | Discovered In | Status |
|------|---------|---------------|--------|
| 2026-10-05 | Initial audit completed | overview.md | Logged |
| 2026-10-19 | In Edit Employee, missing backward navigation options/arrows | Edit Employee Flow | Logged |
| 2026-10-19 | Platform UI is currently adapted primarily for mobile only; desktop/tablet responsive layout needed | Global Frontend UI | Logged |
| 2026-10-19 | Study fallback employer defaults (D-17): determine whether signatories should be directory/high-member staff or team members, and configure via env vars | Document Generation | To Study |
| 2026-10-19 | Study constancia wording vs. DB schema: check whether employeeHours (Employee.hours_per_day) should say "horas diarias" or be calculated as "horas semanales" | Document Reports | To Study |
| 2026-10-28 | In `activity-service.service.spec.ts` line 80, `expect(service.log()).resolves.not.toThrow()` throws in Bun Test because `.resolves` unwraps `undefined` (should be `await expect(service.log()).resolves.toBeUndefined()`) | Test Suite (`activity-service.service.spec.ts`) | Logged |

---

## Ideas & Future

- Template engine for documents (JSON-driven layouts)
- Worker threads for Excel parsing
- Streaming XLSX import for large files
- Employee career history table
- Monthly activities breakdown table in constancia report (Protected in `src/reports/constanciaMensual.report.ts` via `AI_PRESERVE_FEATURE` until historical activity recording is fully standardized)
- Academic period management (Advanced to Phase 2)
- Payroll receipts module (Periodic monthly issuance)
- Optional DB-level snapshot integrity hash (embedding `sha256(metadata)` in QR token to detect unauthorized direct SQL modifications in DB)
