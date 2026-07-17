import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateEmpleadoDto } from './dto/create-empleado.dto';
import { UpdateEmpleadoDto } from './dto/update-empleado.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Employee } from './entities/employee.entity';
import { Schedule } from './entities/schedule.entity';
import { Group } from './entities/group.entity';
import { Activity } from './entities/activity.entity';
import { User } from 'src/auth/entities/auth.entity';
import { IErrorsTypeORM } from 'src/interfaces/error.response';
import { PrinterService } from 'src/printer/printer.service';
import { employementLetterReportByID } from 'src/reports/employementLetterByID.report';
import { constanciaMensualReport } from 'src/reports/constanciaMensual.report';
import * as bcrypt from 'bcrypt';
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
}

@Injectable()
export class EmpleadosService {
  private readonly logger = new Logger('EmpleadosService');

  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly PrinterService: PrinterService,
  ) {}

  async create(createEmpleadoDto: CreateEmpleadoDto) {
    try {
      const user = await this.userRepository.findOneBy({
        id: createEmpleadoDto.userId,
      });
      if (!user) {
        throw new BadRequestException(
          `No existe un usuario con id ${createEmpleadoDto.userId}`,
        );
      }
      const employee = this.employeeRepository.create({
        userId: user.id,
        position: createEmpleadoDto.position,
        start_date: createEmpleadoDto.start_date as any,
        work_time: createEmpleadoDto.work_time,
        hours_per_day: createEmpleadoDto.hours_per_day,
        work_schedule: createEmpleadoDto.work_schedule,
      });
      await this.employeeRepository.save(employee);
      return this.employeeRepository.findOne({
        where: { userId: employee.userId },
        relations: { user: true },
      });
    } catch (error: any) {
      this.handleExceptions(error);
    }
  }

  async findAll() {
    return this.employeeRepository.find({ relations: { user: true } });
  }

  async findOne(id: string) {
    let employee: Employee | null = null;

    // Try UUID format (userId)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      employee = await this.employeeRepository.findOne({
        where: { userId: id },
        relations: { user: true },
      });
    }

    // Try cedula lookup
    if (!employee) {
      let cedulaLimpia = id.replace(/\./g, '').toUpperCase();
      if (!cedulaLimpia.startsWith('V')) {
        cedulaLimpia = 'V' + cedulaLimpia;
      }
      const user = await this.userRepository.findOneBy({ cedula: cedulaLimpia });
      if (user) {
        employee = await this.employeeRepository.findOne({
          where: { userId: user.id },
          relations: { user: true },
        });
      }
    }

    if (!employee) {
      throw new BadRequestException(`No hay empleado con este "${id}" ID`);
    }

    return employee;
  }

  async findSchedules(employeeId: string) {
    return this.scheduleRepository.find({
      where: { employeeId },
      order: { dia: 'ASC', horaInicio: 'ASC' },
    });
  }

  async findGroups(employeeId: string) {
    return this.groupRepository.find({
      where: { employeeId },
    });
  }

  async findActivities(employeeId: string) {
    return this.activityRepository.find({
      where: { employeeId },
      order: { timestamp: 'DESC' },
    });
  }

  async ConstanciaEmpleadoByID(id: string, options?: { month?: string; employerName?: string; employerPosition?: string; employerCompany?: string }) {
    const employee = await this.findOne(id);
    const user = employee.user;

    const employerName = options?.employerName || 'Carlos Medina';
    const employerPosition = options?.employerPosition || 'Director';
    const employerCompany = options?.employerCompany || 'Santisimo Salvador';

    if (options?.month) {
      const [yearStr, monthStr] = options.month.split('-');
      const year = parseInt(yearStr, 10);
      const mes = parseInt(monthStr, 10);

      const startDate = new Date(year, mes - 1, 1);
      const endDate = new Date(year, mes, 0, 23, 59, 59);

      const activities = await this.activityRepository.find({
        where: {
          employeeId: employee.userId,
          timestamp: Between(startDate, endDate),
        },
        order: { timestamp: 'DESC' },
      });

      const docDefinition = constanciaMensualReport({
        employerName,
        employerPosition,
        employerCompany,
        employeeName: user.fullName,
        employeeCedula: user.cedula || 'N/A',
        employeePosition: employee.position,
        employeeStartDate: employee.start_date,
        employeeHours: employee.hours_per_day,
        employeeWorkSchedule: employee.work_schedule,
        month: `${monthStr}-${yearStr}`,
        activities: activities.map((a) => ({
          tipo: a.tipo,
          descripcion: a.descripcion,
          detalle: a.detalle,
          timestamp: a.timestamp,
        })),
      });

      return this.PrinterService.createPdf(docDefinition);
    }

    const docDefinition = employementLetterReportByID({
      employerName,
      employerPosition,
      employerCompany,
      employeeName: user.fullName,
      employeeCedula: user.cedula || 'N/A',
      employeePosition: employee.position,
      employeeStartDate: employee.start_date,
      employeeHours: employee.hours_per_day,
      employeeWorkSchedule: employee.work_schedule,
    });

    return this.PrinterService.createPdf(docDefinition);
  }

  async update(id: string, updateEmpleadoDto: UpdateEmpleadoDto) {
    const employee = await this.findOne(id);

    const updated = await this.employeeRepository.preload({
      userId: employee.userId,
      ...updateEmpleadoDto,
    });

    if (!updated) {
      throw new NotFoundException(
        `El empleado con el id ${id} no se encontró`,
      );
    }

    try {
      const result = await this.employeeRepository.save(updated);
      return this.employeeRepository.findOne({
        where: { userId: result.userId },
        relations: { user: true },
      });
    } catch (error: any) {
      this.handleExceptions(error);
    }
  }

  async remove(id: string) {
    const employee = await this.findOne(id);

    try {
      await this.employeeRepository.remove(employee);
      return `Eliminado`;
    } catch (error: any) {
      this.handleExceptions(error);
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    mapping: Record<string, number>,
  ): Promise<UploadResult> {
    const workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];

    const rows = jsonData
      .slice(1)
      .filter((r) => r.some((cell) => cell !== undefined && cell !== null && cell !== ''));

    let created = 0;
    let updated = 0;
    const errors: UploadError[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;

      try {
        const data = this.extractRowData(row, mapping);

        if (!data.email && !data.cedula) {
          errors.push({
            row: rowNum,
            field: 'email/cedula',
            message: 'Email o cédula es requerido',
          });
          continue;
        }

        // Find or create user
        let user: User | null = null;
        if (data.email) {
          user = await this.userRepository.findOneBy({
            email: String(data.email).toLowerCase().trim(),
          });
        }
        if (!user && data.cedula) {
          let cedulaLookup = String(data.cedula).replace(/\./g, '').toUpperCase();
          if (!cedulaLookup.startsWith('V')) cedulaLookup = 'V' + cedulaLookup;
          user = await this.userRepository.findOneBy({ cedula: cedulaLookup });
        }

        if (user) {
          // Update existing user
          const userUpdates: Partial<User> = {};
          if (data.fullName) userUpdates.fullName = String(data.fullName);
          if (data.email) userUpdates.email = String(data.email).toLowerCase().trim();
          if (data.cedula) {
            let c = String(data.cedula).replace(/\./g, '').toUpperCase();
            if (!c.startsWith('V')) c = 'V' + c;
            userUpdates.cedula = c;
          }
          if (data.telefono)
            userUpdates.telefono = String(data.telefono).replace(/\D/g, '');
          await this.userRepository.save({ ...user, ...userUpdates });
        } else {
          // Create new user
          const password = data.password
            ? String(data.password)
            : `${data.cedula || 'Default'}123!`;
          user = this.userRepository.create({
            email: String(data.email || `${data.cedula}@santisimo.edu`).toLowerCase().trim(),
            password: bcrypt.hashSync(password, 10),
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

        // Find or create employee
        let employee = await this.employeeRepository.findOneBy({
          userId: user.id,
        });

        const employeeData: Partial<Employee> = {
          position: data.position ? String(data.position) : 'General',
          start_date: data.start_date
            ? (this.formatDateValue(data.start_date) as any)
            : (new Date().toISOString().split('T')[0] as any),
          work_time: data.work_time ? String(data.work_time) : '08:00:00',
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

  private extractRowData(
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

  private formatDateValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'number') {
      const date = XLSX.SSF?.parse_date_code?.(value);
      if (date?.y && date?.m && date?.d) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    if (typeof value === 'string') {
      const parsed = new Date(value);
      if (!isNaN(parsed.getTime())) {
        return parsed.toISOString().split('T')[0];
      }
      return value;
    }
    return '';
  }

  async seedActivities(employeeId: string, month: string) {
    const employee = await this.findOne(employeeId);

    const [yearStr, monthStr] = month.split('-');
    const year = parseInt(yearStr, 10);
    const mes = parseInt(monthStr, 10);

    const activityTypes = [
      'Clase Impartida', 'Reunión', 'Corrección de Evaluaciones',
      'Planificación', 'Laboratorio', 'Tutoría',
    ];
    const descriptions = [
      'Matemáticas Básicas', 'Biología Molecular', 'Historia Universal',
      'Lengua y Literatura', 'Física General', 'Química Orgánica',
      'Inglés Avanzado', 'Educación Física', 'Arte y Cultura',
    ];
    const details = [
      'Grupo A', 'Grupo B', 'Grupo C', 'Salón 101', 'Salón 203',
      'Laboratorio 1', 'Aula Virtual', 'Biblioteca',
    ];

    const activities: Activity[] = [];
    const count = 3 + Math.floor(Math.random() * 3);

    for (let i = 0; i < count; i++) {
      const day = 1 + Math.floor(Math.random() * 28);
      const hour = 7 + Math.floor(Math.random() * 10);
      const timestamp = new Date(year, mes - 1, day, hour, 0, 0);

      const tipo = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const descripcion = descriptions[Math.floor(Math.random() * descriptions.length)];
      const detalle = details[Math.floor(Math.random() * details.length)];

      const activity = this.activityRepository.create({
        employeeId: employee.userId,
        tipo,
        descripcion,
        detalle,
        timestamp,
        destacada: Math.random() > 0.7,
      });
      activities.push(activity);
    }

    return this.activityRepository.save(activities);
  }

  private handleExceptions(error: IErrorsTypeORM) {
    if (error.code === '23505') throw new BadRequestException(error.detail);
    this.logger.error(error);
    throw new InternalServerErrorException('Revisar el LOG');
  }
}
