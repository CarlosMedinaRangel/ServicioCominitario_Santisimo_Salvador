import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../../empleados/entities/activity.entity';
import { SeededEmployees } from './employee.seeder';

export interface ActivitySeederResult {
  activitiesCount: number;
}

@Injectable()
export class ActivitySeeder {
  constructor(
    @InjectRepository(Activity)
    private readonly activityRepository: Repository<Activity>,
  ) {}

  async run(employees: SeededEmployees): Promise<ActivitySeederResult> {
    const now = new Date();
    let totalActivities = 0;

    // 1. Elena's Activities
    const elenaActivities = await this.activityRepository.save(
      this.activityRepository.create([
        {
          employeeId: employees.elena.userId,
          tipo: 'Publicación de Calificaciones',
          descripcion: 'Biología Molecular III',
          detalle: 'Hoy, 10:45 AM',
          timestamp: now,
          destacada: true,
        },
        {
          employeeId: employees.elena.userId,
          tipo: 'Registro de Asistencia',
          descripcion: 'Lab 402',
          detalle: 'Ayer, 09:15 AM',
          timestamp: new Date(now.getTime() - 86400000),
          destacada: false,
        },
        {
          employeeId: employees.elena.userId,
          tipo: 'Actualización de Perfil',
          descripcion: 'Certificado PhD',
          detalle: 'Lunes, 16:30 PM',
          timestamp: new Date(now.getTime() - 172800000),
          destacada: false,
        },
      ]),
    );
    totalActivities += elenaActivities.length;

    // 2. Carlos's Activities
    const carlosActivities = await this.activityRepository.save(
      this.activityRepository.create([
        {
          employeeId: employees.carlos.userId,
          tipo: 'Publicación de Notas',
          descripcion: 'Álgebra Lineal II',
          detalle: 'Hoy, 12:00 PM',
          timestamp: now,
          destacada: false,
        },
        {
          employeeId: employees.carlos.userId,
          tipo: 'Reunión de Departamento',
          descripcion: 'Matemáticas',
          detalle: 'Ayer, 15:00 PM',
          timestamp: new Date(now.getTime() - 86400000),
          destacada: true,
        },
      ]),
    );
    totalActivities += carlosActivities.length;

    // 3. Ana's Activities
    const anaActivities = await this.activityRepository.save(
      this.activityRepository.create([
        {
          employeeId: employees.ana.userId,
          tipo: 'Reunión de Coordinación',
          descripcion: 'Planificación',
          detalle: 'Hoy, 08:30 AM',
          timestamp: now,
          destacada: true,
        },
      ]),
    );
    totalActivities += anaActivities.length;

    return { activitiesCount: totalActivities };
  }
}
