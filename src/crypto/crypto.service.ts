import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { User } from '../auth/entities/auth.entity';
import { Employee } from '../empleados/entities/employee.entity';
import { DocumentVerification } from '../documents/entities/document-verification.entity';

export type QrKnownSubType = 'DOC' | 'EDID' | 'SDID' | 'DID';

export interface QrDocumentPayload {
  uuid: DocumentVerification['id'];
  documentType: DocumentVerification['documentType'];
  recipientType: DocumentVerification['recipientType'];
  recipientIdentifier: DocumentVerification['recipientIdentifier'];
  issuedAt: string;
  issuedByUserId?: DocumentVerification['issuedByUserId'];
  hash?: string;
}

export interface QrEmployeeIdPayload {
  employeeId: Employee['userId'];
  userId: User['id'];
  cedula: NonNullable<User['cedula']>;
  fullName: User['fullName'];
  cargo?: Employee['position'];
  department?: string;
  issuedAt: string;
}

export interface QrStudentIdPayload {
  studentId: string;
  cedula: string;
  fullName: string;
  gradeLevel?: string;
  issuedAt: string;
}

export interface QrPayloadMapping {
  DOC: QrDocumentPayload;
  EDID: QrEmployeeIdPayload;
  SDID: QrStudentIdPayload;
  DID: QrEmployeeIdPayload;
}

export interface QrTokenHeader {
  institution: string;
  subType: string;
  version: string;
  isValidHeader: boolean;
}

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  private readonly institutionPrefix: string;
  private readonly currentVersion: string;

  constructor(private readonly configService: ConfigService) {
    this.institutionPrefix =
      (this.configService.get<string>('QR_PREFIX') || 'SS').trim().toUpperCase();
    this.currentVersion =
      (this.configService.get<string>('QR_VERSION') || 'v1').trim().toLowerCase();

    const secret = this.configService.get<string>('QR_SECRET_KEY');
    if (!secret || secret.length < 32) {
      throw new Error(
        'QR_SECRET_KEY must be set and at least 32 characters long. ' +
          'Generate one with: openssl rand -base64 32',
      );
    }
    // Derive a fixed 32-byte key using SHA-256
    this.key = createHash('sha256').update(secret).digest();
  }

  /**
   * Inspects the token header without decrypting to determine its institution, subtype (DOC, DID, etc.) and version.
   * Format: <INSTITUTION>-<SUBTYPE>:<VERSION>:<iv>.<authTag>.<ciphertext>
   * Example: "SS-DOC:v1:..." or "SS-DID:v1:..."
   */
  inspectToken(token: string): QrTokenHeader {
    const trimmed = (token || '').trim();
    const parts = trimmed.split(':');

    if (parts.length < 3) {
      return {
        institution: '',
        subType: '',
        version: '',
        isValidHeader: false,
      };
    }

    const [prefixSubType, version] = parts;
    const prefixSplit = prefixSubType.split('-');

    if (prefixSplit.length !== 2) {
      return {
        institution: '',
        subType: '',
        version: '',
        isValidHeader: false,
      };
    }

    const [institution, subType] = prefixSplit;

    return {
      institution: institution.toUpperCase(),
      subType: subType.toUpperCase(),
      version: version.toLowerCase(),
      isValidHeader: true,
    };
  }

  /**
   * Encrypts a payload into a compact, tamper-proof QR code string with dynamic subtype and version.
   * Supports strongly typed subtypes (DOC, EDID, SDID, DID) or custom strings.
   * Example output: SS-DOC:v1:<iv_b64url>.<authTag_b64url>.<ciphertext_b64url>
   */
  encryptPayload<K extends keyof QrPayloadMapping>(
    payload: QrPayloadMapping[K],
    subType: K,
  ): string;
  encryptPayload<T extends object>(
    payload: T,
    subType?: string,
  ): string;
  encryptPayload(payload: any, subType: string = 'DOC'): string {
    const iv = randomBytes(12); // Standard 12-byte IV for GCM
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    const jsonString = JSON.stringify(payload);
    const encrypted = Buffer.concat([
      cipher.update(jsonString, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();
    const normalizedSubType = (subType || 'DOC').trim().toUpperCase();
    const prefix = `${this.institutionPrefix}-${normalizedSubType}:${this.currentVersion}:`;

    // Format: <INSTITUTION>-<SUBTYPE>:<VERSION>:<iv_b64url>.<authTag_b64url>.<ciphertext_b64url>
    return `${prefix}${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  /**
   * Decrypts and verifies the integrity of a QR verification code string.
   * Automatically infers payload type when a known subtype is specified.
   * Throws BadRequestException if modified or counterfeit.
   */
  decryptPayload<K extends keyof QrPayloadMapping>(
    token: string,
    expectedSubType: K,
  ): QrPayloadMapping[K];
  decryptPayload<T = QrDocumentPayload>(
    token: string,
    expectedSubType?: string,
  ): T;
  decryptPayload(token: string, expectedSubType?: string): any {
    const header = this.inspectToken(token);

    if (!header.isValidHeader) {
      throw new BadRequestException('Estructura de sello digital inválida o irreconocible.');
    }

    if (header.institution !== this.institutionPrefix) {
      throw new BadRequestException(
        `El código pertenece a otra institución (${header.institution}) y no a ${this.institutionPrefix}.`,
      );
    }

    if (expectedSubType && header.subType !== expectedSubType.toUpperCase()) {
      throw new BadRequestException(
        `Tipo de sello digital inesperado. Se esperaba ${expectedSubType} pero se recibió ${header.subType}.`,
      );
    }

    // Extract payload after `<INSTITUTION>-<SUBTYPE>:<VERSION>:`
    const prefixLength = `${header.institution}-${header.subType}:${header.version}:`.length;
    const rawCipherData = (token || '').trim().slice(prefixLength);
    const parts = rawCipherData.split('.');

    if (parts.length !== 3) {
      throw new BadRequestException('Estructura criptográfica de sello digital alterada.');
    }

    const [ivB64, authTagB64, ciphertextB64] = parts;

    let iv: Buffer;
    let authTag: Buffer;
    let ciphertext: Buffer;

    try {
      iv = Buffer.from(ivB64, 'base64url');
      authTag = Buffer.from(authTagB64, 'base64url');
      ciphertext = Buffer.from(ciphertextB64, 'base64url');

      if (iv.length !== 12) {
        throw new BadRequestException(
          'Vector de Inicialización (IV) inválido o corrupto (longitud incorrecta).',
        );
      }
      if (authTag.length !== 16) {
        throw new BadRequestException(
          'Etiqueta de autenticación (AuthTag) corrupta (longitud de firma inválida).',
        );
      }
    } catch (e) {
      if (e instanceof BadRequestException) throw e;
      throw new BadRequestException(
        'Estructura de codificación Base64URL corrupta en el sello digital.',
      );
    }

    let decrypted: Buffer;
    try {
      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);
      decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);
    } catch (err: any) {
      throw new BadRequestException(
        'Sello digital adulterado o falsificado: La firma de autenticidad criptográfica (AuthTag AES-256-GCM) no coincide. El código ha sido manipulado o firmado con una clave no autorizada.',
      );
    }

    try {
      return JSON.parse(decrypted.toString('utf8'));
    } catch {
      throw new BadRequestException(
        'El contenido descifrado no posee una estructura JSON válida o legible.',
      );
    }
  }
}
