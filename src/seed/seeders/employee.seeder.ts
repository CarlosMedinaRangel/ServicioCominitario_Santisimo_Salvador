import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../../empleados/entities/employee.entity';
import { SeededUsers } from './user.seeder';
import {
  CANONICAL_ELENA_EMPLOYEE,
  CANONICAL_CARLOS_EMPLOYEE,
  CANONICAL_ANA_EMPLOYEE,
  CANONICAL_INACTIVE_EMPLOYEE,
} from '../data/employees.canonical';

export interface SeededEmployees {
  elena: Employee;
  carlos: Employee;
  ana: Employee;
  inactive: Employee;
  bulk: Employee[];
}

@Injectable()
export class EmployeeSeeder {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
  ) {}

  async run(users: SeededUsers): Promise<SeededEmployees> {
    // 1. Dr. Elena Rodríguez (Canónica)
    const elena = this.employeeRepository.create({
      ...CANONICAL_ELENA_EMPLOYEE,
      userId: users.elena.id,
    });
    await this.employeeRepository.save(elena);

    // 2. Ing. Carlos Pérez (Canónico)
    const carlos = this.employeeRepository.create({
      ...CANONICAL_CARLOS_EMPLOYEE,
      userId: users.carlos.id,
    });
    await this.employeeRepository.save(carlos);

    // 3. Lic. Ana Torres (Canónica)
    const ana = this.employeeRepository.create({
      ...CANONICAL_ANA_EMPLOYEE,
      userId: users.ana.id,
    });
    await this.employeeRepository.save(ana);

    // 4. Prof. Inactivo Retirado (Canónico)
    const inactive = this.employeeRepository.create({
      ...CANONICAL_INACTIVE_EMPLOYEE,
      userId: users.inactive.id,
    });
    await this.employeeRepository.save(inactive);

    // 5. Bulk Employees (15 empleados de volumen para pruebas de carga y paginación)
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

    const bulk: Employee[] = [];
    for (let i = 0; i < users.bulk.length; i++) {
      const user = users.bulk[i];
      const slot = timeSlots[i % timeSlots.length];
      const position = positions[i % positions.length];

      const bulkEmp = this.employeeRepository.create({
        userId: user.id,
        position,
        start_date: new Date(`202${(i % 4) + 1}-0${(i % 9) + 1}-01`),
        work_time: slot.time,
        hours_per_day: slot.hours,
        work_schedule: `Lunes a Viernes, ${slot.label}`,
      });
      await this.employeeRepository.save(bulkEmp);
      bulk.push(bulkEmp);
    }

    return { elena, carlos, ana, inactive, bulk };
  }
}
