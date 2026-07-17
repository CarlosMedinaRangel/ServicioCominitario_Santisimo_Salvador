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

@Module({
  imports: [
    TypeOrmModule.forFeature([Employee, Schedule, Group, Activity, User]),
    ConfigModule,
  ],
  controllers: [SeedController],
  providers: [SeedService],
})
export class SeedModule {}
