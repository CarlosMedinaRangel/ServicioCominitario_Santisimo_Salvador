import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { SeedService } from './seed.service';
import { SeedController } from './seed.controller';
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

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Employee,
      Schedule,
      Group,
      Activity,
      User,
      DocumentVerification,
    ]),
    ConfigModule,
  ],
  controllers: [SeedController],
  providers: [
    SeedService,
    UserSeeder,
    EmployeeSeeder,
    ScheduleSeeder,
    ActivitySeeder,
    DocumentSeeder,
  ],
  exports: [SeedService],
})
export class SeedModule {}
