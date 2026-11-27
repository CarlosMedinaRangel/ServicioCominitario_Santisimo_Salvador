import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DocumentsService } from '../documents.service';
import {
  DocumentVerification,
  DocumentStatus,
  DocumentType,
} from '../entities/document-verification.entity';
import { createMockDocumentVerification } from '../../../test/fixtures/document.fixture';
import { createMockUser, createMockAdminUser, MockType } from '../../../test/fixtures/user.fixture';
import { createDocumentsServiceTestModule } from '../../../test/fixtures/documents-service.factory';

describe('DocumentsService - Queries, Revocation & Pagination', () => {
  let service: DocumentsService;
  let mockDocRepo: MockType<Repository<DocumentVerification>>;

  const MOCK_DOC_ID = '8f2a1b3c-4d5e-6f7a-8b9c-0d1e2f3a4b5c';

  beforeEach(async () => {
    mockDocRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
      save: jest.fn((entity) => Promise.resolve(createMockDocumentVerification(entity))),
    };

    const module = await createDocumentsServiceTestModule({
      docVerificationRepo: mockDocRepo,
    });
    service = module.service;
  });

  describe('revokeDocument', () => {
    it('should throw NotFoundException if document does not exist', async () => {
      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.revokeDocument('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.revokeDocument('non-existent-id')).rejects.toThrow(
        'Documento con ID non-existent-id no encontrado.',
      );
    });

    it('should update document status to REVOKED and save to repository', async () => {
      const existingDoc = createMockDocumentVerification({
        id: MOCK_DOC_ID,
        status: DocumentStatus.VALID,
      });
      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(existingDoc);

      const result = await service.revokeDocument(MOCK_DOC_ID);

      expect(result.status).toBe(DocumentStatus.REVOKED);
      expect(mockDocRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: MOCK_DOC_ID,
          status: DocumentStatus.REVOKED,
        }),
      );
    });

    it('should throw ForbiddenException when a standard user tries to revoke another recipient document', async () => {
      const otherDoc = createMockDocumentVerification({
        id: MOCK_DOC_ID,
        recipientId: 'another-user-uuid',
        status: DocumentStatus.VALID,
      });
      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(otherDoc);

      const standardUser = createMockUser({
        id: 'requester-user-uuid',
        roles: ['user'],
      });

      await expect(service.revokeDocument(MOCK_DOC_ID, standardUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockDocRepo.save).not.toHaveBeenCalled();
    });

    it('should allow a standard user to revoke their own document', async () => {
      const ownDoc = createMockDocumentVerification({
        id: MOCK_DOC_ID,
        recipientId: 'owner-user-uuid',
        status: DocumentStatus.VALID,
      });
      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(ownDoc);

      const ownerUser = createMockUser({
        id: 'owner-user-uuid',
        roles: ['user'],
      });

      const result = await service.revokeDocument(MOCK_DOC_ID, ownerUser);

      expect(result.status).toBe(DocumentStatus.REVOKED);
      expect(mockDocRepo.save).toHaveBeenCalled();
    });

    it('should allow an admin user to revoke any recipient document', async () => {
      const targetDoc = createMockDocumentVerification({
        id: MOCK_DOC_ID,
        recipientId: 'employee-uuid',
        status: DocumentStatus.VALID,
      });
      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(targetDoc);

      const adminUser = createMockAdminUser({
        id: 'admin-uuid',
        roles: ['admin'],
      });

      const result = await service.revokeDocument(MOCK_DOC_ID, adminUser);

      expect(result.status).toBe(DocumentStatus.REVOKED);
      expect(mockDocRepo.save).toHaveBeenCalled();
    });
  });

  describe('restoreDocument', () => {
    it('should throw NotFoundException if document does not exist', async () => {
      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.restoreDocument('missing-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if another VALID document exists for the same period', async () => {
      const revokedDoc = createMockDocumentVerification({
        id: MOCK_DOC_ID,
        recipientId: 'emp-1',
        documentType: DocumentType.CONSTANCIA_TRABAJO,
        status: DocumentStatus.REVOKED,
        metadata: { mes: '2026-11' },
      });
      const newerValidDoc = createMockDocumentVerification({
        id: 'newer-valid-doc-uuid',
        recipientId: 'emp-1',
        documentType: DocumentType.CONSTANCIA_TRABAJO,
        status: DocumentStatus.VALID,
        metadata: { mes: '2026-11' },
      });

      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(revokedDoc);
      (mockDocRepo.find as jest.Mock).mockResolvedValue([newerValidDoc]);

      await expect(service.restoreDocument(MOCK_DOC_ID)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockDocRepo.save).not.toHaveBeenCalled();
    });

    it('should restore a REVOKED document to VALID when no active duplicate exists', async () => {
      const revokedDoc = createMockDocumentVerification({
        id: MOCK_DOC_ID,
        recipientId: 'emp-1',
        documentType: DocumentType.CONSTANCIA_TRABAJO,
        status: DocumentStatus.REVOKED,
        metadata: { mes: '2026-11' },
      });

      (mockDocRepo.findOne as jest.Mock).mockResolvedValue(revokedDoc);
      (mockDocRepo.find as jest.Mock).mockResolvedValue([]);

      const result = await service.restoreDocument(MOCK_DOC_ID);

      expect(result.status).toBe(DocumentStatus.VALID);
      expect(mockDocRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: MOCK_DOC_ID,
          status: DocumentStatus.VALID,
        }),
      );
    });
  });

  describe('findByRecipient', () => {
    it('should query repository by recipientId ordered by issuedAt DESC', async () => {
      const mockList = [
        createMockDocumentVerification({ id: 'doc-1', recipientId: 'recipient-1' }),
        createMockDocumentVerification({ id: 'doc-2', recipientId: 'recipient-1' }),
      ];

      (mockDocRepo.find as jest.Mock).mockResolvedValue(mockList);

      const results = await service.findByRecipient('recipient-1');

      expect(mockDocRepo.find).toHaveBeenCalledWith({
        where: { recipientId: 'recipient-1' },
        order: { issuedAt: 'DESC' },
      });
      expect(results).toHaveLength(2);
      expect(results).toBe(mockList);
    });
  });

  describe('findAll (Pagination)', () => {
    it('should return paginated documents with default page=1 and limit=20', async () => {
      const mockList = [
        createMockDocumentVerification({ id: 'doc-1', status: DocumentStatus.VALID }),
        createMockDocumentVerification({ id: 'doc-2', status: DocumentStatus.VALID }),
      ];

      (mockDocRepo.findAndCount as jest.Mock).mockResolvedValue([mockList, 45]);

      const result = await service.findAll();

      expect(mockDocRepo.findAndCount).toHaveBeenCalledWith({
        where: {},
        order: { issuedAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({
        data: mockList,
        total: 45,
        page: 1,
        totalPages: 3,
        stats: {
          total: 45,
          validos: 0,
          revocados: 45,
          uniqueRecipients: 0,
        },
      });
    });

    it('should apply status filter, custom page, and limit', async () => {
      const mockList = [createMockDocumentVerification({ id: 'doc-revoked', status: DocumentStatus.REVOKED })];

      (mockDocRepo.findAndCount as jest.Mock).mockResolvedValue([mockList, 15]);

      const result = await service.findAll({
        status: DocumentStatus.REVOKED,
        page: 2,
        limit: 10,
      });

      expect(mockDocRepo.findAndCount).toHaveBeenCalledWith({
        where: { status: DocumentStatus.REVOKED },
        order: { issuedAt: 'DESC' },
        skip: 10,
        take: 10,
      });
      expect(result).toEqual({
        data: mockList,
        total: 15,
        page: 2,
        totalPages: 2,
        stats: {
          total: 15,
          validos: 0,
          revocados: 15,
          uniqueRecipients: 0,
        },
      });
    });
  });

});
