# Feature Spec: Employee Management

> Cross-repo feature spec. Read this before implementing employee-related changes.
> Related ADRs: ADR-006 (Column-Mapping Import), ADR-001 (TypeORM synchronize)

---

## Overview

Employee management is the core domain feature. It handles employee CRUD, profile management, bulk import, and serves as the foundation for document generation.

---

## Domain Model

### Entities (Backend)

**User** (`src/auth/entities/auth.entity.ts`)
- `id: UUID` (PK)
- `email: string`
- `fullName: string`
- `cedula: string` (normalized: V + digits, no dots)
- `telefono: string` (normalized: digits only)
- `password: string` (bcrypt hashed)
- `isActive: boolean` (soft delete)
- `roles: string[]` (e.g., `['user']`, `['admin']`)
- `imagen: string` (Cloudinary URL)
- `publicId: string` (Cloudinary ID)

**Employee** (`src/empleados/entities/employee.entity.ts`)
- `userId: UUID` (FK to User, PK)
- `position: string` (cargo)
- `start_date: string` (fecha de ingreso)
- `work_time: string` (hora de entrada, e.g., "08:00")
- `hours_per_day: number`
- `work_schedule: string` (e.g., "Lunes a Viernes, 8am - 4pm")

**Related Entities:**
- `Schedule` — Employee teaching schedules
- `Group` — Employee groups/classes
- `Activity` — Employee activities (for constancia generation)

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/empleados` | Admin | List all (optional `?status=all\|inactive`) |
| GET | `/api/empleados/:id` | Admin | Get one (UUID or cedula) |
| POST | `/api/empleados` | Admin | Create employee |
| PATCH | `/api/empleados/:id` | Admin | Update employee |
| DELETE | `/api/empleados/:id` | Admin | Soft-delete (set isActive=false) |
| PATCH | `/api/empleados/:id/toggle-status` | Admin | Toggle active status |
| GET | `/api/empleados/:id/schedules` | Admin | Get schedules |
| GET | `/api/empleados/:id/groups` | Admin | Get groups |
| GET | `/api/empleados/:id/activities` | Admin | Get activities |
| POST | `/api/empleados/upload` | Admin | Bulk XLSX/CSV nómina upload |
| GET | `/api/empleados/:id/constancia` | Admin | Generate constancia PDF |

---

## Frontend Components

### Pages
- `pages/AdministracionPage.tsx` — Employee list + admin actions
- `pages/PerfilEmpleadoPage.tsx` — Employee profile detail

### Hooks
- `hooks/Employees/useAdminEmployees.ts` — Employee list with filters
- `hooks/Employees/UseEmployeesByID.tsx` — Single employee
- `hooks/Employees/UseEmpleoyees.tsx` — All employees

### Components
- `components/features/AdminEmployeeTableRow.tsx`
- `components/features/AdminDeleteEmployeeModal.tsx`
- `components/features/AdminReactivateModal.tsx`
- `components/features/AdminGenerateConstanciaModal.tsx`
- `components/features/AdminUploadFileModal.tsx`
- `components/features/AdminColumnMappingModal.tsx`
- `components/features/AdminUploadBanner.tsx`

---

## Key Behaviors

### Cedula Normalization
```
Input: "v-12.345.678" → Output: "V12345678"
Input: "12345678" → Output: "V12345678"
Input: "V12345678" → Output: "V12345678"
```

### Smart ID Lookup
`findOne(id)` tries:
1. UUID format → lookup by `userId`
2. Otherwise → normalize cedula, lookup by `cedula`

### Soft Delete
`DELETE /api/empleados/:id` sets `user.isActive = false`. Employee record remains.

---

## Data Flow: Bulk Import

```
1. User uploads XLSX/CSV in Frontend (/administracion?upload=true)
2. Frontend parses headers, displays column mapping modal
3. User maps columns (cedula, nombre, cargo, etc.)
4. Frontend sends file + mapping JSON to POST /api/empleados/upload
5. Backend parses file with XLSX / PapaParse
6. For each row:
   a. Look up existing User by email or cedula
   b. If found → update user + employee fields
   c. If not found → create User (default password) + Employee
   d. If schedule info present → create/update Schedule records
7. Return summary: { success, created, updated, errors: [] }
```

---

## Cross-Repo Contracts

### Zod Schema (Frontend)
```typescript
// src/schemas/empleado.schema.ts
export const createEmpleadoSchema = z.object({
  userId: z.string().uuid(),
  position: z.string().min(1),
  start_date: z.coerce.date(),
  work_time: z.string().min(1),
  hours_per_day: z.coerce.number().positive(),
  work_schedule: z.string().min(1),
});
```

### DTO (Backend)
```typescript
// src/empleados/dto/create-empleado.dto.ts
export class CreateEmpleadoDto {
  @IsUUID()
  userId: string;

  @IsString()
  @MinLength(1)
  position: string;

  @IsDate()
  start_date: Date;

  @IsString()
  @MinLength(1)
  work_time: string;

  @IsPositive()
  hours_per_day: number;

  @IsString()
  @MinLength(1)
  work_schedule: string;
}
```

---

## Debt Items Related to This Feature

| ID | Description | Tag | Notes |
|----|-------------|-----|-------|
| D-07 | God service (empleados.service.ts) | `pre-student-blocker` | Target: Decompose into 3 domain services in `src/empleados/services/` |
| D-26 | `as any` casts in start_date | `resolved` | Removed redundant casts in `seed.service.ts` |
| D-28 | Excel upload N+1, no transaction | `pre-student-blocker` | Integrate `dataSource.transaction` in `ExcelUploadService` |
| D-29 | No repository abstraction | `pre-student-blocker` | Move to custom repository classes during Phase 2 |

---

## Testing Checklist

- [x] Unit test: Cedula normalization and smart search (`empleados.pagination.spec.ts`)
- [x] Unit test: Smart ID lookup UUID vs cedula (`empleados.pagination.spec.ts`)
- [x] Unit test: Soft delete behavior and toggle status (`empleados.soft-delete.spec.ts`)
- [x] Unit test: Employee manual creation with relations (`empleados.create.spec.ts`)
- [x] Unit test: Employee schedule and group updates (`empleados.update.spec.ts`)
- [x] Unit test: Bulk import with valid data and invalid rows (`empleados.excel.spec.ts`)
- [x] Integration test: CRUD endpoints and query filters (`empleados.http.spec.ts`)
- [x] Integration test: Bulk upload multipart endpoint (`empleados.http.spec.ts`)
- [x] E2E test: Create employee → view profile → generate constancia (`empleados.http.spec.ts`, `empleados.reports.spec.ts`)
