# Backend Agent Rules — Servicio Comunitario
# Stack: NestJS 11 | TypeORM | PostgreSQL 16.3 | Bun | PowerShell

---

## ROLES

| Role | Aliases | Trigger |
|------|---------|---------|
| **Planner** | Architect, Plan Mode | "Act as Planner" or "Plan milestone" |
| **Coder** | Builder, Execution Mode | "Act as Coder" or "Implement milestone" |
| **Tester** | Auditor, Verification Mode | "Act as Tester" or "Review milestone" |

---

## 1. OPERATIONAL BOUNDARIES & SCOPE

- Work in scoped milestones. Never modify more than 4 files in a single turn.
- Package Manager: Always use `bun` commands via PowerShell. Never delete `bun.lock` or `package-lock.json`.

### Surgical Edit Directives (MANDATORY)

**Make surgical edits only. Enforce minimal diffs:**

- Do NOT rewrite existing functions that do not require changes.
- Do NOT format or reorder unaffected lines.
- Do NOT restructure code that is already working correctly.
- Do NOT refactor code outside the current milestone scope.
- Change ONLY what is absolutely necessary for the task.
- When fixing a bug, fix ONLY that bug — do not "improve" surrounding code.
- When adding a feature, add ONLY the required code — do not reorganize existing patterns.

**Goal:** The diff should show exactly what changed and why. If a reviewer sees unrelated changes, the edit was too broad.

**Example of correct surgical edit:**
```diff
// Before
- bcrypt.hashSync(password, 10),
+ await bcrypt.hash(password, 10),
```

**Example of incorrect broad edit:**
```diff
// Before
- bcrypt.hashSync(password, 10),
+ const hashed = await bcrypt.hash(password, 10);
  const user = this.userRepository.create({
    ...UserData,
    imagen: secureUrl ?? CreateUserDto.imagen,
    publicId: publicId ?? CreateUserDto.publicId,
-   password: bcrypt.hashSync(password, 10),
+   password: hashed,
  });
  await this.userRepository.save(user);
- const { password: _, ...userInfo } = user;
- return userInfo;
+ const { password: _, ...safeUser } = user;
+ return safeUser;
```

### Unrelated Findings Protocol
- If an unrelated bug or linter issue is found outside the current milestone, DO NOT fix it.
- Document it in `.context/ROADMAP.md` with a `Found: <date>` tag.
- Continue with the current task only.

### Negative Constraints Against Lazy Code (NEVER DO THESE)

| Bad Practice | Correct Approach |
|--------------|------------------|
| Never fetch data inside `useEffect` | Use declarative query hooks (TanStack Query) |
| Never perform heavy transformations synchronously inside render cycles | Use `useMemo` or compute outside render |
| Never use `bcrypt.hashSync` in request paths | Use `await bcrypt.hash()` |
| Never store JWT in localStorage | Use httpOnly cookies |
| Never hardcode secrets or default keys | Use environment variables, fail if missing |
| Never use `console.log` in production code | Use NestJS `Logger` service |
| Never catch and swallow errors silently | Throw NestJS exceptions or log and rethrow |
| Never use `any` type without justification | Create proper TypeScript types |
| Never access database inside loops without batching | Use transactions or bulk operations |
| Never trust client-side validation alone | Always validate on backend with DTOs |
| Never expose internal error messages to client | Return generic messages, log details server-side |
| Never create new files when existing ones can be extended | Extend existing patterns unless new module is required |

**PowerShell commands:**
```powershell
bun run dev              # Dev server
bunx eslint "src/**/*.ts" --fix   # Lint
bun test                 # Tests
bun run build            # Build
```

---

## 2. IMMUTABLE PUBLIC CONTRACTS

**QR seal format in `src/crypto/` and `src/documents/`:**

```
Format: INSTITUTION-SUBTYPE:VERSION:iv_b64url.authTag_b64url.cipher_b64url
Example: SS-DOC:v1:<iv>.<authTag>.<cipher>
```

- Never change delimiters (`:`, `.`), AES-256-GCM, 12-byte IV, or 16-byte auth tag.
- Printed documents depend on this parser. Changes require human approval.

---

## 3. ARCHITECTURE RULES

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

### Naming Conventions
- Files: kebab-case (`empleados.service.ts`)
- Classes: PascalCase (`EmpleadosService`)
- Methods: camelCase (`findAll`, `findOne`)
- DTOs: `[Action][Entity]Dto` (`CreateEmpleadoDto`)
- Constants: UPPER_SNAKE_CASE (`JWT_SECRET`)

### Service Rules
- Use custom repository classes extending `Repository<Entity>` — not raw TypeORM `Repository`.
- Async crypto only: `await bcrypt.hash(password, 10)`. Never `bcrypt.hashSync` in request paths.
- Target ~200 lines per service. Hard limit 400 lines with justification comment.
- Split into `src/[module]/services/` when exceeded.
- Error handling: NestJS exceptions only (`BadRequestException`, `UnauthorizedException`).
- Logging: NestJS `Logger` service, not `console.log`.

### Controller Rules
- Every mutation needs `@Auth()` for authentication.
- Admin-only routes: `@Auth(ValidRoles.admin)` or `@RoleProtected(ValidRoles.admin)`.
- DTOs with class-validator: `whitelist: true`, `forbidNonWhitelisted: true`.
- Swagger decorators on all endpoints.
- Swagger mounts at `/docs`, NOT `/api`.

### Entity Rules
- Primary keys: UUID (auto-generated).
- Soft delete: `isActive` boolean on User entity. Never hard-delete.
- Timestamps: `@CreateDateColumn()`, `@UpdateDateColumn()`.
- Relations: Explicit `@ManyToOne`, `@OneToMany`.

---

## 4. STATE MANAGEMENT RULES

- Auth source of truth: httpOnly cookies. Never store JWT in localStorage.
- `synchronize: true` is prototype-only. Consider migration path before production.
- Soft delete via `isActive`. Never hard-delete users/employees.

---

## 5. TESTING RULES

- New endpoint = test file created alongside.
- Priority: crypto service → documents service → auth service → employees service.
- Mock Cloudinary and Turnstile in unit tests.
- Use Jest + ts-jest + supertest.

---

## 6. GIT RULES

```
Format: <type>(<scope>): <description>
Types: feat | fix | chore | refactor | docs | test | style
Scopes: auth | documents | crypto | api | employees | seed | config | deps
```

Examples:
```
feat(auth): add Turnstile verification to login endpoint
fix(documents): correct QR seal IV length validation
refactor(employees): split ConstanciaEmpleadoByID into dedicated service
```

### Multi-Repo Coordination
- When changing API endpoints: update frontend `services/api.ts` in same PR.
- When changing Zod schemas: update backend DTOs in same PR.
- When adding document types: sync backend enum + frontend schemas.

---

## 7. CROSS-PROJECT RULES

| Backend Change | Frontend Update Required |
|----------------|-------------------------|
| New API endpoint | Add to `services/api.ts` typed objects |
| Changed DTO validation | Update Zod schema in `src/schemas/` |
| New document type | Update frontend DocumentType constants |
| Changed auth flow | Verify cookie/CORS config |
| Changed error responses | Update frontend error handling |

---

## 8. PROJECT CONTEXT

- **Domain:** School employee management + document generation.
- **Sensitive data:** Employee records, minors' data (future), financial documents.
- **Current state:** Functional prototype with placeholder data.
- **Key constraint:** Historical data integrity via cryptographic QR seals.
- **Language:** English identifiers, Spanish user-facing messages.
