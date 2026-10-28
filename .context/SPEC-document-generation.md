# Feature Spec: Document Generation & Verification

> Cross-repo feature spec. Read this before implementing document-related changes.
> Related ADRs: ADR-002 (AES-256-GCM QR Seals), ADR-007 (TypeScript Report Classes)

---

## Overview

Document generation creates verifiable PDF documents (constancias, receipts) with cryptographic QR seals. Verification validates scanned QR codes against the database.

**⚠️ CRITICAL: The QR seal format is an immutable public contract. Printed documents depend on it.**

---

## Domain Model

### DocumentVerification Entity
`src/documents/entities/document-verification.entity.ts`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| documentType | Enum | CONSTANCIA_TRABAJO, RECIBO_PAGO, CONSTANCIA_ESTUDIO, etc. |
| recipientType | Enum | EMPLOYEE, STUDENT, REPRESENTATIVE |
| recipientId | string | User/Employee ID |
| recipientIdentifier | string | Cedula or other ID |
| recipientName | string | Full name |
| issuedByUserId | string | Who issued it |
| issuedByName | string | Issuer name/position |
| status | Enum | VALID, REVOKED |
| metadata | JSONB | Snapshot of data at issuance time |
| verificationCode | string | Encrypted QR payload |
| issuedAt | Date | Creation timestamp |

### Document Types
```
CONSTANCIA_TRABAJO    — Proof of work (active)
RECIBO_PAGO           — Proof of payment (planned)
CONSTANCIA_ESTUDIO    — Proof of study (future)
NOTAS_CERTIFICADAS    — Certified grades (future)
SOLVENCIA_ADMINISTRATIVA — Administrative clearance (future)
CARNET_DIGITAL        — Digital ID card (active)
```

---

## Cryptographic QR Seal

### Format
```
INSTITUTION-SUBTYPE:VERSION:iv_b64url.authTag_b64url.cipher_b64url
Example: SS-DOC:v1:<iv>.<authTag>.<cipher>
```

### Seal Subtypes
| Subtype | Purpose | Payload |
|---------|---------|---------|
| DOC | Document verification | uuid, documentType, recipientType, recipientIdentifier, issuedAt |
| EDID | Employee digital ID | employeeId, userId, cedula, fullName, cargo, issuedAt |
| DID | Digital ID (alias) | Same as EDID |
| SDID | Student digital ID | studentId, cedula, fullName, gradeLevel, issuedAt |

### Encryption
- Algorithm: AES-256-GCM
- Key: SHA-256 hash of `QR_SECRET_KEY` env var
- IV: 12 bytes (random)
- Auth Tag: 16 bytes

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/empleados/Constancia-Empleado/:id` | Admin | Generate constancia PDF |
| GET | `/api/documents/verify/:code` | Public | Verify QR code |
| PATCH | `/api/documents/:id/revoke` | Admin | Revoke document |
| GET | `/api/documents/recipient/:userId` | Admin | List user's documents |

---

## Document Generation Flow

### Backend Flow
```
1. Client requests constancia (with employeeId, optional month)
2. EmpleadosService.findOne() → get employee + user data
3. DocumentsService.issueDocument() → create DocumentVerification record
   - Generate UUID
   - Encrypt payload → verificationCode
   - Generate QR image (base64)
   - Save record to database
4. If monthly: query activities for that month
5. Select report template (constanciaMensual or employementLetterByID)
6. PrinterService.createPdf() → generate PDF with QR embedded
7. Stream PDF to client
```

### Frontend Flow
```
1. User clicks "Generar Constancia" in UI
2. AdminGenerateConstanciaModal opens
3. User selects employee, month (optional), employer info
4. Frontend calls GET /api/empleados/Constancia-Empleado/:id
5. Backend returns PDF blob
6. Frontend opens PDF in new tab or downloads
```

---

## Document Verification Flow

### Backend Verification
```
1. Client submits QR code string
2. CryptoService.inspectToken() → parse header (no decrypt)
3. Branch by subtype:
   - EDID/DID: Decrypt → lookup user+employee → check isActive
   - DOC: Decrypt → lookup DocumentVerification by uuid → check status
