import { ForbiddenException } from '@nestjs/common';
import { DocumentsController } from '../documents.controller';
import { DocumentsService } from '../documents.service';
import { VerifyDocumentDto } from '../dto/verify-document.dto';
import { DocumentStatus } from '../entities/document-verification.entity';
import { createMockDocumentVerification } from '../../../test/fixtures/document.fixture';
import { createMockUser } from '../../../test/fixtures/user.fixture';
import { createValidDto } from '../../../test/fixtures/dto-factory.helper';

describe('DocumentsController', () => {
  let controller: DocumentsController;
  let mockDocumentsService: jest.Mocked<Partial<DocumentsService>>;

  beforeEach(() => {
    mockDocumentsService = {
      verifyDocument: jest.fn(),
      getStats: jest.fn(),
      findAll: jest.fn(),
      revokeDocument: jest.fn(),
      findByRecipient: jest.fn(),
    };

    controller = new DocumentsController(mockDocumentsService as DocumentsService);
  });

  describe('verifyDocument', () => {
    it('should forward QR code string to documentsService.verifyDocument', async () => {
      const verifyDto = createValidDto(VerifyDocumentDto, {
        code: 'SS-DOC:v1:iv123.tag456.cipher789',
      });
      const mockResult = {
        isValid: true,
        status: DocumentStatus.VALID,
        message: 'Documento auténtico y válido.',
      };
      (mockDocumentsService.verifyDocument as jest.Mock).mockResolvedValue(mockResult);

      const result = await controller.verifyDocument(verifyDto);

      expect(mockDocumentsService.verifyDocument).toHaveBeenCalledWith(verifyDto.code);
      expect(result).toBe(mockResult);
    });
  });

  describe('getStats', () => {
    it('should return aggregated document stats from documentsService', async () => {
      const mockStats = { total: 120, valid: 110, revoked: 10 };
      (mockDocumentsService.getStats as jest.Mock).mockResolvedValue(mockStats);

      const result = await controller.getStats();

      expect(mockDocumentsService.getStats).toHaveBeenCalled();
      expect(result).toBe(mockStats);
    });
  });

  describe('findAll', () => {
    it('should pass pagination options and status filter to documentsService.findAll', async () => {
      const mockPaginated = {
        data: [],
        total: 0,
        page: 2,
        totalPages: 0,
      };
      (mockDocumentsService.findAll as jest.Mock).mockResolvedValue(mockPaginated);

      const result = await controller.findAll(2, 15, DocumentStatus.VALID);

      expect(mockDocumentsService.findAll).toHaveBeenCalledWith({
        page: 2,
        limit: 15,
        status: DocumentStatus.VALID,
      });
      expect(result).toBe(mockPaginated);
    });

    it('should support undefined optional query parameters', async () => {
      (mockDocumentsService.findAll as jest.Mock).mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        totalPages: 0,
      });

      await controller.findAll(undefined, undefined, undefined);

      expect(mockDocumentsService.findAll).toHaveBeenCalledWith({
        page: undefined,
        limit: undefined,
        status: undefined,
      });
    });
  });

  describe('revokeDocument', () => {
    it('should forward document UUID to documentsService.revokeDocument', async () => {
      const mockRevoked = createMockDocumentVerification({
        id: 'uuid-to-revoke',
        status: DocumentStatus.REVOKED,
      });
      (mockDocumentsService.revokeDocument as jest.Mock).mockResolvedValue(mockRevoked);

      const result = await controller.revokeDocument('uuid-to-revoke');

      expect(mockDocumentsService.revokeDocument).toHaveBeenCalledWith('uuid-to-revoke');
      expect(result).toBe(mockRevoked);
    });
  });

  describe('findByRecipient', () => {
    it('should forward recipientId to documentsService.findByRecipient when admin requests', async () => {
      const adminUser = createMockUser({ id: 'admin-1', roles: ['admin'] });
      const mockHistory = [
        createMockDocumentVerification({ id: 'doc-1' }),
        createMockDocumentVerification({ id: 'doc-2' }),
      ];
      (mockDocumentsService.findByRecipient as jest.Mock).mockResolvedValue(mockHistory);

      const result = await controller.findByRecipient('recipient-uuid-123', adminUser);

      expect(mockDocumentsService.findByRecipient).toHaveBeenCalledWith('recipient-uuid-123');
      expect(result).toBe(mockHistory);
    });

    it('should forward recipientId when non-admin requests their own documents', async () => {
      const normalUser = createMockUser({ id: 'recipient-uuid-123', roles: ['user'] });
      const mockHistory = [createMockDocumentVerification({ id: 'doc-1' })];
      (mockDocumentsService.findByRecipient as jest.Mock).mockResolvedValue(mockHistory);

      const result = await controller.findByRecipient('recipient-uuid-123', normalUser);

      expect(mockDocumentsService.findByRecipient).toHaveBeenCalledWith('recipient-uuid-123');
      expect(result).toBe(mockHistory);
    });

    it('should throw ForbiddenException when non-admin requests someone else documents', async () => {
      const normalUser = createMockUser({ id: 'other-user-id', roles: ['user'] });

      expect(() =>
        controller.findByRecipient('recipient-uuid-123', normalUser),
      ).toThrow(ForbiddenException);
    });
  });
});
