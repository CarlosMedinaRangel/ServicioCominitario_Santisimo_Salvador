import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CryptoService, QrDocumentPayload, QrEmployeeIdPayload, QrKnownSubType } from './crypto.service';
import { DocumentType, RecipientType } from '../documents/entities/document-verification.entity';

describe('CryptoService', () => {
  let service: CryptoService;
  let mockConfigService: jest.Mocked<ConfigService>;

  const VALID_SECRET = 'this-is-a-very-secure-32-byte-secret-key-12345';
  const INSTITUTION_PREFIX = 'SS';
  const VERSION = 'v1';

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'QR_SECRET_KEY') return VALID_SECRET;
        if (key === 'QR_PREFIX') return INSTITUTION_PREFIX;
        if (key === 'QR_VERSION') return VERSION;
        return undefined;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    service = new CryptoService(mockConfigService);
  });

  describe('Constructor & Configuration', () => {
    it('should throw an error if QR_SECRET_KEY is missing', () => {
      const emptyConfig = {
        get: jest.fn((key: string) => (key === 'QR_SECRET_KEY' ? undefined : 'SS')),
      } as unknown as ConfigService;

      expect(() => new CryptoService(emptyConfig)).toThrow(
        /QR_SECRET_KEY must be set and at least 32 characters long/,
      );
    });

    it('should throw an error if QR_SECRET_KEY is shorter than 32 characters', () => {
      const shortConfig = {
        get: jest.fn((key: string) => (key === 'QR_SECRET_KEY' ? 'too-short' : 'SS')),
      } as unknown as ConfigService;

      expect(() => new CryptoService(shortConfig)).toThrow(
        /QR_SECRET_KEY must be set and at least 32 characters long/,
      );
    });

    it('should initialize successfully with valid configuration', () => {
      expect(service).toBeDefined();
    });
  });

  describe('Immutable Public Contract Format', () => {
    it('should generate tokens matching the exact contract: INSTITUTION-SUBTYPE:VERSION:iv.authTag.cipher', () => {
      const payload: QrDocumentPayload = {
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        documentType: DocumentType.CONSTANCIA_TRABAJO,
        recipientType: RecipientType.EMPLOYEE,
        recipientIdentifier: 'V-12345678',
        issuedAt: new Date().toISOString(),
      };

      const token = service.encryptPayload(payload, 'DOC');
      expect(typeof token).toBe('string');

      // Validate pattern: SS-DOC:v1:<iv_b64url>.<authTag_b64url>.<cipher_b64url>
      const parts = token.split(':');
      expect(parts.length).toBe(3);
      expect(parts[0]).toBe('SS-DOC');
      expect(parts[1]).toBe('v1');

      const cryptoSegments = parts[2].split('.');
      expect(cryptoSegments.length).toBe(3);

      const [ivB64, authTagB64, cipherB64] = cryptoSegments;
      // 12-byte IV in base64url is 16 chars
      expect(Buffer.from(ivB64, 'base64url').length).toBe(12);
      // 16-byte AuthTag in base64url is 22 chars
      expect(Buffer.from(authTagB64, 'base64url').length).toBe(16);
      expect(cipherB64.length).toBeGreaterThan(0);
    });
  });

  describe('Inspection without Decryption', () => {
    it('should inspect token headers correctly', () => {
      const token = service.encryptPayload({ sample: 'test' }, 'EDID');
      const header = service.inspectToken(token);

      expect(header.isValidHeader).toBe(true);
      expect(header.institution).toBe('SS');
      expect(header.subType).toBe('EDID');
      expect(header.version).toBe('v1');
    });

    it('should return isValidHeader: false for corrupt or invalid tokens', () => {
      const header = service.inspectToken('invalid-token-string');
      expect(header.isValidHeader).toBe(false);
    });
  });

  describe('Encryption & Decryption Roundtrips', () => {
    it('should correctly encrypt and decrypt a document payload (DOC)', () => {
      const payload: QrDocumentPayload = {
        uuid: 'd48e8940-bf7d-4eb7-91a6-1e6ea2bc79f1',
        documentType: DocumentType.CONSTANCIA_TRABAJO,
        recipientType: RecipientType.EMPLOYEE,
        recipientIdentifier: 'V-20123456',
        issuedAt: '2026-10-19T12:00:00.000Z',
        issuedByUserId: 'admin-uuid',
      };

      const token = service.encryptPayload(payload, 'DOC');
      const decrypted = service.decryptPayload(token, 'DOC');

      expect(decrypted).toEqual(payload);
    });

    it('should correctly encrypt and decrypt an employee digital ID payload (EDID)', () => {
      const payload: QrEmployeeIdPayload = {
        employeeId: 'emp-uuid',
        userId: 'user-uuid',
        cedula: 'V-18765432',
        fullName: 'Elena Rodríguez',
        cargo: 'Docente',
        issuedAt: '2026-10-19T14:30:00.000Z',
      };

      const token = service.encryptPayload(payload, 'EDID');
      const decrypted = service.decryptPayload(token, 'EDID');

      expect(decrypted).toEqual(payload);
    });
  });

  describe('Security & Tamper Resistance', () => {
    it('should reject a token from another institution', () => {
      const foreignToken = 'OTHER-DOC:v1:YWJjZGVmZ2hpams.MTIzNDU2Nzg5MDEyMzQ1Ng.Y2lwaGVy';

      expect(() => service.decryptPayload(foreignToken)).toThrow(BadRequestException);
      expect(() => service.decryptPayload(foreignToken)).toThrow(/El código pertenece a otra institución/);
    });

    it('should reject a token when expected subtype does not match', () => {
      const token = service.encryptPayload({ data: 123 }, 'EDID');

      expect(() => service.decryptPayload(token, 'DOC' as QrKnownSubType)).toThrow(BadRequestException);
      expect(() => service.decryptPayload(token, 'DOC' as QrKnownSubType)).toThrow(/Tipo de sello digital inesperado/);
    });

    it('should reject a token if ciphertext was altered or tampered with', () => {
      const token = service.encryptPayload({ amount: 100 }, 'DOC');
      const parts = token.split(':');
      const segments = parts[2].split('.');

      // Alter the ciphertext
      const tamperedCipher = segments[2].slice(0, -2) + (segments[2].endsWith('a') ? 'b' : 'a');
      const tamperedToken = `${parts[0]}:${parts[1]}:${segments[0]}.${segments[1]}.${tamperedCipher}`;

      expect(() => service.decryptPayload(tamperedToken, 'DOC')).toThrow(BadRequestException);
      expect(() => service.decryptPayload(tamperedToken, 'DOC')).toThrow(/Sello digital adulterado o falsificado/);
    });

    it('should reject a token if AuthTag is invalid or manipulated', () => {
      const token = service.encryptPayload({ sensitive: true }, 'DOC');
      const parts = token.split(':');
      const segments = parts[2].split('.');

      // Tamper with the 16-byte auth tag
      const tamperedTag = Buffer.from('manipulatedtag12').toString('base64url');
      const tamperedToken = `${parts[0]}:${parts[1]}:${segments[0]}.${tamperedTag}.${segments[2]}`;

      expect(() => service.decryptPayload(tamperedToken, 'DOC')).toThrow(BadRequestException);
    });

    it('should reject a token with incorrect IV length', () => {
      const token = service.encryptPayload({ test: true }, 'DOC');
      const parts = token.split(':');
      const segments = parts[2].split('.');

      // Wrong IV length (8 bytes instead of 12)
      const shortIv = Buffer.from('12345678').toString('base64url');
      const tamperedToken = `${parts[0]}:${parts[1]}:${shortIv}.${segments[1]}.${segments[2]}`;

      expect(() => service.decryptPayload(tamperedToken, 'DOC')).toThrow(BadRequestException);
      expect(() => service.decryptPayload(tamperedToken, 'DOC')).toThrow(/Vector de Inicialización \(IV\) inválido/);
    });
  });
});
