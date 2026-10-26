import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TurnstileService } from './turnstile.service';

describe('TurnstileService (Anti-Bot Cloudflare Turnstile)', () => {
  let service: TurnstileService;
  let mockConfigService: jest.Mocked<Partial<ConfigService>>;

  // Cloudflare Official Test Keys
  const DUMMY_SECRET_KEY = '1x0000000000000000000000000000000AA'; // Always Passes (Secret Key)
  const ALWAYS_BLOCK_KEY = '2x0000000000000000000000000000000AA'; // Always Fails (Secret Key)
  const TOKEN_SPENT_KEY = '3x0000000000000000000000000000000AA';  // Token already spent (Secret Key)

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn().mockReturnValue(DUMMY_SECRET_KEY),
    };
    service = new TurnstileService(mockConfigService as ConfigService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Development Bypass Mode', () => {
    it('should bypass verification and return true when TURNSTILE_SECRET_KEY is undefined', async () => {
      (mockConfigService.get as jest.Mock).mockReturnValue(undefined);
      const devService = new TurnstileService(mockConfigService as ConfigService);

      const result = await devService.verifyToken();
      expect(result).toBe(true);
    });

    it('should bypass verification when TURNSTILE_SECRET_KEY is set to "disabled"', async () => {
      (mockConfigService.get as jest.Mock).mockReturnValue('disabled');
      const devService = new TurnstileService(mockConfigService as ConfigService);

      const result = await devService.verifyToken();
      expect(result).toBe(true);
    });

    it('should bypass verification when TURNSTILE_SECRET_KEY is set to "bypass"', async () => {
      (mockConfigService.get as jest.Mock).mockReturnValue('bypass');
      const devService = new TurnstileService(mockConfigService as ConfigService);

      const result = await devService.verifyToken();
      expect(result).toBe(true);
    });
  });

  describe('Token Validation Enforcement', () => {
    it('should throw ForbiddenException if token is missing when Turnstile is active', async () => {
      await expect(service.verifyToken('')).rejects.toThrow(ForbiddenException);
      await expect(service.verifyToken('')).rejects.toThrow(
        'Verificación anti-bot requerida: falta el token de Turnstile.',
      );
    });

    it('should throw ForbiddenException if token is undefined', async () => {
      await expect(service.verifyToken(undefined)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('Cloudflare Siteverify API Integration', () => {
    it('should successfully verify when Cloudflare returns success: true', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );

      const result = await service.verifyToken('valid-dummy-token', '192.168.1.1');

      expect(fetch).toHaveBeenCalledWith(
        'https://challenges.cloudflare.com/turnstile/v0/siteverify',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }),
      );
      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when Cloudflare verification fails (success: false)', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              'error-codes': ['invalid-input-response'],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      );

      await expect(
        service.verifyToken('invalid-bot-token', '192.168.1.1'),
      ).rejects.toThrow(ForbiddenException);

      await expect(
        service.verifyToken('invalid-bot-token'),
      ).rejects.toThrow(
        'Verificación anti-bot fallida. Por favor recarga e intenta nuevamente.',
      );
    });

    it('should throw ForbiddenException when token was already spent (timeout-or-duplicate / 3x key)', async () => {
      global.fetch = jest.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              success: false,
              'error-codes': ['timeout-or-duplicate'],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      );

      await expect(
        service.verifyToken('already-spent-token'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should gracefully return true when Cloudflare API is unreachable (network error fallback)', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('Cloudflare network timeout'));

      const result = await service.verifyToken('any-token', '127.0.0.1');

      // System does not hard-lock users on 3rd-party outage
      expect(result).toBe(true);
    });
  });
});
