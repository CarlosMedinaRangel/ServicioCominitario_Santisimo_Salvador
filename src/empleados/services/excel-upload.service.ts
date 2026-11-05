import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
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

class UploadRollbackException extends Error {
  constructor() {
    super('Upload failed, rolling back atomic transaction');
  }
}

@Injectable()
export class ExcelUploadService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
  ) { }

  async uploadFile(
    file: Express.Multer.File,
    mapping: Record<string, number>,
  ): Promise<UploadResult> {
    const workbook = XLSX.read(file.buffer, {
      type: 'buffer',
      cellDates: true,
      codepage: 65001,
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

    try {
      await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository
          ? manager.getRepository(User)
          : this.userRepository;
        const employeeRepo = manager.getRepository
          ? manager.getRepository(Employee)
          : this.employeeRepository;

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
              user = await userRepo.findOneBy({
                email: String(data.email).toLowerCase().trim(),
              });
            }
            if (!user && data.cedula) {
              let cedulaLookup = String(data.cedula)
                .replace(/\./g, '')
                .toUpperCase();
              if (!cedulaLookup.startsWith('V')) cedulaLookup = 'V' + cedulaLookup;
              user = await userRepo.findOneBy({ cedula: cedulaLookup });
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
              await userRepo.save({ ...user, ...userUpdates });
            } else {
              const password = data.password
                ? String(data.password)
                : `${String(data.cedula || 'Default')}123!`;
              const hashedPassword = await bcrypt.hash(password, 10);
              user = userRepo.create({
                email: String(data.email || `${String(data.cedula)}@santisimo.edu`).toLowerCase().trim(),
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
              user = await userRepo.save(user);
            }

            // ── Buscar o crear empleado (solo datos base) ─────────────────────────
            // El upload masivo NO crea schedules ni groups — esos se asignan
            // después desde el formulario individual, donde tienen sentido anidados.
            const employee = await employeeRepo.findOneBy({
              userId: user.id,
            });

            const employeeData: Partial<Employee> = {
              position: data.position ? String(data.position) : 'General',
              start_date: (() => {
                const dateStr = formatDateValue(data.start_date);
                const parsed = dateStr ? new Date(`${dateStr}T00:00:00.000Z`) : new Date();
                return isNaN(parsed.getTime()) ? new Date() : parsed;
              })(),
              work_time: data.work_time
                ? normalizeTime(String(data.work_time))
                : '08:00',
              hours_per_day: data.hours_per_day ? Number(data.hours_per_day) : 8,
              work_schedule: data.work_schedule
                ? String(data.work_schedule)
                : 'Lunes a Viernes, 8am - 4pm',
            };

            if (employee) {
              await employeeRepo.save({
                ...employee,
                ...employeeData,
                userId: user.id,
              });
              updated++;
            } else {
              const newEmployee = employeeRepo.create({
                userId: user.id,
                ...employeeData,
              } as Employee);
              await employeeRepo.save(newEmployee);
              created++;
            }
          } catch (error: unknown) {
            const message =
              error instanceof Error ? error.message : 'Error desconocido';
            errors.push({
              row: rowNum,
              field: 'general',
              message,
            });
          }
        }

        // Si se encontraron errores durante el procesamiento de filas,
        // revertir la transacción atómicamente para garantizar que no
        // quede un estado de base de datos parcialmente modificado.
        if (errors.length > 0) {
          throw new UploadRollbackException();
        }
      });
    } catch (error: unknown) {
      if (error instanceof UploadRollbackException) {
        return { success: false, created: 0, updated: 0, errors, fileName: file.originalname };
      }
      const message =
        error instanceof Error
          ? error.message
          : 'Error inesperado en la transacción de base de datos';
      errors.push({
        row: 0,
        field: 'transaction',
        message,
      });
      return { success: false, created: 0, updated: 0, errors, fileName: file.originalname };
    }

    return { success: errors.length === 0, created, updated, errors, fileName: file.originalname };
  }
}
