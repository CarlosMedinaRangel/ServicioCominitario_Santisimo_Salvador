import { QrGeneratorService } from './qr-generator.service';

describe('QrGeneratorService', () => {
  let service: QrGeneratorService;

  beforeEach(() => {
    service = new QrGeneratorService();
  });

  describe('generateDataUrl', () => {
    it('should generate a valid base64 PNG data URL from token string', async () => {
      const token = 'SS-DOC:v1:test.iv.tag.cipher';
      const result = await service.generateDataUrl(token);

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });

    it('should allow overriding QRCode options like width and margin', async () => {
      const token = 'SS-EDID:v1:test.custom';
      const result = await service.generateDataUrl(token, { width: 350, margin: 4 });

      expect(typeof result).toBe('string');
      expect(result).toMatch(/^data:image\/png;base64,/);
    });
  });

  describe('generateBuffer', () => {
    it('should generate a valid binary Buffer from token string', async () => {
      const token = 'SS-DOC:v1:binary.test';
      const result = await service.generateBuffer(token);

      expect(Buffer.isBuffer(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      // PNG magic number check: 0x89 0x50 0x4E 0x47 (89 50 4e 47)
      expect(result[0]).toBe(0x89);
      expect(result[1]).toBe(0x50);
      expect(result[2]).toBe(0x4e);
      expect(result[3]).toBe(0x47);
    });
  });
});
