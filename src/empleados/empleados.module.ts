import { Module } from '@nestjs/common';
import { EmpleadosService } from './empleados.service';
import { EmpleadosController } from './empleados.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Empleado } from './entities/empleado.entity';

@Module({
  controllers: [EmpleadosController],
  providers: [EmpleadosService],
  imports: [TypeOrmModule.forFeature([Empleado])],
})
export class EmpleadosModule {}
