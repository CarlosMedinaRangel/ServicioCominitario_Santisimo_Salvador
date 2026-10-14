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
| POST | `/api/empleados/:id/activities/seed` | Admin | Seed demo activities |
| GET | `/api/empleados/Constancia-Empleado/:id` | Admin | Generate constancia PDF |

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

## Bulk Import (XLSX)

### Current Flow
1. Admin uploads XLSX file
2. Column mapping modal appears
3. Admin maps XLS columns to system fields
4. Backend processes rows:
   - Find or create User by email/cedula
   - Find or create Employee by userId
   - Returns `{ success, created, updated, errors[] }`

### Fields to Map
| Field | Required | Notes |
|-------|----------|-------|
| email | Yes* | *or cedula |
| cedula | Yes* | *or email, normalized |
| fullName | Yes | Employee name |
| position | No | Default: "General" |
| start_date | No | Default: today |
| work_time | No | Default: "08:00:00" |
| hours_per_day | No | Default: 8 |
| work_schedule | No | Default: "Lunes a Viernes, 8am - 4pm" |
| telefono | No | Normalized to digits |

### Known Issues (D-28)
- N+1 queries (no batching)
- No transaction (partial failure risk)
- Sync bcrypt in loop (blocking)

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

| ID | Description | Tag |
|----|-------------|-----|
| D-07 | God service (empleados.service.ts) | pre-student-blocker |
| D-26 | `as any` casts in start_date | fix-now |
| D-28 | Excel upload N+1, no transaction | pre-student-blocker |
| D-29 | No repository abstraction | pre-student-blocker |

---

## Testing Checklist

- [ ] Unit test: Cedula normalization
- [ ] Unit test: Smart ID lookup (UUID vs cedula)
- [ ] Unit test: Soft delete behavior
- [ ] Integration test: CRUD endpoints
- [ ] Integration test: Bulk import with valid data
- [ ] Integration test: Bulk import with invalid rows
- [ ] E2E test: Create employee → view profile → generate constancia
