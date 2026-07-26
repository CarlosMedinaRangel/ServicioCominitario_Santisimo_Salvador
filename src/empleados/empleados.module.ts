import { Module } from '@nestjs/common';
import { EmpleadosService } from './empleados.service';
import { EmpleadosController } from './empleados.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Employee } from './entities/employee.entity';
import { Schedule } from './entities/schedule.entity';
import { Group } from './entities/group.entity';
import { Activity } from './entities/activity.entity';
import { PrinterModule } from 'src/printer/printer.module';
import { User } from 'src/auth/entities/auth.entity';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
  imports: [
    TypeOrmModule.forFeature([Employee, Schedule, Group, Activity, User]),
    CloudinaryModule,
    PrinterModule,
  ],
  exports: [TypeOrmModule, EmpleadosModule, EmpleadosService, CloudinaryModule],
})
export class EmpleadosModule {}
