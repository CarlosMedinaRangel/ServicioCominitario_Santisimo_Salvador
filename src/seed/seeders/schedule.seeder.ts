import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Schedule } from '../../empleados/entities/schedule.entity';
import { Group } from '../../empleados/entities/group.entity';
import { SeededEmployees } from './employee.seeder';

export interface ScheduleSeederResult {
  schedulesCount: number;
  groupsCount: number;
}

@Injectable()
export class ScheduleSeeder {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Group)
    private readonly groupRepository: Repository<Group>,
  ) {}

  async run(employees: SeededEmployees): Promise<ScheduleSeederResult> {
    let totalSchedules = 0;
    let totalGroups = 0;

    // 1. Elena's Schedules & Groups (Docente Titular de Biología)
    const elenaSchedules = await this.scheduleRepository.save(
      this.scheduleRepository.create([
        {
          employeeId: employees.elena.userId,
          nombre: 'Biología Molecular III',
          aula: 'Lab 402',
          horaInicio: '09:00',
          horaFin: '11:30',
          dias: ['Lunes', 'Miércoles'],
          icono: 'flask',
          activa: true,
        },
        {
          employeeId: employees.elena.userId,
          nombre: 'Bioética Avanzada',
          aula: 'Aula 102',
          horaInicio: '14:00',
          horaFin: '16:00',
          dias: ['Martes'],
          icono: 'book',
          activa: false,
        },
        {
          employeeId: employees.elena.userId,
          nombre: 'Genética Aplicada',
          aula: 'Lab 305',
          horaInicio: '10:00',
          horaFin: '12:30',
          dias: ['Viernes'],
          icono: 'dna',
          activa: true,
        },
      ]),
    );
    totalSchedules += elenaSchedules.length;

    const elenaGroups = await this.groupRepository.save(
      this.groupRepository.create([
        {
          employeeId: employees.elena.userId,
          scheduleId: elenaSchedules[0].id,
          nombre: 'Grupo A-1',
          cantidadEstudiantes: 24,
        },
        {
          employeeId: employees.elena.userId,
          scheduleId: elenaSchedules[1].id,
          nombre: 'Grupo B-4',
          cantidadEstudiantes: 18,
        },
        {
          employeeId: employees.elena.userId,
          scheduleId: elenaSchedules[2].id,
          nombre: 'Grupo C-2',
          cantidadEstudiantes: 30,
        },
      ]),
    );
    totalGroups += elenaGroups.length;

    // 2. Carlos's Schedules & Groups (Profesor de Matemáticas)
    const carlosSchedules = await this.scheduleRepository.save(
      this.scheduleRepository.create([
        {
          employeeId: employees.carlos.userId,
          nombre: 'Álgebra Lineal II',
          aula: 'Aula 301',
          horaInicio: '08:00',
          horaFin: '10:00',
          dias: ['Lunes', 'Miércoles'],
          icono: 'book',
          activa: true,
        },
        {
          employeeId: employees.carlos.userId,
          nombre: 'Cálculo Diferencial',
          aula: 'Aula 302',
          horaInicio: '10:30',
          horaFin: '12:30',
          dias: ['Martes', 'Jueves'],
          icono: 'book',
          activa: true,
        },
      ]),
    );
    totalSchedules += carlosSchedules.length;

    const carlosGroups = await this.groupRepository.save(
      this.groupRepository.create([
        {
          employeeId: employees.carlos.userId,
          scheduleId: carlosSchedules[0].id,
          nombre: 'Grupo D-1',
          cantidadEstudiantes: 20,
        },
        {
          employeeId: employees.carlos.userId,
          scheduleId: carlosSchedules[1].id,
          nombre: 'Grupo E-3',
          cantidadEstudiantes: 15,
        },
      ]),
    );
    totalGroups += carlosGroups.length;

    // 3. Ana's Schedule & Group (Coordinadora Académica)
    const anaSchedules = await this.scheduleRepository.save(
      this.scheduleRepository.create([
        {
          employeeId: employees.ana.userId,
          nombre: 'Orientación Académica y Vocacional',
          aula: 'Aula 101',
          horaInicio: '09:00',
          horaFin: '11:00',
          dias: ['Jueves'],
          icono: 'book',
          activa: true,
        },
      ]),
    );
    totalSchedules += anaSchedules.length;

    const anaGroups = await this.groupRepository.save(
      this.groupRepository.create([
        {
          employeeId: employees.ana.userId,
          scheduleId: anaSchedules[0].id,
          nombre: 'Grupo F-2',
          cantidadEstudiantes: 12,
        },
      ]),
    );
    totalGroups += anaGroups.length;

    // 4. Bulk Employees Schedules & Groups (~0.6 horario por empleado de volumen)
    const bulkCourses = [
      { nombre: 'Física Clásica', aula: 'Lab 305', horaInicio: '07:30', horaFin: '09:30', dias: ['Lunes', 'Miércoles'], icono: 'atom' },
      { nombre: 'Química Orgánica', aula: 'Lab 402', horaInicio: '13:00', horaFin: '15:00', dias: ['Martes', 'Jueves'], icono: 'flask' },
      { nombre: 'Lengua y Literatura', aula: 'Aula 101', horaInicio: '08:00', horaFin: '10:00', dias: ['Lunes', 'Miércoles'], icono: 'book' },
      { nombre: 'Historia de Venezuela', aula: 'Aula 102', horaInicio: '10:00', horaFin: '12:00', dias: ['Martes', 'Jueves'], icono: 'landmark' },
      { nombre: 'Educación Física y Deporte', aula: 'Cancha Deportiva', horaInicio: '07:00', horaFin: '09:00', dias: ['Viernes'], icono: 'activity' },
      { nombre: 'Informática Educativa', aula: 'Lab 305', horaInicio: '14:00', horaFin: '16:00', dias: ['Miércoles'], icono: 'monitor' },
      { nombre: 'Inglés Técnico', aula: 'Aula 201', horaInicio: '09:00', horaFin: '11:00', dias: ['Martes', 'Viernes'], icono: 'globe' },
      { nombre: 'Arte y Patrimonio', aula: 'Aula 202', horaInicio: '11:00', horaFin: '13:00', dias: ['Jueves'], icono: 'palette' },
      { nombre: 'Educación Musical', aula: 'Aula 301', horaInicio: '13:30', horaFin: '15:30', dias: ['Viernes'], icono: 'music' },
      { nombre: 'Geografía General', aula: 'Aula 302', horaInicio: '08:30', horaFin: '10:30', dias: ['Lunes'], icono: 'map' },
    ];

    for (let i = 0; i < bulkCourses.length && i < employees.bulk.length; i++) {
      const emp = employees.bulk[i];
      const course = bulkCourses[i];

      const bulkSchedule = await this.scheduleRepository.save(
        this.scheduleRepository.create({
          employeeId: emp.userId,
          nombre: course.nombre,
          aula: course.aula,
          horaInicio: course.horaInicio,
          horaFin: course.horaFin,
          dias: course.dias,
          icono: course.icono,
          activa: true,
        }),
      );
      totalSchedules++;

      const bulkGroup = await this.groupRepository.save(
        this.groupRepository.create({
          employeeId: emp.userId,
          scheduleId: bulkSchedule.id,
          nombre: `Grupo G-${i + 1}`,
          cantidadEstudiantes: 20 + (i % 10),
        }),
      );
      totalGroups++;
    }

    return { schedulesCount: totalSchedules, groupsCount: totalGroups };
  }
}
