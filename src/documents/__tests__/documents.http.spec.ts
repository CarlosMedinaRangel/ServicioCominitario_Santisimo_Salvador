import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ForbiddenException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { DocumentsController } from '../documents.controller';
import { DocumentsService } from '../documents.service';
import { CryptoService } from '../../crypto/crypto.service';
import { QrGeneratorService } from '../../crypto/qr-generator.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  createMockUser,
  createMockAdminUser,
  MockType,
} from '../../../test/fixtures/user.fixture';
import { createMockDocumentVerification } from '../../../test/fixtures/document.fixture';
import { DocumentVerification, DocumentStatus } from '../entities/document-verification.entity';

describe('DocumentsController (Exhaustive HTTP Integration with Supertest)', () => {
  let app: INestApplication;
  let mockDocumentsService: MockType<DocumentsService>;

  const mockNormalUser = createMockUser({
    id: 'user-uuid-1',
    email: 'docente@santisimo.edu',
    fullName: 'Prof. Mario Silva',
    roles: ['user'],
  });

  const mockAdminUser = createMockAdminUser({
    id: 'admin-uuid-1',
    email: 'director@santisimo.edu',
    fullName: 'Directora Elena Gómez',
    roles: ['admin'],
  });

  const mockDoc = createMockDocumentVerification({
    id: 'a0000000-0000-4000-8000-000000000001',
    verificationCode: 'SS-DOC:v1:ivMock123456.authTagMock1234.cipherMock1234567890',
  });

  beforeEach(async () => {
    mockDocumentsService = {
      verifyDocument: jest.fn(),
      findAll: jest.fn(),
      revokeDocument: jest.fn(),
      restoreDocument: jest.fn(),
      findByRecipient: jest.fn(),
      issueDocument: jest.fn(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        { provide: DocumentsService, useValue: mockDocumentsService },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers['authorization'];
          if (!authHeader) {
            throw new UnauthorizedException('Token no proporcionado');
          }
          if (authHeader === 'Bearer admin-token') {
            req.user = mockAdminUser;
            return true;
          }
          if (authHeader === 'Bearer user-token') {
            req.user = mockNormalUser;
            return true;
          }
          throw new UnauthorizedException('Token inválido o expirado');
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 1. POST /documents/verify - Verification & Role Guards
  // ════════════════════════════════════════════════════════════════════════════════
  describe('POST /documents/verify', () => {
    const validPayload = {
      code: 'SS-DOC:v1:V9DC5RCUrTUdFG87.s7_Bb036ANw5jJfSqaCr8Q.CipherPayload12345',
    };

    it('should return 401 Unauthorized when unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/documents/verify')
        .send(validPayload)
        .expect(401);

      expect(mockDocumentsService.verifyDocument).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden when standard user attempts verification', async () => {
      const res = await request(app.getHttpServer())
        .post('/documents/verify')
        .set('Authorization', 'Bearer user-token')
        .send(validPayload)
        .expect(403);

      expect(res.body.message).toContain('need a valid role: Admin');
      expect(mockDocumentsService.verifyDocument).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request when code is missing', async () => {
      const res = await request(app.getHttpServer())
        .post('/documents/verify')
        .set('Authorization', 'Bearer admin-token')
        .send({})
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('code should not be empty')]),
      );
      expect(mockDocumentsService.verifyDocument).not.toHaveBeenCalled();
    });

    it('should return 400 Bad Request when unwhitelisted properties are injected', async () => {
      const res = await request(app.getHttpServer())
        .post('/documents/verify')
        .set('Authorization', 'Bearer admin-token')
        .send({
          ...validPayload,
          unwhitelisted: 'injection',
        })
        .expect(400);

      expect(res.body.message).toEqual(
        expect.arrayContaining([expect.stringContaining('property unwhitelisted should not exist')]),
      );
      expect(mockDocumentsService.verifyDocument).not.toHaveBeenCalled();
    });

    it('should return 200 OK with document verification result when admin provides valid code', async () => {
      const verificationResult = {
        valid: true,
        document: mockDoc,
        message: 'Documento auténtico y vigente',
      };
      (mockDocumentsService.verifyDocument as jest.Mock).mockResolvedValue(verificationResult);

      const res = await request(app.getHttpServer())
        .post('/documents/verify')
        .set('Authorization', 'Bearer admin-token')
        .send(validPayload)
        .expect(200);

      expect(res.body.valid).toBe(true);
      expect(res.body.document.id).toBe(mockDoc.id);
      expect(mockDocumentsService.verifyDocument).toHaveBeenCalledWith(validPayload.code);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 3. GET /documents - Paginated Verification Records
  // ════════════════════════════════════════════════════════════════════════════════
  describe('GET /documents', () => {
    it('should return 403 Forbidden for non-admin user', async () => {
      await request(app.getHttpServer())
        .get('/documents')
        .set('Authorization', 'Bearer user-token')
        .expect(403);
    });

    it('should return 200 OK and forward pagination query parameters to service', async () => {
      const paginated = {
        data: [mockDoc],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      (mockDocumentsService.findAll as jest.Mock).mockResolvedValue(paginated);

      const res = await request(app.getHttpServer())
        .get('/documents?page=1&limit=10&status=VALID')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.data).toHaveLength(1);
      expect(mockDocumentsService.findAll).toHaveBeenCalledWith({
        page: 1,
        limit: 10,
        status: DocumentStatus.VALID,
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 4. PATCH /documents/:id/revoke - Revocation & ParseUUIDPipe
  // ════════════════════════════════════════════════════════════════════════════════
  describe('PATCH /documents/:id/revoke', () => {
    it('should return 400 Bad Request if :id is not a valid UUID', async () => {
      const res = await request(app.getHttpServer())
        .patch('/documents/not-a-valid-uuid/revoke')
        .set('Authorization', 'Bearer admin-token')
        .expect(400);

      expect(res.body.message).toContain('Validation failed (uuid is expected)');
      expect(mockDocumentsService.revokeDocument).not.toHaveBeenCalled();
    });

    it('should return 403 Forbidden when standard user attempts revocation of someone else document', async () => {
      (mockDocumentsService.revokeDocument as jest.Mock).mockRejectedValue(
        new ForbiddenException('No tienes permisos para anular documentos de otro destinatario.'),
      );

      const res = await request(app.getHttpServer())
        .patch(`/documents/${mockDoc.id}/revoke`)
        .set('Authorization', 'Bearer user-token')
        .expect(403);

      expect(res.body.message).toContain('No tienes permisos para anular documentos');
    });

    it('should return 200 OK when standard user revokes their own document', async () => {
      const revoked = { ...mockDoc, recipientId: mockNormalUser.id, status: DocumentStatus.REVOKED };
      (mockDocumentsService.revokeDocument as jest.Mock).mockResolvedValue(revoked);

      const res = await request(app.getHttpServer())
        .patch(`/documents/${mockDoc.id}/revoke`)
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      expect(res.body.status).toBe(DocumentStatus.REVOKED);
      expect(mockDocumentsService.revokeDocument).toHaveBeenCalledWith(
        mockDoc.id,
        expect.objectContaining({ id: mockNormalUser.id }),
      );
    });

    it('should return 200 OK when admin revokes document with valid UUID', async () => {
      const revoked = { ...mockDoc, status: DocumentStatus.REVOKED };
      (mockDocumentsService.revokeDocument as jest.Mock).mockResolvedValue(revoked);

      const res = await request(app.getHttpServer())
        .patch(`/documents/${mockDoc.id}/revoke`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.status).toBe(DocumentStatus.REVOKED);
      expect(mockDocumentsService.revokeDocument).toHaveBeenCalledWith(
        mockDoc.id,
        expect.objectContaining({ id: mockAdminUser.id }),
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 5. PATCH /documents/:id/restore - Restoration (Admin Only)
  // ════════════════════════════════════════════════════════════════════════════════
  describe('PATCH /documents/:id/restore', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      await request(app.getHttpServer())
        .patch(`/documents/${mockDoc.id}/restore`)
        .expect(401);
    });

    it('should return 403 Forbidden when standard user attempts restoration', async () => {
      await request(app.getHttpServer())
        .patch(`/documents/${mockDoc.id}/restore`)
        .set('Authorization', 'Bearer user-token')
        .expect(403);
    });

    it('should return 200 OK when admin restores document with valid UUID', async () => {
      const restored = { ...mockDoc, status: DocumentStatus.VALID };
      (mockDocumentsService.restoreDocument as jest.Mock).mockResolvedValue(restored);

      const res = await request(app.getHttpServer())
        .patch(`/documents/${mockDoc.id}/restore`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.status).toBe(DocumentStatus.VALID);
      expect(mockDocumentsService.restoreDocument).toHaveBeenCalledWith(mockDoc.id);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════════
  // 5. GET /documents/recipient/:id - Recipient History
  // ════════════════════════════════════════════════════════════════════════════════
  describe('GET /documents/recipient/:id', () => {
    it('should return 403 Forbidden for non-admin user attempting to view another recipient documents', async () => {
      await request(app.getHttpServer())
        .get('/documents/recipient/target-recipient-id')
        .set('Authorization', 'Bearer user-token')
        .expect(403);
    });

    it('should return 200 OK and documents list for non-admin user requesting their own documents', async () => {
      (mockDocumentsService.findByRecipient as jest.Mock).mockResolvedValue([mockDoc]);

      const res = await request(app.getHttpServer())
        .get(`/documents/recipient/${mockNormalUser.id}`)
        .set('Authorization', 'Bearer user-token')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(mockDocumentsService.findByRecipient).toHaveBeenCalledWith(mockNormalUser.id);
    });

    it('should return 200 OK and documents list for admin requesting any recipient documents', async () => {
      (mockDocumentsService.findByRecipient as jest.Mock).mockResolvedValue([mockDoc]);

      const res = await request(app.getHttpServer())
        .get('/documents/recipient/emp-uuid-mock-1')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toHaveLength(1);
      expect(mockDocumentsService.findByRecipient).toHaveBeenCalledWith('emp-uuid-mock-1');
    });
  });
});

describe('DocumentsController + Real DocumentsService + UserRoleGuard (Non-Mocked RBAC Integration)', () => {
  let app: INestApplication;
  let storedDoc: DocumentVerification;

  const ownerUser = createMockUser({
    id: 'owner-user-uuid-1',
    email: 'owner@santisimo.edu',
    fullName: 'Prof. Propietario',
    roles: ['user'],
  });

  const intruderUser = createMockUser({
    id: 'intruder-user-uuid-2',
    email: 'intruder@santisimo.edu',
    fullName: 'Prof. Intruso',
    roles: ['user'],
  });

  const adminUser = createMockAdminUser({
    id: 'admin-user-uuid-3',
    email: 'admin@santisimo.edu',
    fullName: 'Admin Real',
    roles: ['admin'],
  });

  beforeEach(async () => {
    storedDoc = createMockDocumentVerification({
      id: 'b0000000-0000-4000-8000-000000000001',
      recipientId: ownerUser.id,
      status: DocumentStatus.VALID,
    });

    const mockDocRepo = {
      findOne: jest.fn(({ where }) =>
        Promise.resolve(where?.id === storedDoc.id ? storedDoc : null),
      ),
      find: jest.fn(() => Promise.resolve([])),
      save: jest.fn((entity: DocumentVerification) => {
        storedDoc = { ...storedDoc, ...entity };
        return Promise.resolve(storedDoc);
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [DocumentsController],
      providers: [
        DocumentsService,
        { provide: getRepositoryToken(DocumentVerification), useValue: mockDocRepo },
        { provide: getRepositoryToken(require('../../auth/entities/auth.entity').User), useValue: {} },
        { provide: CryptoService, useValue: {} },
        { provide: QrGeneratorService, useValue: {} },
        Reflector,
      ],
    })
      .overrideGuard(AuthGuard('jwt'))
      .useValue({
        canActivate: (context: ExecutionContext) => {
          const req = context.switchToHttp().getRequest();
          const authHeader = req.headers['authorization'];
          if (!authHeader) throw new UnauthorizedException();
          if (authHeader === 'Bearer owner-token') {
            req.user = ownerUser;
            return true;
          }
          if (authHeader === 'Bearer intruder-token') {
            req.user = intruderUser;
            return true;
          }
          if (authHeader === 'Bearer admin-token') {
            req.user = adminUser;
            return true;
          }
          throw new UnauthorizedException();
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('should reject 403 Forbidden when an intruder standard user tries to revoke another user document', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/documents/${storedDoc.id}/revoke`)
      .set('Authorization', 'Bearer intruder-token')
      .expect(403);

    expect(res.body.message).toContain('No tienes permisos para anular documentos');
    expect(storedDoc.status).toBe(DocumentStatus.VALID);
  });

  it('should allow owner user to revoke their own document (200 OK) and block them from restoring it (403 Forbidden)', async () => {
    const revokeRes = await request(app.getHttpServer())
      .patch(`/documents/${storedDoc.id}/revoke`)
      .set('Authorization', 'Bearer owner-token')
      .expect(200);

    expect(revokeRes.body.status).toBe(DocumentStatus.REVOKED);
    expect(storedDoc.status).toBe(DocumentStatus.REVOKED);

    await request(app.getHttpServer())
      .patch(`/documents/${storedDoc.id}/restore`)
      .set('Authorization', 'Bearer owner-token')
      .expect(403);

    expect(storedDoc.status).toBe(DocumentStatus.REVOKED);
  });

  it('should allow admin user to revoke and restore any document (200 OK)', async () => {
    await request(app.getHttpServer())
      .patch(`/documents/${storedDoc.id}/revoke`)
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    expect(storedDoc.status).toBe(DocumentStatus.REVOKED);

    const restoreRes = await request(app.getHttpServer())
      .patch(`/documents/${storedDoc.id}/restore`)
      .set('Authorization', 'Bearer admin-token')
      .expect(200);
    expect(restoreRes.body.status).toBe(DocumentStatus.VALID);
    expect(storedDoc.status).toBe(DocumentStatus.VALID);
  });
});
