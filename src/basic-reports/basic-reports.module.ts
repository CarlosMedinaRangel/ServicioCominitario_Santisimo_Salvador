import { Module } from '@nestjs/common';
import { BasicReportsService } from './basic-reports.service';
import { BasicReportsController } from './basic-reports.controller';
import { EmpleadosModule } from 'src/empleados/empleados.module';
import { PrinterModule } from 'src/printer/printer.module';

@Module({
  controllers: [BasicReportsController],
  providers: [BasicReportsService],
  imports: [EmpleadosModule, PrinterModule],
})
export class BasicReportsModule {}
