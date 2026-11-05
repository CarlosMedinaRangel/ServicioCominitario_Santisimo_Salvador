import * as XLSX from 'xlsx';

export interface UploadError {
  row: number;
  field: string;
  message: string;
}

export interface UploadResult {
  success: boolean;
  created: number;
  updated: number;
  errors: UploadError[];
  fileName?: string;
}

/**
 * Mapea las columnas de una fila tabular cruda a un objeto indexado por campos del DTO
 */
export function extractRowData(
  row: unknown[],
  mapping: Record<string, number>,
): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [field, colIndex] of Object.entries(mapping)) {
    if (colIndex >= 0 && colIndex < row.length) {
      data[field] = row[colIndex];
    }
  }
  return data;
}

/**
 * Convierte valores de fecha crudos de Excel (números de serie, strings o Dates) a formato YYYY-MM-DD
 */
export function formatDateValue(value: unknown): string {
  if (!value) return '';
  if (value instanceof Date) {
    if (isNaN(value.getTime())) return '';
    return value.toISOString().split('T')[0];
  }
  if (typeof value === 'number') {
    const date = XLSX.SSF?.parse_date_code?.(value);
    if (date?.y && date?.m && date?.d) {
      return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
    }
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '';

    // Si es un número serial de Excel como string (ej. "43109" o "43108.99")
    const numericSerial = Number(trimmed);
    if (!isNaN(numericSerial) && numericSerial > 1000 && numericSerial < 200000) {
      const date = XLSX.SSF?.parse_date_code?.(numericSerial);
      if (date?.y && date?.m && date?.d) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }

    // Formato DD/MM/YYYY o D/M/YYYY o DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmyMatch) {
      const day = dmyMatch[1].padStart(2, '0');
      const month = dmyMatch[2].padStart(2, '0');
      const year = dmyMatch[3];
      return `${year}-${month}-${day}`;
    }

    // Formato ISO YYYY-MM-DD o YYYY/MM/DD
    const ymdMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (ymdMatch) {
      const year = ymdMatch[1];
      const month = ymdMatch[2].padStart(2, '0');
      const day = ymdMatch[3].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) return parsed.toISOString().split('T')[0];
    return '';
  }
  return '';
}

/**
 * Normaliza valores de hora al estándar HH:mm (ej. '8:00' -> '08:00')
 */
export function normalizeTime(value: string): string {
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

/**
 * Estandariza la cédula venezolana asegurando el prefijo V y eliminando puntos
 */
export function formatCedulaValue(value: string): string {
  let cleaned = String(value).replace(/\./g, '').trim().toUpperCase();
  if (!cleaned.startsWith('V') && cleaned.length > 0) {
    cleaned = 'V' + cleaned;
  }
  return cleaned;
}
