import {
  extractRowData,
  formatDateValue,
  normalizeTime,
  formatCedulaValue,
} from '../excel-parser.util';

describe('excel-parser.util (Pure Functional Utilities)', () => {
  describe('extractRowData', () => {
    it('should map row columns according to provided index mapping', () => {
      const row = ['V-12345678', 'Juan Pérez', 'juan@test.com', 'Docente'];
      const mapping = {
        cedula: 0,
        fullName: 1,
        email: 2,
        position: 3,
      };

      const result = extractRowData(row, mapping);

      expect(result).toEqual({
        cedula: 'V-12345678',
        fullName: 'Juan Pérez',
        email: 'juan@test.com',
        position: 'Docente',
      });
    });

    it('should ignore column indices that are out of bounds or negative', () => {
      const row = ['Valor A'];
      const mapping = {
        colA: 0,
        colB: 5,
        colC: -1,
      };

      const result = extractRowData(row, mapping);

      expect(result).toEqual({
        colA: 'Valor A',
      });
    });
  });

  describe('formatDateValue', () => {
    it('should format Date instance to YYYY-MM-DD', () => {
      const date = new Date('2024-05-15T12:00:00.000Z');
      expect(formatDateValue(date)).toBe('2024-05-15');
    });

    it('should format string date to YYYY-MM-DD', () => {
      expect(formatDateValue('2023-11-20')).toBe('2023-11-20');
      expect(formatDateValue('15/02/2020')).toBe('2020-02-15');
      expect(formatDateValue('1/9/2023')).toBe('2023-09-01');
      expect(formatDateValue('43109')).toBe('2018-01-09');
    });

    it('should return empty string for null or undefined', () => {
      expect(formatDateValue(null)).toBe('');
      expect(formatDateValue(undefined)).toBe('');
    });
  });

  describe('normalizeTime', () => {
    it('should pad single-digit hour to two digits (e.g. 8:00 -> 08:00)', () => {
      expect(normalizeTime('8:00')).toBe('08:00');
      expect(normalizeTime('7:30')).toBe('07:30');
    });

    it('should preserve already formatted two-digit hour (e.g. 14:30)', () => {
      expect(normalizeTime('14:30')).toBe('14:30');
    });

    it('should return original string if pattern does not match', () => {
      expect(normalizeTime('invalid-time')).toBe('invalid-time');
    });
  });

  describe('formatCedulaValue', () => {
    it('should prepend V when missing and uppercase characters', () => {
      expect(formatCedulaValue('12345678')).toBe('V12345678');
      expect(formatCedulaValue('v12345678')).toBe('V12345678');
    });

    it('should remove periods from formatted cedula (e.g. V-12.345.678 -> V-12345678)', () => {
      expect(formatCedulaValue('V-12.345.678')).toBe('V-12345678');
      expect(formatCedulaValue('12.345.678')).toBe('V12345678');
    });
  });
});
