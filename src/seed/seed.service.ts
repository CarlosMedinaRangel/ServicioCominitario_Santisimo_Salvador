import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Employee } from '../empleados/entities/employee.entity';
import { Schedule } from '../empleados/entities/schedule.entity';
import { Group } from '../empleados/entities/group.entity';
import { Activity } from '../empleados/entities/activity.entity';
import { User } from '../auth/entities/auth.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
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
    private readonly configService: ConfigService,
  ) {}

  async runSeed() {
    await this.deleteTables();
    const result = await this.seedAll();
    return {
      message: 'Database seeded successfully',
      usersCount: result.usersCount,
      employeesCount: result.employeesCount,
      schedulesCount: result.schedulesCount,
      groupsCount: result.groupsCount,
      activitiesCount: result.activitiesCount,
    };
  }

  private async deleteTables() {
    // Delete in reverse dependency order (respects FK constraints)
    await this.activityRepository.query('DELETE FROM activities');
    await this.scheduleRepository.query('DELETE FROM schedules');
    await this.groupRepository.query('DELETE FROM groups');
    await this.employeeRepository.query('DELETE FROM employees');
    await this.userRepository.query('DELETE FROM users');
  }

  private async seedAll() {
    const basePassword =
      this.configService.get('SEED_ADMIN_PASSWORD') || 'Admin123!';

    // ── Admin user (no employee record) ──
    const admin = this.userRepository.create({
      email:
        this.configService.get('SEED_ADMIN_EMAIL') || 'admin@santisimo.edu',
      password: bcrypt.hashSync(basePassword, 10),
      fullName:
        this.configService.get('SEED_ADMIN_NAME') ||
        'Administrador del Sistema',
      cedula: 'V12345678',
      telefono: '04141234567',
      roles: ['admin'],
      isActive: true,
    });
    await this.userRepository.save(admin);

    // ── Employee 1: Dr. Elena Rodríguez ──
    const elenaUser = this.userRepository.create({
      email: 'elena.rodriguez@academia.edu',
      password: bcrypt.hashSync('Elena123!', 10), // Uso de bcrypt según fuentes [3]
      fullName: 'Dr. Elena Rodríguez',
      cedula: this.configService.get('SEED_EMPLOYEE_CEDULA') || 'V882924',
      telefono: '04145550189',
      roles: ['user'],
      isActive: true,
      imagen:
        'https://res.cloudinary.com/i7af6s9l/image/upload/v1785008440/usuarios/images_2_jo1ccl.jpg',
      publicId: 'usuarios/images_2_jo1ccl.jpg',
    });
    await this.userRepository.save(elenaUser);

    const elena = this.employeeRepository.create({
      userId: elenaUser.id,
      position: 'Docente',
      start_date: new Date('2018-09-01') as any,
      work_time: '08:00:00',
      hours_per_day: 8,
      work_schedule: 'Lunes a Viernes, 8am - 4pm',
    });
    await this.employeeRepository.save(elena);

    // Elena's schedules
    const elenaSchedules = this.scheduleRepository.create([
      {
        employeeId: elena.userId,
        nombre: 'Biología Molecular III',
        aula: 'Lab 402',
        horaInicio: '09:00',
        horaFin: '11:30',
        dia: 'Lunes',
        icono: 'flask',
        activa: true,
      },
      {
        employeeId: elena.userId,
        nombre: 'Bioética Avanzada',
        aula: 'Aula 12B',
        horaInicio: '14:00',
        horaFin: '16:00',
        dia: 'Martes',
        icono: 'book',
        activa: false,
      },
      {
        employeeId: elena.userId,
        nombre: 'Genética Aplicada',
        aula: 'Lab 305',
        horaInicio: '10:00',
        horaFin: '12:30',
        dia: 'Miércoles',
        icono: 'dna',
        activa: true,
      },
    ]);
    await this.scheduleRepository.save(elenaSchedules);

    // Elena's groups
    const elenaGroups = this.groupRepository.create([
      {
        employeeId: elena.userId,
        nombre: 'Grupo A-1',
        cantidadEstudiantes: 24,
      },
      {
        employeeId: elena.userId,
        nombre: 'Grupo B-4',
        cantidadEstudiantes: 18,
      },
      {
        employeeId: elena.userId,
        nombre: 'Grupo C-2',
        cantidadEstudiantes: 30,
      },
    ]);
    await this.groupRepository.save(elenaGroups);

    // Elena's activities
    const now = new Date();
    const elenaActivities = this.activityRepository.create([
      {
        employeeId: elena.userId,
        tipo: 'Publicación de Calificaciones',
        descripcion: 'Biología Molecular III',
        detalle: 'Hoy, 10:45 AM',
        timestamp: now,
        destacada: true,
      },
      {
        employeeId: elena.userId,
        tipo: 'Registro de Asistencia',
        descripcion: 'Lab 402',
        detalle: 'Ayer, 09:15 AM',
        timestamp: new Date(now.getTime() - 86400000),
        destacada: false,
      },
      {
        employeeId: elena.userId,
        tipo: 'Actualización de Perfil',
        descripcion: 'Certificado PhD',
        detalle: 'Lunes, 16:30 PM',
        timestamp: new Date(now.getTime() - 172800000),
        destacada: false,
      },
    ]);
    await this.activityRepository.save(elenaActivities);

    // ── Employee 2: Prof. Carlos Mendoza ──
    const carlosUser = this.userRepository.create({
      email: 'carlos.perez@academia.edu',
      password: bcrypt.hashSync('Carlos123!', 10),
      fullName: 'Ing. Carlos Pérez',
      cedula: 'V1234567',
      telefono: '04125550001',
      roles: ['user'],
      isActive: true,
      imagen:
        'https://res.cloudinary.com/i7af6s9l/image/upload/v1785008103/usuarios/1561815164912_oxjbnh.jpg',
      publicId: 'usuarios/1561815164912_oxjbnh',
    });
    await this.userRepository.save(carlosUser);

    const carlos = this.employeeRepository.create({
      userId: carlosUser.id,
      position: 'Profesor Titular',
      start_date: new Date('2020-02-15') as any,
      work_time: '07:30:00',
      hours_per_day: 8,
      work_schedule: 'Lunes a Viernes, 7:30am - 3:30pm',
    });
    await this.employeeRepository.save(carlos);

    // Carlos's schedules
    const carlosSchedules = this.scheduleRepository.create([
      {
        employeeId: carlos.userId,
        nombre: 'Álgebra Lineal II',
        aula: 'Aula 301',
        horaInicio: '08:00',
        horaFin: '10:00',
        dia: 'Lunes',
        icono: 'book',
        activa: true,
      },
      {
        employeeId: carlos.userId,
        nombre: 'Cálculo Diferencial',
        aula: 'Aula 302',
        horaInicio: '10:30',
        horaFin: '12:30',
        dia: 'Miércoles',
        icono: 'book',
        activa: true,
      },
    ]);
    await this.scheduleRepository.save(carlosSchedules);

    // Carlos's groups
    const carlosGroups = this.groupRepository.create([
      {
        employeeId: carlos.userId,
        nombre: 'Grupo D-1',
        cantidadEstudiantes: 20,
      },
      {
        employeeId: carlos.userId,
        nombre: 'Grupo E-3',
        cantidadEstudiantes: 15,
      },
    ]);
    await this.groupRepository.save(carlosGroups);

    // Carlos's activities
    const carlosActivities = this.activityRepository.create([
      {
        employeeId: carlos.userId,
        tipo: 'Publicación de Notas',
        descripcion: 'Álgebra Lineal II',
        detalle: 'Hoy, 12:00 PM',
        timestamp: now,
        destacada: false,
      },
      {
        employeeId: carlos.userId,
        tipo: 'Reunión de Departamento',
        descripcion: 'Matemáticas',
        detalle: 'Ayer, 15:00 PM',
        timestamp: new Date(now.getTime() - 86400000),
        destacada: true,
      },
    ]);
    await this.activityRepository.save(carlosActivities);

    // ── Employee 3: Lic. Ana Torres ──
    const anaUser = this.userRepository.create({
      email: 'ana.torres@academia.edu',
      password: bcrypt.hashSync('Ana123!', 10),
      fullName: 'Lic. Ana Torres',
      cedula: 'V114724',
      telefono: '04165550189',
      roles: ['user'],
      isActive: true,
      imagen:
        'https://res.cloudinary.com/i7af6s9l/image/upload/v1785008441/usuarios/1775867008473_ekou6u.jpg',
      publicId: 'usuarios/1775867008473_ekou6u.jpg',
    });
    await this.userRepository.save(anaUser);

    const ana = this.employeeRepository.create({
      userId: anaUser.id,
      position: 'Coordinadora Académica',
      start_date: new Date('2022-06-01') as any,
      work_time: '08:00:00',
      hours_per_day: 8,
      work_schedule: 'Lunes a Viernes, 8am - 4pm',
    });
    await this.employeeRepository.save(ana);

    // Ana's schedule
    const anaSchedules = this.scheduleRepository.create([
      {
        employeeId: ana.userId,
        nombre: 'Orientación Académica',
        aula: 'Oficina 101',
        horaInicio: '09:00',
        horaFin: '11:00',
        dia: 'Jueves',
        icono: 'book',
        activa: true,
      },
    ]);
    await this.scheduleRepository.save(anaSchedules);

    // Ana's groups
    const anaGroups = this.groupRepository.create([
      {
        employeeId: ana.userId,
        nombre: 'Grupo F-2',
        cantidadEstudiantes: 12,
      },
    ]);
    await this.groupRepository.save(anaGroups);

    // Ana's activities
    const anaActivities = this.activityRepository.create([
      {
        employeeId: ana.userId,
        tipo: 'Reunión de Coordinación',
        descripcion: 'Planificación',
        detalle: 'Hoy, 08:30 AM',
        timestamp: now,
        destacada: true,
      },
    ]);
    await this.activityRepository.save(anaActivities);

    // ── Bulk employees (Employee1..Employee10) ──
    const timeSlots = [
      { time: '07:00:00', hours: 8, label: '7am - 3pm' },
      { time: '08:00:00', hours: 8, label: '8am - 4pm' },
      { time: '09:00:00', hours: 8, label: '9am - 5pm' },
      { time: '13:00:00', hours: 4, label: '1pm - 5pm' },
    ];

    const positions = [
      'Docente de Aula',
      'Docente Especialista',
      'Docente Guía',
      'Coordinador Pedagógico',
      'Preparador',
    ];

    let bulkUsersCount = 0;
    let bulkEmployeesCount = 0;
    for (let i = 1; i <= 10; i++) {
      const slot = timeSlots[Math.floor(Math.random() * timeSlots.length)];

      const bulkUser = this.userRepository.create({
        email: `employee${i}@santisimo.edu`,
        password: bcrypt.hashSync(`${basePassword}${i}`, 10),
        fullName: `Employee${i}`,
        cedula: `V${1000000 + i}`,
        telefono: `0414${String(5500000 + i).padStart(7, '0')}`,
        roles: ['user'],
        isActive: true,
      });
      await this.userRepository.save(bulkUser);
      bulkUsersCount++;

      const bulkEmp = this.employeeRepository.create({
        userId: bulkUser.id,
        position: positions[Math.floor(Math.random() * positions.length)],
        start_date: new Date(
          `202${Math.floor(Math.random() * 4) + 1}-0${Math.floor(Math.random() * 9) + 1}-01`,
        ) as any,
        work_time: slot.time,
        hours_per_day: slot.hours,
        work_schedule: `Lunes a Viernes, ${slot.label}`,
      });
      await this.employeeRepository.save(bulkEmp);
      bulkEmployeesCount++;
    }

    return {
      usersCount: 1 + 3 + bulkUsersCount,
      employeesCount: 3 + bulkEmployeesCount,
      schedulesCount:
        elenaSchedules.length + carlosSchedules.length + anaSchedules.length,
      groupsCount: elenaGroups.length + carlosGroups.length + anaGroups.length,
      activitiesCount:
        elenaActivities.length + carlosActivities.length + anaActivities.length,
    };
  }
}
