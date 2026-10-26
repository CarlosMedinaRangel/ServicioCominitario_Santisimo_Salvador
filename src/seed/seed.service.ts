import { Injectable, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from '../empleados/entities/employee.entity';
import { Schedule } from '../empleados/entities/schedule.entity';
import { Group } from '../empleados/entities/group.entity';
import { Activity } from '../empleados/entities/activity.entity';
import { User } from '../auth/entities/auth.entity';
import { DocumentVerification } from '../documents/entities/document-verification.entity';

import { UserSeeder } from './seeders/user.seeder';
import { EmployeeSeeder } from './seeders/employee.seeder';
import { ScheduleSeeder } from './seeders/schedule.seeder';
import { ActivitySeeder } from './seeders/activity.seeder';
import { DocumentSeeder } from './seeders/document.seeder';

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
    @InjectRepository(DocumentVerification)
    private readonly docVerificationRepository: Repository<DocumentVerification>,
    private readonly configService: ConfigService,
    private readonly userSeeder: UserSeeder,
    private readonly employeeSeeder: EmployeeSeeder,
    private readonly scheduleSeeder: ScheduleSeeder,
    private readonly activitySeeder: ActivitySeeder,
    private readonly documentSeeder: DocumentSeeder,
  ) { }

  async runSeed() {
    const env = this.configService.get<string>('NODE_ENV');
    if (env !== 'development') {
      throw new ForbiddenException(
        `El seeder solo puede ejecutarse en entorno de desarrollo. NODE_ENV actual: "${env}". Se requiere estrictamente "development".`,
      );
    }

    await this.deleteTables();

    // 1. Ejecutar seeders en orden de dependencia relacional
    const users = await this.userSeeder.run();
    const employees = await this.employeeSeeder.run(users);
    const schedules = await this.scheduleSeeder.run(employees);
    const activities = await this.activitySeeder.run(employees);
    const documents = await this.documentSeeder.run(users, employees);

    return {
      message: 'Database seeded successfully',
      usersCount: 1 + 4 + users.bulk.length,
      employeesCount: 4 + employees.bulk.length,
      schedulesCount: schedules.schedulesCount,
      groupsCount: schedules.groupsCount,
      activitiesCount: activities.activitiesCount,
      documentsCount: documents.totalCount,
    };
  }

  private async deleteTables() {
    // Eliminación en orden inverso para respetar restricciones de Foreign Key
    await this.docVerificationRepository.query('DELETE FROM document_verifications');
    await this.activityRepository.query('DELETE FROM activities');
    await this.groupRepository.query('DELETE FROM groups');
    await this.scheduleRepository.query('DELETE FROM schedules');
    await this.employeeRepository.query('DELETE FROM employees');
    await this.userRepository.query('DELETE FROM users');
  }
}
