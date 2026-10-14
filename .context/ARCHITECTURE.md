# ARCHITECTURE.md — Backend (NestJS)

> Last updated: 2026-10-05
> Scope: ServicioCominitario_Santisimo_Salvador

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Runtime | Node.js | 20.x |
| Language | TypeScript | ^5.7.3 |
| Framework | NestJS | ^11.0.1 |
| ORM | TypeORM | ^1.0.0 |
| Database | PostgreSQL | 16.3 |
| Auth | JWT (Passport) + httpOnly cookies | — |
| Validation | class-validator + class-transformer | — |
| PDF | pdfmake + qrcode | — |
| Uploads | Cloudinary + multer | — |
| Rate Limiting | @nestjs/throttler | ^6.7.0 |
| Package Manager | Bun (primary), npm (secondary) | — |

---

## Project Structure

```
ServicioCominitario_Santisimo_Salvador/
├── src/
│   ├── app.module.ts          # Root module
│   ├── main.ts                # Bootstrap (prefix: api/, CORS, ValidationPipe)
│   ├── auth/                  # Authentication module
│   ├── empleados/             # Employee domain module
│   ├── documents/             # Document verification module
│   ├── crypto/                # AES-256-GCM QR seals
│   ├── reports/               # pdfmake report definitions
│   ├── printer/               # PDF generation service
│   ├── cloudinary/            # Image upload service
│   ├── seed/                  # Database seeding
│   ├── common/                # Filters, middleware
│   └── interfaces/            # Shared TypeScript interfaces
├── .context/                  # Agent memory bank
├── docker-compose.yml         # PostgreSQL + pgAdmin
├── package.json
└── AGENTS.md                  # Agent rules
```

---

## Conventions

### Module Pattern
```
src/[module]/
├── [module].module.ts
├── [module].controller.ts
├── [module].service.ts
├── dto/
│   ├── create-[entity].dto.ts
│   └── update-[entity].dto.ts
└── entities/
    └── [entity].entity.ts
```

### Naming
- Files: kebab-case (`empleados.service.ts`)
- Classes: PascalCase (`EmpleadosService`)
- Methods: camelCase (`findAll`, `findOne`)
- DTOs: `[Action][Entity]Dto` (`CreateEmpleadoDto`)
- Constants: UPPER_SNAKE_CASE (`JWT_SECRET`)

### Error Handling
```typescript
throw new BadRequestException('Message in Spanish');
throw new UnauthorizedException('Credenciales inválidas');
throw new NotFoundException('Recurso no encontrado');
```

### Database
- Primary keys: UUID (auto-generated)
- Soft delete: `isActive` boolean on User entity
- Timestamps: `@CreateDateColumn()`, `@UpdateDateColumn()`
- Relations: Explicit `@ManyToOne`, `@OneToMany` with lazy loading when possible

---

## Security Architecture

### Authentication Flow
1. User logs in → JWT signed with `JWT_SECRET`
2. JWT stored in httpOnly cookie (`auth_token`)
3. Cookie sent automatically on subsequent requests
4. `JwtStrategy` validates token and attaches user to request
5. `@Auth()` decorator applies guard to route

### Authorization
- `@Auth()` — requires valid JWT
- `@Auth(ValidRoles.admin)` — requires JWT + admin role
- `@RoleProtected(ValidRoles.admin)` — role check only
- `UserRoleGuard` — combined guard

### Rate Limiting
- Global: 30 requests/minute
- Auth endpoints: 5 requests/minute
- Document issuance: Limited per user per period

---

## Key Patterns

### Service Injection
```typescript
constructor(
  @InjectRepository(User)
  private readonly userRepository: Repository<User>,
  private readonly jwtService: JwtService,
) {}
```

### DTO Validation
```typescript
export class CreateEmpleadoDto {
  @IsString()
  @MinLength(1)
  position: string;

  @IsPositive()
  hours_per_day: number;
}
```

### Controller Decorators
```typescript
@Post()
@Auth(ValidRoles.admin)
@ApiBearerAuth()
@ApiOperation({ summary: 'Crear empleado' })
@ApiResponse({ status: 201, description: 'Creado exitosamente' })
async create(@Body() dto: CreateEmpleadoDto) {
  return this.service.create(dto);
}
```

---

## Immutable Contracts

### QR Seal Format
```
INSTITUTION-SUBTYPE:VERSION:iv_b64url.authTag_b64url.cipher_b64url
Example: SS-DOC:v1:<iv>.<authTag>.<cipher>
```

**NEVER change:**
- Delimiter (`:`)
- AES-256-GCM algorithm
- 12-byte IV length
- 16-byte auth tag length
- Base64URL encoding

---

## Current Technical Debt

| ID | Description | Priority |
|----|-------------|----------|
| D-01 | `synchronize: true` — no migrations | prototype-ok |
| D-03 | JWT in response body + cookie | fix-now |
| D-04 | Test routes in controller | fix-now |
| D-07 | God service (empleados.service.ts) | pre-student-blocker |
| D-27 | bcrypt.hashSync in request path | pre-student-blocker |
| D-30 | Swagger at /api conflicts | fix-now |

Full debt register: See `overview.md` §6
