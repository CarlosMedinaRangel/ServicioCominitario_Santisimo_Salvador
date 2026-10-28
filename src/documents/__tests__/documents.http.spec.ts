import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  UnauthorizedException,
  ExecutionContext,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import request from 'supertest';
import cookieParser from 'cookie-parser';
import { DocumentsController } from '../documents.controller';
import { DocumentsService } from '../documents.service';
import {
  createMockUser,
  createMockAdminUser,
  MockType,
} from '../../../test/fixtures/user.fixture';
import { createMockDocumentVerification } from '../../../test/fixtures/document.fixture';
import { DocumentStatus } from '../entities/document-verification.entity';

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
      getStats: jest.fn(),
      findAll: jest.fn(),
      revokeDocument: jest.fn(),
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
  // 2. GET /documents/stats - Verification Statistics
  // ════════════════════════════════════════════════════════════════════════════════
  describe('GET /documents/stats', () => {
    it('should return 401 Unauthorized when unauthenticated', async () => {
      await request(app.getHttpServer())
        .get('/documents/stats')
        .expect(401);
    });

    it('should return 403 Forbidden when standard user requests stats', async () => {
      await request(app.getHttpServer())
        .get('/documents/stats')
        .set('Authorization', 'Bearer user-token')
        .expect(403);
    });

    it('should return 200 OK with statistics for admin', async () => {
      const stats = { total: 45, valid: 40, revoked: 5 };
      (mockDocumentsService.getStats as jest.Mock).mockResolvedValue(stats);

      const res = await request(app.getHttpServer())
        .get('/documents/stats')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body).toEqual(stats);
      expect(mockDocumentsService.getStats).toHaveBeenCalled();
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

    it('should return 403 Forbidden when standard user attempts revocation', async () => {
      await request(app.getHttpServer())
        .patch(`/documents/${mockDoc.id}/revoke`)
        .set('Authorization', 'Bearer user-token')
        .expect(403);
    });

    it('should return 200 OK when admin revokes document with valid UUID', async () => {
      const revoked = { ...mockDoc, status: DocumentStatus.REVOKED };
      (mockDocumentsService.revokeDocument as jest.Mock).mockResolvedValue(revoked);

      const res = await request(app.getHttpServer())
        .patch(`/documents/${mockDoc.id}/revoke`)
        .set('Authorization', 'Bearer admin-token')
        .expect(200);

      expect(res.body.status).toBe(DocumentStatus.REVOKED);
      expect(mockDocumentsService.revokeDocument).toHaveBeenCalledWith(mockDoc.id);
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
