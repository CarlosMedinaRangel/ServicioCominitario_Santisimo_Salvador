import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

export interface QrDocumentPayload {
  uuid: string;
  documentType: string;
  recipientType: string;
  recipientIdentifier: string;
  issuedAt: string;
  issuedByUserId?: string;
  hash?: string;
}

@Injectable()
export class CryptoService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;
  private readonly prefix = 'SS-DOC:v1:';

  constructor(private readonly configService: ConfigService) {
    const secret =
      this.configService.get<string>('QR_SECRET_KEY') ||
      'Santisimo_Salvador_Default_Secret_Key_2026_Secured!';
    // Derive a fixed 32-byte key using SHA-256
    this.key = createHash('sha256').update(secret).digest();
  }

  /**
   * Encrypts a document payload into a compact, tamper-proof QR verification code string.
   */
  encryptPayload<T extends object>(payload: T): string {
    const iv = randomBytes(12); // Standard 12-byte IV for GCM
    const cipher = createCipheriv(this.algorithm, this.key, iv);

    const jsonString = JSON.stringify(payload);
    const encrypted = Buffer.concat([
      cipher.update(jsonString, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Format: SS-DOC:v1:<iv_b64url>.<authTag_b64url>.<ciphertext_b64url>
    const token = `${this.prefix}${iv.toString('base64url')}.${authTag.toString('base64url')}.${encrypted.toString('base64url')}`;
    return token;
  }

  /**
   * Decrypts and verifies the integrity of a QR verification code string.
   * Throws BadRequestException if modified or counterfeit.
   */
  decryptPayload<T = QrDocumentPayload>(token: string): T {
    const trimmed = (token || '').trim();
    if (!trimmed.startsWith(this.prefix)) {
      throw new BadRequestException(
        'El formato del código no corresponde a un documento oficial de Santísimo Salvador.',
      );
    }

    const rawData = trimmed.slice(this.prefix.length);
    const parts = rawData.split('.');

    if (parts.length !== 3) {
      throw new BadRequestException('Estructura de sello digital inválida.');
    }

    const [ivB64, authTagB64, ciphertextB64] = parts;

    try {
      const iv = Buffer.from(ivB64, 'base64url');
      const authTag = Buffer.from(authTagB64, 'base64url');
      const ciphertext = Buffer.from(ciphertextB64, 'base64url');

      const decipher = createDecipheriv(this.algorithm, this.key, iv);
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return JSON.parse(decrypted.toString('utf8')) as T;
    } catch {
      throw new BadRequestException(
        'Código de verificación inválido, manipulado o alterado.',
      );
    }
  }
}
