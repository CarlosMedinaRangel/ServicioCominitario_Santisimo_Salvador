import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../entities/employee.entity';
import { User } from 'src/auth/entities/auth.entity';
import * as bcrypt from 'bcrypt';
import * as XLSX from 'xlsx';
import {
  extractRowData,
  formatDateValue,
  normalizeTime,
  UploadError,
  UploadResult,
} from '../utils/excel-parser.util';

@Injectable()
export class ExcelUploadService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    mapping: Record<string, number>,
  ): Promise<UploadResult> {
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: true,
    });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
    }) as unknown[][];

    const rows = jsonData
      .slice(1)
      .filter((r) =>
        r.some((cell) => cell !== undefined && cell !== null && cell !== ''),
      );

    let created = 0;
    let updated = 0;
    const errors: UploadError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const data = extractRowData(row, mapping);

        // El upload identifica empleados por cédula (o email si lo incluyeron)
        if (!data.email && !data.cedula) {
          errors.push({
            row: rowNum,
            field: 'email/cedula',
            message: 'Email o cédula es requerido',
          });
          continue;
        }

        // ── Buscar o crear usuario ────────────────────────────────────────────
        let user: User | null = null;

        if (data.email) {
          user = await this.userRepository.findOneBy({
            email: String(data.email).toLowerCase().trim(),
          });
        }
        if (!user && data.cedula) {
          let cedulaLookup = String(data.cedula)
            .replace(/\./g, '')
            .toUpperCase();
          if (!cedulaLookup.startsWith('V')) cedulaLookup = 'V' + cedulaLookup;
          user = await this.userRepository.findOneBy({ cedula: cedulaLookup });
        }

        if (user) {
          const userUpdates: Partial<User> = {};
          if (data.fullName) userUpdates.fullName = String(data.fullName);
          if (data.email)
            userUpdates.email = String(data.email).toLowerCase().trim();
          if (data.cedula) {
            let c = String(data.cedula).replace(/\./g, '').toUpperCase();
            if (!c.startsWith('V')) c = 'V' + c;
            userUpdates.cedula = c;
          }
          if (data.telefono)
            userUpdates.telefono = String(data.telefono).replace(/\D/g, '');
          await this.userRepository.save({ ...user, ...userUpdates });
        } else {
          const password = data.password
            ? String(data.password)
            : `${data.cedula || 'Default'}123!`;
          const hashedPassword = await bcrypt.hash(password, 10);
          user = this.userRepository.create({
            email: String(data.email || `${data.cedula}@santisimo.edu`).toLowerCase().trim(),
            password: hashedPassword,
            fullName: String(data.fullName || data.name || 'Sin Nombre'),
            roles: ['user'],
            isActive: true,
          });
          if (data.cedula) {
            let c = String(data.cedula).replace(/\./g, '').toUpperCase();
            if (!c.startsWith('V')) c = 'V' + c;
            user.cedula = c;
          }
          if (data.telefono)
            user.telefono = String(data.telefono).replace(/\D/g, '');
          user = await this.userRepository.save(user);
        }

        // ── Buscar o crear empleado (solo datos base) ─────────────────────────
        // El upload masivo NO crea schedules ni groups — esos se asignan
        // después desde el formulario individual, donde tienen sentido anidados.
        let employee = await this.employeeRepository.findOneBy({
          userId: user.id,
        });

        const employeeData: Partial<Employee> = {
          position: data.position ? String(data.position) : 'General',
          start_date: data.start_date
            ? new Date(formatDateValue(data.start_date))
            : new Date(),
          work_time: data.work_time
            ? normalizeTime(String(data.work_time))
            : '08:00',
          hours_per_day: data.hours_per_day ? Number(data.hours_per_day) : 8,
          work_schedule: data.work_schedule
            ? String(data.work_schedule)
            : 'Lunes a Viernes, 8am - 4pm',
        };

        if (employee) {
          await this.employeeRepository.save({
            ...employee,
            ...employeeData,
            userId: user.id,
          });
          updated++;
        } else {
          const newEmployee = this.employeeRepository.create({
            userId: user.id,
            ...employeeData,
          } as Employee);
          await this.employeeRepository.save(newEmployee);
          created++;
        }
      } catch (error: any) {
        errors.push({
          row: rowNum,
          field: 'general',
          message: error.message ?? 'Error desconocido',
        });
      }
    }

    return { success: errors.length === 0, created, updated, errors };
  }
}
