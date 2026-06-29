import { Module } from '@nestjs/common';
import { EmpleadosService } from './empleados.service';
import { EmpleadosController } from './empleados.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from './entities/empleado.entity';
import { PrinterModule } from 'src/printer/printer.module';
import { PrinterService } from 'src/printer/printer.service';

@Module({
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
  imports: [TypeOrmModule.forFeature([Empleado]), PrinterModule],
  exports: [TypeOrmModule, EmpleadosModule, EmpleadosService],
})
export class EmpleadosModule {}
