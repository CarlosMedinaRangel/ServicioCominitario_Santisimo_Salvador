export class DateFormatter {
  static formatter = new Intl.DateTimeFormat('es-ES', {
    year: 'numeric',
    month: `long`,
    day: '2-digit',
  });
  static getDDMMMMYYYY(date: Date): string {
    return this.formatter.format(date);
  }
  static formatCedulaHyphen(cedula?: string | null): string {
    if (!cedula) return '';
    const clean = cedula.trim().toUpperCase();
    const prefix = clean.startsWith('E') ? 'E-' : 'V-';
    const digits = clean.replace(/\D/g, '');
    return digits ? `${prefix}${digits}` : clean;
  }
}