4. Return verification result with document details
```

### Frontend Verification
```
1. User opens /verificar page
2. Options: scan camera, upload file, paste code
3. Camera: QrCameraScannerModal (html5-qrcode)
4. File: useQrFileDecoder hook (@zxing + jsqr)
5. Code: direct input
6. Call GET /api/documents/verify/:code
7. Display result: valid/revoked/counterfeit
```

---

## Frontend Components

### Pages
- `pages/ConstanciasPage.tsx` — Employee-facing constancia list
- `pages/AdminConstanciasPage.tsx` — Admin document management
- `pages/VerificarDocumentoPage.tsx` — QR verification page

### Components
- `components/features/AdminGenerateConstanciaModal.tsx`
- `components/features/AdminNominaUploadModal.tsx`
- `components/features/AdminComprobanteRow.tsx`
- `components/features/QrCameraScannerModal.tsx`
- `components/features/DigitalIDCard.tsx`
- `components/common/FileDropzone.tsx`

### Hooks
- `hooks/Constancia/useAdminConstancias.ts`
- `hooks/Constancia/useWorkerConstancias.ts`
- `hooks/Constancia/UseConstancia.tsx`
- `hooks/useQrFileDecoder.ts`

---

## Cross-Repo Contracts

### Verify API Response
```typescript
// Backend returns:
interface VerificationResult {
  isValid: boolean;
  status: 'VALID' | 'REVOKED' | 'COUNTERFEIT';
  message: string;
  document?: {
    id: string;
    documentType: string;
    recipientType: string;
    recipientIdentifier: string;
    recipientName: string;
    issuedByName?: string;
    issuedAt: Date;
    metadata?: Record<string, any>;
  };
}
```

### Zod Schema (Frontend)
```typescript
// Should mirror VerificationResult
export const verificationSchema = z.object({
  isValid: z.boolean(),
  status: z.enum(['VALID', 'REVOKED', 'COUNTERFEIT']),
  message: z.string(),
  document: z.object({
    id: z.string(),
    documentType: z.string(),
    recipientType: z.string(),
    recipientIdentifier: z.string(),
    recipientName: z.string(),
    issuedByName: z.string().optional(),
    issuedAt: z.string(),
    metadata: z.record(z.any()).optional(),
  }).optional(),
});
```

---

## Rate Limiting Rules

- Maximum 1 constancia per employee per 24 hours
- Frontend: localStorage timestamp check
- Backend: `ThrottlerGuard` + timestamp validation
- If limit reached: show existing document instead of generating new one

---

## Revocation Rules

- Only admin can revoke documents
- Revoked documents show in verification as "REVOKED"
- Revoked documents excluded from standard queries (soft-delete pattern)
- Revocation reason required (future: D-05 revocation fields)

---

## Debt Items Related to This Feature

| ID | Description | Tag |
|----|-------------|-----|
| D-09 | Orchestration + PDF entangled in service | pre-student-blocker |
| D-17 | Hardcoded employer defaults | remove-on-real-data |
| D-23 | 4 QR libraries | defer (all justified) |

---

## Testing Checklist

- [x] Unit test: Crypto encrypt/decrypt roundtrip (`crypto.service.spec.ts`)
- [x] Unit test: Token inspection (valid/invalid headers) (`documents.verify.spec.ts`)
- [x] Unit test: Document issue flow (`documents.issue.spec.ts`)
- [x] Unit test: Document verify flow (valid/revoked/counterfeit) (`documents.verify.spec.ts`)
- [x] Unit test: Document revoke flow (`documents.query.spec.ts`)
- [x] Integration test: Constancia generation endpoint (`empleados.http.spec.ts`, `empleados.reports.spec.ts`)
- [x] Integration test: Verification endpoint (`documents.http.spec.ts`)
- [x] Integration test: Recipient documents endpoint with authorization (`documents.http.spec.ts`)
- [x] E2E test: Generate constancia → verify QR seal roundtrip (`empleados.reports.spec.ts`)
- [x] E2E test: Revoke document → verify shows REVOKED (`documents.http.spec.ts`)
