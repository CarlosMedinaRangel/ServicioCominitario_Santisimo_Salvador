import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DocumentsService } from '../../src/documents/documents.service';
import { DocumentVerification } from '../../src/documents/entities/document-verification.entity';
import { User } from '../../src/auth/entities/auth.entity';
import { CryptoService } from '../../src/crypto/crypto.service';
import { QrGeneratorService } from '../../src/crypto/qr-generator.service';
import { MockType } from './user.fixture';
import { createMockDocumentVerification } from './document.fixture';

export interface DocumentsMocks {
  docVerificationRepo: MockType<Repository<DocumentVerification>>;
  userRepo: MockType<Repository<User>>;
  cryptoService: MockType<CryptoService>;
  qrGeneratorService: MockType<QrGeneratorService>;
}

/**
 * Creates a NestJS testing module for DocumentsService.
 *
 * Eliminates manual constructor instantiation and blind `as unknown as` double-assertions.
 * Injects strongly-typed mock repositories and services directly via Nest DI.
 *
 * @param overrides Optional partial mock implementations for specific test requirements.
 * @returns Initialized `DocumentsService` alongside its injected typed mocks.
 */
export async function createDocumentsServiceTestModule(
  overrides: Partial<DocumentsMocks> = {},
): Promise<{ service: DocumentsService; mocks: DocumentsMocks }> {
  const mocks: DocumentsMocks = {
    docVerificationRepo: overrides.docVerificationRepo ?? {
      create: jest.fn((dto) => createMockDocumentVerification(dto)),
      save: jest.fn((entity) => Promise.resolve(createMockDocumentVerification(entity))),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
      count: jest.fn(),
    },
    userRepo: overrides.userRepo ?? {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    },
    cryptoService: overrides.cryptoService ?? {
      encryptPayload: jest.fn(),
      decryptPayload: jest.fn(),
      inspectTokenHeader: jest.fn(),
    },
    qrGeneratorService: overrides.qrGeneratorService ?? {
      generateDataUrl: jest.fn().mockResolvedValue('data:image/png;base64,mockQr'),
      generateBuffer: jest.fn().mockResolvedValue(Buffer.from('mockQrBuffer')),
    },
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      DocumentsService,
      {
        provide: getRepositoryToken(DocumentVerification),
        useValue: mocks.docVerificationRepo,
      },
      {
        provide: getRepositoryToken(User),
        useValue: mocks.userRepo,
      },
      {
        provide: CryptoService,
        useValue: mocks.cryptoService,
      },
      {
        provide: QrGeneratorService,
        useValue: mocks.qrGeneratorService,
      },
    ],
  }).compile();

  const service = moduleRef.get<DocumentsService>(DocumentsService);
  return { service, mocks };
}
