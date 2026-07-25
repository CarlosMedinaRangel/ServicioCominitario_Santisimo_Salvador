import { Module } from '@nestjs/common';
import { EmpleadosService } from './empleados.service';
import { EmpleadosController } from './empleados.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from './entities/empleado.entity';
import { PrinterModule } from 'src/printer/printer.module';
import { PrinterService } from 'src/printer/printer.service';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';

@Module({
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
  imports: [
    TypeOrmModule.forFeature([Empleado]),
    CloudinaryModule,
    PrinterModule,
  ],
  exports: [TypeOrmModule, EmpleadosModule, EmpleadosService, CloudinaryModule],
})
export class EmpleadosModule {}
