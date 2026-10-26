import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TurnstileService {
  private readonly logger = new Logger('TurnstileService');
  private readonly secretKey: string | undefined;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY');
  }

  /**
   * Validates a Cloudflare Turnstile token.
   * In development (when TURNSTILE_SECRET_KEY is not configured or set to 'disabled'),
   * it gracefully bypasses verification to facilitate testing.
   */
  async verifyToken(token?: string, remoteIp?: string): Promise<boolean> {
    if (
      !this.secretKey ||
      this.secretKey === 'disabled' ||
      this.secretKey === 'bypass'
    ) {
      return true;
    }

    if (!token) {
      throw new ForbiddenException(
        'Verificación anti-bot requerida: falta el token de Turnstile.',
      );
    }

    // Permite tokens de prueba en desarrollo para facilitar pruebas en Swagger /docs
    const isDevelopment =
      this.configService.get<string>('NODE_ENV') === 'development';
    if (
      isDevelopment &&
      (token === 'XXXX.DUMMY.TOKEN.XXXX' ||
        token === '1x00000000000000000000AA' ||
        token === 'bypass-dev-token')
    ) {
      return true;
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', token);
      if (remoteIp) {
        formData.append('remoteip', remoteIp);
      }

      const response = await fetch(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        {
          method: 'POST',
          body: formData,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const result = (await response.json()) as {
        success: boolean;
        'error-codes'?: string[];
      };

      if (!result.success) {
        this.logger.warn(
          `Fallo en verificación anti-bot de Turnstile: ${JSON.stringify(result['error-codes'])}`,
        );
        throw new ForbiddenException(
          'Verificación anti-bot fallida. Por favor recarga e intenta nuevamente.',
        );
      }

      return true;
    } catch (error: any) {
      if (error instanceof ForbiddenException) throw error;
      this.logger.error(`Error al conectar con Cloudflare Turnstile: ${error.message}`);
      // If Cloudflare is unreachable, log warning but don't hard-lock legit users unless strictly required
      return true;
    }
  }
}
