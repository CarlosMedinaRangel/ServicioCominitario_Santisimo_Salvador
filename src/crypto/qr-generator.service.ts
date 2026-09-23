import { Injectable } from '@nestjs/common';
import * as QRCode from 'qrcode';

@Injectable()
export class QrGeneratorService {
  /**
   * Generates a base64 Data URL PNG image for the given text/token.
   * Direct drop-in for PDFMake `{ image: dataUrl }`.
   */
  async generateDataUrl(
    text: string,
    options?: QRCode.QRCodeToDataURLOptions,
  ): Promise<string> {
    return QRCode.toDataURL(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 200,
      color: {
        dark: '#1e293b', // Deep slate for crisp print contrast
        light: '#ffffff',
      },
      ...options,
    });
  }

  /**
   * Generates a PNG Buffer of the QR code.
   */
  async generateBuffer(
    text: string,
    options?: QRCode.QRCodeToBufferOptions,
  ): Promise<Buffer> {
    return QRCode.toBuffer(text, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 200,
      ...options,
    });
  }
}
