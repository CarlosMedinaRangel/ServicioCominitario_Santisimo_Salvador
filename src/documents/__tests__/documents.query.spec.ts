import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { DocumentsService } from '../documents.service';
import {
  DocumentVerification,
  DocumentStatus,
} from '../entities/document-verification.entity';
import { createMockDocumentVerification } from '../../../test/fixtures/document.fixture';
import { MockType } from '../../../test/fixtures/user.fixture';
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
      });
    });
  });

  describe('getStats', () => {
    it('should return total, valid, and revoked document counts', async () => {
      (mockDocRepo.count as jest.Mock).mockImplementation((opts?: any) => {
        if (!opts) return Promise.resolve(100);
        if (opts.where?.status === DocumentStatus.VALID) return Promise.resolve(85);
        if (opts.where?.status === DocumentStatus.REVOKED) return Promise.resolve(15);
        return Promise.resolve(0);
      });

      const stats = await service.getStats();

      expect(stats).toEqual({
        total: 100,
        valid: 85,
        revoked: 15,
      });
    });
  });
});
